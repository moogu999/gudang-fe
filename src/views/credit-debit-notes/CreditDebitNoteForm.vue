<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="creditDebitNoteConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Form
    v-else
    ref="creditDebitNoteFormRef"
    v-slot="$form"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <!-- Status tag (VIEW / EDIT modes) -->
    <div v-if="mode !== DialogMode.ADD && currentStatus" class="mb-4">
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`creditDebitNotes.status.${currentStatus}`)"
      />
    </div>

    <!-- Approval timeline + actions -->
    <Panel
      v-if="mode !== DialogMode.ADD && noteId"
      v-model:collapsed="isApprovalCollapsed"
      toggleable
      :header="t('approvals.sectionTitle')"
      class="mb-4"
    >
      <ApprovalTimeline
        ref="approvalTimelineRef"
        module-key="credit_debit_note"
        :reference-id="noteId"
        :show-status-header="false"
      />
      <Divider />
      <ApprovalActionBar
        module-key="credit_debit_note"
        :reference-id="noteId"
        @changed="onApprovalChanged"
      />
    </Panel>

    <!-- Type toggle -->
    <div class="mb-6 flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('creditDebitNotes.fields.noteType') }}</label>
      <SelectButton
        name="noteType"
        :options="noteTypeOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        :disabled="mode === DialogMode.VIEW"
        :pt="{
          root: [
            'w-full',
            noteType === 'credit' ? '[&_.p-togglebutton-checked]:!bg-emerald-600' : '',
            noteType === 'debit' ? '[&_.p-togglebutton-checked]:!bg-rose-600' : '',
          ],
          pcToggleButton: { root: 'flex-1 justify-center' },
        }"
        @update:model-value="onNoteTypeUpdate"
      />
      <small class="text-surface-500">{{
        noteType === 'credit'
          ? t('creditDebitNotes.type.creditLong')
          : t('creditDebitNotes.type.debitLong')
      }}</small>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('creditDebitNotes.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.no')
          }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('creditDebitNotes.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('creditDebitNotes.codeMode.manual')"
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
            <small class="text-surface-500">{{
              t('creditDebitNotes.codeMode.assignedOnSave')
            }}</small>
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
            t('creditDebitNotes.fields.supplier')
          }}</label>
          <InfiniteSelect
            id="supplierId"
            name="supplierId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => SuppliersService.list(q)"
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
            t('creditDebitNotes.fields.legalEntity')
          }}</label>
          <InputText id="legalEntity" :value="legalEntityLabel" disabled class="w-full" />
          <small v-if="!companyName" class="text-surface-500">{{
            t('creditDebitNotes.labels.legalEntityUnresolved')
          }}</small>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.branch')
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

      <!-- Right column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">&nbsp;</h3>

        <!-- Supplier's own note number -->
        <div class="flex flex-col gap-1">
          <label for="supplierNoteNo" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.supplierNoteNo')
          }}</label>
          <InputText
            id="supplierNoteNo"
            name="supplierNoteNo"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.supplierNoteNo?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.supplierNoteNo.error.message }}</Message
          >
        </div>

        <!-- Note date -->
        <div class="flex flex-col gap-1">
          <label for="noteDate" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.noteDate')
          }}</label>
          <DatePicker
            id="noteDate"
            name="noteDate"
            date-format="dd/mm/yy"
            :max-date="maxNoteDate"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.noteDate?.invalid" severity="error" size="small" variant="simple">{{
            $form.noteDate.error.message
          }}</Message>
        </div>

        <!-- Nota Retur / Faktur Pajak Pengganti number -->
        <div class="flex flex-col gap-1">
          <label for="taxReturnNoteNo" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.taxReturnNoteNo')
          }}</label>
          <InputText
            id="taxReturnNoteNo"
            name="taxReturnNoteNo"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @update:model-value="taxReturnNoteNoError = ''"
          />
          <Message v-if="taxReturnNoteNoError" severity="error" size="small" variant="simple">{{
            taxReturnNoteNoError
          }}</Message>
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Correction block -->
    <div class="mb-2">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('creditDebitNotes.sections.correction') }}
      </h3>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="correctionCategoryId" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.correctionCategory')
          }}</label>
          <InfiniteSelect
            id="correctionCategoryId"
            name="correctionCategoryId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => CorrectionCategoriesService.list(q)"
            :custom-filters="activeCorrectionCategoryFilters"
            :initial-option="initialCorrectionCategory"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <Message
            v-if="$form.correctionCategoryId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.correctionCategoryId.error.message }}</Message
          >
        </div>

        <div class="flex flex-col gap-1">
          <label for="apInvoiceHeaderId" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.referenceApInvoice')
          }}</label>
          <InfiniteSelect
            id="apInvoiceHeaderId"
            name="apInvoiceHeaderId"
            option-label="no"
            option-value="id"
            :fetch-fn="(q) => ApInvoicesService.list(q)"
            :custom-filters="referenceApInvoiceFilters"
            :initial-option="initialApInvoice"
            :disabled="mode === DialogMode.VIEW || !selectedSupplierId"
            show-clear
            sort-by="invoice_date"
            sort-operator="desc"
            class="w-full"
          />
        </div>

        <Message severity="info" variant="simple" class="lg:col-span-2">
          {{ t('creditDebitNotes.messages.referenceIsAuditTrailOnly') }}
        </Message>

        <div class="flex flex-col gap-1 lg:col-span-2">
          <label for="description" class="text-sm font-semibold">{{
            t('creditDebitNotes.fields.description')
          }}</label>
          <Textarea
            id="description"
            name="description"
            rows="3"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.description?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.description.error.message }}</Message
          >
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Remark + Amounts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="flex flex-col gap-1">
        <label for="remark" class="text-sm font-semibold">{{
          t('creditDebitNotes.fields.remark')
        }}</label>
        <Textarea
          id="remark"
          name="remark"
          rows="4"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
      </div>

      <CreditDebitNoteAmounts
        v-model:tax-base-amount="taxBaseAmount"
        v-model:tax-amount="taxAmount"
        :tax-rate="taxRate"
        :note-type="noteType"
        :readonly="mode === DialogMode.VIEW"
        :saved-total-amount="savedTotalAmount"
      />
    </div>

    <Message severity="info" variant="simple" class="mt-4">
      {{ t('creditDebitNotes.messages.taxReturnNoteReminder') }}
    </Message>

    <Message
      v-if="mode !== DialogMode.VIEW && !canSubmitForApproval"
      severity="warn"
      variant="simple"
      class="mt-4"
    >
      {{ t('creditDebitNotes.messages.approvalFlowRequired') }}
    </Message>

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('creditDebitNotes.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="t('creditDebitNotes.actions.submitForApproval')"
          :loading="isSaving"
          :disabled="!canSubmitForApproval"
          @click="chosenStatus = 'approved'"
        />
      </template>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount } from 'vue'
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
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import CreditDebitNoteAmounts from './components/CreditDebitNoteAmounts.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import {
  CreditDebitNotesService,
  CreditDebitNoteConfigService,
  CorrectionCategoriesService,
  ApInvoicesService,
  BranchesService,
  CompaniesService,
  CompanyBranchesService,
  SuppliersService,
  TaxConfigurationService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Supplier } from '@/types/supplier.type'
