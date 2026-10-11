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
          {{ t('displayPrograms.title') }}
        </h1>
        <p v-if="counts" class="mt-1 text-sm text-stone-500" data-testid="list-subtitle">
          {{
            t('displayPrograms.list.subtitle', {
              active: counts.active,
              scheduled: counts.scheduled,
              draft: counts.draft,
            })
          }}
        </p>
      </div>
      <Button
        v-if="canWrite"
        :label="t('displayPrograms.list.create')"
        icon="pi pi-plus"
        size="small"
        data-testid="create-program"
        @click="router.push('/display-programs/create')"
      />
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('displayPrograms.list.branch')"
        class="min-w-48"
      />
      <Select
        v-model="filterPrincipal"
        :options="principalFilterOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('displayPrograms.list.allPrincipals')"
        show-clear
        filter
        class="min-w-48"
        data-testid="principal-filter"
      />
      <Select
        v-model="filterTypeId"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('displayPrograms.list.allTypes')"
        show-clear
        filter
        class="min-w-48"
        data-testid="type-filter"
      />
      <SelectButton
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        data-testid="status-filter"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          :query-adapter="DisplayProgramsService.toListQuery"
        >
          <template #content="{ col, data }">
            <div v-if="col.field === 'name'" class="flex flex-col">
              <a
                class="text-primary-500 cursor-pointer font-semibold hover:underline"
                @click.prevent="openProgram(data['id'])"
              >
                {{ data['name'] }}
              </a>
              <span class="font-mono text-xs text-stone-500">{{
                rowSubline(data as DisplayProgramListItem, t)
              }}</span>
            </div>

            <template v-if="col.field === 'principal'">
              <span v-if="data['principal']">{{ data['principal'].name }}</span>
              <span v-else class="text-stone-400">{{ t('displayPrograms.internal') }}</span>
            </template>

            <span v-if="col.field === 'displayType'">{{ data['displayType'].name }}</span>

            <span v-if="col.field === 'period'">
              {{ formatPeriod(data['startDate'], data['endDate'], locale) }}
            </span>

            <span v-if="col.field === 'participantCount'" class="block text-right">
              {{ data['participantCount'] }}
            </span>

            <template v-if="col.field === 'rentPerMonth'">
              <span v-if="formatRent(data['rentPerMonth'], locale)">{{
                formatRent(data['rentPerMonth'], locale)
              }}</span>
              <span v-else class="text-stone-400">{{ t('displayPrograms.noRent') }}</span>
            </template>

            <DisplayProgramStatusTag
              v-if="col.field === 'displayStatus'"
              :status="data['displayStatus']"
            />

            <div v-if="col.field === ''" class="flex items-center gap-1">
              <Button
                :icon="canWrite ? 'pi pi-pen-to-square' : 'pi pi-eye'"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="canWrite ? t('common.actions.edit') : t('common.actions.view')"
                @click="openProgram(data['id'])"
              />
              <Button
                icon="pi pi-ellipsis-v"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="t('displayPrograms.list.moreActions')"
                data-testid="row-menu"
                @click="(e: MouseEvent) => openRowMenu(e, data as DisplayProgramListItem)"
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
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Menu from 'primevue/menu'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { MenuItem } from 'primevue/menuitem'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { DisplayProgramsService, DisplayTypesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useConfirmDelete, usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { API_ENDPOINTS } from '@/constants/api'
import { PERMISSIONS } from '@/constants/permissions'
import { branchLabel } from '@/utils/branchHelper'
import type { Column } from '@/types/table.type'
import type {
  DisplayProgramListItem,
  DisplayProgramStatusCounts,
  DisplayProgramStatusFilter,
} from '@/types/displayProgram.type'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import { formatPeriod, formatRent, rowSubline } from './displayProgramHelpers'
import { translateDisplayProgramError } from './displayProgramErrors'
import DisplayProgramStatusTag from './components/DisplayProgramStatusTag.vue'

const { t, locale } = useI18n()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const { canWrite, hasPermission } = usePermissions('/display-programs')
const canPublish = hasPermission(PERMISSIONS.DISPLAY_PROGRAM_PUBLISH)

const toastGroup = 'displayProgramsView'
const confirmGroup = 'displayProgramsViewConfirm'
const table = ref()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const INTERNAL = 'internal'

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>(
  authStore.primaryBranchId ?? authStore.branchIds[0] ?? undefined,
)
const filterPrincipal = ref<number | typeof INTERNAL | undefined>()
const filterTypeId = ref<number | undefined>()
const filterStatus = ref<DisplayProgramStatusFilter>('current')

const principalFilterOptions = ref<{ label: string; value: number | typeof INTERNAL }[]>([])
async function loadPrincipalOptions() {
  try {
    const options = await loadLabelFilterOptions('principal', '')
    principalFilterOptions.value = [
      { label: t('displayPrograms.internal'), value: INTERNAL },
      ...options
        .filter((o) => o.value !== NO_LABEL)
        .map((o) => ({ label: o.label, value: o.value as number })),
    ]
  } catch {
    // Non-critical: the principal filter stays empty.
  }
}

const typeOptions = ref<{ label: string; value: number }[]>([])
async function loadTypeOptions() {
  try {
    const types = await DisplayTypesService.options()
    typeOptions.value = types.map((o) => ({ label: `${o.code} · ${o.name}`, value: o.id }))
  } catch {
    // Non-critical: reading programs doesn't need the right to read the types.
  }
}

const statusOptions = computed(() =>
  (['current', 'draft', 'scheduled', 'active', 'ended', 'all'] as DisplayProgramStatusFilter[]).map(
    (s) => ({ label: t(`displayPrograms.list.statusFilter.${s}`), value: s }),
  ),
)

const url = computed(() => {
  const params = new URLSearchParams()
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  if (filterPrincipal.value === INTERNAL) params.set('principal', INTERNAL)
  else if (filterPrincipal.value) params.set('principalOptionId', String(filterPrincipal.value))
  if (filterTypeId.value) params.set('displayTypeId', String(filterTypeId.value))
  params.set('status', filterStatus.value)
  return `${API_ENDPOINTS.DISPLAY_PROGRAMS}?${params.toString()}`
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// Header counts
// ---------------------------------------------------------------------------

const counts = ref<DisplayProgramStatusCounts | null>(null)

async function loadCounts() {
  const branchId = filterBranchId.value
  if (!branchId) return
  try {
    const list = await DisplayProgramsService.list(`branchId=${branchId}&status=all&limit=1`)
    // A late answer for a branch no longer selected must not overwrite the current one.
    if (branchId !== filterBranchId.value) return
    counts.value = list.meta.counts ?? null
  } catch {
    counts.value = null
  }
}

watch(filterBranchId, loadCounts)

onMounted(() => {
  loadPrincipalOptions()
  loadTypeOptions()
  loadCounts()
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function openProgram(id: number) {
  router.push(`/display-programs/${id}/edit`)
}

async function refresh() {
  await Promise.all([loadCounts(), table.value?.clearSearch()])
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: t('displayPrograms.entityName'),
  onSuccess: refresh,
})

// None sortable: `/v1/display-programs` orders by status, start date then code and reads no sort parameter.
const columns = computed<Column[]>(() =>
  [
    { field: 'name', header: t('displayPrograms.list.columns.program') },
    { field: 'principal', header: t('displayPrograms.list.columns.principal'), hideOnMobile: true },
    {
      field: 'displayType',
      header: t('displayPrograms.list.columns.displayType'),
      hideOnMobile: true,
    },
    { field: 'period', header: t('displayPrograms.list.columns.period'), hideOnMobile: true },
    {
      field: 'participantCount',
      header: t('displayPrograms.list.columns.customers'),
      hideOnMobile: true,
    },
    { field: 'rentPerMonth', header: t('displayPrograms.list.columns.rent'), hideOnMobile: true },
    { field: 'displayStatus', header: t('displayPrograms.list.columns.status') },
    { field: '', header: t('common.labels.actions') },
  ].map((c) => ({ exportable: false, sortable: false, filterable: false, ...c })),
)

// ---------------------------------------------------------------------------
// Row menu: open, duplicate, end early, delete
// ---------------------------------------------------------------------------

const rowMenu = ref()
const menuRow = ref<DisplayProgramListItem | undefined>()

const rowMenuItems = computed<MenuItem[]>(() => {
  const row = menuRow.value
  if (!row) return []
  const items: MenuItem[] = [
    {
      label: t('displayPrograms.actions.open'),
      icon: 'pi pi-arrow-right',
      command: () => openProgram(row.id),
    },
  ]
  if (canWrite) {
    items.push({
      label: t('displayPrograms.actions.duplicate'),
      icon: 'pi pi-copy',
      command: () => onDuplicate(row),
    })
  }
  if (canPublish && row.displayStatus === 'active') {
    items.push({
      label: t('displayPrograms.actions.endEarly'),
      icon: 'pi pi-stop-circle',
      command: () => onEndEarly(row),
    })
  }
  if (canWrite && row.status === 'draft') {
    items.push({
      label: t('displayPrograms.actions.delete'),
      icon: 'pi pi-trash',
      command: () => confirmDelete(() => DisplayProgramsService.delete(row.id)),
    })
  }
  return items
})

function openRowMenu(event: MouseEvent, row: DisplayProgramListItem) {
  menuRow.value = row
  // The model is computed from menuRow; let it settle before the popup measures it.
  nextTick(() => rowMenu.value?.toggle(event))
}

async function onDuplicate(row: DisplayProgramListItem) {
  try {
    const copy = await DisplayProgramsService.duplicate(row.id)
    toast.add(
      commonSuccessToast(t('displayPrograms.messages.duplicated', { code: copy.code }), toastGroup),
    )
    await router.push(`/display-programs/${copy.id}/edit`)
  } catch (e) {
    toast.add(commonErrorToast(translateDisplayProgramError(e, t), toastGroup))
  }
}

function onEndEarly(row: DisplayProgramListItem) {
  confirm.require({
    group: confirmGroup,
    header: t('displayPrograms.actions.endEarly'),
    message: t('displayPrograms.actions.endEarlyConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('displayPrograms.actions.endEarly') },
    accept: async () => {
      try {
        await DisplayProgramsService.endEarly(row.id, row.version)
        toast.add(commonSuccessToast(t('displayPrograms.messages.endedEarly'), toastGroup))
      } catch (e) {
        toast.add(commonErrorToast(translateDisplayProgramError(e, t), toastGroup))
      }
      await refresh()
    },
  })
}
</script>
