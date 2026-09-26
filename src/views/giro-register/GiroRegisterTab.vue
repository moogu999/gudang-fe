<template>
  <!-- A tab of GiroView (/giro); the page title and the create actions live in its header. -->
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <ResponsiveCard>
      <template #content>
        <!-- Bucket tabs: a button group, not SelectButton (programmatic writes don't repaint it). -->
        <div class="mb-4 flex flex-wrap gap-2" role="tablist">
          <Button
            v-for="b in BUCKETS"
            :key="b.bucket"
            type="button"
            size="small"
            role="tab"
            :aria-selected="bucket === b.bucket"
            :data-testid="`tab-${b.bucket}`"
            :severity="bucket === b.bucket ? 'primary' : 'secondary'"
            :outlined="bucket !== b.bucket"
            :label="t(`giroRegister.tabs.${b.bucket}`)"
            :badge="String(counts?.[b.countKey] ?? 0)"
            :badge-severity="
              b.bucket === 'overdue' && (counts?.overdue ?? 0) > 0 ? 'danger' : 'secondary'
            "
            @click="setBucket(b.bucket)"
          />
        </div>

        <!-- Filters -->
        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfiniteSelect
            v-if="showBranchPicker"
            :model-value="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="fetchUserBranches"
            :placeholder="t('giroRegister.filters.allBranches')"
            show-clear
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onBranchChange"
          />
          <InfiniteSelect
            :model-value="customerId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => CustomersService.list(q)"
            :placeholder="t('giroRegister.filters.allCustomers')"
            show-clear
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onCustomerChange"
          />
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="search"
              :placeholder="t('giroRegister.filters.search')"
              class="w-full"
              data-testid="search"
              @update:model-value="onSearchInput"
            />
          </IconField>
        </div>

        <!-- Deposit selected: held giros picked here open a pre-filled clearing batch. -->
        <div
          v-if="selected.size > 0"
          class="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          data-testid="selection-bar"
        >
          <span class="font-semibold">{{
            t('giroRegister.selection.summary', {
              n: selection.ids.length,
              amount: formatNumber(selection.amount),
            })
          }}</span>
          <Button
            type="button"
            size="small"
            text
            :label="t('giroRegister.selection.clear')"
            data-testid="clear-selection"
            @click="clearSelection"
          />
          <span class="flex-1" />
          <small
            v-if="selection.mixedBranches"
            class="text-amber-600"
            data-testid="mixed-branches"
            >{{ t('giroRegister.selection.mixedBranches') }}</small
          >
          <Button
            type="button"
            size="small"
            icon="pi pi-building-columns"
            data-testid="deposit-selected"
            :label="t('giroRegister.actions.depositSelected', { n: selection.ids.length })"
            :disabled="selection.mixedBranches"
            @click="depositSelected"
          />
        </div>
        <small v-else-if="selectable" class="mb-3 block text-stone-500">{{
          t('giroRegister.selection.hint')
        }}</small>

        <DataTable
          :value="rows"
          data-key="id"
          :lazy="true"
          :paginator="true"
          :first="(page - 1) * pageSize"
          :rows="pageSize"
          :total-records="total"
          :rows-per-page-options="[10, 25, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          :loading="loading"
          :selection-mode="selectable ? 'multiple' : undefined"
          :selection="selectionForPage"
          :select-all="allPickedOnPage"
          responsive-layout="scroll"
          class="text-sm"
          @page="onPage"
          @row-select="onRowSelect"
          @row-unselect="onRowUnselect"
          @select-all-change="onSelectAllChange"
        >
          <Column v-if="selectable" selection-mode="multiple" header-style="width: 3rem" />
          <Column :header="t('giroRegister.columns.giroNo')">
            <template #body="{ data }">
              <span class="font-mono">{{ data.giroNo }}</span>
            </template>
          </Column>
          <Column :header="t('giroRegister.columns.bank')">
            <template #body="{ data }">{{ data.issuingBank }}</template>
          </Column>
          <Column :header="t('giroRegister.columns.customer')">
            <template #body="{ data }">{{ data.customerName }}</template>
          </Column>
          <Column :header="t('giroRegister.columns.received')">
            <template #body="{ data }">
              <div>{{ dayjs(data.receiptDate).format(DateFormat.DATE) }}</div>
              <RouterLink
                :to="`/giro-receipts/${data.receiptId}`"
                class="text-primary text-xs underline"
                >{{ data.receiptNo }}</RouterLink
              >
            </template>
          </Column>
          <Column :header="t('giroRegister.columns.dueDate')">
            <template #body="{ data }">{{ dayjs(data.dueDate).format(DateFormat.DATE) }}</template>
          </Column>
          <Column :header="t('giroRegister.columns.amount')" class="text-right">
            <template #body="{ data }">{{ formatNumber(parseFloat(data.amount) || 0) }}</template>
          </Column>
          <Column :header="t('common.labels.status')">
            <template #body="{ data }">
              <div class="flex flex-col items-start gap-1">
                <Tag
                  v-tooltip.top="data.rejectionNote || null"
                  :severity="labelOf(data).severity"
                  :value="t(`giroRegister.due.${labelOf(data).key}`, labelOf(data).params)"
                  data-testid="due-label"
                />
                <RouterLink
                  v-if="data.status === 'clearing' && data.clearingId"
                  :to="`/giro-clearings/${data.clearingId}`"
                  class="text-primary text-xs underline"
                  >{{ data.clearingNo }}</RouterLink
                >
                <small v-if="data.clearedDate" class="text-stone-500">{{
                  dayjs(data.clearedDate).format(DateFormat.DATE)
                }}</small>
                <small v-else-if="data.rejectedDate" class="text-stone-500">{{
                  dayjs(data.rejectedDate).format(DateFormat.DATE)
                }}</small>
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('giroRegister.empty') }}</div>
          </template>
        </DataTable>

        <Message
          v-if="(counts?.overdue ?? 0) > 0"
          severity="warn"
          variant="simple"
          class="mt-3"
          data-testid="overdue-hint"
        >
          {{ t('giroRegister.overdueHint', { n: counts?.overdue ?? 0 }) }}
        </Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useDebounceFn } from '@vueuse/core'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import {
  GirosService,
  CustomersService,
  BranchesService,
  GenericQueryBuilder,
  commonErrorToast,
} from '@/services'
import type { Branch } from '@/types'
import type { GiroBucket, GiroBucketCounts, GiroRegisterRow } from '@/types/giroReceipt.type'
import { usePermissions } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import {
  BUCKETS,
  SELECTABLE_BUCKETS,
  depositQuery,
  depositSelection,
  dueLabel,
} from './giroRegister'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite: canWriteClearing } = usePermissions('/giro-clearings')