import type { Branch } from '@/types'
import type { ApInvoiceHeader } from '@/types/apInvoice.type'
import type { CorrectionCategory } from '@/types/correctionCategory.type'
import type {
  CreditDebitNoteStatus,
  CreditDebitNoteType,
  CreateCreditDebitNoteRequest,
} from '@/types/creditDebitNote.type'
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
} = useNumberSeries('credit_debit_notes')

const toastGroup = 'creditDebitNoteForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  noteId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

const creditDebitNoteFormRef = ref()

// Status / approval
const chosenStatus = ref<'draft' | 'approved'>('draft')
const currentStatus = ref<CreditDebitNoteStatus | undefined>()
const approvalTimelineRef = ref<InstanceType<typeof ApprovalTimeline> | null>(null)
const isApprovalCollapsed = ref(false)

function statusSeverity(status: CreditDebitNoteStatus) {
  if (status === 'approved') return 'success'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)
const noteId = computed(() => props.noteId)

// Type toggle — form-bound via `name`, mirrored into this ref for reactive
// styling elsewhere (the toggle's colour, the amounts panel's sign).
const noteType = ref<CreditDebitNoteType>('credit')
const noteTypeOptions = computed(() => [
  { label: t('creditDebitNotes.type.creditLong'), value: 'credit' },
  { label: t('creditDebitNotes.type.debitLong'), value: 'debit' },
])

