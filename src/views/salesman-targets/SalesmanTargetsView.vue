<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="deleteAcceptanceHandler" />

    <!-- Header -->
    <div class="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
          {{ t('salesmanTargets.title') }}
        </h1>
        <p v-if="counts" class="mt-1 text-sm text-stone-500">
          {{
            t('salesmanTargets.list.stats', {
              month: filterPeriod ? dayjs(filterPeriod).format('MMMM YYYY') : '',
              active: counts.active,
              draft: counts.draft,
              closed: counts.closed,
            })
          }}
        </p>
      </div>
      <Button
        v-if="canWrite"
        :label="t('salesmanTargets.list.create')"
        icon="pi pi-plus"
        size="small"
        @click="router.push('/salesman-targets/create')"
      />
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <MonthPicker v-model="filterPeriod" class="min-w-40" />
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('salesmanTargets.list.allBranches')"
        class="min-w-48"
        show-clear
      />
      <Select
        v-model="filterSource"
        :options="sourceOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('salesmanTargets.list.allSources')"
        show-clear
        class="min-w-48"
      />
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('salesmanTargets.list.allStatuses')"
        show-clear
        class="min-w-36"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          :query-adapter="SalesmanTargetsService.toListQuery"
          @loaded="onLoaded"
        >
          <template #content="{ col, data }">
            <a
              v-if="col.field === 'code'"
              class="text-primary-500 cursor-pointer font-mono hover:underline"
              @click.prevent="openTarget(data['id'])"
            >
              {{ data['code'] }}
            </a>

            <span v-if="col.field === 'branchName'">{{ data['branchName'] }}</span>

            <div v-if="col.field === 'source'" class="flex flex-wrap items-center gap-2">
              <template v-if="data['source'] === 'principal'">
                <Tag :value="t('salesmanTargets.source.principal')" severity="info" />
                <span>{{ data['principal']?.value }}</span>
              </template>
              <template v-else>
                <Tag :value="t('salesmanTargets.source.internal')" severity="secondary" />
                <span class="text-stone-500">{{ t('salesmanTargets.source.allProducts') }}</span>
              </template>
            </div>

            <span v-if="col.field === 'lineCount'">{{ data['lineCount'] }}</span>

            <span v-if="col.field === 'totalTargetValue'">
              <template v-if="data['hasValue'] && data['totalTargetValue'] !== undefined">
                Rp {{ formatNumber(Number(data['totalTargetValue']), locale) }}
              </template>
              <span v-else class="text-stone-400">—</span>
            </span>

            <span v-if="col.field === 'achieved'">
              <Skeleton
                v-if="achievedPending.has(data['id'] as number)"
                width="7rem"
                height="1rem"
                :aria-label="t('common.messages.loading')"
              />
              <template v-else-if="achievedText(data as SalesmanTargetListRow)">
                {{ achievedText(data as SalesmanTargetListRow) }}
              </template>
              <span v-else class="text-stone-400">—</span>
            </span>

            <span v-if="col.field === 'itemCount'">{{ data['itemCount'] }}</span>

            <SalesmanTargetStatusTag v-if="col.field === 'status'" :status="data['status']" />

            <div v-if="col.field === ''" class="flex items-center gap-1">
              <Button
                :icon="canWrite ? 'pi pi-pen-to-square' : 'pi pi-eye'"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="canWrite ? t('common.actions.edit') : t('common.actions.view')"
                @click="openTarget(data['id'])"
              />
              <Button
                v-if="canWrite && data['status'] === 'draft'"
                v-tooltip.top="t('common.actions.delete')"
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                :aria-label="t('common.actions.delete')"
                @click="onDeleteClick(data as SalesmanTargetListRow)"
              />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { SalesmanTargetsService } from '@/services'
import { useConfirmDelete, usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { API_ENDPOINTS } from '@/constants/api'
import { PERMISSIONS } from '@/constants/permissions'
import { branchLabel } from '@/utils/branchHelper'
import type { Column } from '@/types/table.type'
import type { SalesmanTargetListRow, TargetStatus } from '@/types/salesmanTarget.type'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import { formatNumber, toApiPeriod } from './salesmanTargetHelpers'
import MonthPicker from './components/MonthPicker.vue'
import SalesmanTargetStatusTag from './components/SalesmanTargetStatusTag.vue'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite, hasPermission } = usePermissions('/salesman-targets')
const canSeeAchievement = hasPermission(PERMISSIONS.SALESMAN_TARGET_ACHIEVEMENT_READ)

const toastGroup = 'salesmanTargetsView'
const table = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterPeriod = ref<Date | null>(dayjs().startOf('month').toDate())
const filterBranchId = ref<number | undefined>(
  authStore.primaryBranchId ?? authStore.branchIds[0] ?? undefined,
)

/** 'internal', a principal option id, or nothing for every source. */
type SourceFilter = 'internal' | number
const filterSource = ref<SourceFilter | undefined>()
const principalOptions = ref<{ label: string; value: SourceFilter }[]>([])
const filterStatus = ref<TargetStatus | undefined>()

const sourceOptions = computed(() => [
  { label: t('salesmanTargets.source.internal'), value: 'internal' as SourceFilter },
  ...principalOptions.value,
])
const statusOptions = computed(() =>
  (['draft', 'active', 'closed'] as TargetStatus[]).map((s) => ({
    label: t(`salesmanTargets.status.${s}`),
    value: s,
  })),
)

