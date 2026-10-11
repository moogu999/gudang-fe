<template>
  <div>
    <div class="my-4 flex flex-col gap-2 md:flex-row">
      <InputText
        v-model="search"
        :placeholder="t('competitorProducts.recommendations.search')"
        class="w-full md:w-72"
        @keydown.enter="load(0)"
      />
      <Select
        v-model="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        class="w-full md:w-48"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
    </div>
    <p v-else-if="!items.length" class="text-surface-500 py-10 text-center">
      {{ t('competitorProducts.recommendations.empty') }}
    </p>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="rec in items"
        :key="rec.id"
        class="flex flex-col gap-3 rounded-lg border border-stone-200 p-3 md:flex-row"
        data-testid="recommendation"
      >
        <!-- Photos -->
        <div class="flex shrink-0 gap-1">
          <button
            v-for="photo in rec.photos ?? []"
            :key="photo.id"
            type="button"
            class="h-16 w-16 overflow-hidden rounded bg-stone-100"
            @click="zoomSrc = buildFileUrl(photo.url)"
          >
            <img :src="buildFileUrl(photo.url)" class="h-full w-full object-cover" alt="" />
          </button>
          <div
            v-if="!rec.photos?.length"
            class="flex h-16 w-16 items-center justify-center rounded bg-stone-100"
          >
            <i class="pi pi-image text-stone-400" />
          </div>
        </div>

        <!-- Details -->
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <span class="font-semibold">"{{ rec.name }}"</span>
            <Tag
              v-if="rec.status !== 'pending'"
              :value="t(`competitorProducts.recommendations.status.${rec.status}`)"
              :severity="statusSeverity(rec.status)"
            />
          </div>
          <dl class="text-sm text-stone-600">
            <div>
              {{ t('competitorProducts.recommendations.submittedBy') }}: {{ rec.submitter.name }} ·
              {{ dayjs(rec.createdAt).format(DateFormat.DATE_TIME) }}
            </div>
            <div v-if="rec.customer">
              {{ t('competitorProducts.recommendations.customer') }}: {{ rec.customer.name }}
            </div>
            <div v-if="rec.observedPrice !== undefined">
              {{ t('competitorProducts.recommendations.observedPrice') }}: Rp
              {{ formatPrice(rec.observedPrice) }}
              <template v-if="rec.observedUom"> / {{ rec.observedUom.name }}</template>
            </div>
            <div v-if="rec.notes">
              {{ t('competitorProducts.recommendations.notes') }}: {{ rec.notes }}
            </div>
          </dl>

          <!-- Pending: what it may be -->
          <template v-if="rec.status === 'pending'">
            <div
              v-if="rec.suggestions?.length"
              class="bg-primary-50 mt-2 rounded p-2 text-sm"
              data-testid="suggestion"
            >
              <div>
                {{ t('competitorProducts.recommendations.similar') }}:
                <b>{{ selectedSuggestion(rec).name }}</b> ({{ selectedSuggestion(rec).code }}) ·
                {{
                  t('competitorProducts.recommendations.similarScore', {
                    score: Math.round(selectedSuggestion(rec).score * 100),
                  })
                }}
                <template v-if="rec.siblingIds?.length">
                  ·
                  {{
                    t('competitorProducts.recommendations.siblings', { n: rec.siblingIds.length })
                  }}
                </template>
              </div>
              <div
                v-for="s in rec.suggestions.filter(
                  (x) => x.competitorProductId !== selectedSuggestion(rec).competitorProductId,
                )"
                :key="s.competitorProductId"
                class="mt-1 text-xs"
              >
                <a
                  class="text-primary-600 cursor-pointer hover:underline"
                  @click.prevent="chosen[rec.id] = s.competitorProductId"
                  >{{ s.name }} ({{ s.code }})</a
                >
                · {{ Math.round(s.score * 100) }}%
              </div>
            </div>
            <p v-else-if="rec.similarPending?.length" class="mt-2 text-sm text-stone-600">
              {{
                t('competitorProducts.recommendations.similarPending', {
                  names: rec.similarPending.map((s) => s.name).join(', '),
                })
              }}
            </p>
            <p v-else class="mt-2 text-sm text-stone-400">
              {{ t('competitorProducts.recommendations.noSimilar') }}
            </p>
          </template>

          <!-- Resolved: where it went -->
          <div v-else class="mt-2 text-sm text-stone-600">
            <RouterLink
              v-if="rec.competitorProduct"
              :to="`/competitor-products/${rec.competitorProduct.id}/edit`"
              class="text-primary-600 hover:underline"
              >→ {{ rec.competitorProduct.code }} {{ rec.competitorProduct.name }}</RouterLink
            >
            <div v-if="rec.rejectReason">
              {{ t('competitorProducts.recommendations.reasonLine', { reason: rec.rejectReason }) }}
            </div>
            <div v-if="rec.resolvedByName && rec.resolvedAt">
              {{
                t('competitorProducts.recommendations.resolvedBy', {
                  name: rec.resolvedByName,
                  date: dayjs(rec.resolvedAt).format(DateFormat.DATE_TIME),
                })
              }}
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          v-if="canWrite && rec.status === 'pending'"
          class="flex shrink-0 flex-col gap-2 md:w-52"
          data-testid="actions"
        >
          <Button
            v-if="rec.suggestions?.length"
            :label="
              t('competitorProducts.recommendations.mergeInto', {
                code: selectedSuggestion(rec).code,
              })
            "
            size="small"
            @click="openMerge(rec, selectedSuggestion(rec).competitorProductId)"
          />
          <Button
            :label="t('competitorProducts.recommendations.mergeIntoEllipsis')"
            severity="secondary"
            size="small"
            @click="openMerge(rec)"
          />
          <Button
            :label="t('competitorProducts.recommendations.createNew')"
            :severity="rec.suggestions?.length ? 'secondary' : 'primary'"
            size="small"
            @click="router.push(`/competitor-products/create?recommendationId=${rec.id}`)"
          />
          <Button
            :label="t('competitorProducts.recommendations.reject')"
            severity="danger"
            outlined
            size="small"
            @click="openReject(rec)"
          />
          <small class="text-surface-500">{{ t('competitorProducts.recommendations.help') }}</small>
        </div>
      </div>
    </div>

    <Paginator
      v-if="total > pageSize"
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      class="mt-3"
      @page="onPage"
    />

    <MergeRecommendationDialog
      v-if="mergeTarget"
      :recommendation="mergeTarget.rec"
      :preset-target-id="mergeTarget.presetId"
      :toast-group="toastGroup"
      @close="mergeTarget = undefined"
      @merged="afterChange"
      @already-resolved="afterChange"
    />

    <Dialog
      v-model:visible="isRejectShown"
      :header="t('competitorProducts.recommendations.rejectTitle')"
      modal
      :style="{ width: '30rem', maxWidth: '95vw' }"
    >
      <label for="rejectReason" class="mb-1 block text-sm font-semibold">{{
        t('competitorProducts.recommendations.rejectReason')
      }}</label>
      <Textarea id="rejectReason" v-model="rejectReason" maxlength="255" rows="3" class="w-full" />
      <template #footer>
        <Button
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isRejecting"
          @click="isRejectShown = false"
        />
        <Button
          :label="t('competitorProducts.recommendations.reject')"
          severity="danger"
          :icon="isRejecting ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isRejecting"
          data-testid="reject-confirm"
          @click="confirmReject"
        />
      </template>
    </Dialog>

    <Dialog :visible="!!zoomSrc" modal :style="{ maxWidth: '90vw' }" @update:visible="zoomSrc = ''">
      <img :src="zoomSrc" class="max-h-[75vh] max-w-full rounded object-contain" alt="" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Paginator, { type PageState } from 'primevue/paginator'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { CompetitorProductRecommendationsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DateFormat from '@/constants/dateFormat'
import type { CompetitorProductRecommendation, RecommendationStatus } from '@/types'
import { buildFileUrl } from '@/utils/fileUrl'
import { competitorProductErrorCode, competitorProductErrorKey } from '../competitorProductErrors'
import MergeRecommendationDialog from './MergeRecommendationDialog.vue'

const props = defineProps<{ canWrite: boolean; toastGroup: string }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

type StatusFilter = RecommendationStatus | 'all'

const pageSize = 20
const status = ref<StatusFilter>('pending')
const search = ref('')
const items = ref<CompetitorProductRecommendation[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const zoomSrc = ref('')
// Which suggestion a card acts on, when the user picked one other than the best.
const chosen = reactive<Record<number, number>>({})

const statusOptions = computed(() =>
  (['pending', 'created', 'merged', 'rejected', 'all'] as StatusFilter[]).map((value) => ({
    value,
    label: t(`competitorProducts.recommendations.status.${value}`),
  })),
)

function statusSeverity(s: RecommendationStatus) {
  return s === 'rejected' ? 'danger' : s === 'pending' ? 'warn' : 'success'
}

function formatPrice(value: string): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value))
}

