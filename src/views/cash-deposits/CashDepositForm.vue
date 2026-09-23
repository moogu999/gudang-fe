<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="cashDepositConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Form
    v-else
    v-slot="$form"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <!-- Status + source tags (VIEW / EDIT modes) -->
    <div v-if="mode !== DialogMode.ADD && currentStatus" class="mb-4 flex flex-wrap gap-2">
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`cashDeposits.status.${currentStatus}`)"
      />
      <Tag
        severity="secondary"
        :value="
          source === 'nforce'
            ? t('cashDeposits.labels.sourceNforce')
            : t('cashDeposits.labels.sourceManual')
        "
      />
    </div>

    <!-- Approval timeline + actions -->
    <Panel
      v-if="mode !== DialogMode.ADD && cashDepositId"
      v-model:collapsed="isApprovalCollapsed"
      toggleable
      :header="t('approvals.sectionTitle')"
      class="mb-4"
    >
      <ApprovalTimeline
        ref="approvalTimelineRef"
        module-key="cash_deposit"
        :reference-id="cashDepositId"
        :show-status-header="false"
      />
      <Divider />
      <ApprovalActionBar
        module-key="cash_deposit"
        :reference-id="cashDepositId"
        @changed="onApprovalChanged"
      />
    </Panel>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column: document header -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('cashDeposits.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('cashDeposits.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('cashDeposits.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('cashDeposits.codeMode.manual')"
              :severity="noMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="noMode = 'manual'"
            />
          </div>
          <div v-if="mode === DialogMode.ADD && noMode === 'auto'" class="flex flex-col gap-1">
            <InputText
              :value="numberSeriesLoading ? '' : previewCode"
              :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
              readonly
              class="w-full"
            />
            <small class="text-surface-500">{{ t('cashDeposits.codeMode.assignedOnSave') }}</small>
          </div>
          <InputText
            v-else
            id="no"
            name="no"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW || mode === DialogMode.EDIT"
            class="w-full"
          />
          <Message v-if="$form.no?.invalid" severity="error" size="small" variant="simple">{{
            $form.no.error.message
          }}</Message>
        </div>

        <!-- Employee -->
        <div class="flex flex-col gap-1">
          <label for="employeeId" class="text-sm font-semibold">{{
            t('cashDeposits.fields.employee')
          }}</label>
          <InfiniteSelect
            id="employeeId"
            name="employeeId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => EmployeesService.listForSelect(q)"
            :custom-filters="employeeFilters"
            :initial-option="initialEmployee"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onEmployeeIdUpdate"
            @select-option="(opt) => onEmployeeSelect(opt as Employee)"
          />
          <div v-if="employeeTypeName" class="flex flex-wrap items-center gap-2">
            <Tag severity="info" :value="employeeTypeName" />
            <small v-if="manifestMode" class="text-surface-500">{{
              manifestMode === 'adhoc'
                ? t('cashDeposits.labels.adhocOnly')
                : t('cashDeposits.labels.manifestAvailable')
            }}</small>
          </div>
          <Message
            v-if="$form.employeeId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.employeeId.error.message }}</Message
          >
        </div>

        <!-- Deposit date -->
        <div class="flex flex-col gap-1">
          <label for="depositDate" class="text-sm font-semibold">{{
            t('cashDeposits.fields.depositDate')
          }}</label>
          <DatePicker
            id="depositDate"
            name="depositDate"
            date-format="dd/mm/yy"
            :max-date="maxDepositDate"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @update:model-value="onDepositDateUpdate"
          />
          <Message
            v-if="$form.depositDate?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.depositDate.error.message }}</Message
          >
        </div>
      </div>

      <!-- Right column: who received it, and where -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('cashDeposits.sections.receipt') }}
        </h3>

        <!-- Cashier is the logged-in user (read-only), never a dropdown -->
        <div class="flex flex-col gap-1">
          <label for="receivedBy" class="text-sm font-semibold">{{
            t('cashDeposits.fields.receivedBy')
          }}</label>
          <InputText id="receivedBy" :value="receivedByLabel" disabled class="w-full" />
        </div>

        <!-- Legal entity — resolved from the document's branch, never editable -->
        <div class="flex flex-col gap-1">
          <label for="company" class="text-sm font-semibold">{{
            t('cashDeposits.fields.company')
          }}</label>
          <InputText id="company" :value="companyName" disabled class="w-full" />
          <small v-if="!companyName" class="text-surface-500">{{
            t('cashDeposits.labels.companyUnresolved')
          }}</small>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('cashDeposits.fields.branch')
          }}</label>
          <InfiniteSelect
            id="branchId"
            name="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="fetchUserBranches"
            :initial-option="initialBranch"
            :disabled="mode !== DialogMode.ADD"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onBranchIdUpdate"
          />
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">{{
            $form.branchId.error.message
          }}</Message>
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Manifest (driver / collector only — the picker renders nothing in ad-hoc mode).
         Hidden in VIEW mode, where a read-only table of the saved lines takes its place. -->
    <div v-if="mode !== DialogMode.VIEW" class="mb-6">
      <CashDepositManifestPicker
        ref="pickerRef"
        :employee-id="selectedEmployeeId"
        :deposit-date="depositDateString"
        :exclude-deposit-id="mode === DialogMode.EDIT ? cashDepositId : undefined"
        :preselect="mode === DialogMode.ADD"
        :initial-lines="mode === DialogMode.EDIT ? savedLines : []"
        @update:lines="(lines) => (invoiceLines = lines)"
        @update:mode="(m) => (manifestMode = m)"
      />
    </div>

    <div v-else-if="savedInvoiceLines.length > 0" class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('cashDeposits.sections.manifest') }}
      </h3>
      <DataTable :value="savedInvoiceLines" data-key="id" class="text-sm" size="small">
        <Column :header="t('cashDeposits.picker.invoiceNo')">
          <template #body="{ data }">{{ data.invoiceNo }}</template>
        </Column>
        <Column :header="t('cashDeposits.picker.customer')">
          <template #body="{ data }">{{ data.customerName }}</template>
        </Column>
        <Column :header="t('cashDeposits.picker.receivable')" class="text-right">
          <template #body="{ data }">{{
            formatNumber(parseFloat(data.referenceAmount ?? '0'))
          }}</template>
        </Column>
        <Column :header="t('cashDeposits.picker.received')" class="text-right">
          <template #body="{ data }">{{ formatNumber(parseFloat(data.amount)) }}</template>
        </Column>
      </DataTable>
    </div>

    <!-- Ad-hoc — present in every mode, per the mockup -->
    <div class="mb-6">
      <CashDepositAdhocTable
        ref="adhocRef"
        v-model="adhocRows"
        :readonly="mode === DialogMode.VIEW"
      />
    </div>

    <Message
      v-if="mode !== DialogMode.VIEW && needsApproval"
      severity="info"
      variant="simple"
      class="mb-4"
    >
      {{ t('cashDeposits.messages.approvalInfo') }}
    </Message>

    <!-- Remark + summary -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="space-y-4">
        <div v-if="showVarianceReason" class="flex flex-col gap-1">
          <label for="varianceReason" class="text-sm font-semibold">{{
            t('cashDeposits.fields.varianceReason')
          }}</label>
          <Textarea
            id="varianceReason"
            name="varianceReason"
            rows="3"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <small v-if="mode !== DialogMode.VIEW" class="text-surface-500">{{
            t('cashDeposits.labels.varianceReasonHint')
          }}</small>
        </div>

        <div class="flex flex-col gap-1">
          <label for="remark" class="text-sm font-semibold">{{
            t('cashDeposits.fields.remark')
          }}</label>
          <Textarea
            id="remark"
            name="remark"
            rows="3"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>

      <CashDepositSummary
        v-model:actual="actualAmount"
        :recorded="recordedAmount"
        :readonly="mode === DialogMode.VIEW"
        :saved-recorded="savedRecorded"
        :saved-actual="savedActual"
        :saved-variance="savedVariance"
      />
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('cashDeposits.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="
            needsApproval
              ? t('cashDeposits.actions.submitForApproval')
              : t('cashDeposits.actions.complete')
          "
          :loading="isSaving"
          @click="chosenStatus = 'approved'"
        />
      </template>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount, nextTick } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Panel from 'primevue/panel'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import CashDepositManifestPicker from './components/CashDepositManifestPicker.vue'
