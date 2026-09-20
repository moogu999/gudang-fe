<template>
  <div>
    <Message v-if="!customerId && !readonly" severity="info" variant="simple">
      {{ t('arClearings.invoices.selectCustomerFirst') }}
    </Message>

    <DataTable
      v-else
      :value="rows"
      data-key="documentId"
      :paginator="rows.length > pageSize"
      :rows="pageSize"
      :loading="loading"
      class="text-sm"
    >
      <Column :header="t('arClearings.invoices.invoiceNo')">
        <template #body="{ data }">
          <div class="font-medium">{{ data.documentNo }}</div>
          <div v-if="data.documentDate" class="text-xs text-stone-500">
            {{ dayjs(data.documentDate).format(DateFormat.DATE) }}
          </div>
        </template>
      </Column>
      <Column :header="t('arClearings.invoices.age')">
        <template #body="{ data }">
          <Tag
            v-if="data.ageDays != null"
            :severity="severityTag(data.ageDays)"
            :value="t('arClearings.invoices.ageDays', { days: data.ageDays })"
            :title="t(`arClearings.invoices.aging.${agingSeverity(data.ageDays)}`)"
          />
          <span v-else class="text-stone-400">—</span>
        </template>
      </Column>
      <Column :header="t('arClearings.invoices.total')" class="text-right">
        <template #body="{ data }">{{ formatNumber(parseFloat(data.totalAmount) || 0) }}</template>
      </Column>
      <Column
        :header="
          readonly
            ? t('arClearings.invoices.outstandingNow')
            : t('arClearings.invoices.outstanding')
        "
        class="text-right"
      >
        <template #body="{ data }">{{
          formatNumber(parseFloat(data.outstandingAmount) || 0)
        }}</template>
      </Column>
      <Column
        :header="t('arClearings.invoices.allocation')"
        class="text-right"
        style="min-width: 10rem"
      >
        <template #body="{ data }">
          <template v-if="readonly">{{ formatNumber(data.allocated) }}</template>
          <InputNumber
            v-else
            :model-value="data.allocated"
            :locale="locale"
            :min="0"
            :max="parseFloat(data.outstandingAmount) || 0"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            input-class="w-full min-w-0 text-right"
            class="w-full min-w-0"
            @update:model-value="(v: number | null) => onAmountUpdate(data, v)"
          />
        </template>
      </Column>
      <Column :header="t('common.labels.status')" style="width: 7rem">
        <template #body="{ data }">
          <Tag
            v-if="allocationState(data) !== 'none'"
            :severity="allocationState(data) === 'full' ? 'success' : 'info'"
            :value="t(`arClearings.allocation.${allocationState(data)}`)"
            :data-testid="`state-${data.documentId}`"
          />
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('arClearings.invoices.empty') }}</div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import InputNumber from 'primevue/inputnumber'
import DateFormat from '@/constants/dateFormat'
import { agingSeverity, allocationState, round2, type AllocationRow } from '../arClearingLines'

interface Props {
  customerId?: number
  /** Every outstanding invoice of the customer, oldest first, each carrying its live allocation. */
  rows: AllocationRow[]
  loading?: boolean
  /** VIEW mode: the allocation column is plain text. */
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  customerId: undefined,
  loading: false,
  readonly: false,
})

const emit = defineEmits<{ 'update:rows': [rows: AllocationRow[]] }>()

const { t, locale } = useI18n()

const pageSize = 10

function severityTag(ageDays: number) {
  const s = agingSeverity(ageDays)
  return s === 'ok' ? 'success' : s
}

function onAmountUpdate(row: AllocationRow, value: number | null) {
  // `:max` on the InputNumber does not stop a paste, so clamp here as well.
  const outstanding = parseFloat(row.outstandingAmount) || 0
  const next = round2(Math.min(Math.max(value ?? 0, 0), outstanding))
  if (next === row.allocated) return
  emit(
    'update:rows',
    props.rows.map((r) => (r.documentId === row.documentId ? { ...r, allocated: next } : r)),
  )
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
