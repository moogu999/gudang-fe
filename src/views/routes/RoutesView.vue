<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog :group="confirmGroup" />
    <Menu ref="rowMenu" :model="rowMenuItems" popup />

    <!-- Header -->
    <div class="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
          {{ t('routes.title') }}
        </h1>
        <p v-if="summary && selectedBranchName" class="mt-1 text-sm text-stone-500">
          {{
            t('routes.stats', {
              branch: selectedBranchName,
              routes: summary.routes,
              customers: summary.activeCustomersInRoutes,
              week: summary.cycleWeekToday,
            })
          }}
        </p>
      </div>
      <Button
        v-if="canWrite"
        :label="t('routes.createRoute')"
        icon="pi pi-plus"
        size="small"
        @click="router.push('/routes/create')"
      />
    </div>

    <!-- Banners: per branch, so only with one branch selected -->
    <Message
      v-if="filterBranchId && summary && summary.unroutedCustomers > 0"
      severity="warn"
      class="mb-3"
      data-testid="unrouted-banner"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {{ t('routes.banner.unrouted', { n: summary.unroutedCustomers }, summary.unroutedCustomers) }}
          <template v-if="summary.unroutedTopCustomerType">
            {{ t('routes.banner.unroutedTop', { name: summary.unroutedTopCustomerType.name }) }}
          </template>
        </span>
        <Button
          :label="t('routes.banner.viewCustomers')"
          size="small"
          text
          @click="isUnroutedShown = true"
        />
      </div>
    </Message>

    <Message
      v-if="filterBranchId && summary && (summary.customNextMonthMissing ?? 0) > 0"
      severity="warn"
      class="mb-3"
      data-testid="custom-banner"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {{
            t('routes.banner.customNextMonth', {
              n: summary.customNextMonthMissing,
              month: nextMonthName,
            }, summary.customNextMonthMissing ?? 0)
          }}
        </span>
        <Button
          v-if="canWrite"
          :label="t('routes.banner.reviewAndCopy')"
          size="small"
          text
          @click="isCustomShown = true"
        />
      </div>
    </Message>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('routes.filters.allBranches')"
        class="min-w-48"
        show-clear
        @select-option="(b) => (selectedBranchName = b.name)"
      />
      <Select
        v-model="filterTeamId"
        :options="teamOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('routes.filters.allTeams')"
        :disabled="!filterBranchId"
        show-clear
        filter
        class="min-w-48"
      />
      <Select
        v-model="filterHolderState"
        :options="holderStateOptions"
        option-label="label"
        option-value="value"
        class="min-w-48"
      />
      <InfiniteSelect
        :key="`holder-${filterBranchId ?? 'all'}`"
        v-model="filterHolderId"
        :fetch-fn="(q: string) => EmployeesService.listForSelect(q)"
        :custom-filters="holderFilters"
        :option-label="employeeLabel"
        option-value="id"
        :placeholder="t('routes.filters.anySalesman')"
        class="min-w-48"
        show-clear
      />
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        class="min-w-36"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          :query-adapter="RoutesService.toListQuery"
        >
          <template #content="{ col, data }">
            <a
              v-if="col.field === 'code'"
              class="text-[var(--p-primary-500)] cursor-pointer font-mono hover:underline"
              @click.prevent="openRoute(data['id'])"
            >
              {{ data['code'] }}
            </a>

            <span v-if="col.field === 'name'">{{ data['name'] }}</span>

            <span v-if="col.field === 'salesTeam.name'">
              <span class="font-mono">{{ data['salesTeam'].code }}</span>
              {{ data['salesTeam'].name }}
            </span>

            <div v-if="col.field === 'holder'">
              <template v-if="data['holder']">
                <div>{{ data['holder'].name }}</div>
              </template>
              <Tag v-else-if="!data['pendingHolder']" severity="warn" :value="t('routes.noSalesman')" />
              <div v-if="data['pendingHolder']" class="text-xs text-stone-500">
                {{
                  t('routes.pendingHolder', {
                    name: data['pendingHolder'].name,
                    date: data['pendingHolder'].startDate,
                  })
                }}
              </div>
            </div>

            <div v-if="col.field === 'visitDays'" class="flex flex-wrap items-center gap-1">
              <WeekdayChips :model-value="data['visitDays']" readonly />
              <Tag
                v-if="data['hasCustom']"
                severity="warn"
                :value="t('routes.pattern.CUSTOM')"
              />
            </div>

            <span v-if="col.field === 'customerCount'">{{ data['customerCount'] }}</span>

            <Tag
              v-if="col.field === 'isActive'"
              :value="statusLabel(data as Route)"
              :severity="statusSeverity(data as Route)"
            />

            <div v-if="col.field === ''" class="flex items-center gap-1">
              <Button
                icon="pi pi-ellipsis-v"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="t('common.labels.actions')"
                aria-haspopup="true"
                @click="openMenu($event, data as Route)"
              />
            </div>
          </template>
        </TableComponent>
        <p class="mt-3 text-xs text-stone-500">{{ t('routes.footnote') }}</p>
      </template>
    </ResponsiveCard>

    <RouteChangeSalesmanDialog
      v-if="handoverRoute"
      :route="handoverRoute"
      :toast-group="toastGroup"
      @close="handoverRoute = undefined"
      @changed="refresh"
    />

    <RouteUnroutedDialog
      v-if="filterBranchId"
      :visible="isUnroutedShown"
      :branch-id="filterBranchId"
      :toast-group="toastGroup"
      @close="isUnroutedShown = false"
    />

    <RouteCustomNextMonthDialog
      v-if="filterBranchId"
      :visible="isCustomShown"
      :branch-id="filterBranchId"
      :toast-group="toastGroup"
      @close="isCustomShown = false"
      @changed="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Menu from 'primevue/menu'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { MenuItem } from 'primevue/menuitem'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import WeekdayChips from '@/components/calendar/WeekdayChips.vue'
