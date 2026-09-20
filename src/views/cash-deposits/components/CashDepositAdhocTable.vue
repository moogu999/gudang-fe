<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('cashDeposits.sections.adhoc') }}
      </h3>
      <Button
        v-if="!readonly"
        type="button"
        icon="pi pi-plus"
        size="small"
        :label="t('cashDeposits.adhoc.addRow')"
        @click="addRow"
      />
    </div>

    <DataTable :value="modelValue" data-key="_key" responsive-layout="scroll" class="text-sm">
      <Column :header="t('cashDeposits.adhoc.customer')" style="min-width: 14rem">
        <template #body="{ data, index }">
          <template v-if="readonly">
            {{ data.customer?.name }}
          </template>
          <div v-else class="flex flex-col gap-1">
            <InfiniteSelect
              :model-value="data.customerId"
              option-label="name"
              option-value="id"
              :fetch-fn="(q) => CustomersService.list(q)"
              :initial-option="data.customer"
              :placeholder="t('cashDeposits.adhoc.selectCustomer')"
              show-clear
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @update:model-value="(v: unknown) => onCustomerChange(index, v)"
              @select-option="
                (opt: object) => patch(index, { customer: opt as AdhocRow['customer'] })
              "
            />
            <small v-if="showErrors && errorsOf(data).customer" class="text-red-600">{{
              t('cashDeposits.adhoc.customerRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('cashDeposits.adhoc.category')" style="min-width: 12rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ data.category?.name }}</template>
          <div v-else class="flex flex-col gap-1">
            <InfiniteSelect
              :model-value="data.categoryId"
              option-label="name"
              option-value="id"
              :fetch-fn="(q) => CashDepositCategoriesService.list(q)"
              :custom-filters="categoryFilters"
              :initial-option="data.category"
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @update:model-value="
                (v: unknown) => patch(index, { categoryId: typeof v === 'number' ? v : undefined })
              "
              @select-option="
                (opt: object) => patch(index, { category: opt as AdhocRow['category'] })
              "
            />
            <small v-if="showErrors && errorsOf(data).category" class="text-red-600">{{
              t('cashDeposits.adhoc.categoryRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('cashDeposits.adhoc.note')" style="min-width: 12rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ data.note }}</template>
          <InputText
            v-else
            :model-value="data.note"
            autocomplete="off"
            class="w-full"
            @update:model-value="(v: string | undefined) => patch(index, { note: v ?? '' })"
          />
        </template>
      </Column>

      <Column :header="t('cashDeposits.adhoc.amount')" class="text-right" style="min-width: 10rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ formatNumber(data.amount) }}</template>
          <div v-else class="flex flex-col gap-1">
            <InputNumber
              :model-value="data.amount"
              :locale="locale"
              :min="0"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              input-class="w-full min-w-0 text-right"
              class="w-full min-w-0"
              @update:model-value="
                (v: number | null) => patch(index, { amount: Math.max(v ?? 0, 0) })
              "
            />
            <small v-if="showErrors && errorsOf(data).amount" class="text-red-600">{{
              t('cashDeposits.adhoc.amountRequired')
            }}</small>
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
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <template #footer>
        <div class="flex justify-between text-sm font-semibold">
          <span>{{ t('cashDeposits.adhoc.subtotal') }}</span>
          <span>{{ formatNumber(subtotal) }}</span>
        </div>
      </template>
      <template #empty>
        <div class="py-4 text-center text-stone-400">{{ t('cashDeposits.adhoc.empty') }}</div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import FilterOperator from '@/constants/filterOperator'
import { CustomersService, CashDepositCategoriesService } from '@/services'
import {
  adhocRowErrors,
  isAdhocRowValid,
  newAdhocRow,
  round2,
  type AdhocRow,
} from '../cashDepositLines'

interface Props {
  modelValue: AdhocRow[]
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), { readonly: false })

const emit = defineEmits<{ 'update:modelValue': [rows: AdhocRow[]] }>()

const { t, locale } = useI18n()

// Errors stay hidden until the first submit attempt so a fresh row isn't born red.
const showErrors = ref(false)

const categoryFilters = [
  { filterBy: 'is_active', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

const subtotal = computed(() => round2(props.modelValue.reduce((s, r) => s + (r.amount || 0), 0)))

function errorsOf(row: AdhocRow) {
  return adhocRowErrors(row)
}

// InfiniteSelect emits update:model-value and select-option back to back, before the
// parent's new array reaches props — so every change builds on the last one emitted.
const latest = ref<AdhocRow[]>(props.modelValue)
watch(
  () => props.modelValue,
  (rows) => (latest.value = rows),
)

function commit(rows: AdhocRow[]) {
  latest.value = rows
  emit('update:modelValue', rows)
}

function patch(index: number, changes: Partial<AdhocRow>) {
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
  commit([...latest.value, newAdhocRow()])
}

function removeRow(index: number) {
  commit(latest.value.filter((_, i) => i !== index))
}

/** Reveals per-row errors and reports whether every row is submittable. */
function validate(): boolean {
  showErrors.value = true
  return props.modelValue.every(isAdhocRowValid)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

defineExpose({ validate })
</script>
