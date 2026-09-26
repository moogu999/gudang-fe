<template>
  <div>
    <DataTable :value="modelValue" data-key="lineId" responsive-layout="scroll" class="text-sm">
      <Column :header="t('giroReceipts.fields.giroNo')">
        <template #body="{ data }">
          <div class="font-mono">{{ data.giroNo }}</div>
          <div class="text-xs text-stone-500">{{ data.issuingBank }}</div>
        </template>
      </Column>
      <Column :header="t('giroReceipts.fields.customer')">
        <template #body="{ data }">{{ data.customerName }}</template>
      </Column>
      <Column :header="t('giroReceipts.fields.amount')" class="text-right">
        <template #body="{ data }">{{ formatNumber(data.amount) }}</template>
      </Column>
      <Column :header="t('giroClearings.fields.result')" style="min-width: 11rem">
        <template #body="{ data, index }">
          <div
            v-if="isResolved(data)"
            class="flex flex-col items-start gap-1"
            data-testid="resolved"
          >
            <Tag
              :severity="data.savedResult === 'cleared' ? 'success' : 'danger'"
              :value="t(`giroClearings.results.${data.savedResult}`)"
            />
            <small v-if="data.savedResultDate" class="text-stone-500">{{
              dayjs(data.savedResultDate).format(DateFormat.DATE)
            }}</small>
          </div>
          <Select
            v-else
            :model-value="data.result || null"
            :options="resultOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('giroClearings.results.pending')"
            show-clear
            class="w-full"
            data-testid="result-select"
            @update:model-value="
              (v: 'cleared' | 'rejected' | null) => patch(index, { result: v ?? '' })
            "
          />
        </template>
      </Column>
      <Column :header="t('giroClearings.fields.note')" style="min-width: 14rem">
        <template #body="{ data, index }">
          <span v-if="isResolved(data)">{{ data.savedNote || '—' }}</span>
          <div v-else class="flex flex-col gap-1">
            <InputText
              :model-value="data.note"
              autocomplete="off"
              class="w-full"
              :invalid="showErrors && !!resultRowErrors(data).note"
              data-testid="note-input"
              @update:model-value="(v: string | undefined) => patch(index, { note: v ?? '' })"
            />
            <small
              v-if="showErrors && resultRowErrors(data).note"
              class="text-red-600"
              data-testid="note-required"
              >{{ t('giroClearings.validation.rejectionNoteRequired') }}</small
            >
          </div>
        </template>
      </Column>
    </DataTable>

    <div class="mt-3 flex flex-wrap gap-4 text-sm font-semibold" data-testid="live-totals">
      <span class="text-green-700">{{
        t('giroClearings.results.clearedTotal', { amount: formatNumber(totals.cleared.amount) })
      }}</span>
      <span class="text-red-600">{{
        t('giroClearings.results.rejectedTotal', { amount: formatNumber(totals.rejected.amount) })
      }}</span>
    </div>

    <!-- One callout per rejected giro, then one for everything cleared (adapted from the mockup). -->
    <Message
      v-for="row in rejectedRows"
      :key="row.lineId"
      severity="error"
      variant="simple"
      class="mt-2"
      data-testid="rejected-callout"
    >
      {{
        t('giroClearings.hints.rejectedCallout', {
          giroNo: row.giroNo,
          customer: row.customerName,
          amount: formatNumber(row.amount),
        })
      }}
    </Message>
    <Message
      v-if="totals.cleared.count > 0"
      severity="success"
      variant="simple"
      class="mt-2"
      data-testid="cleared-callout"
    >
      {{
        t('giroClearings.hints.clearedCallout', {
          n: totals.cleared.count,
          amount: formatNumber(totals.cleared.amount),
        })
      }}
      <RouterLink to="/ar-clearings/create" class="text-primary ml-1 underline">{{
        t('giroClearings.hints.openArClearing')
      }}</RouterLink>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import DateFormat from '@/constants/dateFormat'
import { isResolved, resultRowErrors, resultTotals, type ResultRow } from '../giroClearingLines'

const props = defineProps<{ modelValue: ResultRow[] }>()

const emit = defineEmits<{ 'update:modelValue': [rows: ResultRow[]] }>()

const { t } = useI18n()

// A Select, not SelectButton: programmatic writes don't repaint a SelectButton.
const resultOptions = computed(() => [
  { label: t('giroClearings.results.cleared'), value: 'cleared' },
  { label: t('giroClearings.results.rejected'), value: 'rejected' },
])

const showErrors = ref(false)

const totals = computed(() => resultTotals(props.modelValue))
const rejectedRows = computed(() =>
  props.modelValue.filter((r) => !isResolved(r) && r.result === 'rejected'),
)

const latest = ref<ResultRow[]>(props.modelValue)
watch(
  () => props.modelValue,
  (rows) => (latest.value = rows),
)

function patch(index: number, changes: Partial<ResultRow>) {
  const rows = latest.value.map((row, i) => (i === index ? { ...row, ...changes } : row))
  latest.value = rows
  emit('update:modelValue', rows)
}

/** Reveals per-row errors and reports whether every chosen result is submittable. */
function validate(): boolean {
  showErrors.value = true
  return props.modelValue.every((r) => !resultRowErrors(r).note)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

defineExpose({ validate })
</script>
