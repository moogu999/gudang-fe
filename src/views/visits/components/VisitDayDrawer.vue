<template>
  <Drawer
    :visible="true"
    position="right"
    class="!w-full md:!w-[36rem]"
    :header="t('visits.days.drawer.title')"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div v-if="isLoading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <template v-else-if="detail">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="font-semibold">{{ detail.day.employee.name }}</span>
        <span v-if="detail.day.employee.nip" class="text-sm text-stone-500">{{
          detail.day.employee.nip
        }}</span>
        <Tag
          :severity="dayStatusSeverity(detail.day.status)"
          :value="t(`visits.days.status.${detail.day.status}`)"
          data-testid="day-status"
        />
      </div>

      <Message v-if="detail.day.hasActiveVisit" severity="warn" class="mb-4">
        {{ t('visits.days.activeVisit') }}
      </Message>

      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt class="text-stone-500">{{ t('visits.drawer.date') }}</dt>
        <dd>{{ dayjs(detail.day.date).format('DD MMM YYYY') }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.drawer.branch') }}</dt>
        <dd>{{ detail.day.branch.name }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.drawer.team') }}</dt>
        <dd>{{ detail.day.team?.name ?? '—' }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.columns.planned') }}</dt>
        <dd>{{ detail.day.counts.planned }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.columns.completed') }}</dt>
        <dd>{{ detail.day.counts.completed }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.columns.skipped') }}</dt>
        <dd>
          {{ detail.day.counts.skipped
          }}<template v-if="detail.day.counts.skippedAtClose">
            ({{
              t('visits.days.skippedAtClose', { n: detail.day.counts.skippedAtClose })
            }})</template
          >
        </dd>
        <dt class="text-stone-500">{{ t('visits.days.columns.notVisited') }}</dt>
        <dd>{{ detail.day.counts.notVisited }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.drawer.closedVisits') }}</dt>
        <dd>{{ detail.day.counts.closedVisits }}</dd>
        <dt class="text-stone-500">{{ t('visits.days.columns.timeline') }}</dt>
        <dd>
          {{ checkInOutText(detail.day.counts.firstCheckInAt, detail.day.counts.lastCheckOutAt) }}
        </dd>
        <template v-if="detail.day.status !== 'open'">
          <dt class="text-stone-500">{{ t('visits.days.columns.closedAt') }}</dt>
          <dd>{{ formatDateTime(detail.day.closedAt) }}</dd>
          <dt class="text-stone-500">{{ t('visits.days.drawer.source') }}</dt>
          <dd data-testid="day-source">
            {{
              detail.day.source === 'supervisor'
                ? t('visits.days.drawer.sourceSupervisor')
                : t('visits.days.drawer.sourceSalesman')
            }}<template v-if="detail.day.closedByName"> · {{ detail.day.closedByName }}</template>
          </dd>
          <template v-if="detail.day.note">
            <dt class="text-stone-500">{{ t('visits.days.drawer.note') }}</dt>
            <dd class="break-words whitespace-pre-wrap" data-testid="day-note">
              {{ detail.day.note }}
            </dd>
          </template>
        </template>
      </dl>

      <Button
        v-if="showClose"
        :label="t('visits.days.close.action')"
        icon="pi pi-lock"
        severity="warn"
        class="mt-4"
        data-testid="close-day"
        @click="openClose"
      />

      <h3 class="mt-6 mb-2 font-semibold">{{ t('visits.days.drawer.outlets') }}</h3>
      <p v-if="!detail.outlets.length" class="text-sm text-stone-500">
        {{ t('visits.days.drawer.noOutlets') }}
      </p>
      <ul v-else class="divide-y divide-stone-100 text-sm">
        <li
          v-for="o in detail.outlets"
          :key="o.customer.id"
          class="flex items-start gap-3 py-2"
          data-testid="day-outlet"
        >
          <span class="w-6 text-stone-500">{{ o.sequence }}</span>
          <div class="flex flex-1 flex-col">
            <span class="font-medium">{{ o.customer.name }}</span>
            <span class="text-xs text-stone-500">{{ o.customer.code }}</span>
            <span v-if="o.skipReason" class="text-xs text-stone-500">{{ o.skipReason }}</span>
          </div>
          <div class="flex flex-col items-end gap-1">
            <Tag :severity="statusSeverity(o.status)" :value="t(`visits.status.${o.status}`)" />
            <Tag
              v-if="o.skipSource === 'close_day'"
              severity="secondary"
              :value="t('visits.skipSource.close_day')"
              data-testid="outlet-close-day-tag"
            />
          </div>
          <Button
            v-if="o.visitId"
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            :aria-label="t('visits.days.drawer.viewVisit')"
            data-testid="outlet-view-visit"
            @click="emit('openVisit', o.visitId)"
          />
        </li>
      </ul>
    </template>

    <Dialog
      v-model:visible="closeDialogVisible"
      modal
      :header="t('visits.days.close.title')"
      :breakpoints="{ '640px': '90vw' }"
      class="w-[28rem]"
      data-testid="close-day-dialog"
    >
      <p v-if="detail" class="mb-3 text-sm">
        {{
          t('visits.days.close.message', {
            date: dayjs(detail.day.date).format('DD MMM YYYY'),
            salesman: detail.day.employee.name,
          })
        }}
      </p>
      <Message v-if="detail?.day.hasActiveVisit" severity="warn" class="mb-3">
        {{ t('visits.days.close.activeWarning') }}
      </Message>
      <label for="close-day-note" class="mb-1 block text-sm font-medium">{{
        t('visits.days.close.note')
      }}</label>
      <Textarea
        id="close-day-note"
        v-model="closeNote"
        rows="3"
        maxlength="500"
        class="w-full"
        :placeholder="t('visits.days.close.notePlaceholder')"
        :invalid="closeNoteError"
        data-testid="close-day-note"
      />
      <small v-if="closeNoteError" class="text-red-600">{{
        t('visits.days.close.noteRequired')
      }}</small>
      <template #footer>
        <Button
          :label="t('common.actions.cancel')"
          severity="secondary"
          text
          :disabled="isClosing"
          @click="closeDialogVisible = false"
        />
        <Button
          :label="t('visits.days.close.confirm')"
          severity="warn"
          :loading="isClosing"
          data-testid="close-day-confirm"
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
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { VisitService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthStore } from '@/stores'
import type { VisitDayDetail } from '@/types/visit.type'
import {
  canCloseDay,
  checkInOutText,
  dayStatusSeverity,
  formatDateTime,
  statusSeverity,
} from '../visitHelpers'

const props = defineProps<{ employeeId: number; date: string; toastGroup: string }>()
const emit = defineEmits<{ close: []; changed: []; openVisit: [id: number] }>()

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()

const isLoading = ref(true)
const detail = ref<VisitDayDetail>()

const showClose = computed(
  () =>
    !!detail.value &&
    canCloseDay(detail.value.day, authStore.hasPermission(PERMISSIONS.VISIT_CLOSE)),
)

async function load() {
  detail.value = await VisitService.getDay(props.employeeId, props.date)
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
    await VisitService.closeDay({ employeeId: props.employeeId, date: props.date, note })
    closeDialogVisible.value = false
    toast.add(commonSuccessToast(t('visits.days.close.success'), props.toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isClosing.value = false
  }
  try {
    await load()
  } catch {
    // The drawer keeps what it showed; the toast already reported the failure.
  }
}
</script>
