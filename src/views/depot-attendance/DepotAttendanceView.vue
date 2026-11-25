<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-3 sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('depotAttendance.title') }}
      </h1>
      <p class="mt-1 text-sm text-stone-500">{{ t('depotAttendance.subtitle') }}</p>
    </div>

    <!-- Stat cards double as quick filters -->
    <div v-if="statCards.length" role="tablist" class="mb-4 flex flex-wrap gap-2">
      <StatFilterCard
        v-for="card in statCards"
        :key="card.key"
        :count="card.count"
        :label="card.label"
        :severity="card.severity"
        :active="statusFilter === card.key"
        @toggle="toggleStatus(card.key)"
      />
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex flex-col gap-1">
        <DatePicker
          v-model="dateRange"
          selection-mode="range"
          show-icon
          show-clear
          date-format="yy-mm-dd"
          :placeholder="t('depotAttendance.filters.dateRange')"
          class="w-72"
          data-testid="date-range"
          @update:model-value="onRangeChange"
        />
      </div>
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('depotAttendance.filters.allBranches')"
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
          filterBranchId
            ? t('depotAttendance.filters.allTeams')
            : t('depotAttendance.filters.teamNeedsBranch')
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
        :placeholder="t('depotAttendance.filters.allSalesmen')"
        class="min-w-48"
        show-clear
      />
    </div>
    <Message v-if="rangeError" severity="warn" class="mb-4" data-testid="range-error">
      {{ t('depotAttendance.filters.rangeInvalid') }}
    </Message>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          data-key="rowKey"
          :query-adapter="DepotAttendanceService.toListQuery"
          :row-class="rowClass"
          @loaded="onLoaded"
        >
          <template #content="{ col, data }">
            <span v-if="col.field === 'date'">{{ dayjs(data.date).format('DD MMM YYYY') }}</span>

            <div v-else-if="col.field === 'employee.name'" class="flex flex-col text-left">
              <span class="font-medium">{{ data.employee.name }}</span>
              <span class="text-xs text-stone-500">{{ data.employee.nip ?? '' }}</span>
            </div>

            <span v-else-if="col.field === 'team.name'">{{ data.team?.name ?? '—' }}</span>

            <span v-else-if="col.field === 'branch.name'">{{ data.branch.name }}</span>

            <span v-else-if="col.field === 'capturedAt'">{{
              formatClockTime(data.capturedAt)
            }}</span>

            <span v-else-if="col.field === 'distance'">{{
              distanceText(data.distanceM, data.radiusM)
            }}</span>

            <Tag
              v-else-if="col.field === 'status'"
              :severity="statusSeverity(data.status)"
              :value="t(`depotAttendance.status.${data.status}`)"
            />

            <span v-else-if="col.field === 'reasonName'">{{ data.reasonName ?? '—' }}</span>

            <Button
              v-else-if="col.field === ''"
              v-show="data.attendanceId"
              icon="pi pi-eye"
              severity="secondary"
              text
              rounded
              :aria-label="t('depotAttendance.actions.view')"
              data-testid="view-attendance"
              @click="openDrawer(data.attendanceId)"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>

    <DepotAttendanceDrawer
      v-if="drawerId"
      :attendance-id="drawerId"
      :toast-group="toastGroup"
      @close="closeDrawer"
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
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import StatFilterCard, { type StatFilterSeverity } from '@/components/card/StatFilterCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { DepotAttendanceService, EmployeesService, SalesTeamsService } from '@/services'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import type { Base } from '@/types/api.type'
import type { Column } from '@/types/table.type'
import type { SalesTeam } from '@/types/salesTeam.type'
import {
  DEPOT_ATTENDANCE_STATUSES,
  type DepotAttendanceRow,
  type DepotAttendanceStatus,
  type DepotAttendanceSummary,
} from '@/types/depotAttendance.type'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import {
  distanceText,
  formatClockTime,
  isValidRange,
  rowKey,
  statusSeverity,
} from './depotAttendanceHelpers'
import DepotAttendanceDrawer from './components/DepotAttendanceDrawer.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const toastGroup = 'depotAttendanceView'
const table = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>()
const filterTeamId = ref<number | undefined>()
const filterEmployeeId = ref<number | undefined>()
const statusFilter = ref<DepotAttendanceStatus | null>(null)

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