import CashDepositAdhocTable from './components/CashDepositAdhocTable.vue'
import CashDepositSummary from './components/CashDepositSummary.vue'
import { round2, type AdhocRow, type PickedInvoiceLine } from './cashDepositLines'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import {
  CashDepositsService,
  CashDepositConfigService,
  EmployeesService,
  BranchesService,
  CompaniesService,
  CompanyBranchesService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Branch, Employee } from '@/types'
import type {
  CashDepositStatus,
  CashDepositSource,
  CashDepositLineResponse,
  CashDepositLineRequest,
  CashDepositResponse,
  CreateCashDepositRequest,
  ManifestMode,
} from '@/types/cashDeposit.type'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()

const {
  codeMode: noMode,
  previewCode,
  seriesId: numberSeriesId,
  loading: numberSeriesLoading,
  hasDefaultSeries,
  generateCode,
} = useNumberSeries('cash_deposits')

const toastGroup = 'cashDepositForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  cashDepositId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: [deposit: CashDepositResponse]
}>()

// Status / approval
const chosenStatus = ref<'draft' | 'approved'>('draft')
const currentStatus = ref<CashDepositStatus | undefined>()
const source = ref<CashDepositSource>('manual')
const approvalTimelineRef = ref<InstanceType<typeof ApprovalTimeline> | null>(null)
const isApprovalCollapsed = ref(false)

