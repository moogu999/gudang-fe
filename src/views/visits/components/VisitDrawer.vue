<template>
  <Drawer
    :visible="true"
    position="right"
    class="!w-full md:!w-[36rem]"
    :header="t('visits.drawer.title')"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div v-if="isLoading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <template v-else-if="detail">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="font-semibold">{{ detail.customer.name }}</span>
        <span class="text-sm text-stone-500">{{ detail.customer.code }}</span>
        <Tag
          :severity="statusSeverity(detail.displayStatus)"
          :value="t(`visits.status.${detail.displayStatus}`)"
          data-testid="drawer-status"
        />
      </div>
      <p class="mb-4 text-sm text-stone-600">
        {{ detail.employee.name }}
        <span v-if="detail.employee.nip" class="text-stone-500">· {{ detail.employee.nip }}</span>
      </p>

      <!-- A visit left open on an earlier day blocks the salesman's next check-in -->
      <Message
        v-if="detail.displayStatus === 'not_checked_out'"
        severity="warn"
        class="mb-4"
        data-testid="drawer-close-hint"
      >
        <div class="flex flex-col gap-2">
          <span>{{ t('visits.close.hint') }}</span>
          <Button
            v-if="canClose"
            :label="t('visits.close.action')"
            icon="pi pi-lock"
            severity="warn"
            size="small"
            class="self-start"
            data-testid="close-visit"
            @click="openClose"
          />
        </div>
      </Message>

      <!-- Selfie -->
      <div v-if="record.status !== 'skipped'" class="mb-4">
        <Image
          v-if="detail.selfieUrl"
          :src="buildFileUrl(detail.selfieUrl)"
          preview
          image-class="max-h-72 w-full rounded-md object-contain bg-stone-100"
          data-testid="drawer-selfie"
        />
        <p v-else class="rounded-md bg-stone-100 p-4 text-sm text-stone-500">
          {{ t('visits.drawer.noSelfie') }}
        </p>
      </div>

      <!-- Map: the customer point, its radius and where the salesman checked in and out -->
      <div v-if="record.status !== 'skipped'" class="mb-4">
        <div v-if="hasMap" class="h-64" data-testid="drawer-map">
          <BaseMap :markers="markers" :circles="circles" />
        </div>
        <p v-else class="text-sm text-stone-500" data-testid="drawer-no-map">
          {{ noMapText }}
        </p>
      </div>

      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt class="text-stone-500">{{ t('visits.drawer.date') }}</dt>
        <dd>{{ dayjs(record.date).format('DD MMM YYYY') }}</dd>
        <dt class="text-stone-500">{{ t('visits.drawer.team') }}</dt>
        <dd>{{ detail.team?.name ?? '—' }}</dd>
        <dt class="text-stone-500">{{ t('visits.drawer.branch') }}</dt>
        <dd>{{ detail.branch.name }}</dd>
        <dt class="text-stone-500">{{ t('visits.drawer.mode') }}</dt>
        <dd>{{ t(`visits.mode.${record.mode}`) }}</dd>
        <dt class="text-stone-500">{{ t('visits.drawer.route') }}</dt>
        <dd>{{ record.routeCode ?? '—' }}</dd>
        <template v-if="record.status === 'skipped'">
          <dt class="text-stone-500">{{ t('visits.drawer.skippedAt') }}</dt>
          <dd>
            {{ formatDateTime(record.skippedAt) }}<template v-if="record.skippedAt"> WIB</template>
          </dd>
        </template>
        <template v-else>
          <dt class="text-stone-500">{{ t('visits.drawer.checkedInAt') }}</dt>
          <dd>
            {{ formatDateTime(record.checkedInAt)
            }}<template v-if="record.checkedInAt"> WIB</template>
          </dd>
          <template v-if="record.status === 'closed'">
            <dt class="text-stone-500">{{ t('visits.drawer.closedAt') }}</dt>
            <dd data-testid="drawer-closed-at">
              {{ formatDateTime(record.closedAt) }}<template v-if="record.closedAt"> WIB</template>
            </dd>
            <dt class="text-stone-500">{{ t('visits.drawer.closedBy') }}</dt>
            <dd>{{ detail.closedByName ?? '—' }}</dd>
            <dt class="text-stone-500">{{ t('visits.drawer.closeNote') }}</dt>
            <dd class="break-words whitespace-pre-wrap" data-testid="drawer-close-note">
              {{ record.closeNote ?? '—' }}
            </dd>
          </template>
          <template v-else>
            <dt class="text-stone-500">{{ t('visits.drawer.checkedOutAt') }}</dt>
            <dd>
              {{ formatDateTime(record.checkedOutAt)
              }}<template v-if="record.checkedOutAt"> WIB</template>
            </dd>
          </template>
          <dt class="text-stone-500">{{ t('visits.drawer.duration') }}</dt>
          <dd>
            {{
              detail.durationMin != null
                ? t('visits.drawer.durationMin', { n: detail.durationMin })
                : '—'
            }}
          </dd>
          <dt class="text-stone-500">{{ t('visits.drawer.distance') }}</dt>
          <dd>
            <template v-if="record.withinRadius == null && record.outletLatitude == null">
              {{ t('visits.radius.noPoint') }}
            </template>
            <template v-else>{{ distanceText(record.distanceM, record.radiusM) }}</template>
          </dd>
          <dt class="text-stone-500">{{ t('visits.drawer.accuracy') }}</dt>
          <dd>
            {{ record.checkInAccuracyM != null ? `${Math.round(record.checkInAccuracyM)} m` : '—' }}
          </dd>
          <dt class="text-stone-500">{{ t('visits.drawer.rule') }}</dt>
          <dd>{{ record.radiusRuleLevel ? t(`visits.level.${record.radiusRuleLevel}`) : '—' }}</dd>
        </template>
        <dt class="text-stone-500">{{ t('visits.drawer.reason') }}</dt>
        <dd>{{ reasonText }}</dd>
        <dt class="text-stone-500">{{ t('visits.drawer.note') }}</dt>
        <dd class="break-words whitespace-pre-wrap">{{ noteText }}</dd>
      </dl>

      <!-- Stock check -->
      <h3 class="mt-6 mb-2 font-semibold">{{ t('visits.drawer.stockCheck') }}</h3>
      <Message
        v-if="stockCheckMissing"
        severity="warn"
        class="mb-2"
        data-testid="drawer-stock-missing"
      >
        {{ t('visits.drawer.stockCheckMissing') }}
      </Message>
      <p
        v-if="!detail.stockCheck.length"
        class="text-sm text-stone-500"
        data-testid="drawer-no-stock"
      >
        {{ t('visits.drawer.noStockCheck') }}
      </p>
      <div
        v-for="group in detail.stockCheck"
        :key="group.surveyId"
        class="mb-4"
        data-testid="stock-group"
      >
        <p class="mb-1 text-sm font-medium">
          {{
            t('visits.drawer.survey', {
              code: group.surveyCode,
              name: group.surveyName,
              version: group.surveyVersion,
            })
          }}
        </p>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-stone-500">
              <th class="py-1 pr-2 font-normal">{{ t('visits.drawer.product') }}</th>
              <th class="py-1 pr-2 font-normal">{{ t('visits.drawer.available') }}</th>
              <th class="py-1 pr-2 text-right font-normal">{{ t('visits.drawer.storeQty') }}</th>
              <th class="py-1 text-right font-normal">{{ t('visits.drawer.displayQty') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in group.items" :key="item.productId" class="border-t border-stone-100">
              <td class="py-1 pr-2">
                <span class="block">{{ item.productName }}</span>
                <span class="text-xs text-stone-500">{{ item.productCode }}</span>
              </td>
              <td class="py-1 pr-2">
                <Tag
                  :severity="item.available ? 'success' : 'danger'"
                  :value="item.available ? t('visits.drawer.yes') : t('visits.drawer.no')"
                />
              </td>
              <td class="py-1 pr-2 text-right">{{ qtyText(item.storeQty) }}</td>
              <td class="py-1 text-right">{{ qtyText(item.displayQty) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <Dialog
      v-model:visible="closeDialogVisible"
      modal
      :header="t('visits.close.title')"
      :breakpoints="{ '640px': '90vw' }"
      class="w-[28rem]"
      data-testid="close-dialog"
    >
      <p v-if="detail" class="mb-3 text-sm">
        {{
          t('visits.close.message', {
            customer: detail.customer.name,
            salesman: detail.employee.name,
          })
        }}
      </p>
      <label for="close-note" class="mb-1 block text-sm font-medium">{{
        t('visits.close.note')
      }}</label>
      <Textarea
        id="close-note"
        v-model="closeNote"
        rows="3"
        maxlength="500"
        class="w-full"
        :placeholder="t('visits.close.notePlaceholder')"
        :invalid="closeNoteError"
        data-testid="close-note"
      />
      <small v-if="closeNoteError" class="text-red-600">{{ t('visits.close.noteRequired') }}</small>
      <template #footer>
        <Button
          :label="t('common.actions.cancel')"
          severity="secondary"
          text
          :disabled="isClosing"
          @click="closeDialogVisible = false"
        />
        <Button
          :label="t('visits.close.confirm')"
          severity="warn"
          :loading="isClosing"
          data-testid="close-confirm"
          @click="submitClose"
        />
      </template>
    </Dialog>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import Image from 'primevue/image'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import BaseMap, { type MapMarker } from '@/components/map/BaseMap.vue'
import type { MapCircle } from '@/components/map/mapGeometry'
import { VisitService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthStore } from '@/stores'
import { buildFileUrl } from '@/utils/fileUrl'
import type { VisitDetail } from '@/types/visit.type'
import { distanceText, formatDateTime, qtyText, statusSeverity } from '../visitHelpers'

const props = defineProps<{ visitId: number; toastGroup: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { t } = useI18n()
const toast = useToast()

const isLoading = ref(true)
const detail = ref<VisitDetail>()

const record = computed(() => detail.value!.visit)

function point(lat?: number | null, lng?: number | null) {
  return lat != null && lng != null ? { lat, lng } : undefined
}

const outlet = computed(() => point(record.value?.outletLatitude, record.value?.outletLongitude))
const checkIn = computed(() => point(record.value?.checkInLatitude, record.value?.checkInLongitude))
const checkOut = computed(() =>
  point(record.value?.checkOutLatitude, record.value?.checkOutLongitude),
)

const hasMap = computed(() => !!outlet.value || !!checkIn.value || !!checkOut.value)

const markers = computed<MapMarker[]>(() => {
  const list: MapMarker[] = []
  if (outlet.value) {
    list.push({ id: 1, ...outlet.value, variant: 'muted', popup: t('visits.drawer.outletPoint') })
  }
  if (checkIn.value) {
    list.push({
      id: 2,
      ...checkIn.value,
      variant: record.value.withinRadius === false ? 'pin' : 'primary',
      popup: t('visits.drawer.checkInPoint'),
    })
  }
  if (checkOut.value) {
    list.push({
      id: 3,
      ...checkOut.value,
      variant: 'muted',
      popup: t('visits.drawer.checkOutPoint'),
    })
  }
  return list
})

const circles = computed<MapCircle[]>(() =>
  outlet.value && record.value.radiusM
    ? [{ id: 1, ...outlet.value, radiusM: record.value.radiusM }]
    : [],
)

/** Says what is missing: no point on the customer, or no fix from the phone. */
const noMapText = computed(() => t('visits.drawer.noLocation'))

const reasonText = computed(() => {
  const r =
    record.value.status === 'skipped' ? detail.value?.skipReason : detail.value?.outsideReason
  return r ? `${r.code} · ${r.name}` : '—'
})

const noteText = computed(
  () =>
    (record.value.status === 'skipped' ? record.value.skipNote : record.value.outsideNote) || '—',
)

/** The stock check is flagged when the rule required it and nothing was saved. */
const stockCheckMissing = computed(
  () =>
    record.value.stockCheckLevel === 'required' &&
    record.value.status !== 'skipped' &&
    !detail.value?.stockCheck.length,
)

async function load() {
  detail.value = await VisitService.get(props.visitId)
}

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
    emit('close')
  } finally {
    isLoading.value = false
  }
})

// ---------------------------------------------------------------------------
// Closing a visit left open on an earlier day
// ---------------------------------------------------------------------------

const authStore = useAuthStore()
const canClose = computed(() => authStore.hasPermission(PERMISSIONS.VISIT_CLOSE))
const closeDialogVisible = ref(false)
const closeNote = ref('')
const closeNoteError = ref(false)
const isClosing = ref(false)

function openClose() {
  closeNote.value = ''
  closeNoteError.value = false
  closeDialogVisible.value = true
}

async function submitClose() {
  const note = closeNote.value.trim()
  closeNoteError.value = !note
  if (!note) return
  isClosing.value = true
  try {
    await VisitService.close(props.visitId, note)
    closeDialogVisible.value = false
    toast.add(commonSuccessToast(t('visits.close.success'), props.toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isClosing.value = false
  }
  // Show the visit as it now stands, also after a conflict (the phone may have
  // checked it out meanwhile).
  try {
    await load()
  } catch {
    // The row stays as it was; the toast already reported the failure.
  }
}
</script>