function selectedSuggestion(rec: CompetitorProductRecommendation) {
  const list = rec.suggestions ?? []
  return list.find((s) => s.competitorProductId === chosen[rec.id]) ?? list[0]
}

async function load(p = page.value) {
  loading.value = true
  page.value = p
  try {
    const res = await CompetitorProductRecommendationsService.list({
      status: status.value === 'all' ? undefined : status.value,
      search: search.value.trim() || undefined,
      limit: pageSize,
      offset: p * pageSize,
    })
    items.value = res.data ?? []
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

function onPage(e: PageState) {
  load(e.page)
}

async function afterChange() {
  await load()
  emit('changed')
}

watch(status, () => load(0))
onMounted(() => load(0))

// Merge
const mergeTarget = ref<{ rec: CompetitorProductRecommendation; presetId?: number } | undefined>()

function openMerge(rec: CompetitorProductRecommendation, presetId?: number) {
  mergeTarget.value = { rec, presetId }
}

// Reject
const isRejectShown = ref(false)
const rejectReason = ref('')
const isRejecting = ref(false)
let rejecting: CompetitorProductRecommendation | undefined

function openReject(rec: CompetitorProductRecommendation) {
  rejecting = rec
  rejectReason.value = ''
  isRejectShown.value = true
}

async function confirmReject() {
  if (!rejecting) return
  isRejecting.value = true
  try {
    await CompetitorProductRecommendationsService.reject(
      rejecting.id,
      rejectReason.value.trim() || undefined,
    )
    toast.add(
      commonSuccessToast(t('competitorProducts.recommendations.rejected'), props.toastGroup),
    )
    isRejectShown.value = false
    await afterChange()
  } catch (e) {
    const key = competitorProductErrorKey(e)
    toast.add(commonErrorToast(key ? t(key) : e, props.toastGroup))
    if (competitorProductErrorCode(e) === 'recommendation_not_pending') {
      isRejectShown.value = false
      await afterChange()
    }
  } finally {
    isRejecting.value = false
  }
}
</script>
