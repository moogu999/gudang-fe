<template>
  <div>
    <Message v-if="!supplierId" severity="info" variant="simple">
      {{ t('apPayments.picker.selectSupplierFirst') }}
    </Message>

    <template v-else>
      <!-- Raw DataTable: TableComponent hardcodes selection-mode="single", and this
           table needs a per-row editable amount column besides. -->
      <DataTable
        :value="pickerItems"
        data-key="_key"
        selection-mode="multiple"
        :selection="selectionForPage"
        :select-all="allPickedOnPage"
        :lazy="true"
        :paginator="true"
        :rows="pageSize"
        :total-records="total"
        :rows-per-page-options="[10, 25, 50]"
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        :loading="loading"
        class="text-sm"
        @page="onPage"
        @row-select="onRowSelect"
        @row-unselect="onRowUnselect"
        @select-all-change="onSelectAllChange"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column :header="t('apPayments.picker.documentNo')">
          <template #body="{ data }">
            <div class="font-medium">{{ data.documentNo }}</div>
            <div class="text-xs text-stone-500">
              {{ dayjs(data.documentDate).format(DateFormat.DATE) }}
            </div>
          </template>
        </Column>
        <Column :header="t('apPayments.picker.type')">
          <template #body="{ data }">
            <Tag
              :severity="typeSeverity(data.documentType)"
              :value="typeLabel(data.documentType)"
            />
          </template>
        </Column>
        <Column :header="t('apPayments.picker.dueDate')">
          <template #body="{ data }">
            <div>{{ dayjs(data.dueDate).format(DateFormat.DATE) }}</div>
            <Tag
              v-if="data.documentType === 'ap_invoice'"
              :severity="agingSeverity(data.dueDate)"
              :value="agingLabel(data.dueDate)"
              class="mt-1"
            />
            <span v-else class="text-xs text-stone-400">—</span>
          </template>
        </Column>
        <Column :header="t('apPayments.picker.outstanding')" class="text-right">
          <template #body="{ data }">
            <span :class="data.documentType === 'credit_note' ? 'text-emerald-700' : ''">
              {{ formatNumber(parseFloat(data.outstandingAmount)) }}
            </span>
          </template>
        </Column>
        <Column :header="t('apPayments.picker.appliedAmount')" class="text-right">
          <template #body="{ data }">
            <InputNumber
              v-if="data.documentType === 'ap_invoice'"
              :model-value="appliedAmountOf(data)"
              :disabled="!isPicked(data)"
              :locale="locale"
              :min="0"
              :max="Math.abs(parseFloat(data.outstandingAmount))"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              input-class="w-full min-w-0 text-right"
              class="w-36 min-w-0"
              @update:model-value="(v) => onAmountUpdate(data, v)"
            />
            <span v-else-if="isPicked(data)" class="text-stone-500">
              {{ formatNumber(Math.abs(parseFloat(data.outstandingAmount))) }}
            </span>
          </template>
        </Column>
        <template #empty>
          <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
        </template>
      </DataTable>

      <div
        class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm"
      >
        <span>{{
          t('apPayments.picker.selectedSummary', {
            count: pickedRows.length,
            invoices: invoiceCount,
            credits: creditCount,
            debits: debitCount,
          })
        }}</span>
        <span class="font-semibold" :class="netAmount < 0 ? 'text-red-600' : 'text-green-700'">
          {{ t('apPayments.picker.net') }}: {{ formatNumber(netAmount) }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import InputNumber from 'primevue/inputnumber'
import DateFormat from '@/constants/dateFormat'
import { ApOutstandingService } from '@/services'
import type { ApOutstandingItem, ApOutstandingDocumentType } from '@/types/apOutstanding.type'
import type { ApPaymentApplicationResponse, ApPaymentDocumentType } from '@/types/apPayment.type'

export interface PickedApplication {
  documentType: ApPaymentDocumentType
  documentId: number
  documentNo: string
  dueDate: string
  /** Unsigned magnitude, matching the outstanding-amount convention on the note side. */
  outstandingAmount: string
  appliedAmount: number
}

interface PickerRow extends ApOutstandingItem {
  _key: string
}

interface Props {
  supplierId?: number
  branchId?: number
  /** Seeds picked rows before the picker's own page loads — the saved applications on a draft being edited. */
  initialApplications?: ApPaymentApplicationResponse[]
}

const props = defineProps<Props>()

const emit = defineEmits<{ 'update:applications': [applications: PickedApplication[]] }>()

const { t, locale } = useI18n()

function keyOf(documentType: string, documentId: number): string {
  return `${documentType}:${documentId}`
}

const pickedMap = ref(new Map<string, PickedApplication>())

const pickedRows = computed(() => Array.from(pickedMap.value.values()))
const invoiceCount = computed(
  () => pickedRows.value.filter((r) => r.documentType === 'ap_invoice').length,
)
const creditCount = computed(
  () => pickedRows.value.filter((r) => r.documentType === 'credit_note').length,
)
const debitCount = computed(
  () => pickedRows.value.filter((r) => r.documentType === 'debit_note').length,
)
const netAmount = computed(() => {
  const gross = pickedRows.value
    .filter((r) => r.documentType === 'ap_invoice' || r.documentType === 'debit_note')
    .reduce((sum, r) => sum + r.appliedAmount, 0)
  const credit = pickedRows.value
    .filter((r) => r.documentType === 'credit_note')
    .reduce((sum, r) => sum + r.appliedAmount, 0)
  return Math.round((gross - credit) * 100) / 100
})

function emitApplications() {
  emit('update:applications', pickedRows.value)
}

// ---------------------------------------------------------------------------
// Paginated fetch
// ---------------------------------------------------------------------------

const pickerItems = ref<PickerRow[]>([])
const page = ref(0)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

function toRow(item: ApOutstandingItem): PickerRow {
  return { ...item, _key: keyOf(item.documentType, item.documentId) }
}

async function fetchPickerData(p: number) {
  if (!props.supplierId) {
    pickerItems.value = []
    total.value = 0
    return
  }

  loading.value = true
  page.value = p
  try {
    const params = new URLSearchParams({
      supplierId: String(props.supplierId),
      excludeSettled: 'true',
      page: String(p + 1),
      limit: String(pageSize.value),
    })
    if (props.branchId) params.set('branchId', String(props.branchId))

    const res = await ApOutstandingService.list(params.toString())
    pickerItems.value = res.data.map(toRow)
    total.value = res.meta.total
  } finally {
    loading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  pageSize.value = event.rows
  fetchPickerData(event.page)
}

// ---------------------------------------------------------------------------
// Selection — derived from pickedMap so it stays correct across page changes
// without relying on PrimeVue to merge selection state itself.
// ---------------------------------------------------------------------------

const selectionForPage = computed(() =>
  pickerItems.value.filter((item) => pickedMap.value.has(item._key)),
)

// PrimeVue's header "select all" checkbox only emits `select-all-change` when the
// `select-all` prop is non-null (see DataTable's toggleRowsWithCheckbox); otherwise it
// silently emits row-select-all/update:selection instead, which this component ignores.
const allPickedOnPage = computed(
  () =>
    pickerItems.value.length > 0 &&
    pickerItems.value.every((item) => pickedMap.value.has(item._key)),
)

function isPicked(item: PickerRow): boolean {
  return pickedMap.value.has(item._key)
}

function appliedAmountOf(item: PickerRow): number {
  return pickedMap.value.get(item._key)?.appliedAmount ?? 0
}

function seed(item: ApOutstandingItem): PickedApplication {
  return {
    documentType: item.documentType,
    documentId: item.documentId,
    documentNo: item.documentNo,
    dueDate: item.dueDate,
    outstandingAmount: item.outstandingAmount,
    appliedAmount: Math.abs(parseFloat(item.outstandingAmount)) || 0,
  }
}

function onRowSelect(event: { data: PickerRow }) {
  pickedMap.value.set(event.data._key, seed(event.data))
  emitApplications()
}

function onRowUnselect(event: { data: PickerRow }) {
  pickedMap.value.delete(event.data._key)
  emitApplications()
}

function onSelectAllChange(event: { checked: boolean }) {
  for (const item of pickerItems.value) {
    if (event.checked) {
      if (!pickedMap.value.has(item._key)) pickedMap.value.set(item._key, seed(item))
    } else {
      pickedMap.value.delete(item._key)
    }
  }
  emitApplications()
}

function onAmountUpdate(item: PickerRow, value: number | null) {
  const entry = pickedMap.value.get(item._key)
  if (!entry) return
  const outstanding = Math.abs(parseFloat(item.outstandingAmount)) || 0
  let amount = value ?? 0
  if (amount < 0) amount = 0
  if (amount > outstanding) amount = outstanding
  entry.appliedAmount = amount
  emitApplications()
}

// ---------------------------------------------------------------------------
// Type / aging presentation
// ---------------------------------------------------------------------------

function typeSeverity(type: ApOutstandingDocumentType) {
  if (type === 'credit_note') return 'success'
  if (type === 'debit_note') return 'danger'
  return 'info'
}

function typeLabel(type: ApOutstandingDocumentType) {
  return t(`apPayments.picker.documentType.${type}`)
}

function agingSeverity(dueDate: string) {
  return dayjs(dueDate).isBefore(dayjs(), 'day') ? 'danger' : 'secondary'
}

function agingLabel(dueDate: string) {
  const days = dayjs(dueDate).diff(dayjs(), 'day')
  return days < 0
    ? t('apPayments.picker.overdueDays', { days: Math.abs(days) })
    : t('apPayments.picker.dueInDays', { days })
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function seedInitialApplications() {
  pickedMap.value = new Map(
    (props.initialApplications ?? []).map((a) => [
      keyOf(a.documentType, a.documentId),
      {
        documentType: a.documentType,
        documentId: a.documentId,
        documentNo: a.documentNo,
        dueDate: a.dueDate,
        outstandingAmount: a.outstandingAmount,
        appliedAmount: parseFloat(a.appliedAmount) || 0,
      },
    ]),
  )
}

/** Clears every pick and refetches page 0 — called by the parent when the supplier or branch changes. */
function reset() {
  pickedMap.value = new Map()
  emitApplications()
  fetchPickerData(0)
}

onMounted(() => {
  seedInitialApplications()
  emitApplications()
  fetchPickerData(0)
})

defineExpose({ reset })
</script>
