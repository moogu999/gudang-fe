<template>
  <div>
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
        data-testid="days-date-range"
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
    </div>
    <Message v-if="rangeError" severity="warn" class="mb-4" data-testid="days-range-error">
      {{ t('visits.filters.rangeInvalid') }}
    </Message>

    <TableComponent
      ref="table"
      :url="url"
      :columns="columns"
      data-key="rowKey"
      :query-adapter="VisitService.toListQuery"
      @loaded="onLoaded"
    >
      <template #content="{ col, data }">
        <span v-if="col.field === 'date'">{{ dayjs(data.date).format('DD MMM YYYY') }}</span>

        <div v-else-if="col.field === 'employee.name'" class="flex flex-col text-left">
          <span class="font-medium">{{ data.employee.name }}</span>
          <span class="text-xs text-stone-500">{{ data.employee.nip ?? '' }}</span>
        </div>

        <span v-else-if="col.field === 'team'">{{ data.team?.name ?? '—' }}</span>

        <div v-else-if="col.field === 'status'" class="flex items-center gap-2">
          <Tag
            :severity="dayStatusSeverity(data.status)"
            :value="t(`visits.days.status.${data.status}`)"
          />
          <i
            v-if="data.hasActiveVisit"
            v-tooltip.top="t('visits.days.activeVisit')"
            class="pi pi-exclamation-triangle text-amber-600"
            data-testid="active-visit-icon"
          />
        </div>

        <span v-else-if="col.field === 'counts.planned'">{{ data.counts.planned }}</span>
        <span v-else-if="col.field === 'counts.completed'">{{ data.counts.completed }}</span>

        <div v-else-if="col.field === 'counts.skipped'" class="flex flex-col">
          <span>{{ data.counts.skipped }}</span>
          <span v-if="data.counts.skippedAtClose" class="text-xs text-stone-500">{{
            t('visits.days.skippedAtClose', { n: data.counts.skippedAtClose })
          }}</span>
        </div>

        <span v-else-if="col.field === 'counts.notVisited'">{{ data.counts.notVisited }}</span>

        <span v-else-if="col.field === 'timeline'">{{
          checkInOutText(data.counts.firstCheckInAt, data.counts.lastCheckOutAt)
        }}</span>

        <span v-else-if="col.field === 'closedAt'">{{ formatDateTime(data.closedAt) }}</span>

        <Button
          v-else-if="col.field === ''"
          icon="pi pi-eye"
          severity="secondary"
          text
          rounded
          :aria-label="t('visits.days.view')"
          data-testid="view-day"
          @click="openDay(data)"
        />
      </template>
    </TableComponent>

    <VisitDayDrawer
      v-if="selected"
      :employee-id="selected.employeeId"
      :date="selected.date"
      :toast-group="toastGroup"
      @close="closeDay"
      @changed="onChanged"
      @open-visit="(id: number) => emit('openVisit', id)"
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
import TableComponent from '@/components/table/TableComponent.vue'
import StatFilterCard, { type StatFilterSeverity } from '@/components/card/StatFilterCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { EmployeesService, SalesTeamsService, VisitService } from '@/services'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import type { Base } from '@/types/api.type'
import type { Column } from '@/types/table.type'
import type { SalesTeam } from '@/types/salesTeam.type'
import {
  VISIT_DAY_STATUSES,
  type VisitDayRow,
  type VisitDayStatus,
  type VisitDayListResponse,
} from '@/types/visit.type'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import {
  checkInOutText,
  dayRowKey,
  dayStatusSeverity,
  formatDateTime,
  isValidRange,
} from '../visitHelpers'
import VisitDayDrawer from './VisitDayDrawer.vue'

defineProps<{ toastGroup: string }>()
const emit = defineEmits<{ openVisit: [id: number] }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const table = ref()

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>()
const filterTeamId = ref<number | undefined>()
const filterEmployeeId = ref<number | undefined>()
const statusFilter = ref<VisitDayStatus | null>(null)

/** The last 7 days, today included. */
const defaultStart = dayjs().subtract(6, 'day')
const dateRange = ref<(Date | null)[] | null>([defaultStart.toDate(), new Date()])
const from = ref(defaultStart.format('YYYY-MM-DD'))
const to = ref(dayjs().format('YYYY-MM-DD'))
const rangeError = ref(false)

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

function fetchTeams(query: string): Promise<Base<SalesTeam>> {
  const params = new URLSearchParams(SalesTeamsService.toListQuery(query))
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  params.set('status', 'active')
  return SalesTeamsService.list(params.toString())
}

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
  VisitService.daysUrl({ ...summaryFilters.value, status: statusFilter.value }),
)

watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

const summary = ref<VisitDayListResponse['summary'] | null>(null)

async function loadSummary() {
  const filters = summaryFilters.value
  try {
    const result = await VisitService.daysSummary(filters)
    if (filters !== summaryFilters.value) return
    summary.value = result
  } catch {
    summary.value = null
  }
}
watch(summaryFilters, loadSummary)

const CARD_SEVERITY: Record<VisitDayStatus, StatFilterSeverity> = {
  open: 'warn',
  closed: 'success',
  closed_by_supervisor: 'secondary',
}

const statCards = computed(() => {
  const s = summary.value
  if (!s) return []
  return VISIT_DAY_STATUSES.map((key) => ({
    key: key as string,
    count: s.countsByStatus[key] ?? 0,
    label: t(`visits.days.status.${key}`),
    severity: CARD_SEVERITY[key],
    active: statusFilter.value === key,
    toggle: () => (statusFilter.value = statusFilter.value === key ? null : key),
  }))
})

function onLoaded(rows: Record<string, unknown>[]) {
  ;(rows as unknown as VisitDayRow[]).forEach((r) => (r.rowKey = dayRowKey(r)))
}

// Detail drawer, deep-linked with ?day=<employeeId>:<date>
const selected = ref<{ employeeId: number; date: string }>()

function openDay(row: VisitDayRow) {
  selected.value = { employeeId: row.employee.id, date: row.date }
  router.replace({ query: { ...route.query, day: `${row.employee.id}:${row.date}` } })
}

function closeDay() {
  selected.value = undefined
  const query = { ...route.query }
  delete query.day
  router.replace({ query })
}

function onChanged() {
  table.value?.clearSearch()
  loadSummary()
}

onMounted(() => {
  loadSummary()
  const [id, date] = String(route.query.day ?? '').split(':')
  if (Number(id) > 0 && date) selected.value = { employeeId: Number(id), date }
})

const columns = computed<Column[]>(() =>
  (
    [
      ['date', t('visits.days.columns.date'), false],
      ['employee.name', t('visits.days.columns.salesman'), false],
      ['team', t('visits.days.columns.team'), true],
      ['status', t('visits.days.columns.status'), false],
      ['counts.planned', t('visits.days.columns.planned'), true],
      ['counts.completed', t('visits.days.columns.completed'), true],
      ['counts.skipped', t('visits.days.columns.skipped'), true],
      ['counts.notVisited', t('visits.days.columns.notVisited'), true],
      ['timeline', t('visits.days.columns.timeline'), true],
      ['closedAt', t('visits.days.columns.closedAt'), true],
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