function onNoteTypeUpdate(value: unknown) {
  if (value === 'credit' || value === 'debit') noteType.value = value
}

// Amounts — DPP is entered, not derived (the one place CN/DN differs from AP Invoice)
const taxRate = ref(0)
const taxBaseAmount = ref(0)
const taxAmount = ref(0)

// Backend-computed figure — used in VIEW mode instead of recomputing, so an approved
// note does not move when the tax configuration percentage is edited later.
const savedTotalAmount = ref<number | undefined>(undefined)

// Supplier — form-bound, but also drives the legal entity and the reference-invoice picker.
const selectedSupplierId = ref<number | undefined>()
const initialSupplier = ref<Supplier | undefined>()

// Legal entity, resolved from the document's branch via company_branches → companies.
const companyName = ref('')
const companyTaxId = ref('')

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
 * Resolve the legal entity from a branch. A branch mapping to no company is a hard
 * 400 on save (`ErrCompanyNotResolved`), so surface the blank here rather than at submit.
 */
async function resolveCompanyForBranch(branchId: number | undefined) {
  companyName.value = ''
  companyTaxId.value = ''
  if (!branchId) return
  try {
    const query = new GenericQueryBuilder()
      .withFilter('branchId', FilterOperator.EQUAL, branchId)
      .build()
    const mappings = await CompanyBranchesService.list(query)
    const companyId = mappings.data[0]?.companyId
    if (!companyId) return
    const company = await CompaniesService.get(companyId)
    companyName.value = company.name
    companyTaxId.value = company.taxId ?? ''
  } catch {
    // Leave the field blank — the hint under it explains the unmapped branch.
  }
}

// A correction is dated when it is recorded, so it can never be dated ahead of today.
function endOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

const maxNoteDate = computed(() => endOfToday())

// ---------------------------------------------------------------------------
// Correction category / reference AP invoice pickers
// ---------------------------------------------------------------------------

const initialCorrectionCategory = ref<CorrectionCategory | undefined>()
const initialApInvoice = ref<ApInvoiceHeader | undefined>()

