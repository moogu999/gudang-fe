<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="apPaymentConfirm" />

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
    <!-- Status tag (VIEW / EDIT modes) -->
    <div v-if="mode !== DialogMode.ADD && currentStatus" class="mb-4">
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`apPayments.status.${currentStatus}`)"
      />
    </div>

    <!-- Approval timeline + actions -->
    <Panel
      v-if="mode !== DialogMode.ADD && apPaymentId"
      v-model:collapsed="isApprovalCollapsed"
      toggleable
      :header="t('approvals.sectionTitle')"
      class="mb-4"
    >
      <ApprovalTimeline
        ref="approvalTimelineRef"
        module-key="ap_payment"
        :reference-id="apPaymentId"
        :show-status-header="false"
      />
      <Divider />
      <ApprovalActionBar
        module-key="ap_payment"
        :reference-id="apPaymentId"
        @changed="onApprovalChanged"
      />
    </Panel>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('apPayments.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('apPayments.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('apPayments.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('apPayments.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('apPayments.codeMode.assignedOnSave') }}</small>
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

        <!-- Supplier -->
        <div class="flex flex-col gap-1">
          <label for="supplierId" class="text-sm font-semibold">{{
            t('apPayments.fields.supplier')
          }}</label>
          <InfiniteSelect
            id="supplierId"
            name="supplierId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => SuppliersService.listForSelect(q)"
            :initial-option="initialSupplier"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onSupplierIdUpdate"
            @select-option="(opt) => onSupplierSelect(opt as Supplier)"
          />
          <Message
            v-if="$form.supplierId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.supplierId.error.message }}</Message
          >
        </div>

        <!-- Legal entity — resolved from the document's branch, never editable -->
        <div class="flex flex-col gap-1">
          <label for="legalEntity" class="text-sm font-semibold">{{
            t('apPayments.fields.legalEntity')
          }}</label>
          <InputText id="legalEntity" :value="legalEntityLabel" disabled class="w-full" />
          <small v-if="!companyName" class="text-surface-500">{{
            t('apPayments.labels.legalEntityUnresolved')
          }}</small>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('apPayments.fields.branch')
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

        <!-- Payment date -->
        <div class="flex flex-col gap-1">
          <label for="paymentDate" class="text-sm font-semibold">{{
            t('apPayments.fields.paymentDate')
          }}</label>
          <DatePicker
            id="paymentDate"
            name="paymentDate"
            date-format="dd/mm/yy"
            :max-date="maxPaymentDate"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.paymentDate?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.paymentDate.error.message }}</Message
          >
        </div>
      </div>

      <!-- Right column: payment method -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('apPayments.sections.paymentMethod') }}
        </h3>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('apPayments.fields.paymentMethod') }}</label>
          <SelectButton
            name="paymentMethodId"
            :options="paymentMethods"
            option-label="name"
            option-value="id"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            :pt="{ pcToggleButton: { root: 'flex-1 justify-center' } }"
            @update:model-value="onMethodIdUpdate"
          />
          <Message
            v-if="$form.paymentMethodId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.paymentMethodId.error.message }}</Message
          >
        </div>

        <template v-if="selectedMethodCode === 'TRANSFER'">
          <div class="flex flex-col gap-1">
            <label for="branchBankAccountId" class="text-sm font-semibold">{{
              t('apPayments.fields.branchBankAccount')
            }}</label>
            <InfiniteSelect
              id="branchBankAccountId"
              name="branchBankAccountId"
              :option-label="bankAccountLabel"
              option-value="id"
              :fetch-fn="(q) => BranchBankAccountsService.list(q)"
              :custom-filters="bankAccountFilters"
              :initial-option="initialBranchBankAccount"
              :disabled="mode === DialogMode.VIEW"
              sort-by="bank_name"
              sort-operator="asc"
              class="w-full"
            />
            <Message
              v-if="$form.branchBankAccountId?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.branchBankAccountId.error.message }}</Message
            >
          </div>

          <div class="flex flex-col gap-1">
            <label for="referenceNo" class="text-sm font-semibold">{{
              t('apPayments.fields.referenceNo')
            }}</label>
            <InputText
              id="referenceNo"
              name="referenceNo"
              autocomplete="off"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
            <Message
              v-if="$form.referenceNo?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.referenceNo.error.message }}</Message
            >
          </div>
        </template>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Open-item picker (hidden in VIEW mode — a read-only table of the saved
         applications takes its place) -->
    <div v-if="mode !== DialogMode.VIEW" class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('apPayments.sections.picker') }}
      </h3>
      <ApPaymentOpenItemPicker
        ref="pickerRef"
        :supplier-id="selectedSupplierId"
        :branch-id="selectedBranchId"
        :initial-applications="mode === DialogMode.EDIT ? savedApplications : []"
        @update:applications="onApplicationsUpdate"
      />
    </div>

    <div v-else class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('apPayments.sections.picker') }}
      </h3>
      <DataTable :value="savedApplications" data-key="id" class="text-sm" size="small">
        <Column :header="t('apPayments.picker.documentNo')">
          <template #body="{ data }">{{ data.documentNo }}</template>
        </Column>
        <Column :header="t('apPayments.picker.type')">
          <template #body="{ data }">
            <Tag
              :severity="typeSeverity(data.documentType)"
              :value="typeLabel(data.documentType)"
            />
          </template>
        </Column>
        <Column :header="t('apPayments.picker.dueDate')">
          <template #body="{ data }">{{ dayjs(data.dueDate).format(DateFormat.DATE) }}</template>
        </Column>
        <Column :header="t('apPayments.picker.outstanding')" class="text-right">
          <template #body="{ data }">{{
            formatNumber(parseFloat(data.outstandingAmount))
          }}</template>
        </Column>
        <Column :header="t('apPayments.picker.appliedAmount')" class="text-right">
          <template #body="{ data }">{{ formatNumber(parseFloat(data.appliedAmount)) }}</template>
        </Column>
        <template #empty>
          <div class="py-4 text-center text-sm text-stone-400">
            {{ t('apPayments.picker.empty') }}
          </div>
        </template>
      </DataTable>
    </div>

    <Message
      v-if="mode !== DialogMode.VIEW && needsApproval && approvalFlowId !== null"
      severity="info"
      variant="simple"
      class="mb-4"
    >
      {{
        t('apPayments.messages.thresholdInfo', { threshold: formatNumber(approvalThreshold ?? 0) })
      }}
    </Message>

    <Message
      v-if="mode !== DialogMode.VIEW && needsApproval && approvalFlowId === null"
      severity="warn"
      variant="simple"
      class="mb-4"
    >
      {{ t('apPayments.messages.approvalFlowRequired', { branch: branchName || '—' }) }}
    </Message>

    <!-- Remark + Summary -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="flex flex-col gap-1">
        <label for="remark" class="text-sm font-semibold">{{
          t('apPayments.fields.remark')
        }}</label>
        <Textarea
          id="remark"
          name="remark"
          rows="4"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
      </div>

      <ApPaymentSummary
        :applications="summaryApplications"
        :readonly="mode === DialogMode.VIEW"
        :saved-gross-amount="savedGrossAmount"
        :saved-credit-amount="savedCreditAmount"
        :saved-net-amount="savedNetAmount"
      />
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('apPayments.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="
            needsApproval
              ? t('apPayments.actions.submitForApproval')
              : t('apPayments.actions.postPayment')
          "
          :loading="isSaving"
          :disabled="needsApproval && approvalFlowId === null"
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
import SelectButton from 'primevue/selectbutton'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import ApPaymentOpenItemPicker, {
  type PickedApplication,
} from './components/ApPaymentOpenItemPicker.vue'
import ApPaymentSummary, { type SummaryApplication } from './components/ApPaymentSummary.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import DateFormat from '@/constants/dateFormat'
import {
  ApPaymentsService,
  ApPaymentConfigService,
  PaymentMethodsService,
  BranchBankAccountsService,
  BranchesService,
  CompaniesService,
  CompanyBranchesService,
  SuppliersService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Supplier } from '@/types/supplier.type'
import type { Branch, PaymentMethod, BranchBankAccount } from '@/types'
import type {
  ApPaymentStatus,
  ApPaymentDocumentType,
  ApPaymentApplicationResponse,
  CreateApPaymentRequest,
} from '@/types/apPayment.type'
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
} = useNumberSeries('ap_payments')