async function loadPrincipalOptions() {
  try {
    const options = await loadLabelFilterOptions('principal', '')
    principalOptions.value = options
      .filter((o) => o.value !== NO_LABEL)
      .map((o) => ({
        label: t('salesmanTargets.list.principalOption', { name: o.label }),
        value: o.value as number,
      }))
  } catch {
    // Non-critical: the source filter keeps just "Internal".
  }
}

/** The filters every list call shares, without the status. */
function baseParams(): URLSearchParams {
  const params = new URLSearchParams()
  if (filterPeriod.value) params.set('period', toApiPeriod(filterPeriod.value))
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  if (filterSource.value === 'internal') params.set('source', 'internal')
  else if (filterSource.value) {
    params.set('source', 'principal')
    params.set('principalOptionId', String(filterSource.value))
  }
  return params
}

const url = computed(() => {
  const params = baseParams()
  if (filterStatus.value) params.set('status', filterStatus.value)
  return `${API_ENDPOINTS.SALESMAN_TARGETS}?${params.toString()}`
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// Header counts: one cheap list call per status for the current filter
// ---------------------------------------------------------------------------

const counts = ref<Record<TargetStatus, number> | null>(null)

async function loadCounts() {
  const key = baseParams().toString()
  try {
    const statuses: TargetStatus[] = ['draft', 'active', 'closed']
    const totals = await Promise.all(
      statuses.map((status) => {
        const params = new URLSearchParams(key)
        params.set('status', status)
        params.set('limit', '1')
        return SalesmanTargetsService.list(params.toString())
      }),
    )
    // A late answer for a filter no longer selected must not overwrite the current one.
    if (key !== baseParams().toString()) return
    counts.value = {
      draft: totals[0].meta.total,
      active: totals[1].meta.total,
      closed: totals[2].meta.total,
    }
  } catch {
    counts.value = null
  }
}

watch(() => baseParams().toString(), loadCounts)

onMounted(() => {
  loadPrincipalOptions()
  loadCounts()
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function openTarget(id: number) {
  router.push(`/salesman-targets/${id}/edit`)
}

async function refresh() {
  await Promise.all([loadCounts(), table.value?.clearSearch()])
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: 'target',
  onSuccess: refresh,
})

function onDeleteClick(row: SalesmanTargetListRow) {
  confirmDelete(() => SalesmanTargetsService.delete(row.id))
}

// ---------------------------------------------------------------------------
// Achieved column: loaded after the rows, so a slow summary never holds the list
// ---------------------------------------------------------------------------

const achieved = ref(new Map<number, number>())
// Ids whose figure is in flight; their cell shows a skeleton, not an empty dash.
const achievedPending = ref(new Set<number>())
// Only the latest page's answer may land; a slow earlier page is dropped.
let achievedRequest = 0

async function onLoaded(loaded: Record<string, unknown>[]) {
  if (!canSeeAchievement) return
  const request = ++achievedRequest
  const ids = (loaded as unknown as SalesmanTargetListRow[])
    .filter((r) => r.status !== 'draft' && r.hasValue && r.totalTargetValue !== undefined)
    .map((r) => r.id)
  achieved.value = new Map()
  achievedPending.value = new Set(ids)
  if (ids.length === 0) return
  try {
    const summaries = await SalesmanTargetsService.achievementSummaries(ids)
    if (request !== achievedRequest) return
    achieved.value = new Map(summaries.map((s) => [s.targetId, Number(s.achievedValue)]))
  } catch (e) {
    if (request !== achievedRequest) return
    // The list stays usable without it.
    console.error('achievement summaries failed', e)
  } finally {
    if (request === achievedRequest) achievedPending.value = new Set()
  }
}

function achievedText(row: SalesmanTargetListRow): string {
  const value = achieved.value.get(row.id)
  if (value === undefined) return ''
  const target = Number(row.totalTargetValue)
  const text = `Rp ${formatNumber(value, locale.value)}`
  return target > 0 ? `${text} (${formatNumber((value / target) * 100, locale.value, 1)} %)` : text
}

// None sortable: `/v1/salesman-targets` orders by period then code and reads no sort parameter.
const columns = computed<Column[]>(() =>
  [
    { field: 'code', header: t('salesmanTargets.list.columns.code') },
    { field: 'branchName', header: t('salesmanTargets.list.columns.branch'), hideOnMobile: true },
    { field: 'source', header: t('salesmanTargets.list.columns.source') },
    { field: 'lineCount', header: t('salesmanTargets.list.columns.salesmen') },
    {
      field: 'totalTargetValue',
      header: t('salesmanTargets.list.columns.targetValue'),
      hideOnMobile: true,
    },
    ...(canSeeAchievement
      ? [
          {
            field: 'achieved',
            header: t('salesmanTargets.list.columns.achieved'),
            hideOnMobile: true,
          },
        ]
      : []),
    { field: 'itemCount', header: t('salesmanTargets.list.columns.items'), hideOnMobile: true },
    { field: 'status', header: t('salesmanTargets.list.columns.status') },
    { field: '', header: t('common.labels.actions') },
  ].map((c) => ({ exportable: false, sortable: false, filterable: false, ...c })),
)
</script>
