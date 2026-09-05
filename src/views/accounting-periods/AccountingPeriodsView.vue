<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteYearAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('accountingPeriods.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #start>
        <InfiniteSelect
          v-model="selectedCompanyId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => CompaniesService.list(query)"
          :placeholder="t('chartOfAccounts.labels.selectCompany')"
          :initial-option="initialCompany"
          sort-by="name"
          sort-operator="asc"
          class="w-48 sm:w-64"
          @update:model-value="loadCompanyData"
        />
      </template>
      <template #end>
        <ResponsiveButton
          v-if="canWrite"
          :label="t('accountingPeriods.newFiscalYear')"
          @click="addYear"
        />
      </template>
    </Toolbar>

    <div v-if="fiscalYears.length > 0" class="mb-4 flex flex-wrap items-center gap-2">
      <SelectButton
        v-if="!isMobile"
        v-model="selectedFiscalYearId"
        :options="yearOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
      />
      <Select
        v-else
        v-model="selectedFiscalYearId"
        :options="yearOptions"
        option-label="label"
        option-value="value"
        class="w-full"
      />
      <Button
        v-if="canWrite && selectedFiscalYear"
        icon="pi pi-pen-to-square"
        severity="contrast"
        text
        rounded
        outlined
        :aria-label="t('accountingPeriods.editFiscalYear')"
        class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
        @click="editYear"
      />
      <Button
        v-if="canWrite && selectedFiscalYear"
        icon="pi pi-trash"
        severity="danger"
        text
        rounded
        outlined
        :aria-label="t('accountingPeriods.deleteFiscalYear')"
        class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
        @click="confirmDeleteYear(selectedFiscalYear)"
      />
    </div>

    <Message v-if="!hasOpenPeriod" severity="warn" :closable="false" class="mb-4 text-sm">
      {{ t('accountingPeriods.warnings.noOpenPeriod') }}
    </Message>
    <Message v-if="showNoReopenFlowWarning" severity="info" :closable="false" class="mb-4 text-sm">
      {{ t('accountingPeriods.warnings.noReopenFlow') }}
    </Message>

    <ResponsiveCard>
      <template #content>
        <div class="w-full overflow-x-auto">
          <DataTable
            :value="selectedYearPeriods"
            :loading="loading"
            :row-class="(p: AccountingPeriod) => (p.status === 'OPEN' ? 'bg-surface-50' : '')"
            class="w-full"
          >
            <Column field="name" :header="t('accountingPeriods.fields.period')">
              <template #body="{ data }">
                <div>
                  <div class="font-medium">{{ data.name }}</div>
                  <div class="text-surface-500 font-mono text-xs">
                    {{ formatRange(data.startDate, data.endDate) }}
                  </div>
                </div>
              </template>
            </Column>

            <Column v-if="!isMobile" field="status" :header="t('accountingPeriods.fields.status')">
              <template #body="{ data }">
                <div class="flex flex-col items-start gap-1">
                  <Tag
                    :severity="STATUS_CONFIG[data.status as PeriodStatus].severity"
                    :icon="STATUS_CONFIG[data.status as PeriodStatus].icon"
                    :value="
                      t(
                        `accountingPeriods.status.${STATUS_CONFIG[data.status as PeriodStatus].labelKey}`,
                      )
                    "
                  />
                  <Tag
                    v-if="data.reopenRequestStatus"
                    severity="secondary"
                    :value="t('accountingPeriods.labels.reopenPending')"
                  />
                </div>
              </template>
            </Column>

            <Column
              v-if="!isMobile"
              field="history"
              :header="t('accountingPeriods.fields.history')"
            >
              <template #body="{ data }">
                <div v-if="hasHistory(data)" class="flex flex-col gap-0.5 text-xs">
                  <span v-if="data.openedAt">{{
                    t('accountingPeriods.labels.historyOpened', {
                      date: formatDateTime(data.openedAt),
                    })
                  }}</span>
                  <span v-if="data.closedAt">{{
                    t('accountingPeriods.labels.historyClosed', {
                      date: formatDateTime(data.closedAt),
                    })
                  }}</span>
                  <span v-if="data.permanentlyClosedAt">{{
                    t('accountingPeriods.labels.historyPermanentlyClosed', {
                      date: formatDateTime(data.permanentlyClosedAt),
                    })
                  }}</span>
                  <span v-if="data.revertedAt">{{
                    t('accountingPeriods.labels.historyReverted', {
                      date: formatDateTime(data.revertedAt),
                      reason: data.revertReason,
                    })
                  }}</span>
                </div>
                <span v-else class="text-surface-400 text-xs">{{
                  t('accountingPeriods.labels.noActivity')
                }}</span>
              </template>
            </Column>

            <Column field="actions" :header="t('common.labels.actions')">
              <template #body="{ data }">
                <div v-if="canWrite" class="flex items-center gap-1">
                  <Button
                    v-if="visibleActions(data).length === 0"
                    icon="pi pi-minus"
                    severity="secondary"
                    text
                    rounded
                    outlined
                    disabled
                    :aria-label="t('accountingPeriods.helpers.whyDisabled')"
                    v-tooltip.top="t('accountingPeriods.helpers.whyDisabled')"
                    class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  />
                  <Button
                    v-for="action in visibleActions(data)"
                    :key="action"
                    :icon="ACTION_ICON[action]"
                    severity="contrast"
                    text
                    rounded
                    outlined
                    :aria-label="t(`accountingPeriods.actions.${ACTION_I18N_KEY[action]}`)"
                    v-tooltip.top="t(`accountingPeriods.actions.${ACTION_I18N_KEY[action]}`)"
                    class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                    @click="openPeriodAction(data, action)"
                  />
                </div>
              </template>
            </Column>

            <template #empty>
              <div class="text-surface-500 p-4 text-center">{{ t('common.messages.noData') }}</div>
            </template>
          </DataTable>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <span class="text-surface-500 text-xs font-semibold"
            >{{ t('accountingPeriods.labels.legend') }}:</span
          >
          <div v-for="status in ALL_STATUSES" :key="status" class="flex items-center gap-1 text-xs">
            <Tag
              :severity="STATUS_CONFIG[status].severity"
              :icon="STATUS_CONFIG[status].icon"
              :value="t(`accountingPeriods.status.${STATUS_CONFIG[status].labelKey}`)"
            />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <Dialog
      :header="fiscalYearDialogHeader"
      @hide="closeFiscalYearDialog"
      v-model:visible="isFiscalYearDialogShown"
      modal
      :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
      :style="{ width: '60vw' }"
      :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    >
      <FiscalYearDialog
        v-if="selectedCompanyId"
        :mode="fiscalYearDialogMode"
        :company-id="selectedCompanyId"
        :fiscal-year="fiscalYearDetail"
        @close="closeFiscalYearDialog"
      />
    </Dialog>

    <Dialog
      :header="periodActionDialogHeader"
      @hide="closePeriodActionDialog"
      v-model:visible="isPeriodActionDialogShown"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      :style="{ width: '40vw' }"
      :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    >
      <PeriodActionDialog
        v-if="selectedPeriod && selectedAction"
        :action="selectedAction"
        :period="selectedPeriod"
        :timeline="companyTimeline"
        @close="closePeriodActionDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted } from 'vue'
import Toolbar from 'primevue/toolbar'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import dayjs from 'dayjs'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import FiscalYearDialog from './FiscalYearDialog.vue'
import PeriodActionDialog from './PeriodActionDialog.vue'
import { formatRange } from './periodSchedule'
import { actionsFor, type PeriodAction } from './periodActions'
import { useDialog, usePermissions, useResponsiveSize } from '@/composables'
import { AccountingPeriodsService, FiscalYearsService, CompaniesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { ApiError } from '@/types/api.type'
import DateFormat from '@/constants/dateFormat'
import DialogMode from '@/constants/dialogMode'
import { PERMISSIONS } from '@/constants'
import type {
  AccountingPeriod,
  AccountingPeriodConfig,
  Company,
  FiscalYear,
  FiscalYearDetail,
  PeriodStatus,
} from '@/types'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const { isMobile } = useResponsiveSize()

const overlayGroup = 'accountingPeriodsView'
const { canWrite, hasPermission } = usePermissions('/accounting-periods')
const canRevert = computed(() =>
  hasPermission(PERMISSIONS.ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE),
)

const loading = ref(false)

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

const selectedCompanyId = ref<number | undefined>(undefined)
const initialCompany = ref<Company | undefined>(undefined)

async function loadDefaultCompany() {
  const result = await CompaniesService.list('sortBy=name&sortOperator=asc&limit=1')
  const first = result.data[0]
  if (first) {
    selectedCompanyId.value = first.id
    initialCompany.value = first
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const config = ref<AccountingPeriodConfig | null>(null)

async function loadConfig() {
  try {
    config.value = await AccountingPeriodsService.getConfig(selectedCompanyId.value!)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      config.value = null
      return
    }
    throw e
  }
}

const showNoReopenFlowWarning = computed(
  () => !config.value?.reopenFlowId && companyTimeline.value.some((p) => p.status === 'CLOSED'),
)

// ---------------------------------------------------------------------------
// Fiscal years
// ---------------------------------------------------------------------------

const fiscalYears = ref<FiscalYear[]>([])
const selectedFiscalYearId = ref<number | undefined>(undefined)

async function loadYears() {
  const result = await FiscalYearsService.list(`companyId=${selectedCompanyId.value}&limit=100`)
  fiscalYears.value = result.data
}

const yearOptions = computed(() =>
  fiscalYears.value.map((fy) => ({ label: fy.name, value: fy.id })),
)

const selectedFiscalYear = computed(() =>
  fiscalYears.value.find((fy) => fy.id === selectedFiscalYearId.value),
)

function selectDefaultYear() {
  if (currentPeriod.value) {
    selectedFiscalYearId.value = currentPeriod.value.fiscalYearId
    return
  }
  const sorted = [...fiscalYears.value].sort((a, b) => a.startDate.localeCompare(b.startDate))
  selectedFiscalYearId.value = sorted.at(-1)?.id
}

const fiscalYearDialogMode = ref<DialogMode>(DialogMode.ADD)
const fiscalYearDetail = ref<FiscalYearDetail | undefined>(undefined)

const fiscalYearDialogHeader = computed(() =>
  fiscalYearDialogMode.value === DialogMode.ADD
    ? t('accountingPeriods.newFiscalYear')
    : t('accountingPeriods.editFiscalYear'),
)

const {
  isVisible: isFiscalYearDialogShown,
  open: openFiscalYearDialogFn,
  close: closeFiscalYearDialog,
} = useDialog({
  onClose: async () => {
    await loadCompanyData()
  },
})

function addYear() {
  fiscalYearDetail.value = undefined
  fiscalYearDialogMode.value = DialogMode.ADD
  openFiscalYearDialogFn()
}

async function editYear() {
  if (!selectedFiscalYearId.value) {
    return
  }
  fiscalYearDetail.value = await FiscalYearsService.get(selectedFiscalYearId.value)
  fiscalYearDialogMode.value = DialogMode.EDIT
  openFiscalYearDialogFn()
}

const deleteYearAcceptanceHandler = ref(async () => {})

function confirmDeleteYear(fy: FiscalYear | undefined) {
  if (!fy) {
    return
  }

  deleteYearAcceptanceHandler.value = async () => {
    try {
      await FiscalYearsService.delete(fy.id)
      toast.add(commonSuccessToast(t('accountingPeriods.messages.deleted'), overlayGroup))
      await loadCompanyData()
    } catch (e) {
      // A 409 here means the schedule is frozen — the server's message
      // already explains why, so it is shown as-is rather than mapped to
      // the generic "record is in use" copy.
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }

  confirm.require({
    group: overlayGroup,
    message: t('common.messages.confirmDelete', { entity: 'fiscal year' }),
    header: t('common.confirmation.delete'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.confirmation.yes') },
  })
}

// ---------------------------------------------------------------------------
// Periods / timeline
// ---------------------------------------------------------------------------

// The full company timeline, across every fiscal year — actionsFor needs
// visibility across fiscal-year boundaries (e.g. the reopenable period can
// sit in the year before the one currently displayed).
const companyTimeline = ref<AccountingPeriod[]>([])
const currentPeriod = ref<AccountingPeriod | null>(null)

const hasOpenPeriod = computed(() => currentPeriod.value !== null)

async function loadTimeline() {
  const result = await AccountingPeriodsService.list(
    `companyId=${selectedCompanyId.value}&limit=1000`,
  )
  companyTimeline.value = result.data
}

async function loadCurrentPeriod() {
  try {
    currentPeriod.value = await AccountingPeriodsService.current(selectedCompanyId.value!)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      currentPeriod.value = null
      return
    }
    throw e
  }
}

const selectedYearPeriods = computed(() =>
  companyTimeline.value
    .filter((p) => p.fiscalYearId === selectedFiscalYearId.value)
    .sort((a, b) => a.sequence - b.sequence),
)

function hasHistory(p: AccountingPeriod): boolean {
  return Boolean(p.openedAt || p.closedAt || p.permanentlyClosedAt || p.revertedAt)
}

function formatDateTime(value: string): string {
  return dayjs(value).format(DateFormat.DATE_TIME)
}

const ALL_STATUSES: PeriodStatus[] = ['UPCOMING', 'OPEN', 'CLOSED', 'PERMANENTLY_CLOSED']

const STATUS_CONFIG: Record<
  PeriodStatus,
  { severity: 'info' | 'success' | 'warn' | 'danger'; icon: string; labelKey: string }
> = {
  UPCOMING: { severity: 'info', icon: 'pi pi-clock', labelKey: 'upcoming' },
  OPEN: { severity: 'success', icon: 'pi pi-circle-fill', labelKey: 'open' },
  CLOSED: { severity: 'warn', icon: 'pi pi-lock-open', labelKey: 'closed' },
  PERMANENTLY_CLOSED: { severity: 'danger', icon: 'pi pi-lock', labelKey: 'permanentlyClosed' },
}

const ACTION_ICON: Record<PeriodAction, string> = {
  open: 'pi pi-play-circle',
  close: 'pi pi-lock',
  'request-reopen': 'pi pi-refresh',
  'permanent-close': 'pi pi-ban',
  'revert-permanent-close': 'pi pi-history',
}

const ACTION_I18N_KEY: Record<PeriodAction, string> = {
  open: 'open',
  close: 'close',
  'request-reopen': 'requestReopen',
  'permanent-close': 'permanentClose',
  'revert-permanent-close': 'revertPermanentClose',
}

// Actions this row exposes as buttons — filters out request-reopen while a
// request is already pending (the muted status tag communicates that
// instead) and revert-permanent-close for anyone without permission 115,
// rather than rendering it disabled.
function visibleActions(period: AccountingPeriod): PeriodAction[] {
  return actionsFor(period, companyTimeline.value).filter((action) => {
    if (action === 'request-reopen' && period.reopenRequestStatus) {
      return false
    }
    if (action === 'revert-permanent-close' && !canRevert.value) {
      return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Period action dialog
// ---------------------------------------------------------------------------

const selectedPeriod = ref<AccountingPeriod | null>(null)
const selectedAction = ref<PeriodAction | null>(null)

const periodActionDialogHeader = computed(() => {
  if (!selectedAction.value) {
    return ''
  }
  return t(`accountingPeriods.actions.${ACTION_I18N_KEY[selectedAction.value]}`)
})

const {
  isVisible: isPeriodActionDialogShown,
  open: openPeriodActionDialogFn,
  close: closePeriodActionDialog,
} = useDialog({
  onClose: async () => {
    await loadCompanyData()
  },
})

function openPeriodAction(period: AccountingPeriod, action: PeriodAction) {
  selectedPeriod.value = period
  selectedAction.value = action
  openPeriodActionDialogFn()
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

async function loadCompanyData() {
  if (!selectedCompanyId.value) {
    return
  }

  loading.value = true
  try {
    await Promise.all([loadConfig(), loadYears(), loadTimeline(), loadCurrentPeriod()])
    selectDefaultYear()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadDefaultCompany()
  await loadCompanyData()
})
</script>
