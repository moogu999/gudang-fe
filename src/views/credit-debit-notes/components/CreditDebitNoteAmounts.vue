<template>
  <div class="rounded-lg border border-stone-200 p-4">
    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('creditDebitNotes.sections.amounts') }}
    </h4>

    <div class="space-y-2">
      <!-- DPP — the whole content of the document, entered by the caller -->
      <div class="flex items-center justify-between gap-3">
        <span>{{ t('creditDebitNotes.fields.taxBase') }}</span>
        <span v-if="readonly">{{ formatNumber(taxBaseAmount) }}</span>
        <InputNumber
          v-else
          :model-value="taxBaseAmount"
          :locale="locale"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          :min="0"
          input-class="w-full min-w-0 text-right"
          class="w-44 min-w-0"
          @update:model-value="onTaxBaseInput"
        />
      </div>

      <!-- PPN — defaults to DPP × the configured rate, overridable to match the faktur -->
      <div class="flex items-center justify-between gap-3 text-orange-600">
        <span>{{ t('creditDebitNotes.fields.tax') }}</span>
        <span v-if="readonly">{{ formatNumber(taxAmount) }}</span>
        <InputNumber
          v-else
          :model-value="taxAmount"
          :locale="locale"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          :min="0"
          input-class="w-full min-w-0 text-right"
          class="w-44 min-w-0"
          @update:model-value="onTaxInput"
        />
      </div>

      <Message
        v-if="showDeviationWarning"
        severity="warn"
        variant="simple"
        size="small"
        class="!mt-1"
      >
        {{ t('creditDebitNotes.validation.taxDeviation', { amount: formatNumber(computedTax) }) }}
      </Message>

      <Divider />

      <div class="flex justify-between text-lg">
        <span class="font-bold">{{ t('creditDebitNotes.fields.total') }}</span>
        <span class="font-bold" :class="signColorClass">{{ signedTotalLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import type { CreditDebitNoteType } from '@/types/creditDebitNote.type'

const { t, locale } = useI18n()

interface Props {
  /** DPP — always a positive magnitude. In VIEW mode the parent passes the saved figure. */
  taxBaseAmount: number
  /** PPN percentage from the tax configuration singleton. */
  taxRate: number
  /** PPN. `v-model` — the parent owns it so it can be sent on submit. */
  taxAmount: number
  noteType: CreditDebitNoteType
  /** VIEW mode: no editing, no seeding, no deviation warning. */
  readonly?: boolean
  /** Server-saved total, used verbatim in VIEW mode. */
  savedTotalAmount?: number
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  savedTotalAmount: undefined,
})

const emit = defineEmits<{
  'update:taxBaseAmount': [value: number]
  'update:taxAmount': [value: number]
}>()

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const computedTax = computed(() => round2((props.taxBaseAmount * props.taxRate) / 100))

/**
 * Once the user edits PPN we stop re-seeding it from the computed figure. Same flag
 * pattern as ApInvoiceSummary's ppnTouched.
 *
 * Opening a saved draft for editing starts out touched when its stored PPN does not
 * match the computed one: that difference can only be an override, and re-seeding
 * would silently discard it the moment the form mounted.
 */
const ppnTouched = ref(
  !props.readonly && props.taxAmount > 0 && Math.abs(props.taxAmount - computedTax.value) > 0.005,
)

const total = computed(() => {
  if (props.readonly && props.savedTotalAmount !== undefined) return props.savedTotalAmount
  return round2(props.taxBaseAmount + props.taxAmount)
})

/** Non-blocking: a deviation over Rp 1.000 is worth flagging, never worth refusing. */
const showDeviationWarning = computed(
  () => !props.readonly && ppnTouched.value && Math.abs(props.taxAmount - computedTax.value) > 1000,
)

function onTaxBaseInput(value: number | null) {
  emit('update:taxBaseAmount', value ?? 0)
}

function onTaxInput(value: number | null) {
  ppnTouched.value = true
  emit('update:taxAmount', value ?? 0)
}

// Re-seed PPN whenever DPP or the rate moves, unless the user has taken it over.
watch(
  computedTax,
  (next) => {
    if (props.readonly || ppnTouched.value) return
    if (next !== props.taxAmount) emit('update:taxAmount', next)
  },
  { immediate: true },
)

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Stored amounts are always positive (master decision 2) — the sign here is
 * presentation only, applied to the Total row exactly as the mockup shows
 * ("− Rp 194.250" for a credit note).
 */
const signColorClass = computed(() =>
  props.noteType === 'credit' ? 'text-emerald-700' : 'text-rose-700',
)

const signedTotalLabel = computed(() => {
  const prefix = props.noteType === 'credit' ? '− ' : '+ '
  return prefix + formatNumber(total.value)
})

defineExpose({ ppnTouched })
</script>
