<template>
  <div class="rounded-lg border border-stone-200 p-4">
    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('giroReceipts.summary.title') }}
    </h4>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- Declared: what the lines add up to -->
      <div class="flex flex-col gap-1">
        <span class="text-xs text-stone-500">{{ t('giroReceipts.summary.declared') }}</span>
        <span class="text-lg font-semibold" data-testid="recorded-count">{{
          t('giroReceipts.summary.giroCount', { n: recordedValue.count })
        }}</span>
        <span class="text-sm" data-testid="recorded-amount">{{
          formatNumber(recordedValue.amount)
        }}</span>
      </div>

      <!-- Physically verified: counted by the admin -->
      <div class="flex flex-col gap-1">
        <span class="text-xs text-stone-500">{{ t('giroReceipts.summary.verified') }}</span>
        <template v-if="!readonly">
          <label class="text-xs text-stone-500" for="actualCount">{{
            t('giroReceipts.fields.actualCount')
          }}</label>
          <InputNumber
            input-id="actualCount"
            :model-value="actualCount"
            :min="0"
            :use-grouping="false"
            input-class="w-full min-w-0 text-right"
            class="w-full min-w-0"
            data-testid="actual-count-input"
            @update:model-value="(v: number | null) => emit('update:actualCount', v)"
          />
          <label class="text-xs text-stone-500" for="actualAmount">{{
            t('giroReceipts.fields.actualAmount')
          }}</label>
          <InputNumber
            input-id="actualAmount"
            :model-value="actualAmount"
            :locale="locale"
            :min="0"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            input-class="w-full min-w-0 text-right"
            class="w-full min-w-0"
            data-testid="actual-amount-input"
            @update:model-value="(v: number | null) => emit('update:actualAmount', v)"
          />
        </template>
        <template v-else>
          <span class="text-lg font-semibold" data-testid="actual-count">{{
            t('giroReceipts.summary.giroCount', { n: savedActual?.count ?? 0 })
          }}</span>
          <span class="text-sm" data-testid="actual-amount">{{
            formatNumber(savedActual?.amount ?? 0)
          }}</span>
        </template>
      </div>

      <!-- Variance, in both units -->
      <div class="flex flex-col gap-1">
        <span class="text-xs text-stone-500">{{ t('giroReceipts.summary.variance') }}</span>
        <span
          class="text-lg font-semibold"
          :class="variance.count === 0 ? 'text-green-700' : 'text-amber-600'"
          data-testid="variance-count"
          >{{ signed(variance.count) }}</span
        >
        <span
          class="text-sm"
          :class="variance.amount === 0 ? 'text-green-700' : 'text-amber-600'"
          data-testid="variance-amount"
          >{{ formatNumber(variance.amount) }}</span
        >
      </div>
    </div>

    <p class="mt-3 text-xs text-stone-500">{{ t('giroReceipts.labels.statusNote') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import { variances } from '../giroReceiptLines'

const { t, locale } = useI18n()

interface Totals {
  count: number
  amount: number
}

interface Props {
  /** Live totals from the lines. Ignored in readonly mode. */
  recorded: Totals
  actualCount: number | null
  actualAmount: number | null
  /** Detail mode: render the server's saved figures verbatim, never a recomputation. */
  readonly?: boolean
  savedRecorded?: Totals
  savedActual?: Totals
  savedVariance?: Totals
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  savedRecorded: undefined,
  savedActual: undefined,
  savedVariance: undefined,
})

const emit = defineEmits<{
  'update:actualCount': [value: number | null]
  'update:actualAmount': [value: number | null]
}>()

const recordedValue = computed(() =>
  props.readonly && props.savedRecorded ? props.savedRecorded : props.recorded,
)

// Until a unit is counted there is nothing to compare against, so its variance stays 0.
const variance = computed(() =>
  props.readonly && props.savedVariance
    ? props.savedVariance
    : variances(props.recorded, { count: props.actualCount, amount: props.actualAmount }),
)

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
