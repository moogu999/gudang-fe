<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-3 sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">{{ t('visits.title') }}</h1>
      <p class="mt-1 text-sm text-stone-500">{{ t('visits.subtitle') }}</p>
    </div>

    <Tabs :value="activeTab" class="mb-4" @update:value="onTabChange">
      <TabList>
        <Tab value="visits" data-testid="tab-visits">{{ t('visits.tabs.visits') }}</Tab>
        <Tab value="days" data-testid="tab-days">{{ t('visits.tabs.days') }}</Tab>
      </TabList>
    </Tabs>

    <VisitDaysTab v-if="activeTab === 'days'" :toast-group="toastGroup" @open-visit="openDrawer" />

    <template v-else>
      <!-- Stat cards double as quick filters -->
      <div v-if="statCards.length" role="tablist" class="mb-4 flex flex-wrap gap-2">
        <StatFilterCard
          v-for="card in statCards"
          :key="card.key"
          :count="card.count"
          :label="card.label"
          :severity="card.severity"
          :active="card.active"
          @toggle="card.toggle"
        />
      </div>

      <!-- Filters -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <DatePicker
          v-model="dateRange"
          selection-mode="range"
          show-icon
          show-clear
          date-format="yy-mm-dd"
          :max-date="new Date()"
          :placeholder="t('visits.filters.dateRange')"
          class="w-72"
          data-testid="date-range"
          @update:model-value="onRangeChange"
        />
        <InfiniteSelect
          v-model="filterBranchId"
          :fetch-fn="fetchBranches"
          :option-label="branchLabel"
          option-value="id"
          :placeholder="t('visits.filters.allBranches')"
          class="min-w-48"
          show-clear
        />
        <InfiniteSelect
          :key="filterBranchId ?? 'none'"
          v-model="filterTeamId"
          :fetch-fn="fetchTeams"
          option-label="name"
          option-value="id"
          :placeholder="
            filterBranchId ? t('visits.filters.allTeams') : t('visits.filters.teamNeedsBranch')
          "
          :disabled="!filterBranchId"
          class="min-w-44"
          show-clear
        />
        <InfiniteSelect
          v-model="filterEmployeeId"
          :fetch-fn="(q: string) => EmployeesService.listForSelect(q)"
          option-label="name"
          option-value="id"
          :placeholder="t('visits.filters.allSalesmen')"
          class="min-w-48"
          show-clear
        />
        <InfiniteSelect
          v-model="filterCustomerId"
          :fetch-fn="(q: string) => CustomersService.list(q)"
          option-label="name"
          option-value="id"
          :placeholder="t('visits.filters.allCustomers')"
          class="min-w-48"
          show-clear
        />
      </div>
      <Message v-if="rangeError" severity="warn" class="mb-4" data-testid="range-error">
        {{ t('visits.filters.rangeInvalid') }}
      </Message>

      <ResponsiveCard>
        <template #content>
          <TableComponent
            ref="table"
            :url="url"
            :columns="columns"
            data-key="rowKey"
            :query-adapter="VisitService.toListQuery"
            :row-class="rowClass"
            @loaded="onLoaded"
          >
            <template #content="{ col, data }">
              <span v-if="col.field === 'planDate'">{{
                dayjs(data.planDate).format('DD MMM YYYY')
              }}</span>

              <div v-else-if="col.field === 'employee.name'" class="flex flex-col text-left">
                <span class="font-medium">{{ data.employee.name }}</span>
                <span class="text-xs text-stone-500">{{ data.employee.nip ?? '' }}</span>
              </div>

              <div v-else-if="col.field === 'customer.name'" class="flex flex-col text-left">
                <span class="font-medium">{{ data.customer.name }}</span>
                <span class="text-xs text-stone-500">{{ data.customer.code }}</span>
              </div>

              <span v-else-if="col.field === 'sequence'">{{
                sequenceText(data.planSequence, data.actualSequence)
              }}</span>

              <div v-else-if="col.field === 'status'" class="flex flex-col items-start gap-1">
                <Tag
                  :severity="statusSeverity(data.status)"
                  :value="t(`visits.status.${data.status}`)"
                />
                <Tag
                  v-if="data.skipSource === 'close_day'"
                  severity="secondary"
                  :value="t('visits.skipSource.close_day')"
                  data-testid="close-day-tag"
                />
                <span v-if="data.skipReason" class="text-xs text-stone-500">{{
                  data.skipReason
                }}</span>
              </div>

              <div v-else-if="col.field === 'checkInOut'" class="flex flex-col">
                <span>{{ checkInOutText(data.checkedInAt, data.checkedOutAt) }}</span>
                <span v-if="data.durationMin != null" class="text-xs text-stone-500">{{
                  t('visits.drawer.durationMin', { n: data.durationMin })
                }}</span>
              </div>

              <div v-else-if="col.field === 'radius'" class="flex flex-col items-start gap-1">
                <Tag
                  v-if="data.withinRadius != null"
                  :severity="data.withinRadius ? 'success' : 'danger'"
                  :value="
                    data.withinRadius ? t('visits.radius.inside') : t('visits.radius.outside')
                  "
                />
                <span v-if="data.distanceM != null" class="text-xs text-stone-500">{{
                  distanceText(data.distanceM)
                }}</span>
                <span v-if="data.withinRadius == null && data.checkedInAt">—</span>
              </div>

              <template v-else-if="col.field === 'stockCheck'">
                <Tag
                  v-if="data.stockCheckMissing"
                  severity="warn"
                  :value="t('visits.stockCheckMissing')"
                />
                <span v-else-if="data.stockCheckCount">{{ data.stockCheckCount }}</span>
                <span v-else>—</span>
              </template>

              <Button
                v-else-if="col.field === ''"
                v-show="data.visitId"
                icon="pi pi-eye"
                severity="secondary"
                text
                rounded
                :aria-label="t('visits.actions.view')"
                data-testid="view-visit"
                @click="openDrawer(data.visitId)"
              />
            </template>
          </TableComponent>
        </template>
      </ResponsiveCard>
    </template>

    <VisitDrawer
      v-if="drawerId"
      :visit-id="drawerId"
      :toast-group="toastGroup"
      @close="closeDrawer"
      @changed="onVisitChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import StatFilterCard, { type StatFilterSeverity } from '@/components/card/StatFilterCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CustomersService, EmployeesService, SalesTeamsService, VisitService } from '@/services'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import type { Base } from '@/types/api.type'
