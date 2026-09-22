<template>
  <div class="rounded-lg border border-stone-200 p-4">
    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('cashDeposits.summary.title') }}
    </h4>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-stone-500">{{ t('cashDeposits.summary.recorded') }}</span>
        <span class="text-lg font-semibold" data-testid="recorded">{{
          formatNumber(recordedValue)
        }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-stone-500">{{ t('cashDeposits.summary.actual') }}</span>
        <InputNumber
          v-if="!readonly"
          :model-value="actual"
          :locale="locale"
          :min="0"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          input-class="w-full min-w-0 text-right"
          class="w-full min-w-0"
          data-testid="actual-input"
          @update:model-value="(v: number | null) => emit('update:actual', v)"
        />
        <span v-else class="text-lg font-semibold" data-testid="actual">{{
          formatNumber(actualValue)
        }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-stone-500">{{ t('cashDeposits.summary.variance') }}</span>
        <span
          class="text-lg font-semibold"
          :class="variance === 0 ? 'text-green-700' : 'text-amber-600'"
          data-testid="variance"
        >
          {{ formatNumber(variance) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import { round2 } from '../cashDepositLines'

const { t, locale } = useI18n()

interface Props {
  /** Live Σ of ticked manifest amounts + ad-hoc amounts. Ignored in readonly mode. */
  recorded: number
  actual: number | null
  /** Detail mode: render the server's saved figures verbatim, never a recomputation. */
  readonly?: boolean
  savedRecorded?: number
  savedActual?: number
  savedVariance?: number
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  savedRecorded: undefined,
  savedActual: undefined,
  savedVariance: undefined,
})

const emit = defineEmits<{ 'update:actual': [value: number | null] }>()

const useSaved = computed(() => props.readonly && props.savedRecorded !== undefined)

const recordedValue = computed(() =>
  useSaved.value ? (props.savedRecorded as number) : round2(props.recorded),
)
const actualValue = computed(() =>
  useSaved.value ? (props.savedActual ?? 0) : (props.actual ?? 0),
)
// Until a count is entered there is nothing to compare against, so no variance yet.
const variance = computed(() => {
  if (useSaved.value && props.savedVariance !== undefined) return props.savedVariance
  if (props.actual === null) return 0
  return round2(actualValue.value - recordedValue.value)
})

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
