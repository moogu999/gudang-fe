<template>
  <div class="rounded-lg border border-stone-200 p-4">
    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('apPayments.summary.title') }}
    </h4>

    <div class="space-y-2">
      <div class="flex justify-between">
        <span>{{ t('apPayments.summary.gross') }}</span>
        <span>{{ formatNumber(gross) }}</span>
      </div>

      <div class="flex justify-between text-emerald-700">
        <span>{{ t('apPayments.summary.credit') }}</span>
        <span>− {{ formatNumber(credit) }}</span>
      </div>

      <Divider />

      <div class="flex justify-between text-lg">
        <span class="font-bold">{{ t('apPayments.summary.net') }}</span>
        <span class="font-bold text-green-600">{{ formatNumber(net) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Divider from 'primevue/divider'
import type { ApPaymentDocumentType } from '@/types/apPayment.type'

const { t } = useI18n()

export interface SummaryApplication {
  documentType: ApPaymentDocumentType
  appliedAmount: number
}

interface Props {
  /** The picker's currently ticked rows. Ignored in VIEW mode. */
  applications: SummaryApplication[]
  /** VIEW mode: render the server's saved figures verbatim, never a recomputation. */
  readonly?: boolean
  savedGrossAmount?: number
  savedCreditAmount?: number
  savedNetAmount?: number
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  savedGrossAmount: undefined,
  savedCreditAmount: undefined,
  savedNetAmount: undefined,
})

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const computedGross = computed(() =>
  round2(
    props.applications
      .filter((a) => a.documentType === 'ap_invoice' || a.documentType === 'debit_note')
      .reduce((sum, a) => sum + a.appliedAmount, 0),
  ),
)

const computedCredit = computed(() =>
  round2(
    props.applications
      .filter((a) => a.documentType === 'credit_note')
      .reduce((sum, a) => sum + a.appliedAmount, 0),
  ),
)

const computedNet = computed(() => round2(computedGross.value - computedCredit.value))

const gross = computed(() =>
  props.readonly && props.savedGrossAmount !== undefined
    ? props.savedGrossAmount
    : computedGross.value,
)
const credit = computed(() =>
  props.readonly && props.savedCreditAmount !== undefined
    ? props.savedCreditAmount
    : computedCredit.value,
)
const net = computed(() =>
  props.readonly && props.savedNetAmount !== undefined ? props.savedNetAmount : computedNet.value,
)

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