const toastGroup = 'giroRegister'

const bucket = ref<GiroBucket>('custody')
const branchId = ref<number | undefined>()
const customerId = ref<number | undefined>()
const search = ref('')

const rows = ref<GiroRegisterRow[]>([])
const counts = ref<GiroBucketCounts | null>(null)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// ---------------------------------------------------------------------------
// Deposit selected — held giros picked across pages and buckets, keyed by giro id.
// ---------------------------------------------------------------------------

const selectable = computed(
  () => canWriteClearing.value && SELECTABLE_BUCKETS.includes(bucket.value),
)
const selected = ref(new Map<number, GiroRegisterRow>())
const selection = computed(() => depositSelection([...selected.value.values()]))
const selectionForPage = computed(() => rows.value.filter((r) => selected.value.has(r.id)))
// A real boolean, so PrimeVue emits select-all-change rather than row-select-all.
const allPickedOnPage = computed(
  () => rows.value.length > 0 && rows.value.every((r) => selected.value.has(r.id)),
)

function setSelected(next: Map<number, GiroRegisterRow>) {
  selected.value = next
}

function onRowSelect(event: { data: GiroRegisterRow }) {
  setSelected(new Map(selected.value).set(event.data.id, event.data))
}

function onRowUnselect(event: { data: GiroRegisterRow }) {
  const next = new Map(selected.value)
  next.delete(event.data.id)
  setSelected(next)
}

function onSelectAllChange(event: { checked: boolean }) {
  const next = new Map(selected.value)
  for (const row of rows.value) {
    if (event.checked) next.set(row.id, row)
    else next.delete(row.id)
  }
  setSelected(next)
}

function clearSelection() {
  setSelected(new Map())
}

function depositSelected() {
  if (selection.value.mixedBranches || selection.value.ids.length === 0) return
  router.push({ path: '/giro-clearings/create', query: depositQuery(selection.value) })
}

function labelOf(row: GiroRegisterRow) {
  return dueLabel(row.daysToDue, row.status)
}

async function load() {
  loading.value = true
  try {
    const result = await GirosService.register({
      bucket: bucket.value,
      branchId: branchId.value,
      customerId: customerId.value,
      search: search.value.trim() || undefined,
      page: page.value,
      limit: pageSize.value,
    })
    rows.value = result.data
    counts.value = result.meta.counts
    total.value = result.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function setBucket(next: GiroBucket) {
  bucket.value = next
  reload()
}

function onBranchChange(value: unknown) {
  branchId.value = typeof value === 'number' ? value : undefined
  reload()
}

function onCustomerChange(value: unknown) {
  customerId.value = typeof value === 'number' ? value : undefined
  reload()
}

const onSearchInput = useDebounceFn(() => reload(), 400)

function onPage(event: DataTablePageEvent) {
  pageSize.value = event.rows
  page.value = event.page + 1
  load()
}

// ---------------------------------------------------------------------------
// Branch filter — multi-branch users only. Without a branch the server shows every branch the
// user holds.
// ---------------------------------------------------------------------------

const showBranchPicker = computed(() => authStore.branchIds.length > 1)

let userBranchesPromise: Promise<Branch[]> | null = null

function loadUserBranches(): Promise<Branch[]> {
  if (!userBranchesPromise) {
    userBranchesPromise = Promise.all(
      authStore.branchIds.map(async (id) => {
        const query = new GenericQueryBuilder().withFilter('id', FilterOperator.EQUAL, id).build()
        const result = await BranchesService.list(query)
        return result.data[0]
      }),
    ).then((branches) => branches.filter((b): b is Branch => !!b))
  }
  return userBranchesPromise
}

async function fetchUserBranches(query: string) {
  const branches = await loadUserBranches()
  const term = new URLSearchParams(query).get('search')?.toLowerCase()
  const filtered = term
    ? branches.filter(
        (b) => b.name.toLowerCase().includes(term) || b.code.toLowerCase().includes(term),
      )
    : branches
  return {
    data: filtered,
    meta: { total: filtered.length, limit: filtered.length, offset: 0, hasMore: false },
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

onMounted(load)
</script>
