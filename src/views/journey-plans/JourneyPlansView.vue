<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog :group="confirmGroup" />

    <div class="mb-3 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('journeyPlans.title') }}
      </h1>
      <div v-if="canWrite && branchId" class="flex flex-wrap gap-2">
        <Button
          :label="t('journeyPlans.addVisit')"
          icon="pi pi-plus"
          size="small"
          :disabled="!canAddOnDate"
          data-testid="add-visit"
          @click="isAddShown = true"
        />
        <Button
          :label="t('journeyPlans.regenerate')"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="regenerating"
          data-testid="regenerate"
          @click="confirmRegenerate"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <InfiniteSelect
        v-model="branchId"
        :fetch-fn="fetchBranches"
        :option-label="branchLabel"
        option-value="id"
        :placeholder="t('journeyPlans.filters.branch')"
        class="min-w-48"
      />
      <DatePicker
        v-model="date"
        date-format="yy-mm-dd"
        show-icon
        :max-date="maxDate"
        data-testid="plan-date"
      />
      <Tag :value="`W${cycleWeekOfDate}`" severity="secondary" data-testid="cycle-week" />
      <Select
        v-model="salesmanId"
        :options="salesmanOptions"
        option-label="label"
        option-value="value"
        class="min-w-56"
        data-testid="salesman-filter"
      />
    </div>

    <JourneyPlanStatusBar
      :status="status"
      :can-write="canWrite"
      :busy="regenerating"
      @regenerate="confirmRegenerate"
    />

    <ResponsiveCard>
      <template #content>
        <DataTable
          :value="sortedRows"
          data-key="id"
          :loading="loading"
          :row-group-mode="salesmanId === 0 ? 'subheader' : undefined"
          :group-rows-by="salesmanId === 0 ? 'employee.id' : undefined"
          class="text-sm"
        >
          <template #groupheader="{ data }">
            <span class="font-semibold">{{ data.employee.name }}</span>
            <span class="ml-2 text-xs text-stone-500">
              {{ data.employee.nip }} · {{ t('journeyPlans.visits', { n: countOf(data.employee.id) }, countOf(data.employee.id)) }}
            </span>
          </template>
          <Column header="#" style="width: 3rem">
            <template #body="{ data }">{{ data.sequence }}</template>
          </Column>
          <Column :header="t('journeyPlans.columns.customer')">
            <template #body="{ data }">
              <div class="font-semibold">{{ data.customer.name }}</div>
              <div class="text-xs text-stone-500">
                {{ [data.customer.outletType, data.customer.address].filter(Boolean).join(' · ') }}
              </div>
            </template>
          </Column>
          <Column :header="t('journeyPlans.columns.route')">
            <template #body="{ data }">
              <span v-if="data.routeCode" class="font-mono">{{ data.routeCode }}</span>
              <span v-else class="text-stone-400">—</span>
            </template>
          </Column>
          <Column :header="t('journeyPlans.columns.pattern')">
            <template #body="{ data }">
              <Tag
                v-if="data.patternLabel"
                :value="patternTagText(data.patternLabel, t)"
                :severity="severityOf(data.patternLabel)"
              />
              <span v-else class="text-stone-400">—</span>
            </template>
          </Column>
          <Column :header="t('journeyPlans.columns.source')">
            <template #body="{ data }">
              <Tag
                v-if="data.source === 'supervisor_addition'"
                v-tooltip.top="data.reason ?? ''"
                :value="t('journeyPlans.source.supervisor_addition')"
                severity="contrast"
              />
              <Tag v-else :value="t('journeyPlans.source.pjp')" severity="secondary" />
            </template>
          </Column>
          <Column v-if="canWrite" style="width: 3rem">
            <template #body="{ data }">
              <Button
                v-if="data.source === 'supervisor_addition' && data.date >= todayIso"
                icon="pi pi-times"
                severity="secondary"
                text
                rounded
                size="small"
                :aria-label="t('common.actions.delete')"
                :data-testid="`delete-addition-${data.id}`"
                @click="confirmDelete(data)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('journeyPlans.empty') }}</div>
          </template>
          <template #footer>
            <span class="text-xs text-stone-600">{{ t('journeyPlans.total', { n: rows.length }, rows.length) }}</span>
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>

    <JourneyPlanAddVisitDialog
      v-if="isAddShown && branchId"
      :branch-id="branchId"
      :today="todayIso"
      :initial-date="dateIso"
      :salesman="salesmanForDialog"
      :toast-group="toastGroup"
      @close="isAddShown = false"
      @added="reload"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { JourneyPlanConfigService, JourneyPlansService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import DateFormat from '@/constants/dateFormat'
import { branchLabel } from '@/utils/branchHelper'
import { addDays, cycleWeek, parsePatternLabel, patternSeverity } from '@/utils/visitCycle'
import type {
  JourneyPlanConfig,
  JourneyPlanRow,
  JourneyPlanSalesman,
  JourneyPlanStatus,
} from '@/types'
import { fromApiDate, patternTagText, toApiDate } from '@/views/routes/routeHelpers'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import JourneyPlanAddVisitDialog from './components/JourneyPlanAddVisitDialog.vue'
import JourneyPlanStatusBar from './components/JourneyPlanStatusBar.vue'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/journey-plans')

const toastGroup = 'journeyPlansView'
const confirmGroup = 'journeyPlansConfirm'

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const branchId = ref<number | undefined>(authStore.primaryBranchId ?? authStore.branchIds[0])
const date = ref<Date>(new Date())
/** 0 stands for every salesman. */
const salesmanId = ref(0)

const status = ref<JourneyPlanStatus | null>(null)
const config = ref<JourneyPlanConfig | null>(null)
const salesmen = ref<JourneyPlanSalesman[]>([])
const rows = ref<JourneyPlanRow[]>([])
const loading = ref(false)
const regenerating = ref(false)
const isAddShown = ref(false)

const dateIso = computed(() => toApiDate(date.value))
// Before the first status answer the browser's day stands in for the business day.
const todayIso = computed(() => status.value?.today ?? dayjs().format(DateFormat.DATE))
const maxDate = computed(() =>
  status.value?.availableUntil ? fromApiDate(status.value.availableUntil) : undefined,
)

const cycleWeekOfDate = computed(() =>
  config.value ? cycleWeek(dateIso.value, config.value.cycleAnchorDate) : 1,
)

const canAddOnDate = computed(
  () => dateIso.value === todayIso.value || dateIso.value === addDays(todayIso.value, 1),
)

const salesmanOptions = computed(() => [
  { label: t('journeyPlans.filters.allSalesmen'), value: 0 },
  ...salesmen.value.map((s) => ({
    label: `${s.name}${s.nip ? ` · ${s.nip}` : ''} (${s.visits})`,
    value: s.employeeId,
  })),
])

const salesmanForDialog = computed(() => {
  const found = salesmen.value.find((s) => s.employeeId === salesmanId.value)
  return found ? { id: found.employeeId, name: found.name, nip: found.nip } : undefined
})

const sortedRows = computed(() =>
  [...rows.value].sort(
    (a, b) => a.employee.name.localeCompare(b.employee.name) || a.sequence - b.sequence,
  ),
)

function countOf(employeeId: number): number {
  return rows.value.filter((r) => r.employee.id === employeeId).length
}

function severityOf(label: string) {
  const parsed = parsePatternLabel(label)
  return parsed ? patternSeverity(parsed.kind) : 'secondary'
}

async function loadStatus() {
  if (!branchId.value) return
  const wanted = branchId.value
  const [statusResult, configResult] = await Promise.allSettled([
    JourneyPlansService.status(wanted),
    JourneyPlanConfigService.getMyBranch(wanted),
  ])
  if (wanted !== branchId.value) return
  status.value = statusResult.status === 'fulfilled' ? statusResult.value : null
  config.value = configResult.status === 'fulfilled' ? configResult.value : null
}

async function loadPlan() {
  if (!branchId.value) return
  const wanted = branchId.value
  const wantedDate = dateIso.value
  loading.value = true
  try {
    const [people, plan] = await Promise.all([
      JourneyPlansService.salesmen(wanted, wantedDate),
      JourneyPlansService.list(wanted, wantedDate, salesmanId.value || undefined),
    ])
    // A late answer for an old filter must not overwrite the current one.
    if (wanted !== branchId.value || wantedDate !== dateIso.value) return
    salesmen.value = people
    rows.value = plan
    if (salesmanId.value && !people.some((p) => p.employeeId === salesmanId.value)) {
      salesmanId.value = 0
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

async function reload() {
  await Promise.all([loadStatus(), loadPlan()])
}

onMounted(async () => {
  await loadStatus()
  await loadPlan()
})

watch(branchId, () => {
  salesmanId.value = 0
  reload()
})
watch([dateIso, salesmanId], loadPlan)

function confirmRegenerate() {
  confirm.require({
    group: confirmGroup,
    header: t('journeyPlans.regenerate'),
    message: t('journeyPlans.regenerateMessage'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('journeyPlans.regenerate') },
    accept: regenerate,
  })
}

async function regenerate() {
  if (!branchId.value) return
  regenerating.value = true
  try {
    await JourneyPlansService.regenerate(branchId.value)
    toast.add(commonSuccessToast(t('journeyPlans.messages.regenerated'), toastGroup))
    await reload()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    regenerating.value = false
  }
}

function confirmDelete(row: JourneyPlanRow) {
  confirm.require({
    group: confirmGroup,
    header: t('journeyPlans.deleteHeader'),
    message: t('journeyPlans.deleteMessage', { name: row.customer.name }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.actions.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await JourneyPlansService.deleteAddition(row.id)
        toast.add(commonSuccessToast(t('journeyPlans.messages.visitDeleted'), toastGroup))
        await reload()
      } catch (e) {
        toast.add(commonErrorToast(e, toastGroup))
      }
    },
  })
}
</script>
