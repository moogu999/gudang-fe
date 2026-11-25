<template>
  <div class="flex flex-col gap-4">
    <!-- Categories -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('surveys.grid.categories') }}</label>
      <MultiSelect
        :model-value="grid.categories.map((c) => c.id)"
        :options="categoryOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('surveys.grid.selectCategories')"
        :disabled="disabled"
        display="chip"
        filter
        class="w-full"
        data-testid="grid-categories"
        @update:model-value="onCategories"
      />
    </div>

    <!-- What is asked -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-semibold">{{ t('surveys.grid.asked') }}</label>
      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <div v-for="flag in askFlags" :key="flag" class="flex items-center gap-2">
          <Checkbox
            :model-value="grid[flag]"
            binary
            :disabled="disabled"
            :input-id="`${question.clientKey}-${flag}`"
            :data-testid="`grid-${flag}`"
            @update:model-value="(v: boolean) => setFlag(flag, v)"
          />
          <label :for="`${question.clientKey}-${flag}`" class="text-sm">{{
            t(`surveys.grid.${flag}`)
          }}</label>
        </div>
      </div>
      <small v-if="askError" class="text-red-500">{{ t('surveys.validation.gridAsk') }}</small>
    </div>

    <div class="flex items-center gap-2">
      <ToggleSwitch
        :model-value="grid.allowUnlisted"
        :disabled="disabled"
        :input-id="`${question.clientKey}-unlisted`"
        @update:model-value="(v: boolean) => setFlag('allowUnlisted', v)"
      />
      <label :for="`${question.clientKey}-unlisted`" class="text-sm">{{
        t('surveys.grid.allowUnlisted')
      }}</label>
    </div>
    <small class="text-surface-500 -mt-3">{{ t('surveys.grid.allowUnlistedHint') }}</small>

    <!-- Product list: live while a draft, the snapshot once published -->
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <label class="text-sm font-semibold">{{ t('surveys.grid.products') }}</label>
        <span class="text-sm text-stone-500" data-testid="grid-counter">
          <template v-if="frozen">{{
            t('surveys.grid.frozenCount', { n: frozen.length }, frozen.length)
          }}</template>
          <template v-else>{{
            t('surveys.grid.liveCount', { included: includedCount, total: live.length })
          }}</template>
        </span>
      </div>

      <DataTable :value="rows" data-key="competitorProductId" :loading="loading" class="text-sm">
        <Column field="name" :header="t('surveys.grid.columns.product')" />
        <Column field="brandName" :header="t('surveys.grid.columns.brand')" />
        <Column :header="t('surveys.grid.columns.comparison')">
          <template #body="{ data }">{{ data.comparisonProduct?.name ?? '—' }}</template>
        </Column>
        <Column :header="t('surveys.grid.columns.comparisonPrice')" class="text-right">
          <template #body="{ data }">{{
            data.comparisonPrice !== undefined
              ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(
                  Number(data.comparisonPrice),
                )
              : '—'
          }}</template>
        </Column>
        <Column v-if="!frozen" :header="t('surveys.grid.columns.include')" style="width: 7rem">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="!isExcluded(data.competitorProductId)"
              :disabled="disabled"
              data-testid="grid-include"
              @update:model-value="(v: boolean) => setIncluded(data, v)"
            />
          </template>
        </Column>
        <template #empty>
          <div class="py-4 text-center text-stone-500">
            {{
              grid.categories.length ? t('surveys.grid.empty') : t('surveys.grid.pickCategories')
            }}
          </div>
        </template>
      </DataTable>
      <Message
        v-if="!frozen && grid.categories.length > 0 && !loading && live.length === 0"
        severity="warn"
        size="small"
        variant="simple"
        data-testid="grid-empty-warning"
      >
        {{ t('surveys.grid.emptyWarning') }}
      </Message>
      <small class="text-surface-500">{{ t('surveys.grid.frozenNote') }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import MultiSelect from 'primevue/multiselect'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import { SurveysService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { SurveyGridConfig, SurveyGridProduct, SurveyQuestion } from '@/types/survey.type'
import { NO_LABEL, loadLabelFilterOptions } from '../../../sales-teams/salesTeamHelpers'
import { newGridConfig } from '../../surveyHelpers'

type AskFlag = 'askAvailability' | 'askPrice' | 'askPhoto' | 'askOurStorePrice'
const askFlags: AskFlag[] = ['askAvailability', 'askPrice', 'askPhoto', 'askOurStorePrice']

const props = defineProps<{
  /** Questions, categories and exclusions can't change (read-only or already published). */
  disabled?: boolean
  /** The viewer can't write, so the live preview endpoint is off limits. */
  readonly?: boolean
  toastGroup: string
}>()

const question = defineModel<SurveyQuestion>('question', { required: true })

/** Products the survey would ask about, for the phone preview and the publish check. */
const emit = defineEmits<{ loaded: [products: SurveyGridProduct[]] }>()

const { t } = useI18n()
const toast = useToast()

const grid = computed<SurveyGridConfig>(() => question.value.grid ?? newGridConfig())
const frozen = computed(() => grid.value.frozen)
const askError = computed(
  () => !grid.value.askAvailability && !grid.value.askPrice && !grid.value.askPhoto,
)

const categoryOptions = ref<{ label: string; value: number }[]>([])
const live = ref<SurveyGridProduct[]>([])
const loading = ref(false)

const excludedIds = computed(() => new Set(grid.value.excluded.map((e) => e.id)))
function isExcluded(id: number): boolean {
  return excludedIds.value.has(id)
}

const rows = computed(() => frozen.value ?? live.value)
const includedCount = computed(
  () => live.value.filter((p) => !isExcluded(p.competitorProductId)).length,
)

function update(patch: Partial<SurveyGridConfig>) {
  question.value = { ...question.value, grid: { ...grid.value, ...patch } }
}

function setFlag(flag: AskFlag | 'allowUnlisted', value: boolean) {
  update({ [flag]: value })
}

function onCategories(ids: number[]) {
  const known = new Map([
    ...grid.value.categories.map((c) => [c.id, c.name] as const),
    ...categoryOptions.value.map((o) => [o.value, o.label] as const),
  ])
  update({ categories: ids.map((id) => ({ id, name: known.get(id) ?? String(id) })) })
}

function setIncluded(product: SurveyGridProduct, included: boolean) {
  const without = grid.value.excluded.filter((e) => e.id !== product.competitorProductId)
  update({
    excluded: included
      ? without
      : [...without, { id: product.competitorProductId, name: product.name }],
  })
}

// Latest request wins: the categories can change while an earlier answer is in flight.
let loadSeq = 0
async function loadLive() {
  const seq = ++loadSeq
  const ids = grid.value.categories.map((c) => c.id)
  if (frozen.value || props.readonly || ids.length === 0) {
    live.value = []
    return
  }
  loading.value = true
  try {
    const products = await SurveysService.competitorGridPreview(ids)
    if (seq === loadSeq) live.value = products
  } catch (e) {
    if (seq === loadSeq) {
      live.value = []
      toast.add(commonErrorToast(e, props.toastGroup))
    }
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

const included = computed(() =>
  frozen.value ? frozen.value : live.value.filter((p) => !isExcluded(p.competitorProductId)),
)

// Reported once the list is known, so a grid still loading never reads as empty.
watch(
  [included, loading],
  () => {
    if (loading.value) return
    if (props.readonly && !frozen.value) return
    emit('loaded', included.value)
  },
  { immediate: true },
)

watch(() => grid.value.categories.map((c) => c.id).join(','), loadLive)

onMounted(async () => {
  loadLive()
  try {
    const options = await loadLabelFilterOptions('category', '')
    categoryOptions.value = options
      .filter((o) => o.value !== NO_LABEL)
      .map((o) => ({ label: o.label, value: o.value as number }))
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
})
</script>
