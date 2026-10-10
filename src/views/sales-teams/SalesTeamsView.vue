<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog :group="confirmGroup" />

    <!-- Header -->
    <div class="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
          {{ t('salesTeams.title') }}
        </h1>
        <p v-if="summary" class="mt-1 text-sm text-stone-500">
          {{
            t('salesTeams.stats', {
              teams: summary.activeTeams,
              salesmen: summary.salesmen,
              withoutTeam: summary.salesmenWithoutTeam,
            })
          }}
        </p>
      </div>
      <Button
        v-if="canWrite"
        :label="t('salesTeams.createTeam')"
        icon="pi pi-plus"
        size="small"
        @click="router.push('/sales-teams/create')"
      />
    </div>

    <!-- Uncovered SKUs: per branch, so only with one branch selected -->
    <Message v-if="filterBranchId && uncovered && uncovered.total > 0" severity="warn" class="mb-4">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {{ t('salesTeams.banner.text', { n: uncovered.total, branch: selectedBranchName }) }}
          <template v-if="uncovered.latest">
            {{
              t('salesTeams.banner.latest', {
                name: uncovered.latest.name,
                date: uncovered.latest.createdAt
                  ? dayjs(uncovered.latest.createdAt).format(DateFormat.DATE)
                  : '—',
              })
            }}
          </template>
        </span>
        <i
          v-tooltip.top="t('salesTeams.banner.caveat')"
          class="pi pi-info-circle cursor-help text-sm"
        />
        <Button
          :label="t('salesTeams.banner.view')"
          size="small"
          text
          @click="isUncoveredDialogShown = true"
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
        :placeholder="t('salesTeams.filters.allBranches')"
        class="min-w-48"
        show-clear
        @select-option="(b) => (selectedBranchName = branchLabel(b))"
      />
      <Select
        v-model="filterPrincipal"
        :options="principalOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('salesTeams.filters.allPrincipals')"
        show-clear
        filter
        class="min-w-48"
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
          :query-adapter="SalesTeamsService.toListQuery"
        >
          <template #content="{ col, data }">
            <a
              v-if="col.field === 'code'"
              class="text-primary-500 cursor-pointer font-mono hover:underline"
              @click.prevent="openTeam(data['id'])"
            >
              {{ data['code'] }}
            </a>

            <div v-if="col.field === 'name'" class="flex flex-wrap items-center gap-2">
              <span>{{ data['name'] }}</span>
              <Tag
                v-if="data['channel']"
                v-tooltip.top="data['channel'].name"
                :value="data['channel'].code"
                severity="secondary"
              />
            </div>

            <div v-if="col.field === 'supervisor.name'" class="flex items-center gap-1">
              <span>{{ data['supervisor']?.name }}</span>
              <i
                v-if="data['supervisor'] && !data['supervisor'].isActive"
                v-tooltip.top="t('salesTeams.supervisorInactive')"
                class="pi pi-exclamation-triangle text-sm text-amber-500"
              />
            </div>

            <span v-if="col.field === 'principals'">
              <template v-if="data['principals']?.length">
                {{ principalSummaryText(data['principals'], t('salesTeams.noPrincipal'), 2) }}
                <span
                  v-if="data['principals'].length > 2"
                  v-tooltip.top="
                    principalSummaryText(data['principals'].slice(2), t('salesTeams.noPrincipal'))
                  "
                  class="ml-1 cursor-help text-stone-500"
                >
                  +{{ data['principals'].length - 2 }}
                </span>
              </template>
              <span v-else class="text-stone-400">—</span>
            </span>

            <span v-if="col.field === 'skuCount'">{{ data['skuCount'] }}</span>
            <span v-if="col.field === 'memberCount'">{{ data['memberCount'] }}</span>

            <Tag
              v-if="col.field === 'isActive'"
              :value="
                data['isActive'] ? t('salesTeams.status.active') : t('salesTeams.status.inactive')
              "
              :severity="data['isActive'] ? 'success' : 'secondary'"
            />

            <div v-if="col.field === ''" class="flex items-center gap-1">
              <Button
                :icon="canWrite ? 'pi pi-pen-to-square' : 'pi pi-eye'"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="canWrite ? t('common.actions.edit') : t('common.actions.view')"
                @click="openTeam(data['id'])"
              />
              <SalesTeamRowActions
                :team="data as SalesTeam"
                :can-write="canWrite"
                :toast-group="toastGroup"
                :confirm-group="confirmGroup"
                @changed="refresh"
                @duplicate="(team) => (duplicateSource = team)"
              />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>

    <SalesTeamDuplicateDialog
      :source="duplicateSource"
      :toast-group="toastGroup"
      @close="duplicateSource = undefined"
    />

    <SalesTeamUncoveredDialog
      v-if="filterBranchId"
      :visible="isUncoveredDialogShown"
      :branch-id="filterBranchId"
      :branch-name="selectedBranchName"
      :toast-group="toastGroup"
      @close="isUncoveredDialogShown = false"
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
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { SalesTeamsService } from '@/services'
import { usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import { branchLabel } from '@/utils/branchHelper'
import type { Column } from '@/types/table.type'
import type {
  SalesTeam,
  SalesTeamStatusFilter,
  SalesTeamSummary,
  UncoveredProduct,
} from '@/types/salesTeam.type'
import { principalSummaryText } from './salesTeamGrouping'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
  type LabelSelectValue,
} from './salesTeamHelpers'
import SalesTeamRowActions from './components/SalesTeamRowActions.vue'
import SalesTeamDuplicateDialog from './components/SalesTeamDuplicateDialog.vue'
import SalesTeamUncoveredDialog from './components/SalesTeamUncoveredDialog.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/sales-teams')

