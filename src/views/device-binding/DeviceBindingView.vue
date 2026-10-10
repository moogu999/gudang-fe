<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <!-- Header -->
    <div class="mb-3 sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('deviceBinding.title') }}
      </h1>
      <p v-if="summary" class="mt-1 text-sm text-stone-500" data-testid="device-binding-header">
        {{
          t('deviceBinding.headerLine', {
            enrolled: summary.enrolled,
            android: summary.android,
            ios: summary.ios,
          })
        }}
        <template v-if="summary.latestAppVersion">
          · {{ t('deviceBinding.latestApp', { version: summary.latestAppVersion }) }}
        </template>
      </p>
    </div>

    <!-- Without a flow, change requests wait and can't be approved. -->
    <Message
      v-if="summary && !summary.approvalFlowConfigured"
      severity="warn"
      class="mb-4"
      data-testid="device-binding-no-flow"
    >
      {{ t('deviceBinding.noFlowBanner') }}
      <RouterLink
        v-if="canReadConfig"
        to="/configs?tab=device-binding"
        class="ml-1 font-semibold underline"
      >
        {{ t('deviceBinding.openConfig') }}
      </RouterLink>
    </Message>

    <!-- Stat cards double as quick filters -->
    <div v-if="summary" role="tablist" class="mb-4 flex flex-wrap gap-2">
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
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('deviceBinding.filters.allBranches')"
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
            ? t('deviceBinding.filters.allTeams')
            : t('deviceBinding.filters.teamNeedsBranch')
        "
        :disabled="!filterBranchId"
        class="min-w-44"
        show-clear
      />
      <Select
        v-model="filterPlatform"
        :options="platformOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('deviceBinding.filters.allPlatforms')"
        show-clear
        class="min-w-36"
      />
      <Select
        v-model="filterOutdated"
        :options="versionOptions"
        option-label="label"
        option-value="value"
        class="min-w-44"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          data-key="employee.id"
          :query-adapter="DeviceBindingService.toListQuery"
          :row-class="rowClass"
        >
          <template #content="{ col, data }">
            <!-- Salesman -->
            <div v-if="col.field === 'employee.name'" class="flex items-center gap-2 text-left">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700"
              >
                {{ initials(data.employee.name) }}
              </span>
              <div class="flex flex-col">
                <span class="font-medium">{{ data.employee.name }}</span>
                <span class="text-xs text-stone-500">
                  {{ [data.employee.nip, data.employee.phone].filter(Boolean).join(' · ') }}
                </span>
              </div>
            </div>

            <!-- Mode -->
            <Tag
              v-else-if="col.field === 'mode'"
              v-tooltip.top="data.employee.typeName"
              :value="modeLabel(data.employee.typeName)"
              severity="secondary"
            />

            <!-- Device -->
            <DeviceCell
              v-else-if="col.field === 'device'"
              :device="shownDevice(data)"
              :pending="!!data.pendingDevice"
              :os-outdated="data.osOutdated"
              :mock-location-days="data.mockLocationDays30"
            />

            <!-- Device id -->
            <span
              v-else-if="col.field === 'deviceUid'"
              v-tooltip.top="shownDevice(data)?.deviceUid"
              class="font-mono text-xs"
            >
              {{ shownDevice(data) ? shortUid(shownDevice(data)!.deviceUid) : '—' }}
            </span>

            <!-- App version -->
            <span
              v-else-if="col.field === 'app'"
              :class="data.appOutdated ? 'font-semibold text-orange-600' : ''"
            >
              {{ shownDevice(data)?.appVersion ?? '—' }}
              <i
                v-if="data.appOutdated"
                v-tooltip.top="t('deviceBinding.device.appOutdated')"
                class="pi pi-exclamation-circle text-xs"
              />
            </span>

            <!-- Last sync: of the bound phone, which is the old one on a pending row -->
            <div v-else-if="col.field === 'lastSync'" class="flex flex-col">
              <template v-if="data.currentDevice?.lastSyncAt">
                <span>{{ lastSyncText(data.currentDevice.lastSyncAt) }}</span>
                <span v-if="data.pendingDevice" class="text-xs text-stone-500">
                  {{ t('deviceBinding.device.fromOldPhone') }}
                </span>
                <span
                  v-else-if="relativeDay(data.currentDevice.lastSyncAt).kind === 'daysAgo'"
                  class="text-xs text-stone-500"
                >
                  {{ dayjs(data.currentDevice.lastSyncAt).format('DD MMM YYYY HH:mm') }}
                </span>
              </template>
              <span v-else class="text-stone-400">
                {{ data.currentDevice ? t('deviceBinding.device.never') : '—' }}
              </span>
            </div>

            <!-- Status -->
            <div
              v-else-if="col.field === 'status'"
              class="flex flex-col items-end gap-1 md:items-start"
            >
              <Tag
                :severity="statusSeverity(data.status)"
                :value="t(`deviceBinding.status.${data.status}`)"
              />
            </div>

            <!-- Actions -->
            <DeviceBindingRowActions
              v-else-if="col.field === ''"
              :row="data"
              :can-write="canWrite"
              @view-code="openCode(data)"
              @review="data.pendingDevice && openReview(data.pendingDevice.id)"
              @history="openHistory(data.employee.id)"
              @action="(kind) => openAction(kind, data)"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>

    <ActivationCodeDialog
      v-if="codeRow"
      :row="codeRow"
      :initial="codeInitial"
      :toast-group="toastGroup"
      @close="closeCode"
    />

    <DeviceActionReasonDialog
      v-if="action"
      :kind="action.kind"
      :row="action.row"
      :toast-group="toastGroup"
      @close="action = undefined"
      @done="onActionDone"
    />

    <DeviceChangeReviewDialog
      v-if="reviewDeviceId"
      :device-id="reviewDeviceId"
      :toast-group="toastGroup"
      @close="closeReview"
      @changed="refresh"
    />

    <DeviceHistoryDrawer
      v-if="historyEmployeeId"
      :employee-id="historyEmployeeId"
      :toast-group="toastGroup"
      @close="closeHistory"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import StatFilterCard, { type StatFilterSeverity } from '@/components/card/StatFilterCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { DeviceBindingService, SalesTeamsService } from '@/services'
import { usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import { branchLabel } from '@/utils/branchHelper'
import type { Base } from '@/types/api.type'
import type { Column } from '@/types/table.type'
import type { SalesTeam } from '@/types/salesTeam.type'
import type {
  ActivationCodeView,
  DeviceActionKind,
  DeviceBinding,
  DeviceBindingStatusFilter,
  DeviceBindingSummary,
  DevicePlatform,
} from '@/types/deviceBinding.type'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import { initials, relativeDay, shortUid, statusSeverity } from './deviceBindingHelpers'
import DeviceCell from './components/DeviceCell.vue'
import DeviceBindingRowActions from './components/DeviceBindingRowActions.vue'
import ActivationCodeDialog from './components/ActivationCodeDialog.vue'
import DeviceActionReasonDialog from './components/DeviceActionReasonDialog.vue'
import DeviceChangeReviewDialog from './components/DeviceChangeReviewDialog.vue'
import DeviceHistoryDrawer from './components/DeviceHistoryDrawer.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/device-binding')
const { canRead: canReadConfig } = usePermissions('/device-binding-configs')

const toastGroup = 'deviceBindingView'
const table = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>()
const filterTeamId = ref<number | undefined>()
const filterPlatform = ref<DevicePlatform | undefined>()
const filterOutdated = ref(false)
const statusFilter = ref<DeviceBindingStatusFilter | null>(null)

/** The selected branch's active teams; `/v1/sales-teams` reads the generic query through its adapter. */
function fetchTeams(query: string): Promise<Base<SalesTeam>> {
  const params = new URLSearchParams(SalesTeamsService.toListQuery(query))
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  params.set('status', 'active')
  return SalesTeamsService.list(params.toString())
}

const platformOptions = computed(() => [
  { label: 'Android', value: 'android' },
  { label: 'iOS', value: 'ios' },
])

const versionOptions = computed(() => [
  { label: t('deviceBinding.filters.allVersions'), value: false },
  { label: t('deviceBinding.filters.outdatedOnly'), value: true },
])

function toggleStatus(key: DeviceBindingStatusFilter) {
  statusFilter.value = statusFilter.value === key ? null : key
}

// A team belongs to one branch, so it can't outlive a branch change.
watch(filterBranchId, () => {
  filterTeamId.value = undefined
})

const summaryFilters = computed(() => ({
  branchId: filterBranchId.value,
  teamId: filterTeamId.value,
  platform: filterPlatform.value,
}))

const url = computed(() =>
  DeviceBindingService.listUrl({
    ...summaryFilters.value,
    status: statusFilter.value,
    outdated: filterOutdated.value,
  }),
)

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// Summary and stat cards (they ignore the status filter, so they stay stable)
// ---------------------------------------------------------------------------

const summary = ref<DeviceBindingSummary | null>(null)

async function loadSummary() {
  const filters = summaryFilters.value
  try {
    const result = await DeviceBindingService.summary(filters)
    // A late answer for filters no longer selected must not overwrite the current one.
    if (filters !== summaryFilters.value) return
    summary.value = result
  } catch {
    summary.value = null
  }
}