const toastGroup = 'apPaymentForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  apPaymentId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

// Status / approval
const chosenStatus = ref<'draft' | 'approved'>('draft')
const currentStatus = ref<ApPaymentStatus | undefined>()
const approvalTimelineRef = ref<InstanceType<typeof ApprovalTimeline> | null>(null)
const isApprovalCollapsed = ref(false)

function statusSeverity(status: ApPaymentStatus) {
  if (status === 'approved') return 'success'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)
const apPaymentId = computed(() => props.apPaymentId)

// Supplier — form-bound, but it also drives the legal entity and the picker.
const selectedSupplierId = ref<number | undefined>()
const initialSupplier = ref<Supplier | undefined>()

// Legal entity, resolved from the document's branch via company_branches → companies.
const companyName = ref('')
const companyTaxId = ref('')
const branchName = ref('')

const legalEntityLabel = computed(() => {
  if (!companyName.value) return ''
  return companyTaxId.value
    ? `${companyName.value} — NPWP ${companyTaxId.value}`
    : companyName.value
})

// Branch — only rendered when the user has more than one assigned branch, matching
// the backend's resolveBranchID rules (omitted + exactly one branch → use it silently).
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
 * Resolve the legal entity and branch name from a branch. A branch mapping to no
 * company is a hard 400 on save (`ErrCompanyNotResolved`), so surface the blank
 * here rather than at submit.
 */
