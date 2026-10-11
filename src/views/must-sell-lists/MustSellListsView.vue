<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="deleteAcceptanceHandler" />
    <ConfirmDialog :group="confirmGroup" />
    <Menu ref="rowMenu" :model="rowMenuItems" popup />

    <!-- Header -->
    <div class="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
          {{ t('mustSellLists.title') }}
        </h1>
        <p v-if="configLoaded" class="mt-1 text-sm text-stone-500" data-testid="list-subtitle">
          <template v-if="config">
            {{
              t('mustSellLists.list.subtitle', {
                level: t(scopeLevelLabelKey(config.scopeLevel)),
                active: counts?.active ?? 0,
                scheduled: counts?.scheduled ?? 0,
                draft: counts?.draft ?? 0,
              })
            }}
          </template>
          <template v-else>
            {{ t('mustSellLists.list.noConfig') }}
            <RouterLink to="/configs?tab=msl" class="text-primary-500 ml-1 underline">
              {{ t('mustSellLists.form.missingConfigLink') }}
            </RouterLink>
          </template>
        </p>
      </div>
      <Button
        v-if="canWrite"
        :label="t('mustSellLists.list.create')"
        icon="pi pi-plus"
        size="small"
        data-testid="create-msl"
        @click="router.push('/must-sell-lists/create')"
      />
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('mustSellLists.list.branch')"
        class="min-w-48"
      />
      <Select
        v-model="filterPrincipalId"
        :options="principalOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('mustSellLists.list.allPrincipals')"
        show-clear
        filter
        class="min-w-48"
      />
      <Select
        v-if="config"
        v-model="filterScopeId"
        :options="scopeOptions"
        option-label="name"
        option-value="id"
        :placeholder="
          t('mustSellLists.list.allScopes', { level: t(scopeLevelLabelKey(config.scopeLevel)) })
        "
        show-clear
        filter
        class="min-w-48"
      />
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        class="min-w-48"
        data-testid="status-filter"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          :query-adapter="MustSellListsService.toListQuery"
        >
          <template #content="{ col, data }">
            <a
              v-if="col.field === 'code'"
              class="text-primary-500 cursor-pointer font-mono hover:underline"
              @click.prevent="openList(data['id'])"
            >
              {{ data['code'] }}
            </a>

            <span v-if="col.field === 'name'">{{ data['name'] }}</span>

            <span v-if="col.field === 'principal'">{{ data['principal']?.name }}</span>

            <span v-if="col.field === 'period'">
              {{ formatPeriod(data['startDate'], data['endDate'], locale) }}
            </span>

            <div v-if="col.field === 'scope'" class="flex flex-wrap items-center gap-1">
              <Tag
                v-if="config && data['scopeLevel'] !== config.scopeLevel"
                :value="t(scopeLevelLabelKey(data['scopeLevel']))"
                severity="warn"
              />
              <Tag v-if="data['scopeAll']" :value="t('mustSellLists.list.allCustomers')" />
              <Tag
                v-for="value in data['scopeValues'] ?? []"
                :key="value.id"
                :value="value.name"
                severity="secondary"
                :class="{ 'opacity-60': !value.isActive || value.deleted }"
              />
            </div>

            <span v-if="col.field === 'itemCount'">{{ data['itemCount'] }}</span>

            <span v-if="col.field === 'customerCount'">
              {{ formatNumber(data['customerCount'], locale) }}
            </span>

            <MslStatusTag v-if="col.field === 'displayStatus'" :status="data['displayStatus']" />

            <div v-if="col.field === ''" class="flex items-center gap-1">
              <Button
                :icon="canWrite ? 'pi pi-pen-to-square' : 'pi pi-eye'"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="canWrite ? t('common.actions.edit') : t('common.actions.view')"
                @click="openList(data['id'])"
              />
              <Button
                icon="pi pi-ellipsis-v"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="t('mustSellLists.list.moreActions')"
                data-testid="row-menu"
                @click="(e: MouseEvent) => openRowMenu(e, data as MustSellListListItem)"
              />
            </div>
          </template>
        </TableComponent>
        <p class="mt-3 text-xs text-stone-500">{{ t('mustSellLists.list.footnote') }}</p>
      </template>
    </ResponsiveCard>

    <MslCustomersDialog
      v-if="customersRow"
      visible
      :branch-id="customersRow.branchId"
      :scope-level="customersRow.row.scopeLevel"
      :scope-all="customersRow.row.scopeAll"
      :scope-value-ids="
        (customersRow.row.scopeValues ?? []).filter((v) => !v.deleted).map((v) => v.id)
      "
      :toast-group="toastGroup"
      @close="customersRow = undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Menu from 'primevue/menu'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { MenuItem } from 'primevue/menuitem'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import {
  CustomerCategoriesService,
  CustomerChannelsService,
  CustomerOutletTypesService,
  MustSellListConfigService,
  MustSellListsService,
} from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useConfirmDelete, usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { API_ENDPOINTS } from '@/constants/api'
import { PERMISSIONS } from '@/constants/permissions'
import { branchLabel } from '@/utils/branchHelper'
import type { Column } from '@/types/table.type'
import type {
  MslScopeLevel,
  MslStatusCounts,
  MslStatusFilter,
  MustSellListConfig,
  MustSellListListItem,
} from '@/types/mustSellList.type'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import {
  formatNumber,
  formatPeriod,
  mslErrorCode,
  scopeLevelLabelKey,
  translateMslError,
} from './mustSellListHelpers'
import MslCustomersDialog from './components/MslCustomersDialog.vue'
import MslStatusTag from './components/MslStatusTag.vue'