import type { Column } from '@/types/table.type'
import type { SalesTeam } from '@/types/salesTeam.type'
import {
  VISIT_DISPLAY_STATUSES,
  type VisitDisplayStatus,
  type VisitRow,
  type VisitSummary,
} from '@/types/visit.type'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import {
  checkInOutText,
  distanceText,
  isValidRange,
  rowKey,
  sequenceText,
  statusSeverity,
} from './visitHelpers'
import VisitDrawer from './components/VisitDrawer.vue'
import VisitDaysTab from './components/VisitDaysTab.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const toastGroup = 'visitsView'
const table = ref()

type TabKey = 'visits' | 'days'
const activeTab = ref<TabKey>(route.query.tab === 'days' || route.query.day ? 'days' : 'visits')

function onTabChange(value: string | number) {
  const tab: TabKey = value === 'days' ? 'days' : 'visits'
  activeTab.value = tab
  const query = { ...route.query }
  delete query.visit
  delete query.day
  if (tab === 'days') query.tab = 'days'
  else delete query.tab
  router.replace({ query })
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>()
const filterTeamId = ref<number | undefined>()
const filterEmployeeId = ref<number | undefined>()
const filterCustomerId = ref<number | undefined>()
const statusFilter = ref<VisitDisplayStatus | null>(null)
const outsideOnly = ref(false)

/** Today, as a one-day range. */
const dateRange = ref<(Date | null)[] | null>([new Date(), null])
const from = ref(dayjs().format('YYYY-MM-DD'))
const to = ref(from.value)
const rangeError = ref(false)

/**
 * A range is final once both ends are picked (or only the first, which means
 * one day). More than 31 days is refused instead of clipped, so the page never
 * shows a different range than the picker.
 */
function onRangeChange() {
  const [start, end] = dateRange.value ?? []
  if (!start) {
    rangeError.value = false
    return
  }
  const a = dayjs(start)
  const b = dayjs(end ?? start)
  if (!isValidRange(a, b)) {
    rangeError.value = true
    return
  }
  rangeError.value = false
  from.value = a.format('YYYY-MM-DD')
  to.value = b.format('YYYY-MM-DD')
}

/** The selected branch's active teams; `/v1/sales-teams` reads the generic query through its adapter. */
function fetchTeams(query: string): Promise<Base<SalesTeam>> {
  const params = new URLSearchParams(SalesTeamsService.toListQuery(query))
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  params.set('status', 'active')
  return SalesTeamsService.list(params.toString())
}

// A team belongs to one branch, so it can't outlive a branch change.
watch(filterBranchId, () => {
  filterTeamId.value = undefined
})

const summaryFilters = computed(() => ({
  dateFrom: from.value,
  dateTo: to.value,
  branchId: filterBranchId.value,
  teamId: filterTeamId.value,
  employeeId: filterEmployeeId.value,
  customerId: filterCustomerId.value,
}))

const url = computed(() =>
  VisitService.listUrl({
    ...summaryFilters.value,
    status: statusFilter.value,
    outsideRadius: outsideOnly.value,
  }),
)

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// Summary and stat cards (they ignore the status filters, so they stay stable)
// ---------------------------------------------------------------------------

const summary = ref<VisitSummary | null>(null)

async function loadSummary() {
  const filters = summaryFilters.value
  try {
    const result = await VisitService.summary(filters)
    // A late answer for filters no longer selected must not overwrite the current one.
    if (filters !== summaryFilters.value) return
    summary.value = result
  } catch {
    summary.value = null
  }
}

watch(summaryFilters, loadSummary)

const ALWAYS_SHOWN: VisitDisplayStatus[] = [
  'pending',
  'active',
  'completed',
  'skipped',
  'not_visited',
]

const CARD_SEVERITY: Record<VisitDisplayStatus, StatFilterSeverity> = {
  pending: 'secondary',
  active: 'info',
  completed: 'success',
  skipped: 'secondary',
  not_visited: 'warn',
  not_checked_out: 'warn',
  closed: 'secondary',
}

function toggleStatus(key: VisitDisplayStatus) {
  statusFilter.value = statusFilter.value === key ? null : key
}

const statCards = computed(() => {
  const s = summary.value
  if (!s) return []
  const cards = VISIT_DISPLAY_STATUSES.filter(
    (k) => ALWAYS_SHOWN.includes(k) || (s.countsByStatus[k] ?? 0) > 0,
  ).map((key) => ({
    key: key as string,
    count: s.countsByStatus[key] ?? 0,
    label: t(`visits.status.${key}`),
    severity: CARD_SEVERITY[key],
    active: statusFilter.value === key,
    toggle: () => toggleStatus(key),
  }))
  cards.push({
    key: 'outside_radius',
    count: s.outsideRadius,
    label: t('visits.outsideRadius'),
    severity: 'danger',
    active: outsideOnly.value,
    toggle: () => (outsideOnly.value = !outsideOnly.value),
  })
  return cards
})

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** A plan row nobody visited has no id, so the table keys on day, salesman and customer. */
function onLoaded(rows: VisitRow[]) {
  rows.forEach((r) => (r.rowKey = rowKey(r)))
}

function rowClass(row: VisitRow): string | undefined {
  if (row.withinRadius === false) return '!bg-red-50'
  if (row.status === 'not_visited' || row.status === 'not_checked_out') return '!bg-amber-50'
  return undefined
}

// ---------------------------------------------------------------------------
// Detail drawer, deep-linked with ?visit=
// ---------------------------------------------------------------------------

const drawerId = ref<number>()

function openDrawer(id: number) {
  drawerId.value = id
  router.replace({ query: { ...route.query, visit: String(id) } })
}

/** A visit closed from the drawer moves between statuses: refresh the rows and the cards. */
function onVisitChanged() {
  table.value?.clearSearch()
  loadSummary()
}

function closeDrawer() {
  drawerId.value = undefined
  const query = { ...route.query }
  delete query.visit
  router.replace({ query })
}

onMounted(() => {
  loadSummary()
  const id = Number(route.query.visit)
  if (id > 0) drawerId.value = id
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

// None sortable: `/v1/visits` orders by date, salesman and plan sequence and reads no sort parameter.
const columns = computed<Column[]>(() =>
  (
    [
      ['planDate', t('visits.columns.date'), false],
      ['employee.name', t('visits.columns.salesman'), false],
      ['customer.name', t('visits.columns.customer'), false],
      ['sequence', t('visits.columns.sequence'), true],
      ['status', t('visits.columns.status'), false],
      ['checkInOut', t('visits.columns.checkInOut'), true],
      ['radius', t('visits.columns.radius'), true],
      ['stockCheck', t('visits.columns.stockCheck'), true],
      ['', t('common.labels.actions'), false],
    ] as const
  ).map(([field, header, hideOnMobile]) => ({
    field,
    header,
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile,
  })),
)
</script>