import { EmployeesService, RoutesService, SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { API_ENDPOINTS } from '@/constants/api'
import FilterOperator from '@/constants/filterOperator'
import { branchLabel } from '@/utils/branchHelper'
import type { Column } from '@/types/table.type'
import type { Route, RoutesSummary } from '@/types'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import { translateRouteError } from './routeErrors'
import RouteChangeSalesmanDialog from './components/RouteChangeSalesmanDialog.vue'
import RouteUnroutedDialog from './components/RouteUnroutedDialog.vue'
import RouteCustomNextMonthDialog from './components/RouteCustomNextMonthDialog.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const confirm = useConfirm()
const toast = useToast()
const { canWrite } = usePermissions('/routes')

const toastGroup = 'routesView'
const confirmGroup = 'routesViewConfirm'
const table = ref()
const rowMenu = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

type HolderStateFilter = 'all' | 'assigned' | 'none' | 'pending'
type StatusFilter = 'active' | 'inactive' | 'all'

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>(
  authStore.primaryBranchId ?? authStore.branchIds[0] ?? undefined,
)
const selectedBranchName = ref('')
const filterTeamId = ref<number | undefined>()
const filterHolderState = ref<HolderStateFilter>('all')
const filterHolderId = ref<number | undefined>()
const filterStatus = ref<StatusFilter>('active')
const teamOptions = ref<{ label: string; value: number }[]>([])

const holderStateOptions = computed(() => [
  { label: t('routes.filters.holderAll'), value: 'all' },
  { label: t('routes.filters.holderAssigned'), value: 'assigned' },
  { label: t('routes.filters.holderNone'), value: 'none' },
  { label: t('routes.filters.holderPending'), value: 'pending' },
])

const statusOptions = computed(() => [
  { label: t('routes.filters.statusActive'), value: 'active' },
  { label: t('routes.filters.statusInactive'), value: 'inactive' },
  { label: t('routes.filters.statusAll'), value: 'all' },
])

const holderFilters = computed(() =>
  filterBranchId.value
    ? [
        { filterBy: 'branchId', filterOperator: FilterOperator.EQUAL, filterValue: filterBranchId.value },
        { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
      ]
    : [],
)

function employeeLabel(e: { name: string; nip?: string | null }): string {
  return e.nip ? `${e.name} · ${e.nip}` : e.name
}

async function loadTeamOptions() {
  filterTeamId.value = undefined
  teamOptions.value = []
  if (!filterBranchId.value) return
  const branchId = filterBranchId.value
  try {
    const res = await SalesTeamsService.list(`branchId=${branchId}&status=active&limit=100`)
    if (branchId !== filterBranchId.value) return
    teamOptions.value = res.data.map((team) => ({ label: `${team.code} · ${team.name}`, value: team.id }))
  } catch {
    // Non-critical: the team filter just stays empty.
  }
}

async function loadSelectedBranchName() {
  if (!filterBranchId.value) return
  const res = await fetchBranches('')
  const branch = res.data.find((b) => b.id === filterBranchId.value)
  if (branch) selectedBranchName.value = branch.name
}

const url = computed(() => {
  const params = new URLSearchParams()
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  if (filterTeamId.value) params.set('salesTeamId', String(filterTeamId.value))
  if (filterHolderState.value !== 'all') params.set('holderState', filterHolderState.value)
  if (filterHolderId.value) params.set('holderId', String(filterHolderId.value))
  if (filterStatus.value !== 'all') params.set('isActive', String(filterStatus.value === 'active'))
  const qs = params.toString()
  return qs ? `${API_ENDPOINTS.ROUTES}?${qs}` : API_ENDPOINTS.ROUTES
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

watch(filterBranchId, () => {
  loadTeamOptions()
  loadSummary()
})

// ---------------------------------------------------------------------------
// Header stats and banners
// ---------------------------------------------------------------------------

const summary = ref<RoutesSummary | null>(null)
const isUnroutedShown = ref(false)
const isCustomShown = ref(false)
const nextMonthName = computed(() => dayjs().add(1, 'month').format('MMMM'))

async function loadSummary() {
  const branchId = filterBranchId.value
  if (!branchId) {
    summary.value = null
    return
  }
  const [result] = await Promise.allSettled([RoutesService.summary(branchId)])
  // A late answer for a branch no longer selected must not overwrite the current one.
  if (branchId !== filterBranchId.value) return
  summary.value = result.status === 'fulfilled' ? result.value : null
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadTeamOptions(), loadSelectedBranchName()])
})

async function refresh() {
  await Promise.all([loadSummary(), table.value?.clearSearch()])
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function openRoute(id: number) {
  router.push(`/routes/${id}/edit`)
}

function statusLabel(route: Route): string {
  if (!route.isActive) return t('routes.status.inactive')
  if (!route.holder && !route.pendingHolder) return t('routes.status.noSalesman')
  return t('routes.status.active')
}

function statusSeverity(route: Route): 'success' | 'secondary' | 'warn' {
  if (!route.isActive) return 'secondary'
  if (!route.holder && !route.pendingHolder) return 'warn'
  return 'success'
}

// None sortable: `/v1/routes` orders by code and reads no sort parameter.
const columns = computed<Column[]>(() => [
  { field: 'code', header: t('routes.columns.code'), exportable: false, sortable: false, filterable: false },
  { field: 'name', header: t('routes.columns.name'), exportable: false, sortable: false, filterable: false },
  {
    field: 'salesTeam.name',
    header: t('routes.columns.team'),
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  { field: 'holder', header: t('routes.columns.salesman'), exportable: false, sortable: false, filterable: false },
  {
    field: 'visitDays',
    header: t('routes.columns.visitDays'),
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'customerCount',
    header: t('routes.columns.customers'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  { field: 'isActive', header: t('routes.columns.status'), exportable: false, sortable: false, filterable: false },
  { field: '', header: t('common.labels.actions'), exportable: false, sortable: false, filterable: false },
])

// ---------------------------------------------------------------------------
// Row menu
// ---------------------------------------------------------------------------

const menuRoute = ref<Route | undefined>()
const handoverRoute = ref<Route | undefined>()

const rowMenuItems = computed<MenuItem[]>(() => {
  const route = menuRoute.value
  if (!route) return []
  const items: MenuItem[] = [
    { label: t('routes.menu.open'), icon: 'pi pi-eye', command: () => openRoute(route.id) },
  ]
  if (canWrite.value) {
    items.push({
      label: t('routes.menu.changeSalesman'),
      icon: 'pi pi-user-edit',
      disabled: !route.isActive,
      command: () => (handoverRoute.value = route),
    })
    items.push({
      label: route.isActive ? t('routes.menu.deactivate') : t('routes.menu.activate'),
      icon: route.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
      command: () => confirmToggle(route),
    })
  }
  return items
})

function openMenu(event: Event, route: Route) {
  menuRoute.value = route
  rowMenu.value?.toggle(event)
}

function confirmToggle(route: Route) {
  const deactivating = route.isActive
  confirm.require({
    group: confirmGroup,
    header: deactivating ? t('routes.deactivate.header') : t('routes.activate.header'),
    message: deactivating
      ? t('routes.deactivate.message', { code: route.code })
      : t('routes.activate.message', { code: route.code }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: {
      label: deactivating ? t('routes.menu.deactivate') : t('routes.menu.activate'),
    },
    accept: async () => {
      try {
        if (deactivating) await RoutesService.deactivate(route.id)
        else await RoutesService.activate(route.id)
        toast.add(
          commonSuccessToast(
            deactivating ? t('routes.messages.deactivated') : t('routes.messages.activated'),
            toastGroup,
          ),
        )
        await refresh()
      } catch (e) {
        toast.add(commonErrorToast(translateRouteError(e, t), toastGroup))
      }
    },
  })
}
</script>