function toggleStatus(key: DepotAttendanceStatus) {
  statusFilter.value = statusFilter.value === key ? null : key
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
}))

const url = computed(() =>
  DepotAttendanceService.listUrl({ ...summaryFilters.value, status: statusFilter.value }),
)

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// Summary and stat cards (they ignore the status filter, so they stay stable)
// ---------------------------------------------------------------------------

const summary = ref<DepotAttendanceSummary | null>(null)

async function loadSummary() {
  const filters = summaryFilters.value
  try {
    const result = await DepotAttendanceService.summary(filters)
    // A late answer for filters no longer selected must not overwrite the current one.
    if (filters !== summaryFilters.value) return
    summary.value = result
  } catch {
    summary.value = null
  }
}

watch(summaryFilters, loadSummary)

/** Statuses that matter every day always show; the rest only when something is in them. */
const ALWAYS_SHOWN: DepotAttendanceStatus[] = ['in_radius', 'outside_radius', 'missing']

const CARD_SEVERITY: Record<DepotAttendanceStatus, StatFilterSeverity> = {
  in_radius: 'success',
  outside_radius: 'danger',
  no_depot_point: 'info',
  missing: 'warn',
  exempt_missing: 'warn',
  holiday: 'secondary',
  not_scheduled: 'secondary',
  not_required: 'secondary',
}

const statCards = computed(() => {
  const counts = summary.value?.countsByStatus
  if (!counts) return []
  return DEPOT_ATTENDANCE_STATUSES.filter(
    (s) => ALWAYS_SHOWN.includes(s) || (counts[s] ?? 0) > 0,
  ).map((key) => ({
    key,
    count: counts[key] ?? 0,
    label: t(`depotAttendance.status.${key}`),
    severity: CARD_SEVERITY[key],
  }))
})

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** The API has no id for a day nobody clocked in, so the table keys on salesman and day. */
function onLoaded(rows: DepotAttendanceRow[]) {
  rows.forEach((r) => (r.rowKey = rowKey(r)))
}

function rowClass(row: DepotAttendanceRow): string | undefined {
  if (row.status === 'outside_radius') return '!bg-red-50'
  if (row.status === 'missing') return '!bg-amber-50'
  return undefined
}

// ---------------------------------------------------------------------------
// Detail drawer, deep-linked with ?attendance=
// ---------------------------------------------------------------------------

const drawerId = ref<number>()

function openDrawer(id: number) {
  drawerId.value = id
  router.replace({ query: { ...route.query, attendance: String(id) } })
}

function closeDrawer() {
  drawerId.value = undefined
  const query = { ...route.query }
  delete query.attendance
  router.replace({ query })
}

onMounted(() => {
  loadSummary()
  const id = Number(route.query.attendance)
  if (id > 0) drawerId.value = id
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

// None sortable: `/v1/depot-attendances` orders by date and salesman and reads no sort parameter.
const columns = computed<Column[]>(() =>
  (
    [
      ['date', t('depotAttendance.columns.date'), false],
      ['employee.name', t('depotAttendance.columns.salesman'), false],
      ['team.name', t('depotAttendance.columns.team'), true],
      ['branch.name', t('depotAttendance.columns.depot'), true],
      ['capturedAt', t('depotAttendance.columns.clockIn'), false],
      ['distance', t('depotAttendance.columns.distance'), true],
      ['status', t('depotAttendance.columns.status'), false],
      ['reasonName', t('depotAttendance.columns.reason'), true],
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
