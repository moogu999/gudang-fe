<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('giroReceipts.sections.giros') }}
      </h3>
      <Button
        v-if="!readonly"
        type="button"
        icon="pi pi-plus"
        size="small"
        data-testid="add-giro"
        :label="t('giroReceipts.actions.addGiro')"
        @click="addRow"
      />
    </div>

    <DataTable :value="modelValue" data-key="_key" responsive-layout="scroll" class="text-sm">
      <Column :header="t('giroReceipts.fields.giroNo')" style="min-width: 10rem">
        <template #body="{ data, index }">
          <span v-if="readonly" class="font-mono">{{ data.giroNo }}</span>
          <div v-else class="flex flex-col gap-1">
            <InputText
              :model-value="data.giroNo"
              autocomplete="off"
              class="w-full"
              :invalid="isDuplicate(data) || (showErrors && !!errorsOf(data).giroNo)"
              @update:model-value="(v: string | undefined) => patch(index, { giroNo: v ?? '' })"
            />
            <small v-if="showErrors && errorsOf(data).giroNo" class="text-red-600">{{
              t('giroReceipts.validation.giroNoRequired')
            }}</small>
            <small v-else-if="isDuplicate(data)" class="text-red-600" data-testid="duplicate">{{
              t('giroReceipts.validation.duplicateInDocument')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('giroReceipts.fields.issuingBank')" style="min-width: 11rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ data.issuingBank }}</template>
          <div v-else class="flex flex-col gap-1">
            <InputText
              :model-value="data.issuingBank"
              autocomplete="off"
              :placeholder="t('giroReceipts.fields.issuingBankPlaceholder')"
              class="w-full"
              :invalid="isDuplicate(data) || (showErrors && !!errorsOf(data).issuingBank)"
              @update:model-value="
                (v: string | undefined) => patch(index, { issuingBank: v ?? '' })
              "
            />
            <small v-if="showErrors && errorsOf(data).issuingBank" class="text-red-600">{{
              t('giroReceipts.validation.issuingBankRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('giroReceipts.fields.customer')" style="min-width: 14rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ data.customer?.name }}</template>
          <div v-else class="flex flex-col gap-1">
            <InfiniteSelect
              :model-value="data.customerId"
              option-label="name"
              option-value="id"
              :fetch-fn="(q) => CustomersService.list(q)"
              :custom-filters="customerFilters"
              :initial-option="data.customer"
              :placeholder="t('giroReceipts.fields.selectCustomer')"
              show-clear
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @update:model-value="(v: unknown) => onCustomerChange(index, v)"
              @select-option="
                (opt: object) => patch(index, { customer: opt as GiroRow['customer'] })
              "
            />
            <small v-if="showErrors && errorsOf(data).customer" class="text-red-600">{{
              t('giroReceipts.validation.customerRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('giroReceipts.fields.giroDate')" style="min-width: 9rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ formatDate(data.giroDate) }}</template>
          <div v-else class="flex flex-col gap-1">
            <DatePicker
              :model-value="data.giroDate"
              date-format="dd/mm/yy"
              class="w-full"
              @update:model-value="
                (v: unknown) => patch(index, { giroDate: v instanceof Date ? v : null })
              "
            />
            <small v-if="showErrors && errorsOf(data).giroDate" class="text-red-600">{{
              t('giroReceipts.validation.giroDateRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('giroReceipts.fields.dueDate')" style="min-width: 9rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ formatDate(data.dueDate) }}</template>
          <div v-else class="flex flex-col gap-1">
            <DatePicker
              :model-value="data.dueDate"
              date-format="dd/mm/yy"
              :min-date="data.giroDate ?? undefined"
              class="w-full"
              @update:model-value="
                (v: unknown) => patch(index, { dueDate: v instanceof Date ? v : null })
              "
            />
            <small v-if="dueDateError(data)" class="text-red-600">{{ dueDateError(data) }}</small>
            <small
              v-else-if="isOverdueOnEntry(data)"
              class="text-amber-600"
              data-testid="overdue-warning"
              >{{ t('giroReceipts.warnings.alreadyOverdue') }}</small
            >
          </div>
        </template>
      </Column>

      <Column :header="t('giroReceipts.fields.amount')" class="text-right" style="min-width: 10rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ formatNumber(data.amount ?? 0) }}</template>
          <div v-else class="flex flex-col gap-1">
            <InputNumber
              :model-value="data.amount"
              :locale="locale"
              :min="0"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              input-class="w-full min-w-0 text-right"
              class="w-full min-w-0"
              @update:model-value="(v: number | null) => patch(index, { amount: v })"
            />
            <small v-if="showErrors && errorsOf(data).amount" class="text-red-600">{{
              t('giroReceipts.validation.amountRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column v-if="showStatus" :header="t('common.labels.status')" style="min-width: 9rem">
        <template #body="{ data }">
          <div v-if="data.status" class="flex flex-col gap-1">
            <GiroStatusTag :status="data.status" />
            <small v-if="data.clearedDate" class="text-stone-500">{{
              formatDate(data.clearedDate)
            }}</small>
            <small v-else-if="data.rejectedDate" class="text-stone-500">{{
              formatDate(data.rejectedDate)
            }}</small>
            <small v-if="data.rejectionNote" class="text-stone-500">{{ data.rejectionNote }}</small>
          </div>
        </template>
      </Column>

      <Column v-if="!readonly" style="width: 4rem">
        <template #body="{ index }">
          <Button
            type="button"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            data-testid="remove-giro"
            :aria-label="t('giroReceipts.actions.removeGiro')"
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <template #footer>
        <div class="flex justify-between text-sm font-semibold">
          <span data-testid="subtotal-label">{{
            t('giroReceipts.labels.subtotal', { n: modelValue.length })
          }}</span>
          <span data-testid="subtotal">{{ formatNumber(totals.amount) }}</span>
        </div>
      </template>
      <template #empty>
        <div class="py-4 text-center text-stone-400">{{ t('giroReceipts.labels.noGiros') }}</div>
      </template>
    </DataTable>

    <small v-if="!readonly" class="text-surface-500 mt-2 block">{{
      t('giroReceipts.labels.customerPickerHint')
    }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import GiroStatusTag from './GiroStatusTag.vue'
import FilterOperator from '@/constants/filterOperator'
import { CustomersService } from '@/services'
import {
  duplicateGiroKeys,
  emptyGiroRow,
  giroKey,
  giroRowErrors,
  isGiroRowValid,
  isOverdueOnEntry,
  recordedTotals,
  type GiroRow,
} from '../giroReceiptLines'

interface Props {
  modelValue: GiroRow[]
  readonly?: boolean
  /** VIEW mode: add a per-giro lifecycle column. */
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), { readonly: false, showStatus: false })

const emit = defineEmits<{ 'update:modelValue': [rows: GiroRow[]] }>()

const { t, locale } = useI18n()

// D12: only customers flagged "Pays with Giro" can hand one over. `/gen/v1/customers` has no
// FilterMap, so the column name passes through to the generic handler as-is.
const customerFilters = [
  { filterBy: 'paysWithGiro', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

// "Required" errors stay hidden until the first submit attempt so a fresh row isn't born red.
// Duplicates and a due date before the giro date show at once.
const showErrors = ref(false)

const totals = computed(() => recordedTotals(props.modelValue))
const duplicates = computed(() => duplicateGiroKeys(props.modelValue))

function errorsOf(row: GiroRow) {
  return giroRowErrors(row)
}

function isDuplicate(row: GiroRow): boolean {
  const key = giroKey(row)
  return !!key && duplicates.value.has(key)
}

function dueDateError(row: GiroRow): string | null {
  const error = errorsOf(row).dueDate
  if (error === 'beforeGiroDate') return t('giroReceipts.validation.dueBeforeGiroDate')
  if (error === 'required' && showErrors.value) return t('giroReceipts.validation.dueDateRequired')
  return null
}

// InfiniteSelect emits update:model-value and select-option back to back, before the
// parent's new array reaches props — so every change builds on the last one emitted.
const latest = ref<GiroRow[]>(props.modelValue)
watch(
  () => props.modelValue,
  (rows) => (latest.value = rows),
)

function commit(rows: GiroRow[]) {
  latest.value = rows
  emit('update:modelValue', rows)
}

function patch(index: number, changes: Partial<GiroRow>) {
  commit(latest.value.map((row, i) => (i === index ? { ...row, ...changes } : row)))
}

function onCustomerChange(index: number, value: unknown) {
  if (typeof value === 'number') {
    patch(index, { customerId: value })
  } else {
    patch(index, { customerId: undefined, customer: undefined })
  }
}

function addRow() {
  commit([...latest.value, emptyGiroRow()])
}

function removeRow(index: number) {
  commit(latest.value.filter((_, i) => i !== index))
}

/** Reveals per-row errors and reports whether every row is submittable and unique. */
function validate(): boolean {
  showErrors.value = true
  return props.modelValue.every(isGiroRowValid) && duplicates.value.size === 0
}

function formatDate(value: Date | string | null): string {
  if (!value) return ''
  return dayjs(typeof value === 'string' ? value.slice(0, 10) : value).format('DD/MM/YYYY')
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

defineExpose({ validate })
</script>