// D9: `approved` reads as Completed / Selesai in the UI.
function statusSeverity(status: CashDepositStatus) {
  if (status === 'approved') return 'success'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)
const cashDepositId = computed(() => props.cashDepositId)

// ---------------------------------------------------------------------------
// Employee — form-bound, but it also drives the manifest.
// ---------------------------------------------------------------------------

const selectedEmployeeId = ref<number | undefined>()
const initialEmployee = ref<Employee | undefined>()
const employeeTypeName = ref('')
const manifestMode = ref<ManifestMode | null>(null)

const employeeFilters = [
  { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

const pickerRef = ref<InstanceType<typeof CashDepositManifestPicker> | null>(null)
const adhocRef = ref<InstanceType<typeof CashDepositAdhocTable> | null>(null)

async function resetPicker() {
  // The picker reads props.employeeId / props.depositDate, which only reflect the
  // assignment after Vue flushes the prop update to the child — await it or reset()
  // fires against the stale value.
  await nextTick()
  pickerRef.value?.reset()
}

async function onEmployeeSelect(employee: Employee) {
  const changed = selectedEmployeeId.value !== employee.id
  selectedEmployeeId.value = employee.id
  employeeTypeName.value = employee.employeeType?.name ?? ''
  if (changed) await resetPicker()
}

async function onEmployeeIdUpdate(value: unknown) {
  if (typeof value === 'number') return
  selectedEmployeeId.value = undefined
  employeeTypeName.value = ''
  manifestMode.value = null
  await resetPicker()
}

// ---------------------------------------------------------------------------
// Header: date, cashier, company, branch
// ---------------------------------------------------------------------------

function endOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

// Custody is recorded after the cash changes hands, so it can't be dated ahead of today.
const maxDepositDate = computed(() => endOfToday())

const selectedDate = ref<Date | undefined>(props.mode === DialogMode.ADD ? new Date() : undefined)
const depositDateString = computed(() =>
  selectedDate.value ? dayjs(selectedDate.value).format('YYYY-MM-DD') : undefined,
)

async function onDepositDateUpdate(value: unknown) {
  selectedDate.value = value instanceof Date ? value : undefined
  await resetPicker()
}

const savedReceivedBy = ref('')
const receivedByLabel = computed(() =>
  props.mode === DialogMode.VIEW ? savedReceivedBy.value : (authStore.email ?? ''),
)

const companyName = ref('')

const showBranchPicker = computed(() => authStore.branchIds.length > 1)
const initialBranch = ref<Branch | undefined>()
const selectedBranchId = ref<number | undefined>()

let userBranchesPromise: Promise<Branch[]> | null = null

function loadUserBranches(): Promise<Branch[]> {
  if (!userBranchesPromise) {
    userBranchesPromise = Promise.all(
      authStore.branchIds.map(async (id) => {
        const query = new GenericQueryBuilder().withFilter('id', FilterOperator.EQUAL, id).build()
        const result = await BranchesService.list(query)
        return result.data[0]
      }),
    ).then((branches) => branches.filter((b): b is Branch => !!b))
  }
  return userBranchesPromise
}

async function fetchUserBranches(query: string) {
  const branches = await loadUserBranches()
  const search = new URLSearchParams(query).get('search')?.toLowerCase()
  const filtered = search
    ? branches.filter(
        (b) => b.name.toLowerCase().includes(search) || b.code.toLowerCase().includes(search),
      )
    : branches
  return {
    data: filtered,
    meta: { total: filtered.length, limit: filtered.length, offset: 0, hasMore: false },
  }
}

/**
 * Resolve the legal entity from a branch. A branch mapping to no
 * company is a hard 400 on save, so surface the blank here rather than at submit.
 */
async function resolveCompanyForBranch(branchId: number | undefined) {
  companyName.value = ''
  if (!branchId) return
  try {
    const mappingQuery = new GenericQueryBuilder()
      .withFilter('branchId', FilterOperator.EQUAL, branchId)
      .build()
    const mappings = await CompanyBranchesService.list(mappingQuery)
    const companyId = mappings.data[0]?.companyId
    if (!companyId) return
    const company = await CompaniesService.get(companyId)
    companyName.value = company.name
  } catch {
    // Leave the fields blank — the hint under Company explains the unmapped branch.
  }
}

async function onBranchIdUpdate(value: unknown) {
  selectedBranchId.value = typeof value === 'number' ? value : undefined
  await resolveCompanyForBranch(selectedBranchId.value)
}

// ---------------------------------------------------------------------------
// Lines + summary
// ---------------------------------------------------------------------------

const invoiceLines = ref<PickedInvoiceLine[]>([])
const adhocRows = ref<AdhocRow[]>([])
const actualAmount = ref<number | null>(null)

const savedLines = ref<CashDepositLineResponse[]>([])
const savedInvoiceLines = computed(() => savedLines.value.filter((l) => l.lineType === 'invoice'))

const savedRecorded = ref<number | undefined>()
const savedActual = ref<number | undefined>()
const savedVariance = ref<number | undefined>()
const savedVarianceReason = ref('')

const recordedAmount = computed(() =>
  round2(
    invoiceLines.value.reduce((s, l) => s + l.amount, 0) +
      adhocRows.value.reduce((s, r) => s + (r.amount || 0), 0),
  ),
)
const variance = computed(() =>
  props.mode === DialogMode.VIEW && savedVariance.value !== undefined
    ? savedVariance.value
    : actualAmount.value === null
      ? 0
      : round2(actualAmount.value - recordedAmount.value),
)

// Variance reason is UI-surfaced, not required: a half-counted draft must still save.
const showVarianceReason = computed(
  () => variance.value !== 0 || (props.mode === DialogMode.VIEW && !!savedVarianceReason.value),
)

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Variance-threshold pre-flight (D4/D5) — mirrors CashDepositConfigData.RequiresApproval.
// An unconfigured flow never requires approval.
// ---------------------------------------------------------------------------

const approvalFlowId = ref<number | null>(null)
const varianceThreshold = ref<number | null>(null)

async function loadApprovalConfig() {
  const cfg = await CashDepositConfigService.getMyBranch()
  approvalFlowId.value = cfg?.approvalFlowId ?? null
  varianceThreshold.value =
    cfg?.varianceThreshold != null ? parseFloat(cfg.varianceThreshold) : null
}

const needsApproval = computed(() => {
  if (approvalFlowId.value === null) return false
  if (varianceThreshold.value === null) return variance.value !== 0
  return Math.abs(variance.value) > varianceThreshold.value
})

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const initialValues = reactive({
  no: '',
  employeeId: undefined as number | undefined,
  depositDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  varianceReason: '',
  remark: '',
  branchId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('cashDeposits.validation.noRequired')),
      employeeId: z.number({ message: t('cashDeposits.validation.employeeRequired') }),
      depositDate: z
        .date({ message: t('cashDeposits.validation.depositDateRequired') })
        .refine((date) => date <= endOfToday(), {
          message: t('cashDeposits.validation.depositDateFuture'),
        }),
      varianceReason: z.string().optional().nullable(),
      remark: z.string().optional().nullable(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('cashDeposits.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateCashDepositRequest | null>(null)

function failValidation(key: string) {
  toast.add(commonErrorToast(new Error(t(key)), toastGroup))
}

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    let saved: CashDepositResponse
    if (props.mode === DialogMode.EDIT && props.cashDepositId) {
      const req = pendingRequest.value
      saved = await CashDepositsService.update(props.cashDepositId, {
        status: req.status,
        employeeId: req.employeeId,
        depositDate: req.depositDate,
        actualAmount: req.actualAmount,
        varianceReason: req.varianceReason,
        remark: req.remark,
        lines: req.lines,
      })
      toast.add(commonSuccessToast(t('cashDeposits.messages.updated'), toastGroup))
    } else {
      saved = await CashDepositsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('cashDeposits.messages.created'), toastGroup))
    }
    // A draft save keeps the user on the edit page — refresh the server-computed state.
    if (props.mode === DialogMode.EDIT && saved.status === 'draft') await loadCashDeposit()
    emit('submitted', saved)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    // The config can change between page load and submit — re-check so the
    // pre-flight message stays honest.
    if (chosenStatus.value === 'approved') await loadApprovalConfig()
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  if (actualAmount.value === null) return failValidation('cashDeposits.validation.actualRequired')

  if (invoiceLines.value.length + adhocRows.value.length === 0) {
    return failValidation('cashDeposits.validation.noLines')
  }

  if (invoiceLines.value.some((l) => !(l.amount > 0))) {
    return failValidation('cashDeposits.validation.invoiceAmountRequired')
  }

  if (adhocRef.value && !adhocRef.value.validate()) {
    return failValidation('cashDeposits.validation.adhocInvalid')
  }

  let no: string | null = null
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  const lines: CashDepositLineRequest[] = [
    ...invoiceLines.value.map((l) => ({
      lineType: 'invoice' as const,
      invoiceId: l.invoiceId,
      amount: l.amount.toFixed(2),
    })),
    ...adhocRows.value.map((r) => ({
      lineType: 'adhoc' as const,
      customerId: r.customerId ?? null,
      categoryId: r.categoryId ?? null,
      note: r.note.trim() || null,
      amount: r.amount.toFixed(2),
    })),
  ]

  const reason = (event.states.varianceReason?.value as string | undefined)?.trim()

  const request: CreateCashDepositRequest = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    status: chosenStatus.value,
    employeeId: event.states.employeeId.value as number,
    // dayjs, never toISOString().split('T')[0] — the latter converts to UTC and
    // lands a day early at UTC+7.
    depositDate: dayjs(event.states.depositDate.value as Date).format('YYYY-MM-DD'),
    actualAmount: actualAmount.value.toFixed(2),
    varianceReason: variance.value !== 0 && reason ? reason : null,
    remark: (event.states.remark?.value as string | undefined)?.trim() || null,
    lines,
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'cashDepositConfirm',
      header: t('cashDeposits.confirm.header'),
      message: needsApproval.value
        ? t('cashDeposits.confirm.messageSubmit')
        : t('cashDeposits.confirm.messageComplete'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: {
        label: needsApproval.value
          ? t('cashDeposits.actions.submitForApproval')
          : t('cashDeposits.actions.complete'),
      },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadCashDeposit() {
  if (!props.cashDepositId) return

  isLoading.value = true
  try {
    const deposit = await CashDepositsService.get(props.cashDepositId)
    const depositDate = dayjs(deposit.depositDate.slice(0, 10)).toDate()

    initialValues.no = deposit.no
    initialValues.employeeId = deposit.employeeId
    initialValues.depositDate = depositDate
    initialValues.varianceReason = deposit.varianceReason ?? ''
    initialValues.remark = deposit.remark ?? ''
    initialValues.branchId = deposit.branchId

    currentStatus.value = deposit.status
    source.value = deposit.source
    selectedEmployeeId.value = deposit.employeeId
    selectedDate.value = depositDate
    selectedBranchId.value = deposit.branchId
    initialEmployee.value = {
      id: deposit.employeeId,
      name: deposit.employeeName ?? '',
    } as Employee
    employeeTypeName.value = deposit.employeeTypeName ?? ''

    companyName.value = deposit.companyName ?? ''
    savedReceivedBy.value = deposit.receivedByUserName ?? ''

    savedLines.value = deposit.lines
    savedVarianceReason.value = deposit.varianceReason ?? ''
    savedRecorded.value = parseFloat(deposit.recordedAmount) || 0
    savedActual.value = parseFloat(deposit.actualAmount) || 0
    savedVariance.value = parseFloat(deposit.varianceAmount) || 0
    actualAmount.value = savedActual.value

    adhocRows.value = deposit.lines
      .filter((l) => l.lineType === 'adhoc')
      .map((l) => ({
        _key: crypto.randomUUID(),
        customerId: l.customerId ?? undefined,
        customer: l.customerId ? { id: l.customerId, name: l.customerName ?? '' } : undefined,
        categoryId: l.categoryId ?? undefined,
        category: l.categoryId ? { id: l.categoryId, name: l.categoryName ?? '' } : undefined,
        note: l.note ?? '',
        amount: parseFloat(l.amount) || 0,
      }))

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, deposit.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function onApprovalChanged() {
  await approvalTimelineRef.value?.refresh()
  if (!props.cashDepositId) return
  try {
    const deposit = await CashDepositsService.get(props.cashDepositId)
    currentStatus.value = deposit.status
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    isLoading.value = true
  }

  try {
    if (props.mode !== DialogMode.VIEW) {
      await loadApprovalConfig()
    }

    if ((props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) && props.cashDepositId) {
      await loadCashDeposit()
      return
    }

    if (showBranchPicker.value && authStore.primaryBranchId) {
      const branches = await loadUserBranches()
      const defaultBranch = branches.find((b) => b.id === authStore.primaryBranchId)
      if (defaultBranch) {
        initialValues.branchId = defaultBranch.id
        initialBranch.value = defaultBranch
        selectedBranchId.value = defaultBranch.id
      }
    } else {
      selectedBranchId.value = authStore.branchIds[0]
    }

    await resolveCompanyForBranch(selectedBranchId.value)
  } finally {
    if (props.mode === DialogMode.ADD) {
      isLoading.value = false
    }
  }
})
</script>
