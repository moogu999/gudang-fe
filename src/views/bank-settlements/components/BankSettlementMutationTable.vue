<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('bankSettlements.sections.mutations') }}
      </h3>
      <Button
        v-if="!readonly"
        type="button"
        icon="pi pi-plus"
        size="small"
        data-testid="add-row"
        :label="t('bankSettlements.table.addRow')"
        @click="addRow"
      />
    </div>

    <DataTable :value="modelValue" data-key="_key" responsive-layout="scroll" class="text-sm">
      <Column :header="t('bankSettlements.table.mutationDate')" style="min-width: 10rem">
        <template #body="{ data, index }">
          <template v-if="readonly">{{ formatDate(data.mutationDate) }}</template>
          <div v-else class="flex flex-col gap-1">
            <DatePicker
              :model-value="data.mutationDate"
              date-format="dd/mm/yy"
              :min-date="period?.[0]"
              :max-date="period?.[1]"
              :default-date="period?.[0]"
              class="w-full"
              @update:model-value="
                (v: unknown) => patch(index, { mutationDate: v instanceof Date ? v : null })
              "
            />
            <small v-if="dateError(data)" class="text-red-600">{{ dateError(data) }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('bankSettlements.table.description')" style="min-width: 14rem">
        <template #body="{ data, index }">
          <template v-if="readonly">
            <span class="whitespace-pre-line">{{ data.description }}</span>
          </template>
          <div v-else class="flex flex-col gap-1">
            <InputText
              :model-value="data.description"
              autocomplete="off"
              class="w-full"
              @update:model-value="
                (v: string | undefined) => patch(index, { description: v ?? '' })
              "
            />
            <small v-if="showErrors && errorsOf(data).description" class="text-red-600">{{
              t('bankSettlements.validation.lineDescriptionRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column
        :header="t('bankSettlements.table.amount')"
        class="text-right"
        style="min-width: 10rem"
      >
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
              t('bankSettlements.validation.lineAmountRequired')
            }}</small>
          </div>
        </template>
      </Column>

      <Column :header="t('bankSettlements.table.customer')" style="min-width: 16rem">
        <template #body="{ data, index }">
          <template v-if="readonly">
            <RouterLink
              v-if="data.giroClearingId != null"
              :to="`/giro-clearings/${data.giroClearingId}`"
              class="text-primary underline"
              data-testid="giro-link"
              >{{
                t('bankSettlements.tagMode.giroLabel', { no: data.giroClearingNo ?? '' })
              }}</RouterLink
            >
            <span v-else>{{ data.customer?.name }}</span>
          </template>
          <div v-else class="flex flex-col gap-1">
            <!-- D13: a line is tagged to a customer OR to a giro clearing batch, never both.
                 A Select, not SelectButton: programmatic writes don't repaint a SelectButton. -->
            <Select
              :model-value="modeOf(data)"
              :options="modeOptions"
              option-label="label"
              option-value="value"
              size="small"
              class="w-full"
              data-testid="tag-mode"
              @update:model-value="(v: TagMode) => onModeChange(index, v)"
            />
            <Select
              v-if="modeOf(data) === 'giro'"
              :model-value="data.giroClearingId ?? null"
              :options="giroOptions(data)"
              option-label="label"
              option-value="value"
              :placeholder="t('bankSettlements.tagMode.giroClearingPlaceholder')"
              :empty-message="t('bankSettlements.tagMode.noCandidates')"
              show-clear
              class="w-full"
              data-testid="giro-select"
              @update:model-value="(v: number | null) => onGiroChange(index, v)"
            />
            <InfiniteSelect
              v-else
              :model-value="data.customerId"
              option-label="name"
              option-value="id"
              :fetch-fn="(q) => CustomersService.list(q)"
              :initial-option="data.customer"
              :placeholder="t('bankSettlements.table.selectCustomer')"
              show-clear
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @update:model-value="(v: unknown) => onCustomerChange(index, v)"
              @select-option="
                (opt: object) => patch(index, { customer: opt as MutationRow['customer'] })
              "
            />
            <small
              v-if="lookalikeOf(data)"
              class="flex items-start gap-1 text-amber-600"
              data-testid="lookalike-warning"
            >
              <i class="pi pi-exclamation-triangle mt-0.5" />
              <span>{{
                t('bankSettlements.tagMode.giroLookalikeWarning', {
                  customer: data.customer?.name ?? lookalikeOf(data)!.customerName,
                  giroNo: lookalikeOf(data)!.giroNo,
                  date: dayjs(lookalikeOf(data)!.clearedDate).format('DD/MM/YYYY'),
                  no: lookalikeOf(data)!.clearingNo,
                })
              }}</span>
            </small>
          </div>
        </template>
      </Column>

      <Column :header="t('bankSettlements.table.status')" style="min-width: 8rem">
        <template #body="{ data }">
          <Tag
            v-if="isTagged(data)"
            severity="success"
            data-testid="status-tagged"
            :value="t('bankSettlements.table.tagged')"
          />
          <Tag
            v-else
            severity="warn"
            data-testid="status-untagged"
            :value="t('bankSettlements.table.untagged')"
          />
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
            data-testid="remove-row"
            :aria-label="t('bankSettlements.table.removeRow')"
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <template #empty>
        <div class="py-4 text-center text-stone-400">{{ t('bankSettlements.table.empty') }}</div>
      </template>
    </DataTable>

    <small v-if="!readonly" class="text-surface-500 mt-2 block">{{
      t('bankSettlements.table.nameMismatchHint')
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
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CustomersService } from '@/services'
import type { GiroClearingCandidate } from '@/types/bankSettlement.type'
import {
  giroLookalike,
  isRowValid,
  isTagged,
  newMutationRow,
  rowErrors,
  type MutationRow,
  type Period,
  type TagMode,
} from '../bankSettlementLines'

interface Props {
  modelValue: MutationRow[]
  readonly?: boolean
  /** The header period; null until both ends are picked. Drives D9 on every row. */
  period?: Period | null
  /** D13: giro clearing batches on this account a line can be tagged to. */
  candidates?: GiroClearingCandidate[]
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  period: null,
  candidates: () => [],
})

const emit = defineEmits<{ 'update:modelValue': [rows: MutationRow[]] }>()

const { t, locale } = useI18n()

// "Required" errors stay hidden until the first submit attempt so a fresh row isn't born
// red. An out-of-period date is always shown — narrowing the period must flag rows at once.
const showErrors = ref(false)

function errorsOf(row: MutationRow) {
  return rowErrors(row, props.period)
}

function dateError(row: MutationRow): string | null {
  const error = errorsOf(row).date
  if (error === 'outOfPeriod') return t('bankSettlements.validation.lineDateOutOfPeriod')
  if (error === 'required' && showErrors.value)
    return t('bankSettlements.validation.lineDateRequired')
  return null
}

// InfiniteSelect emits update:model-value and select-option back to back, before the
// parent's new array reaches props — so every change builds on the last one emitted.
const latest = ref<MutationRow[]>(props.modelValue)
watch(
  () => props.modelValue,
  (rows) => (latest.value = rows),
)

function commit(rows: MutationRow[]) {
  latest.value = rows
  emit('update:modelValue', rows)
}

function patch(index: number, changes: Partial<MutationRow>) {
  commit(latest.value.map((row, i) => (i === index ? { ...row, ...changes } : row)))
}

function onCustomerChange(index: number, value: unknown) {
  if (typeof value === 'number') {
    patch(index, { customerId: value, giroClearingId: undefined, giroClearingNo: undefined })
  } else {
    patch(index, { customerId: undefined, customer: undefined })
  }
}

// ---------------------------------------------------------------------------
// D13: customer tag vs giro clearing batch tag
// ---------------------------------------------------------------------------

const modeOptions = computed(() => [
  { label: t('bankSettlements.tagMode.customer'), value: 'customer' },
  { label: t('bankSettlements.tagMode.giro'), value: 'giro' },
])

// The chosen mode of an untagged row isn't in the row itself, so remember it per row key.
const chosenMode = ref(new Map<string, TagMode>())

function modeOf(row: MutationRow): TagMode {
  if (row.giroClearingId != null) return 'giro'
  if (row.customerId != null) return 'customer'
  return chosenMode.value.get(row._key) ?? 'customer'
}

function onModeChange(index: number, mode: TagMode) {
  const row = latest.value[index]
  if (!row) return
  chosenMode.value.set(row._key, mode)
  // Switching clears the other tag — a line is never tagged twice.
  if (mode === 'giro') patch(index, { customerId: undefined, customer: undefined })
  else patch(index, { giroClearingId: undefined, giroClearingNo: undefined })
}

function giroOptions(row: MutationRow) {
  const options = props.candidates.map((c) => ({
    value: c.id,
    label: t('bankSettlements.tagMode.giroCandidateLabel', {
      no: c.no,
      date: dayjs(c.depositDate).format('DD/MM/YYYY'),
      amount: formatNumber(parseFloat(c.unmatchedAmount) || 0),
    }),
  }))
  // A saved link whose batch is no longer offered (fully matched since) still labels itself.
  if (row.giroClearingId != null && !options.some((o) => o.value === row.giroClearingId)) {
    options.unshift({ value: row.giroClearingId, label: row.giroClearingNo ?? '' })
  }
  return options
}

function onGiroChange(index: number, value: number | null) {
  const batch = props.candidates.find((c) => c.id === value)
  patch(index, {
    giroClearingId: value ?? undefined,
    giroClearingNo: batch?.no,
    customerId: undefined,
    customer: undefined,
  })
}

function lookalikeOf(row: MutationRow) {
  return giroLookalike(row, props.candidates)
}

function addRow() {
  commit([...latest.value, newMutationRow()])
}

function removeRow(index: number) {
  commit(latest.value.filter((_, i) => i !== index))
}

/** Reveals per-row errors and reports whether every row is submittable. */
function validate(): boolean {
  showErrors.value = true
  return props.modelValue.every((row) => isRowValid(row, props.period))
}

function formatDate(value: Date | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY') : ''
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

defineExpose({ validate })
</script>
