<template>
  <div class="rounded-lg border border-stone-200 p-4">
    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('bankSettlements.sections.summary') }}
    </h4>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="flex flex-col gap-1 rounded-md bg-stone-50 p-3">
        <span class="text-xs text-stone-500">{{ t('bankSettlements.summary.total') }}</span>
        <span class="text-lg font-semibold" data-testid="total">{{
          formatNumber(totalValue)
        }}</span>
      </div>

      <div class="flex flex-col gap-1 rounded-md bg-green-50 p-3">
        <span class="text-xs text-stone-500">{{ t('bankSettlements.summary.tagged') }}</span>
        <span class="text-lg font-semibold text-green-700" data-testid="tagged">{{
          formatNumber(taggedValue)
        }}</span>
      </div>

      <div
        class="flex flex-col gap-1 rounded-md p-3"
        :class="untaggedValue === 0 ? 'bg-stone-50' : 'bg-amber-50'"
      >
        <span class="text-xs text-stone-500">{{ t('bankSettlements.summary.untagged') }}</span>
        <span
          class="text-lg font-semibold"
          :class="untaggedValue === 0 ? 'text-stone-700' : 'text-amber-600'"
          data-testid="untagged"
          >{{ formatNumber(untaggedValue) }}</span
        >
      </div>
    </div>

    <Message v-if="!readonly" severity="info" variant="simple" size="small" class="mt-3">
      {{ t('bankSettlements.labels.splitHint') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Message from 'primevue/message'
import { round2 } from '../bankSettlementLines'

const { t } = useI18n()

interface Props {
  /** Live figures from the rows being edited. Ignored in readonly mode. */
  total: number
  tagged: number
  untagged: number
  /** Detail mode: render the server's saved figures verbatim, never a recomputation. */
  readonly?: boolean
  savedTotal?: number
  savedTagged?: number
  savedUntagged?: number
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  savedTotal: undefined,
  savedTagged: undefined,
  savedUntagged: undefined,
})

const useSaved = computed(() => props.readonly && props.savedTotal !== undefined)

const totalValue = computed(() => round2(useSaved.value ? (props.savedTotal ?? 0) : props.total))
const taggedValue = computed(() => round2(useSaved.value ? (props.savedTagged ?? 0) : props.tagged))
const untaggedValue = computed(() =>
  round2(useSaved.value ? (props.savedUntagged ?? 0) : props.untagged),
)

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
