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
          {{ t('surveys.title') }}
        </h1>
        <p v-if="configLoaded" class="mt-1 text-sm text-stone-500" data-testid="list-subtitle">
          <template v-if="config">
            {{
              t('surveys.list.summary', {
                active: counts?.active ?? 0,
                scheduled: counts?.scheduled ?? 0,
                draft: counts?.draft ?? 0,
                mode: t(`surveys.list.requiredModeSummary.${config.requiredMode}`),
              })
            }}
          </template>
          <template v-else>
            {{ t('surveys.list.noConfig') }}
            <RouterLink to="/configs?tab=survey" class="text-primary-500 ml-1 underline">
              {{ t('surveys.form.missingConfigLink') }}
            </RouterLink>
          </template>
        </p>
      </div>
      <Button
        v-if="canWrite"
        :label="t('surveys.list.create')"
        icon="pi pi-plus"
        size="small"
        :disabled="configLoaded && !config"
        data-testid="create-survey"
        @click="router.push('/surveys/create')"
      />
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('surveys.list.branch')"
        class="min-w-48"
      />
      <Select
        v-model="filterPrincipalId"
        :options="principalOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('surveys.list.allPrincipals')"
        show-clear
        filter
        class="min-w-48"
      />
      <Select
        v-model="filterType"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('surveys.list.allTypes')"
        show-clear
        class="min-w-40"
      />
      <Select
        v-model="filterFrequency"
        :options="frequencyOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('surveys.list.allFrequencies')"
        show-clear
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
          :query-adapter="SurveysService.toListQuery"
        >
          <template #content="{ col, data }">
            <div v-if="col.field === 'name'">
              <a
                class="text-primary-500 cursor-pointer font-semibold hover:underline"
                @click.prevent="openSurvey(data['id'])"
              >
                {{ data['name'] }}
              </a>
              <Tag
                v-if="data['type'] === 'stock_check'"
                :value="t('surveys.types.stock_check')"
                severity="info"
                class="ml-2"
              />
              <div class="font-mono text-xs text-stone-500">{{ data['code'] }}</div>
              <div class="text-xs text-stone-500">
                {{ subtitleOf(data as SurveyListItem) }}
              </div>
            </div>

            <span v-if="col.field === 'principal'">
              {{ data['principal']?.name ?? t('surveys.list.internal') }}
            </span>

            <span v-if="col.field === 'period'">
              {{ formatPeriod(data['startDate'], data['endDate'], locale) }}
            </span>

            <span v-if="col.field === 'frequency'">
              {{ t(`surveys.frequency.${data['frequency']}`) }}
            </span>

            <Tag
              v-if="col.field === 'isRequired'"
              :value="
                data['isRequired'] ? t('surveys.required.required') : t('surveys.required.optional')
              "
              :severity="data['isRequired'] ? 'warn' : 'secondary'"
            />

            <SurveyStatusTag v-if="col.field === 'displayStatus'" :status="data['displayStatus']" />

            <div v-if="col.field === ''" class="flex items-center gap-1">
              <Button
                :icon="canWrite ? 'pi pi-pen-to-square' : 'pi pi-eye'"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="canWrite ? t('common.actions.edit') : t('common.actions.view')"
                @click="openSurvey(data['id'])"
              />
              <Button
                v-if="hasRowActions"
                icon="pi pi-ellipsis-v"
                severity="contrast"
                text
                rounded
                size="small"
                :aria-label="t('surveys.list.moreActions')"
                data-testid="row-menu"
                @click="(e: MouseEvent) => openRowMenu(e, data as SurveyListItem)"
              />
            </div>
          </template>
        </TableComponent>
        <p class="mt-3 text-xs text-stone-500">{{ t('surveys.list.footnote') }}</p>
      </template>
    </ResponsiveCard>
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
import { SurveyConfigService, SurveysService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useConfirmDelete, usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { API_ENDPOINTS } from '@/constants/api'
import { PERMISSIONS } from '@/constants/permissions'
import { branchLabel } from '@/utils/branchHelper'
import type { Column } from '@/types/table.type'
import type {
  SurveyConfig,
  SurveyFrequency,
  SurveyListItem,
  SurveyStatusCounts,
  SurveyStatusFilter,
  SurveyType,
} from '@/types/survey.type'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import { formatPeriod, listSubtitle } from './surveyHelpers'
import { surveyErrorCode, translateSurveyError } from './surveyErrors'
import SurveyStatusTag from './components/SurveyStatusTag.vue'

const { t, te, locale } = useI18n()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const { canWrite, hasPermission } = usePermissions('/surveys')
const canPublish = hasPermission(PERMISSIONS.SURVEY_PUBLISH)
const hasRowActions = canWrite || canPublish

const toastGroup = 'surveysView'
const confirmGroup = 'surveysViewConfirm'
const table = ref()

/** The "Internal" entry of the principal filter: surveys without a principal. */
const INTERNAL = 0

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const filterBranchId = ref<number | undefined>(
  authStore.primaryBranchId ?? authStore.branchIds[0] ?? undefined,
)
const filterPrincipalId = ref<number | undefined>()
const filterType = ref<SurveyType | undefined>()
const filterFrequency = ref<SurveyFrequency | undefined>()
const filterStatus = ref<SurveyStatusFilter>('current')

const principalOptions = ref<{ label: string; value: number }[]>([])
async function loadPrincipalOptions() {
  try {
    const options = await loadLabelFilterOptions('principal', '')
    principalOptions.value = [
      { label: t('surveys.list.internal'), value: INTERNAL },
      ...options
        .filter((o) => o.value !== NO_LABEL)
        .map((o) => ({ label: o.label, value: o.value as number })),
    ]
  } catch {
    // Non-critical: the principal filter stays empty.
  }
}

const typeOptions = computed(() =>
  (['regular', 'stock_check'] as SurveyType[]).map((v) => ({
    label: t(`surveys.types.${v}`),
    value: v,
  })),
)
const frequencyOptions = computed(() =>
  (['once_per_period', 'every_visit'] as SurveyFrequency[]).map((v) => ({
    label: t(`surveys.frequency.${v}`),
    value: v,
  })),
)
const statusOptions = computed(() =>
  (['current', 'draft', 'scheduled', 'active', 'ended', 'all'] as SurveyStatusFilter[]).map(
    (s) => ({ label: t(`surveys.list.statusFilter.${s}`), value: s }),
  ),
)

const url = computed(() => {
  const params = new URLSearchParams()
  if (filterBranchId.value) params.set('branchId', String(filterBranchId.value))
  if (filterPrincipalId.value !== undefined && filterPrincipalId.value !== null) {
    params.set('principalOptionId', String(filterPrincipalId.value))
  }
  if (filterType.value) params.set('type', filterType.value)
  if (filterFrequency.value) params.set('frequency', filterFrequency.value)
  params.set('status', filterStatus.value)
  return `${API_ENDPOINTS.SURVEYS}?${params.toString()}`
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// ---------------------------------------------------------------------------
// The branch's config and header counts
// ---------------------------------------------------------------------------

const config = ref<SurveyConfig | null>(null)
const configLoaded = ref(false)
const counts = ref<SurveyStatusCounts | null>(null)

async function loadBranchContext() {
  const branchId = filterBranchId.value
  configLoaded.value = false
  if (!branchId) return
  try {
    const [cfg, list] = await Promise.all([
      SurveyConfigService.getMyBranch(branchId),
      SurveysService.list(`branchId=${branchId}&status=all&limit=1`),
    ])
    // A late answer for a branch no longer selected must not overwrite the current one.
    if (branchId !== filterBranchId.value) return
    config.value = cfg
    counts.value = list.meta.counts ?? null
  } catch {
    config.value = null
    counts.value = null
  }
  configLoaded.value = true
}

watch(filterBranchId, loadBranchContext)

onMounted(() => {
  loadPrincipalOptions()
  loadBranchContext()
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function openSurvey(id: number) {
  router.push(`/surveys/${id}/edit`)
}

function subtitleOf(row: SurveyListItem): string {
  return listSubtitle(row)
    .map((p) => (p.params ? t(p.key, p.params, p.params.n as number) : t(p.key)))
    .join(' · ')
}

async function refresh() {
  await Promise.all([loadBranchContext(), table.value?.clearSearch()])
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: 'survey',
  onSuccess: refresh,
})

// None sortable: `/v1/surveys` orders by status, start date then id and reads no sort parameter.
const columns = computed<Column[]>(() =>
  [
    { field: 'name', header: t('surveys.list.columns.survey') },
    { field: 'principal', header: t('surveys.list.columns.principal'), hideOnMobile: true },
    { field: 'period', header: t('surveys.list.columns.period'), hideOnMobile: true },
    { field: 'frequency', header: t('surveys.list.columns.frequency'), hideOnMobile: true },
    { field: 'isRequired', header: t('surveys.list.columns.required'), hideOnMobile: true },
    { field: 'displayStatus', header: t('surveys.list.columns.status') },
    { field: '', header: t('common.labels.actions') },
  ].map((c) => ({ exportable: false, sortable: false, filterable: false, ...c })),
)

// ---------------------------------------------------------------------------
// Row menu: duplicate, end early, delete
// ---------------------------------------------------------------------------

const rowMenu = ref()
const menuRow = ref<SurveyListItem | undefined>()

const rowMenuItems = computed<MenuItem[]>(() => {
  const row = menuRow.value
  if (!row) return []
  const items: MenuItem[] = []
  if (canWrite) {
    items.push({
      label: t('surveys.actions.duplicate'),
      icon: 'pi pi-copy',
      command: () => onDuplicate(row),
    })
  }
  if (canPublish && row.displayStatus === 'active') {
    items.push({
      label: t('surveys.actions.endEarly'),
      icon: 'pi pi-stop-circle',
      command: () => onEndEarly(row),
    })
  }
  if (canWrite && row.status === 'draft') {
    items.push({
      label: t('surveys.actions.delete'),
      icon: 'pi pi-trash',
      command: () => confirmDelete(() => SurveysService.delete(row.id)),
    })
  }
  return items
})

function openRowMenu(event: MouseEvent, row: SurveyListItem) {
  menuRow.value = row
  // The model is computed from menuRow; let it settle before the popup measures it.
  nextTick(() => rowMenu.value?.toggle(event))
}

async function onDuplicate(row: SurveyListItem) {
  try {
    const copy = await SurveysService.duplicate(row.id)
    toast.add(commonSuccessToast(t('surveys.messages.duplicated', { code: copy.code }), toastGroup))
    if (copy.scopeCleared) {
      toast.add({
        severity: 'warn',
        summary: t('surveys.messages.scopeCleared'),
        life: 6000,
        group: toastGroup,
      })
    }
    await router.push(`/surveys/${copy.id}/edit`)
  } catch (e) {
    toast.add(commonErrorToast(translateSurveyError(e, t, te), toastGroup))
  }
}

function onEndEarly(row: SurveyListItem) {
  confirm.require({
    group: confirmGroup,
    header: t('surveys.actions.endEarly'),
    message: t('surveys.actions.endEarlyConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('surveys.actions.endEarly') },
    accept: async () => {
      try {
        await SurveysService.endEarly(row.id, row.version)
        toast.add(commonSuccessToast(t('surveys.messages.endedEarly'), toastGroup))
        await refresh()
      } catch (e) {
        const message =
          surveyErrorCode(e) === 'SURVEY_STALE' ? new Error(t('surveys.stale.message')) : e
        toast.add(commonErrorToast(translateSurveyError(message, t, te), toastGroup))
        await refresh()
      }
    },
  })
}
</script>