const activeCorrectionCategoryFilters = [
  { filterBy: 'is_active', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

// Filtered on an impossible id until a supplier is chosen, so the (disabled) field
// never shows another supplier's invoices while it waits.
const referenceApInvoiceFilters = computed(() => [
  {
    filterBy: 'supplier_id',
    filterOperator: FilterOperator.EQUAL,
    filterValue: selectedSupplierId.value ?? 0,
  },
])

// ---------------------------------------------------------------------------
// Approval pre-flight — decision 4 makes a configured flow mandatory to post.
// ---------------------------------------------------------------------------

const branchApprovalFlowId = ref<number | null>(null)
const approvalConfigLoaded = ref(false)

async function loadApprovalConfig() {
  approvalConfigLoaded.value = false
  try {
    const cfg = await CreditDebitNoteConfigService.getMyBranch()
    branchApprovalFlowId.value = cfg?.approvalFlowId ?? null
  } catch {
    branchApprovalFlowId.value = null
  } finally {
    approvalConfigLoaded.value = true
  }
}

const canSubmitForApproval = computed(
  () => approvalConfigLoaded.value && branchApprovalFlowId.value !== null,
)

// ---------------------------------------------------------------------------
// Tax return note submit-time validation (decision 7) — status-dependent, so zod alone
// cannot express it from a static schema.
// ---------------------------------------------------------------------------

const taxReturnNoteNoError = ref('')

const initialValues = reactive({
  no: '',
  noteType: 'credit' as CreditDebitNoteType,
  supplierId: undefined as number | undefined,
  supplierNoteNo: '',
  noteDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  taxReturnNoteNo: '',
  correctionCategoryId: undefined as number | undefined,
  apInvoiceHeaderId: undefined as number | undefined,
  description: '',
  remark: '',
  branchId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('creditDebitNotes.validation.noRequired')),
      noteType: z.enum(['credit', 'debit'], {
        message: t('creditDebitNotes.validation.noteTypeRequired'),
      }),
      supplierId: z.number({ message: t('creditDebitNotes.validation.supplierRequired') }),
      supplierNoteNo: z.string().min(1, t('creditDebitNotes.validation.supplierNoteNoRequired')),
      noteDate: z
        .date({ message: t('creditDebitNotes.validation.noteDateRequired') })
        .refine((date) => date <= endOfToday(), {
          message: t('creditDebitNotes.validation.noteDateFuture'),
        }),
      taxReturnNoteNo: z.string().optional(),
      correctionCategoryId: z.number({
        message: t('creditDebitNotes.validation.correctionCategoryRequired'),
      }),
      apInvoiceHeaderId: z.number().optional().nullable(),
      description: z.string().min(1, t('creditDebitNotes.validation.descriptionRequired')),
      remark: z.string().optional(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('creditDebitNotes.validation.supplierRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

function clearReferenceInvoice() {
  initialApInvoice.value = undefined
  if (creditDebitNoteFormRef.value?.states?.apInvoiceHeaderId) {
    creditDebitNoteFormRef.value.states.apInvoiceHeaderId.value = undefined
  }
}

async function onSupplierSelect(supplier: Supplier) {
  const changed = selectedSupplierId.value !== supplier.id
  selectedSupplierId.value = supplier.id
  // The reference invoice is supplier-scoped (assumption in the master plan).
  if (changed) clearReferenceInvoice()
}

function onSupplierIdUpdate(value: unknown) {
  if (typeof value === 'number') return
  selectedSupplierId.value = undefined
  clearReferenceInvoice()
}

async function onBranchIdUpdate(value: unknown) {
  selectedBranchId.value = typeof value === 'number' ? value : undefined
  await resolveCompanyForBranch(selectedBranchId.value)
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateCreditDebitNoteRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    if (props.mode === DialogMode.EDIT && props.noteId) {
      // `no` and `branchId` are stamped at creation and are not recomputed on update.
      const req = pendingRequest.value
      await CreditDebitNotesService.update(props.noteId, {
        status: req.status,
        noteType: req.noteType,
        supplierId: req.supplierId,
        supplierNoteNo: req.supplierNoteNo,
        noteDate: req.noteDate,
        taxReturnNoteNo: req.taxReturnNoteNo,
        correctionCategoryId: req.correctionCategoryId,
        apInvoiceHeaderId: req.apInvoiceHeaderId,
        description: req.description,
        taxBaseAmount: req.taxBaseAmount,
        taxAmount: req.taxAmount,
        remark: req.remark,
      })
      toast.add(commonSuccessToast(t('creditDebitNotes.messages.updated'), toastGroup))
    } else {
      await CreditDebitNotesService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('creditDebitNotes.messages.created'), toastGroup))
    }
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    // The config can change between page load and submit — re-check so the guard
    // in the UI stays honest rather than only failing on the server from now on.
    if (chosenStatus.value === 'approved') await loadApprovalConfig()
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  if (taxBaseAmount.value <= 0) {
    toast.add(
      commonErrorToast(new Error(t('creditDebitNotes.validation.taxBasePositive')), toastGroup),
    )
    return
  }

  if (taxAmount.value < 0) {
    toast.add(commonErrorToast(new Error(t('creditDebitNotes.validation.taxNegative')), toastGroup))
    return
  }

  taxReturnNoteNoError.value = ''
  const taxReturnNoteNo = (event.states.taxReturnNoteNo.value as string)?.trim() || null
  if (chosenStatus.value !== 'draft' && taxAmount.value > 0 && !taxReturnNoteNo) {
    taxReturnNoteNoError.value = t('creditDebitNotes.validation.taxReturnNoteNoRequired')
    toast.add(
      commonErrorToast(
        new Error(t('creditDebitNotes.validation.taxReturnNoteNoRequired')),
        toastGroup,
      ),
    )
    return
  }

  let no: string | null = null
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  const request: CreateCreditDebitNoteRequest = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    status: chosenStatus.value,
    noteType: event.states.noteType.value as CreditDebitNoteType,
    supplierId: event.states.supplierId.value as number,
    supplierNoteNo: (event.states.supplierNoteNo.value as string).trim(),
    // dayjs, never toISOString().split('T')[0] — the latter converts to UTC and
    // lands a day early at UTC+7.
    noteDate: dayjs(event.states.noteDate.value as Date).format('YYYY-MM-DD'),
    taxReturnNoteNo,
    correctionCategoryId: event.states.correctionCategoryId.value as number,
    apInvoiceHeaderId: (event.states.apInvoiceHeaderId.value as number | undefined) ?? null,
    description: (event.states.description.value as string).trim(),
    taxBaseAmount: String(taxBaseAmount.value),
    taxAmount: String(taxAmount.value),
    remark: (event.states.remark.value as string)?.trim() || null,
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'creditDebitNoteConfirm',
      header: t('creditDebitNotes.confirm.header'),
      message: t('creditDebitNotes.confirm.message'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('creditDebitNotes.actions.submitForApproval') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadNote() {
  if (!props.noteId) return

  isLoading.value = true
  try {
    const note = await CreditDebitNotesService.get(props.noteId)

    initialValues.no = note.no
    initialValues.noteType = note.noteType
    initialValues.supplierId = note.supplierId
    initialValues.supplierNoteNo = note.supplierNoteNo
    initialValues.noteDate = new Date(note.noteDate)
    initialValues.taxReturnNoteNo = note.taxReturnNoteNo ?? ''
    initialValues.correctionCategoryId = note.correctionCategoryId
    initialValues.apInvoiceHeaderId = note.apInvoiceHeaderId ?? undefined
    initialValues.description = note.description
    initialValues.remark = note.remark ?? ''
    initialValues.branchId = note.branchId

    currentStatus.value = note.status
    noteType.value = note.noteType
    selectedSupplierId.value = note.supplierId
    selectedBranchId.value = note.branchId

    initialSupplier.value = {
      id: note.supplierId,
      name: note.supplierName ?? '',
    } as Supplier

    initialCorrectionCategory.value = {
      id: note.correctionCategoryId,
      name: note.correctionCategoryName ?? '',
    } as CorrectionCategory

    if (note.apInvoiceHeaderId) {
      initialApInvoice.value = {
        id: note.apInvoiceHeaderId,
        no: note.apInvoiceNo ?? '',
      } as ApInvoiceHeader
    }

    companyName.value = note.companyName ?? ''
    companyTaxId.value = note.companyTaxId ?? ''

    taxBaseAmount.value = parseFloat(note.taxBaseAmount) || 0
    taxAmount.value = parseFloat(note.taxAmount) || 0
    savedTotalAmount.value = parseFloat(note.totalAmount) || 0

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, note.branchId)
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
  if (!props.noteId) return
  try {
    const note = await CreditDebitNotesService.get(props.noteId)
    currentStatus.value = note.status
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    isLoading.value = true
  }

  try {
    const taxConfig = await TaxConfigurationService.get().catch(() => ({ percentage: '0' }))
    taxRate.value = parseFloat(taxConfig.percentage) || 0

    if (props.mode !== DialogMode.VIEW) {
      await loadApprovalConfig()
    }

    if ((props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) && props.noteId) {
      await loadNote()
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