async function resolveCompanyForBranch(branchId: number | undefined) {
  companyName.value = ''
  companyTaxId.value = ''
  branchName.value = ''
  if (!branchId) return
  try {
    const query = new GenericQueryBuilder().withFilter('id', FilterOperator.EQUAL, branchId).build()
    const branchResult = await BranchesService.list(query)
    branchName.value = branchResult.data[0]?.name ?? ''

    const mappingQuery = new GenericQueryBuilder()
      .withFilter('branchId', FilterOperator.EQUAL, branchId)
      .build()
    const mappings = await CompanyBranchesService.list(mappingQuery)
    const companyId = mappings.data[0]?.companyId
    if (!companyId) return
    const company = await CompaniesService.get(companyId)
    companyName.value = company.name
    companyTaxId.value = company.taxId ?? ''
  } catch {
    // Leave the fields blank — the hint under Legal Entity explains the unmapped branch.
  }
}

// A disbursement records money already committed to leave, so it can never be
// dated ahead of today.
function endOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

const maxPaymentDate = computed(() => endOfToday())

// ---------------------------------------------------------------------------
// Payment method block
// ---------------------------------------------------------------------------

const paymentMethods = ref<PaymentMethod[]>([])
const selectedMethodId = ref<number | undefined>()
const selectedMethodCode = computed(
  () => paymentMethods.value.find((m) => m.id === selectedMethodId.value)?.code ?? '',
)

const initialBranchBankAccount = ref<BranchBankAccount | undefined>()

function bankAccountLabel(a: BranchBankAccount): string {
  return `${a.bankName} — ${a.accountNumber} (${a.accountHolderName})`
}