watch(summaryFilters, loadSummary)

const statCards = computed<
  { key: DeviceBindingStatusFilter; count: number; label: string; severity: StatFilterSeverity }[]
>(() => {
  const s = summary.value
  if (!s) return []
  return [
    { key: 'active', count: s.active, label: t('deviceBinding.stats.active'), severity: 'success' },
    {
      key: 'pending_review',
      count: s.pending,
      label: t('deviceBinding.stats.pending'),
      severity: 'warn',
    },
    {
      key: 'blocked',
      count: s.blocked,
      label: t('deviceBinding.stats.blocked'),
      severity: 'danger',
    },
    {
      key: 'not_logged_in',
      count: s.notLoggedIn,
      label: t('deviceBinding.stats.notLoggedIn'),
      severity: 'secondary',
    },
    {
      key: 'stale24h',
      count: s.stale24h,
      label: t('deviceBinding.stats.stale24h'),
      severity: 'warn',
    },
  ]
})

async function refresh() {
  await Promise.all([loadSummary(), table.value?.clearSearch()])
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** A pending row shows the phone asking to be bound; the bound one is in its sub-line. */
function shownDevice(row: DeviceBinding) {
  return row.pendingDevice ?? row.currentDevice
}

function rowClass(row: DeviceBinding): string | undefined {
  return row.status === 'pending_review' ? '!bg-amber-50' : undefined
}

function modeLabel(typeName: string): string {
  if (typeName === EMPLOYEE_TYPE_NAMES.CANVASS) return t('deviceBinding.mode.canvass')
  if (typeName === EMPLOYEE_TYPE_NAMES.SALESMAN) return t('deviceBinding.mode.salesman')
  return typeName
}

function lastSyncText(iso: string): string {
  const day = relativeDay(iso)
  if (day.kind === 'today') return t('deviceBinding.time.today', { time: day.time })
  if (day.kind === 'yesterday') return t('deviceBinding.time.yesterday', { time: day.time })
  return t('deviceBinding.time.daysAgo', { n: day.days })
}

// ---------------------------------------------------------------------------
// Dialogs. The page owns them, so only one of each exists.
// ---------------------------------------------------------------------------

const codeRow = ref<DeviceBinding>()
const codeInitial = ref<ActivationCodeView>()
const action = ref<{ kind: DeviceActionKind; row: DeviceBinding }>()
const reviewDeviceId = ref<number>()
const historyEmployeeId = ref<number>()

function openCode(row: DeviceBinding, initial?: ActivationCodeView) {
  codeInitial.value = initial
  codeRow.value = row
}

function closeCode() {
  codeRow.value = undefined
  codeInitial.value = undefined
  // Viewing may have generated a code, which changes the row's actions.
  refresh()
}

function openAction(kind: DeviceActionKind, row: DeviceBinding) {
  action.value = { kind, row }
}

function onActionDone(code?: ActivationCodeView) {
  const done = action.value
  action.value = undefined
  refresh()
  // A PIN reset hands back the new code: show it straight away.
  if (done?.kind === 'reset_pin' && code) openCode(done.row, code)
}

/** Deep links (`?request=` from My Approvals, `?employee=` from the employee form) stay in the url while open. */
function setQuery(patch: Record<string, string | undefined>) {
  const query = { ...route.query, ...patch }
  for (const key of Object.keys(query)) if (query[key] === undefined) delete query[key]
  router.replace({ query })
}

function openReview(deviceId: number) {
  reviewDeviceId.value = deviceId
}

function closeReview() {
  reviewDeviceId.value = undefined
  if (route.query.request) setQuery({ request: undefined })
}

function openHistory(employeeId: number) {
  historyEmployeeId.value = employeeId
}

function closeHistory() {
  historyEmployeeId.value = undefined
  if (route.query.employee) setQuery({ employee: undefined, panel: undefined })
}

function openFromQuery() {
  const request = Number(route.query.request)
  if (request > 0) openReview(request)
  const employee = Number(route.query.employee)
  if (employee > 0) openHistory(employee)
}

onMounted(() => {
  loadSummary()
  openFromQuery()
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

// None sortable: `/v1/device-binding` orders pending first, then by status and name.
const columns = computed<Column[]>(() =>
  (
    [
      ['employee.name', t('deviceBinding.columns.salesman'), false],
      ['mode', t('deviceBinding.columns.mode'), true],
      ['device', t('deviceBinding.columns.device'), false],
      ['deviceUid', t('deviceBinding.columns.deviceId'), true],
      ['app', t('deviceBinding.columns.app'), true],
      ['lastSync', t('deviceBinding.columns.lastSync'), false],
      ['status', t('deviceBinding.columns.status'), false],
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
