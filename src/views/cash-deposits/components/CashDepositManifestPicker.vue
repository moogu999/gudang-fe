<template>
  <div>
    <Message v-if="!employeeId" severity="info" variant="simple">
      {{ t('cashDeposits.picker.selectEmployeeFirst') }}
    </Message>

    <template v-else-if="mode !== 'adhoc'">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('cashDeposits.sections.manifest') }}
        <Tag
          v-if="mode"
          class="ml-2 align-middle"
          severity="info"
          :value="t(`cashDeposits.picker.mode.${mode}`)"
        />
      </h3>

      <InputText
        v-if="mode === 'collector'"
        v-model="search"
        :placeholder="t('cashDeposits.picker.search')"
        class="mb-3 w-full sm:w-80"
        autocomplete="off"
        @input="onSearchInput"
        @keyup.enter="applySearch"
      />

      <!-- Raw DataTable: TableComponent hardcodes selection-mode="single", and this
           table needs a per-row editable amount column besides. -->
      <DataTable
        :value="items"
        data-key="invoiceId"
        selection-mode="multiple"
        :selection="selectionForPage"
        :select-all="allPickedOnPage"
        :lazy="true"
        :paginator="mode === 'collector'"
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
        <Column :header="t('cashDeposits.picker.invoiceNo')">
          <template #body="{ data }">
            <div class="font-medium">{{ data.invoiceNo }}</div>
            <div class="text-xs text-stone-500">{{ data.deliveryOrderNo }}</div>
          </template>
        </Column>
        <Column :header="t('cashDeposits.picker.outlet')">
          <template #body="{ data }">{{ data.customerName }}</template>
        </Column>
        <Column :header="t('cashDeposits.picker.age')">
          <template #body="{ data }">{{
            t('cashDeposits.picker.ageDays', { days: data.ageDays })
          }}</template>
        </Column>
        <Column :header="t('cashDeposits.picker.receivable')" class="text-right">
          <template #body="{ data }">
            <div>{{ formatNumber(parseFloat(data.remainingAmount)) }}</div>
            <div v-if="parseFloat(data.alreadyDepositedAmount) > 0" class="text-xs text-stone-500">
              {{
                t('cashDeposits.picker.alreadyDeposited', {
                  amount: formatNumber(parseFloat(data.alreadyDepositedAmount)),
                })
              }}
            </div>
          </template>
        </Column>
        <Column :header="t('cashDeposits.picker.received')" class="text-right">
          <template #body="{ data }">
            <InputNumber
              :model-value="amountOf(data)"
              :disabled="!isPicked(data)"
              :locale="locale"
              :min="0"
              :max="parseFloat(data.remainingAmount)"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              input-class="w-full min-w-0 text-right"
              class="w-36 min-w-0"
              @update:model-value="(v: number | null) => onAmountUpdate(data, v)"
            />
          </template>
        </Column>
        <Column :header="t('common.labels.status')">
          <template #body="{ data }">
            <Tag
              v-if="rowStatus(data)"
              :severity="rowStatus(data) === 'paid' ? 'success' : 'warn'"
              :value="t(`cashDeposits.picker.lineStatus.${rowStatus(data)}`)"
            />
          </template>
        </Column>
        <template #empty>
          <div class="py-6 text-center text-stone-500">{{ t('cashDeposits.picker.empty') }}</div>
        </template>
      </DataTable>

      <div
        class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm"
      >
        <span>{{ t('cashDeposits.picker.selectedSummary', { count: pickedRows.length }) }}</span>
        <span class="font-semibold text-green-700">
          {{ t('cashDeposits.picker.selectedTotal') }}: {{ formatNumber(pickedTotal) }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import { CashDepositsService } from '@/services'
import type {
  CashDepositLineResponse,
  ManifestCandidate,
  ManifestMode,
} from '@/types/cashDeposit.type'
import { clamp, lineStatus, round2, type PickedInvoiceLine } from '../cashDepositLines'

interface Props {
  employeeId?: number
  /** 'YYYY-MM-DD'. Only invoices dated on or before it are offered. */
  depositDate?: string
  /** The deposit being edited, so its own lines don't count as already deposited. */
  excludeDepositId?: number
  /** Driver mode ticks every returned row up front. Off when editing a saved draft. */
  preselect?: boolean
  /** Saved invoice lines of a draft being edited. */
  initialLines?: CashDepositLineResponse[]
}

const props = withDefaults(defineProps<Props>(), {
  employeeId: undefined,
  depositDate: undefined,
  excludeDepositId: undefined,
  preselect: true,
  initialLines: () => [],
})

const emit = defineEmits<{
  'update:lines': [lines: PickedInvoiceLine[]]
  'update:mode': [mode: ManifestMode | null]
}>()

const { t, locale } = useI18n()

const MAX_DRIVER_ROWS = 500

const mode = ref<ManifestMode | null>(null)
const items = ref<ManifestCandidate[]>([])
const page = ref(0)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const search = ref('')

// Held outside the table so ticks and amounts survive pagination and search.
const pickedMap = ref(new Map<number, PickedInvoiceLine>())
// Rows already offered once — driver auto-ticking must not re-tick what the admin unticked.
const seen = new Set<number>()

const pickedRows = computed(() => Array.from(pickedMap.value.values()))
const pickedTotal = computed(() => round2(pickedRows.value.reduce((s, r) => s + r.amount, 0)))

function emitLines() {
  emit('update:lines', pickedRows.value)
}

function toPicked(item: ManifestCandidate): PickedInvoiceLine {
  const remaining = parseFloat(item.remainingAmount) || 0
  return {
    invoiceId: item.invoiceId,
    invoiceNo: item.invoiceNo,
    customerName: item.customerName,
    totalAmount: parseFloat(item.totalAmount) || 0,
    remainingAmount: remaining,
    amount: remaining,
  }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

let requestToken = 0

async function fetchData(p: number) {
  const token = ++requestToken
  if (!props.employeeId) {
    items.value = []
    total.value = 0
    mode.value = null
    emit('update:mode', null)
    return
  }

  loading.value = true
  page.value = p
  try {
    const params = new URLSearchParams({
      employeeId: String(props.employeeId),
      limit: String(pageSize.value),
      offset: String(p * pageSize.value),
    })
    if (props.depositDate) params.set('depositDate', props.depositDate)
    if (props.excludeDepositId) params.set('excludeDepositId', String(props.excludeDepositId))
    if (search.value.trim()) params.set('search', search.value.trim())

    const res = await CashDepositsService.manifestCandidates(params.toString())
    if (token !== requestToken) return

    mode.value = res.mode
    emit('update:mode', res.mode)

    // A driver's manifest is small and must be complete up front — a ticked-by-default
    // row on page 2 that nobody paged to would silently drop out of the recorded total.
    if (
      res.mode === 'driver' &&
      res.meta.total > res.data.length &&
      pageSize.value < MAX_DRIVER_ROWS
    ) {
      pageSize.value = Math.min(res.meta.total, MAX_DRIVER_ROWS)
      await fetchData(0)
      return
    }

    items.value = res.data
    total.value = res.meta.total

    let changed = false
    for (const item of res.data) {
      if (seen.has(item.invoiceId)) continue
      seen.add(item.invoiceId)
      if (res.mode === 'driver' && props.preselect && !pickedMap.value.has(item.invoiceId)) {
        pickedMap.value.set(item.invoiceId, toPicked(item))
        changed = true
      }
    }
    if (changed) emitLines()
  } finally {
    if (token === requestToken) loading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  pageSize.value = event.rows
  fetchData(event.page)
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applySearch, 350)
}

function applySearch() {
  clearTimeout(searchTimer)
  fetchData(0)
}

// ---------------------------------------------------------------------------
// Selection — derived from pickedMap so it stays correct across page changes.
// ---------------------------------------------------------------------------

const selectionForPage = computed(() =>
  items.value.filter((item) => pickedMap.value.has(item.invoiceId)),
)

// PrimeVue's header "select all" checkbox only emits `select-all-change` when the
// `select-all` prop is non-null (see DataTable's toggleRowsWithCheckbox).
const allPickedOnPage = computed(
  () => items.value.length > 0 && items.value.every((item) => pickedMap.value.has(item.invoiceId)),
)

function isPicked(item: ManifestCandidate): boolean {
  return pickedMap.value.has(item.invoiceId)
}

function amountOf(item: ManifestCandidate): number {
  return pickedMap.value.get(item.invoiceId)?.amount ?? 0
}

function rowStatus(item: ManifestCandidate) {
  const entry = pickedMap.value.get(item.invoiceId)
  return entry ? lineStatus(entry.amount, parseFloat(item.remainingAmount) || 0) : null
}

function onRowSelect(event: { data: ManifestCandidate }) {
  pickedMap.value.set(event.data.invoiceId, toPicked(event.data))
  emitLines()
}

function onRowUnselect(event: { data: ManifestCandidate }) {
  pickedMap.value.delete(event.data.invoiceId)
  emitLines()
}

function onSelectAllChange(event: { checked: boolean }) {
  for (const item of items.value) {
    if (event.checked) {
      if (!pickedMap.value.has(item.invoiceId)) pickedMap.value.set(item.invoiceId, toPicked(item))
    } else {
      pickedMap.value.delete(item.invoiceId)
    }
  }
  emitLines()
}

// Clamp here, not just via :min/:max — the InputNumber props alone do not clamp typed input.
function onAmountUpdate(item: ManifestCandidate, value: number | null) {
  const entry = pickedMap.value.get(item.invoiceId)
  if (!entry) return
  entry.remainingAmount = parseFloat(item.remainingAmount) || 0
  entry.amount = clamp(value, entry.remainingAmount)
  emitLines()
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

function seedInitialLines() {
  pickedMap.value = new Map(
    props.initialLines
      .filter((l) => l.lineType === 'invoice' && l.invoiceId != null)
      .map((l) => {
        const amount = parseFloat(l.amount) || 0
        const total = parseFloat(l.referenceAmount ?? '0') || 0
        return [
          l.invoiceId as number,
          {
            invoiceId: l.invoiceId as number,
            invoiceNo: l.invoiceNo ?? '',
            customerName: l.customerName ?? '',
            totalAmount: total,
            remainingAmount: total,
            amount,
          },
        ]
      }),
  )
  seen.clear()
  pickedMap.value.forEach((_, id) => seen.add(id))
}

/** Clears every pick and refetches page 0 — called by the parent when the employee or date changes. */
function reset() {
  pickedMap.value = new Map()
  seen.clear()
  search.value = ''
  pageSize.value = 10
  emitLines()
  fetchData(0)
}

onMounted(() => {
  seedInitialLines()
  emitLines()
  fetchData(0)
})

defineExpose({ reset })
</script>
