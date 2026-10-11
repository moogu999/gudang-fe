<template>
  <Dialog
    :visible="true"
    :header="t('competitorProducts.recommendations.mergeTitle')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '40vw' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm">
        <span class="font-semibold">"{{ recommendation.name }}"</span>
      </p>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{
          t('competitorProducts.recommendations.mergeTarget')
        }}</label>
        <InfiniteSelect
          v-model="targetId"
          :fetch-fn="(q: string) => CompetitorProductsService.listForSelect(q)"
          :custom-filters="activeFilter"
          :option-label="optionLabel"
          option-value="id"
          :initial-option="initialTarget"
          :placeholder="t('competitorProducts.recommendations.selectTarget')"
          class="w-full"
          data-testid="merge-target"
        />
        <small v-if="targetError" class="text-red-500">{{ targetError }}</small>
      </div>

      <div v-if="showSiblings" class="flex items-center gap-2">
        <Checkbox
          v-model="includeSiblings"
          input-id="siblings"
          binary
          data-testid="include-siblings"
        />
        <label for="siblings" class="text-sm">{{
          t('competitorProducts.recommendations.alsoMergeSiblings', { n: siblingIds.length })
        }}</label>
      </div>
    </div>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isLoading"
        @click="emit('close')"
      />
      <Button
        :label="t('common.actions.confirm')"
        :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
        :disabled="!targetId || isLoading"
        data-testid="merge-confirm"
        @click="confirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CompetitorProductRecommendationsService, CompetitorProductsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import FilterOperator from '@/constants/filterOperator'
import type { CompetitorProductListItem, CompetitorProductRecommendation } from '@/types'
import { competitorProductErrorCode, competitorProductErrorKey } from '../competitorProductErrors'

const props = defineProps<{
  recommendation: CompetitorProductRecommendation
  /** The master product to start on, e.g. the best suggestion. */
  presetTargetId?: number
  toastGroup: string
}>()

const emit = defineEmits<{ close: []; merged: []; 'already-resolved': [] }>()

const { t } = useI18n()
const toast = useToast()

const activeFilter = [
  { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

type Option = Pick<CompetitorProductListItem, 'id' | 'code' | 'name'> & {
  brand?: { name: string }
  brandName?: string
}

const suggestion = props.recommendation.suggestions?.find(
  (s) => s.competitorProductId === props.presetTargetId,
)
const initialTarget: Option | undefined = suggestion
  ? {
      id: suggestion.competitorProductId,
      code: suggestion.code,
      name: suggestion.name,
      brandName: suggestion.brandName,
    }
  : undefined

const targetId = ref<number | undefined>(props.presetTargetId)
const targetError = ref('')
const isLoading = ref(false)

function optionLabel(o: Option): string {
  const brand = o.brand?.name ?? o.brandName
  return [o.code, o.name, brand].filter(Boolean).join(' · ')
}

// Siblings point at the best suggestion, so they only join a merge into it.
const siblingIds = computed(() => props.recommendation.siblingIds ?? [])
const bestSuggestionId = computed(() => props.recommendation.suggestions?.[0]?.competitorProductId)
const showSiblings = computed(
  () =>
    siblingIds.value.length > 0 && !!targetId.value && targetId.value === bestSuggestionId.value,
)
const includeSiblings = ref(true)

async function confirm() {
  if (!targetId.value) return
  targetError.value = ''
  isLoading.value = true
  const ids = [
    props.recommendation.id,
    ...(showSiblings.value && includeSiblings.value ? siblingIds.value : []),
  ]
  try {
    const res = await CompetitorProductRecommendationsService.merge(targetId.value, ids)
    const code = res.data[0]?.competitorProduct?.code ?? ''
    toast.add(
      commonSuccessToast(
        t('competitorProducts.recommendations.merged', { n: res.data.length || ids.length, code }),
        props.toastGroup,
      ),
    )
    emit('merged')
    emit('close')
  } catch (e) {
    const key = competitorProductErrorKey(e)
    const message = key ? t(key) : undefined
    switch (competitorProductErrorCode(e)) {
      case 'competitor_product_inactive':
        targetError.value = message!
        break
      case 'recommendation_not_pending':
        toast.add(commonErrorToast(message!, props.toastGroup))
        emit('already-resolved')
        emit('close')
        break
      default:
        toast.add(commonErrorToast(message ?? e, props.toastGroup))
    }
  } finally {
    isLoading.value = false
  }
}
</script>