const toastGroup = 'salesTeamsView'
const confirmGroup = 'salesTeamsRowActions'
const table = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>(
  authStore.primaryBranchId ?? authStore.branchIds[0] ?? undefined,
)
const selectedBranchName = ref('')

const filterPrincipal = ref<LabelSelectValue | undefined>()
const principalOptions = ref<{ label: string; value: LabelSelectValue }[]>([])

const filterStatus = ref<SalesTeamStatusFilter>('active')
const statusOptions = computed(() => [
  { label: t('salesTeams.filters.statusActive'), value: 'active' },
  { label: t('salesTeams.filters.statusInactive'), value: 'inactive' },
  { label: t('salesTeams.filters.statusAll'), value: 'all' },
])

async function loadPrincipalOptions() {
  try {
    principalOptions.value = await loadLabelFilterOptions('principal', t('salesTeams.noPrincipal'))
  } catch {
    // Non-critical: the principal filter just stays empty.
  }
}

async function loadSelectedBranchName() {
  if (!filterBranchId.value) return
  const res = await fetchBranches('')
  const branch = res.data.find((b) => b.id === filterBranchId.value)
  if (branch) selectedBranchName.value = branchLabel(branch)
}

const url = computed(() => {
  const params = new URLSearchParams({ status: filterStatus.value })
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  if (filterPrincipal.value === NO_LABEL) params.set('noPrincipal', 'true')
  else if (filterPrincipal.value) params.set('principalOptionId', String(filterPrincipal.value))
  return `${API_ENDPOINTS.SALES_TEAMS}?${params.toString()}`
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

watch(filterBranchId, () => {
  loadHeader()
})

// ---------------------------------------------------------------------------
// Header stats and the uncovered banner
// ---------------------------------------------------------------------------

const summary = ref<SalesTeamSummary | null>(null)
const uncovered = ref<{ total: number; latest?: UncoveredProduct } | null>(null)

async function loadHeader() {
  const branchId = filterBranchId.value
  const [summaryResult, uncoveredResult] = await Promise.allSettled([
    SalesTeamsService.summary(branchId),
    branchId ? SalesTeamsService.uncoveredProducts(branchId, { limit: 1 }) : Promise.resolve(null),
  ])
  // A late answer for a branch no longer selected must not overwrite the current one.
  if (branchId !== filterBranchId.value) return
  summary.value = summaryResult.status === 'fulfilled' ? summaryResult.value : null
  uncovered.value =
    uncoveredResult.status === 'fulfilled' && uncoveredResult.value
      ? { total: uncoveredResult.value.meta.total, latest: uncoveredResult.value.data[0] }
      : null
}

onMounted(async () => {
  await Promise.all([loadHeader(), loadPrincipalOptions(), loadSelectedBranchName()])
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

const isUncoveredDialogShown = ref(false)
const duplicateSource = ref<SalesTeam | undefined>()

function openTeam(id: number) {
  router.push(`/sales-teams/${id}/edit`)
}

async function refresh() {
  await Promise.all([loadHeader(), table.value?.clearSearch()])
}

// None sortable: `/v1/sales-teams` orders by code and reads no sort parameter.
const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('salesTeams.columns.code'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: 'name',
    header: t('salesTeams.columns.name'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: 'supervisor.name',
    header: t('salesTeams.columns.supervisor'),
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'principals',
    header: t('salesTeams.columns.principal'),
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'skuCount',
    header: t('salesTeams.columns.sku'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: 'memberCount',
    header: t('salesTeams.columns.salesmen'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: 'isActive',
    header: t('salesTeams.columns.status'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: '',
    header: t('common.labels.actions'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
])
</script>