const bankAccountFilters = computed(() => [
  {
    filterBy: 'branch_id',
    filterOperator: FilterOperator.EQUAL,
    filterValue: selectedBranchId.value ?? 0,
  },
  { filterBy: 'is_active', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
])

async function loadPaymentMethods() {
  const query = new GenericQueryBuilder()
    .withFilter('is_active', FilterOperator.EQUAL, 'true')
    .build()
  const res = await PaymentMethodsService.list(query)
  paymentMethods.value = res.data
}

function onMethodIdUpdate(value: unknown) {
  selectedMethodId.value = typeof value === 'number' ? value : undefined
}

// ---------------------------------------------------------------------------
// Open-item picker + summary
// ---------------------------------------------------------------------------

const pickerRef = ref<InstanceType<typeof ApPaymentOpenItemPicker> | null>(null)
const applications = ref<PickedApplication[]>([])
const savedApplications = ref<ApPaymentApplicationResponse[]>([])

const savedGrossAmount = ref<number | undefined>(undefined)
const savedCreditAmount = ref<number | undefined>(undefined)
const savedNetAmount = ref<number | undefined>(undefined)

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function onApplicationsUpdate(apps: PickedApplication[]) {
  applications.value = apps
}

const summaryApplications = computed<SummaryApplication[]>(() =>
  applications.value.map((a) => ({ documentType: a.documentType, appliedAmount: a.appliedAmount })),
)

const grossAmount = computed(() =>
  round2(
    applications.value
      .filter((a) => a.documentType === 'ap_invoice' || a.documentType === 'debit_note')
      .reduce((sum, a) => sum + a.appliedAmount, 0),
  ),
)
const creditAmount = computed(() =>
  round2(
    applications.value
      .filter((a) => a.documentType === 'credit_note')
      .reduce((sum, a) => sum + a.appliedAmount, 0),
  ),
)
const netAmount = computed(() => round2(grossAmount.value - creditAmount.value))

function typeSeverity(type: ApPaymentDocumentType) {
  if (type === 'credit_note') return 'success'
  if (type === 'debit_note') return 'danger'
  return 'info'
}

function typeLabel(type: ApPaymentDocumentType) {
  return t(`apPayments.picker.documentType.${type}`)
}

// ---------------------------------------------------------------------------
// Threshold pre-flight — reactive on the running net, master decision 1.
// ---------------------------------------------------------------------------

const approvalFlowId = ref<number | null>(null)
const approvalThreshold = ref<number | null>(null)
const configLoaded = ref(false)

async function loadApprovalConfig() {
  configLoaded.value = false
  try {
    const cfg = await ApPaymentConfigService.getMyBranch()
    approvalFlowId.value = cfg?.approvalFlowId ?? null
    approvalThreshold.value =
      cfg?.approvalThreshold != null ? parseFloat(cfg.approvalThreshold) : null
  } catch {
    approvalFlowId.value = null
    approvalThreshold.value = null
  } finally {
    configLoaded.value = true
  }
}

const needsApproval = computed(
  () => approvalThreshold.value === null || netAmount.value >= approvalThreshold.value,
)

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

async function onSupplierSelect(supplier: Supplier) {
  const changed = selectedSupplierId.value !== supplier.id
  selectedSupplierId.value = supplier.id
  // pickerRef reads props.supplierId, which only reflects this assignment
  // after Vue flushes the prop update to the child — await it or reset()
  // fires against the stale (often undefined) supplierId.
  if (changed) {
    await nextTick()
    pickerRef.value?.reset()
  }
}

async function onSupplierIdUpdate(value: unknown) {
  if (typeof value === 'number') return
  selectedSupplierId.value = undefined
  await nextTick()
  pickerRef.value?.reset()
}

async function onBranchIdUpdate(value: unknown) {
  selectedBranchId.value = typeof value === 'number' ? value : undefined
  await resolveCompanyForBranch(selectedBranchId.value)
  await nextTick()
  pickerRef.value?.reset()
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const initialValues = reactive({
  no: '',
  supplierId: undefined as number | undefined,
  paymentDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  paymentMethodId: undefined as number | undefined,
  branchBankAccountId: undefined as number | undefined,
  referenceNo: '',
  remark: '',
  branchId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('apPayments.validation.noRequired')),
      supplierId: z.number({ message: t('apPayments.validation.supplierRequired') }),
      paymentDate: z
        .date({ message: t('apPayments.validation.paymentDateRequired') })
        .refine((date) => date <= endOfToday(), {
          message: t('apPayments.validation.paymentDateFuture'),
        }),
      paymentMethodId: z.number({ message: t('apPayments.validation.paymentMethodRequired') }),
      branchBankAccountId:
        selectedMethodCode.value === 'TRANSFER'
          ? z.number({ message: t('apPayments.validation.bankAccountRequired') })
          : z.number().optional().nullable(),
      referenceNo:
        selectedMethodCode.value === 'TRANSFER'
          ? z.string().min(1, t('apPayments.validation.referenceNoRequired'))
          : z.string().optional().nullable(),
      remark: z.string().optional(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('apPayments.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateApPaymentRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    if (props.mode === DialogMode.EDIT && props.apPaymentId) {
      const req = pendingRequest.value
      await ApPaymentsService.update(props.apPaymentId, {
        status: req.status,
        supplierId: req.supplierId,
        paymentDate: req.paymentDate,
        paymentMethodId: req.paymentMethodId,
        branchBankAccountId: req.branchBankAccountId,
        referenceNo: req.referenceNo,
        remark: req.remark,
        applications: req.applications,
      })
      toast.add(commonSuccessToast(t('apPayments.messages.updated'), toastGroup))
    } else {
      await ApPaymentsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('apPayments.messages.created'), toastGroup))
    }
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    // The config can change between page load and submit — re-check so the
    // guard in the UI stays honest rather than only failing on the server.
    if (chosenStatus.value === 'approved') await loadApprovalConfig()
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  if (applications.value.length === 0) {
    toast.add(commonErrorToast(new Error(t('apPayments.validation.noApplications')), toastGroup))
    return
  }

  const invalidInvoiceRow = applications.value.find(
    (a) => a.documentType === 'ap_invoice' && (!a.appliedAmount || a.appliedAmount <= 0),
  )
  if (invalidInvoiceRow) {
    toast.add(
      commonErrorToast(new Error(t('apPayments.validation.appliedAmountRequired')), toastGroup),
    )
    return
  }

  if (netAmount.value < 0) {
    toast.add(commonErrorToast(new Error(t('apPayments.validation.negativeNet')), toastGroup))
    return
  }

  let no: string | null = null
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  const isTransfer = selectedMethodCode.value === 'TRANSFER'

  const request: CreateApPaymentRequest = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    status: chosenStatus.value,
    supplierId: event.states.supplierId.value as number,
    // dayjs, never toISOString().split('T')[0] — the latter converts to UTC and
    // lands a day early at UTC+7.
    paymentDate: dayjs(event.states.paymentDate.value as Date).format('YYYY-MM-DD'),
    paymentMethodId: event.states.paymentMethodId.value as number,
    branchBankAccountId: isTransfer ? (event.states.branchBankAccountId.value as number) : null,
    referenceNo: isTransfer ? (event.states.referenceNo.value as string)?.trim() || null : null,
    remark: (event.states.remark.value as string)?.trim() || null,
    applications: applications.value.map((a) => ({
      documentType: a.documentType,
      documentId: a.documentId,
      appliedAmount: a.documentType === 'ap_invoice' ? String(a.appliedAmount) : undefined,
    })),
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'apPaymentConfirm',
      header: t('apPayments.confirm.header'),
      message: needsApproval.value
        ? t('apPayments.confirm.messageSubmit')
        : t('apPayments.confirm.messagePost'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: {
        label: needsApproval.value
          ? t('apPayments.actions.submitForApproval')
          : t('apPayments.actions.postPayment'),
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

async function loadApPayment() {
  if (!props.apPaymentId) return

  isLoading.value = true
  try {
    const payment = await ApPaymentsService.get(props.apPaymentId)

    initialValues.no = payment.no
    initialValues.supplierId = payment.supplierId
    initialValues.paymentDate = new Date(payment.paymentDate)
    initialValues.paymentMethodId = payment.paymentMethodId
    initialValues.branchBankAccountId = payment.branchBankAccountId ?? undefined
    initialValues.referenceNo = payment.referenceNo ?? ''
    initialValues.remark = payment.remark ?? ''
    initialValues.branchId = payment.branchId

    currentStatus.value = payment.status
    selectedSupplierId.value = payment.supplierId
    selectedBranchId.value = payment.branchId
    selectedMethodId.value = payment.paymentMethodId

    // The saved method may since have been deactivated — loadPaymentMethods()
    // only fetches active rows, so a deactivated method must be injected here
    // or it silently renders as unselected on a saved payment.
    if (!paymentMethods.value.some((m) => m.id === payment.paymentMethodId)) {
      paymentMethods.value = [
        ...paymentMethods.value,
        {
          id: payment.paymentMethodId,
          code: payment.paymentMethodCode ?? '',
          name: payment.paymentMethodName ?? '',
          isActive: false,
          createdAt: '',
          updatedAt: '',
        },
      ]
    }

    initialSupplier.value = { id: payment.supplierId, name: payment.supplierName ?? '' } as Supplier

    if (payment.branchBankAccountId) {
      initialBranchBankAccount.value = {
        id: payment.branchBankAccountId,
        bankName: payment.branchBankAccountLabel ?? '',
        accountNumber: '',
        accountHolderName: '',
      } as BranchBankAccount
    }

    companyName.value = payment.companyName ?? ''
    companyTaxId.value = payment.companyTaxId ?? ''

    savedApplications.value = payment.applications
    savedGrossAmount.value = parseFloat(payment.grossAmount) || 0
    savedCreditAmount.value = parseFloat(payment.creditAmount) || 0
    savedNetAmount.value = parseFloat(payment.netAmount) || 0

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, payment.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }
    branchName.value = (await loadUserBranches()).find((b) => b.id === payment.branchId)?.name ?? ''
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function onApprovalChanged() {
  await approvalTimelineRef.value?.refresh()
  if (!props.apPaymentId) return
  try {
    const payment = await ApPaymentsService.get(props.apPaymentId)
    currentStatus.value = payment.status
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    isLoading.value = true
  }

  try {
    await loadPaymentMethods()

    if (props.mode !== DialogMode.VIEW) {
      await loadApprovalConfig()
    }

    if ((props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) && props.apPaymentId) {
      await loadApPayment()
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