const { t, te, locale } = useI18n()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const { canWrite, hasPermission } = usePermissions('/must-sell-lists')
const canPublish = hasPermission(PERMISSIONS.MSL_PUBLISH)

const toastGroup = 'mustSellListsView'
const confirmGroup = 'mustSellListsViewConfirm'
const table = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>(
  authStore.primaryBranchId ?? authStore.branchIds[0] ?? undefined,
)
const filterPrincipalId = ref<number | undefined>()
const filterScopeId = ref<number | undefined>()
const filterStatus = ref<MslStatusFilter>('current')

const principalOptions = ref<{ label: string; value: number }[]>([])
async function loadPrincipalOptions() {
  try {
    const options = await loadLabelFilterOptions('principal', '')
    principalOptions.value = options
      .filter((o) => o.value !== NO_LABEL)
      .map((o) => ({ label: o.label, value: o.value as number }))
  } catch {
    // Non-critical: the principal filter stays empty.
  }
}

const statusOptions = computed(() =>
  (['current', 'draft', 'scheduled', 'active', 'ended', 'all'] as MslStatusFilter[]).map((s) => ({
    label: t(`mustSellLists.list.statusFilter.${s}`),
    value: s,
  })),
)

const url = computed(() => {
  const params = new URLSearchParams()
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  if (filterPrincipalId.value) params.set('principalOptionId', String(filterPrincipalId.value))
  if (filterScopeId.value) params.set('scopeOptionId', String(filterScopeId.value))
  params.set('status', filterStatus.value)
  return `${API_ENDPOINTS.MUST_SELL_LISTS}?${params.toString()}`
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// The branch's config (level) and header counts
// ---------------------------------------------------------------------------

const config = ref<MustSellListConfig | null>(null)
const configLoaded = ref(false)
const counts = ref<MslStatusCounts | null>(null)
const scopeOptions = ref<{ id: number; name: string }[]>([])

async function loadScopeOptions(level: MslScopeLevel | undefined) {
  scopeOptions.value = []
  if (!level) return
  try {
    const query = new GenericQueryBuilder().withPagination(1, 500).build()
    const lister =
      level === 'outlet_type'
        ? CustomerOutletTypesService
        : level === 'channel'
          ? CustomerChannelsService
          : CustomerCategoriesService
    const res = await lister.list(query)
    scopeOptions.value = res.data.map((o) => ({ id: o.id, name: o.name }))
  } catch {
    // Non-critical: the scope filter stays empty.
  }
}

async function loadBranchContext() {
  const branchId = filterBranchId.value
  configLoaded.value = false
  if (!branchId) return
  try {
    const [cfg, list] = await Promise.all([
      MustSellListConfigService.getMyBranch(branchId),
      MustSellListsService.list(`branchId=${branchId}&status=all&limit=1`),
    ])
    // A late answer for a branch no longer selected must not overwrite the current one.
    if (branchId !== filterBranchId.value) return
    config.value = cfg
    counts.value = list.meta.counts ?? null
    await loadScopeOptions(cfg?.scopeLevel)
  } catch {
    config.value = null
    counts.value = null
  }
  configLoaded.value = true
}

watch(filterBranchId, () => {
  filterScopeId.value = undefined
  loadBranchContext()
})

onMounted(() => {
  loadPrincipalOptions()
  loadBranchContext()
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function openList(id: number) {
  router.push(`/must-sell-lists/${id}/edit`)
}

async function refresh() {
  await Promise.all([loadBranchContext(), table.value?.clearSearch()])
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: 'list',
  onSuccess: refresh,
})

// None sortable: `/v1/must-sell-lists` orders by status, start date then code and reads no sort parameter.
const columns = computed<Column[]>(() =>
  [
    { field: 'code', header: t('mustSellLists.list.columns.code') },
    { field: 'name', header: t('mustSellLists.list.columns.name') },
    { field: 'principal', header: t('mustSellLists.list.columns.principal'), hideOnMobile: true },
    { field: 'period', header: t('mustSellLists.list.columns.period'), hideOnMobile: true },
    { field: 'scope', header: t('mustSellLists.list.columns.scope'), hideOnMobile: true },
    { field: 'itemCount', header: t('mustSellLists.list.columns.products'), hideOnMobile: true },
    {
      field: 'customerCount',
      header: t('mustSellLists.list.columns.customers'),
      hideOnMobile: true,
    },
    { field: 'displayStatus', header: t('mustSellLists.list.columns.status') },
    { field: '', header: t('common.labels.actions') },
  ].map((c) => ({ exportable: false, sortable: false, filterable: false, ...c })),
)

// ---------------------------------------------------------------------------
// Row menu: duplicate, end early, view customers, delete
// ---------------------------------------------------------------------------

const rowMenu = ref()
const menuRow = ref<MustSellListListItem | undefined>()
const customersRow = ref<{ branchId: number; row: MustSellListListItem } | undefined>()

const rowMenuItems = computed<MenuItem[]>(() => {
  const row = menuRow.value
  if (!row) return []
  const items: MenuItem[] = []
  if (canWrite) {
    items.push({
      label: t('mustSellLists.actions.duplicate'),
      icon: 'pi pi-copy',
      command: () => onDuplicate(row),
    })
  }
  if (canPublish && row.displayStatus === 'active') {
    items.push({
      label: t('mustSellLists.actions.endEarly'),
      icon: 'pi pi-stop-circle',
      command: () => onEndEarly(row),
    })
  }
  items.push({
    label: t('mustSellLists.actions.viewCustomers'),
    icon: 'pi pi-users',
    command: () => {
      customersRow.value = { branchId: row.branch.id, row }
    },
  })
  if (canWrite && row.status === 'draft') {
    items.push({
      label: t('mustSellLists.actions.delete'),
      icon: 'pi pi-trash',
      command: () => confirmDelete(() => MustSellListsService.delete(row.id)),
    })
  }
  return items
})

function openRowMenu(event: MouseEvent, row: MustSellListListItem) {
  menuRow.value = row
  // The model is computed from menuRow; let it settle before the popup measures it.
  nextTick(() => rowMenu.value?.toggle(event))
}

async function onDuplicate(row: MustSellListListItem) {
  try {
    const copy = await MustSellListsService.duplicate(row.id)
    toast.add(
      commonSuccessToast(t('mustSellLists.messages.duplicated', { code: copy.code }), toastGroup),
    )
    if (copy.scopeCleared) {
      toast.add({
        severity: 'warn',
        summary: t('mustSellLists.messages.scopeCleared'),
        life: 6000,
        group: toastGroup,
      })
    }
    await router.push(`/must-sell-lists/${copy.id}/edit`)
  } catch (e) {
    toast.add(commonErrorToast(translateMslError(e, t, te), toastGroup))
  }
}

function onEndEarly(row: MustSellListListItem) {
  confirm.require({
    group: confirmGroup,
    header: t('mustSellLists.actions.endEarly'),
    message: t('mustSellLists.actions.endEarlyConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('mustSellLists.actions.endEarly') },
    accept: async () => {
      try {
        await MustSellListsService.endEarly(row.id, row.version)
        toast.add(commonSuccessToast(t('mustSellLists.messages.endedEarly'), toastGroup))
        await refresh()
      } catch (e) {
        const message =
          mslErrorCode(e) === 'MSL_STALE' ? new Error(t('mustSellLists.stale.message')) : e
        toast.add(commonErrorToast(translateMslError(message, t, te), toastGroup))
        await refresh()
      }
    },
  })
}
</script>
