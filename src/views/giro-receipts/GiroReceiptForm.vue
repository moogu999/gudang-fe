<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="giroReceiptConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Message v-else-if="notEditable" severity="error">{{
    t('giroReceipts.messages.notEditable')
  }}</Message>

  <Form
    v-else
    v-slot="$form"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <!-- Status tag (VIEW / EDIT modes) -->
    <div v-if="mode !== DialogMode.ADD && currentStatus" class="mb-4 flex flex-wrap gap-2">
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`giroReceipts.status.${currentStatus}`)"
      />
    </div>

    <!-- Voided banner: the document stays readable, nothing on it is editable. -->
    <Message
      v-if="currentStatus === 'voided'"
      severity="warn"
      class="mb-4"
      data-testid="void-banner"
    >
      <div class="font-semibold">{{ t('giroReceipts.void.voidedBanner') }}</div>
      <div v-if="voidInfo?.at" class="text-sm">
        {{ dayjs(voidInfo.at).format(DateFormat.DATE_TIME) }}
      </div>
      <div class="text-sm">{{ t('giroReceipts.void.reason') }}: {{ voidInfo?.reason }}</div>
    </Message>

    <!-- Source banner (D5): rendered from `source`, so the N-Force variant works once it exists -->
    <Message severity="secondary" variant="simple" class="mb-4" data-testid="source-banner">
      <i class="pi mr-1" :class="source === 'nforce' ? 'pi-mobile' : 'pi-pencil'" />
      {{
        source === 'nforce'
          ? t('giroReceipts.sourceBanner.nforce')
          : t('giroReceipts.sourceBanner.manual', { user: receivedByLabel || '—' })
      }}
    </Message>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column: document header -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('giroReceipts.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('giroReceipts.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('giroReceipts.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('giroReceipts.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('giroReceipts.codeMode.assignedOnSave') }}</small>
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

        <!-- Employee handing the giros over -->
        <div class="flex flex-col gap-1">
          <label for="employeeId" class="text-sm font-semibold">{{
            t('giroReceipts.fields.employee')
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
          <div v-if="employeeTypeName">
            <Tag severity="info" :value="employeeTypeName" />
          </div>
          <Message
            v-if="$form.employeeId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.employeeId.error.message }}</Message
          >
        </div>

        <!-- Receipt date -->
        <div class="flex flex-col gap-1">
          <label for="receiptDate" class="text-sm font-semibold">{{
            t('giroReceipts.fields.receiptDate')
          }}</label>
          <DatePicker
            id="receiptDate"
            name="receiptDate"
            date-format="dd/mm/yy"
            :max-date="maxReceiptDate"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.receiptDate?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.receiptDate.error.message }}</Message
          >
        </div>
      </div>

      <!-- Right column: who received it, and where -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('giroReceipts.sections.receipt') }}
        </h3>

        <!-- Received by is the logged-in user (read-only), never a dropdown (D5) -->
        <div class="flex flex-col gap-1">
          <label for="receivedBy" class="text-sm font-semibold">{{
            t('giroReceipts.fields.receivedBy')
          }}</label>
          <InputText id="receivedBy" :value="receivedByLabel" disabled class="w-full" />
        </div>

        <!-- Legal entity — resolved from the document's branch, never editable -->
        <div class="flex flex-col gap-1">
          <label for="company" class="text-sm font-semibold">{{
            t('giroReceipts.fields.company')
          }}</label>
          <InputText id="company" :value="companyName" disabled class="w-full" />
          <small v-if="!companyName" class="text-surface-500">{{
            t('giroReceipts.labels.companyUnresolved')
          }}</small>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('giroReceipts.fields.branch')
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

    <div class="mb-6">
      <GiroLinesTable
        ref="linesRef"
        v-model="rows"
        :readonly="mode === DialogMode.VIEW"
        :show-status="mode === DialogMode.VIEW && currentStatus !== 'draft'"
      />
    </div>

    <!-- Remark + variance reason | custody strip -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="space-y-4">
        <div v-if="showVarianceReason" class="flex flex-col gap-1">
          <label for="varianceReason" class="text-sm font-semibold">{{
            t('giroReceipts.fields.varianceReason')
          }}</label>
          <Textarea
            id="varianceReason"
            name="varianceReason"
            rows="3"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <small v-if="mode !== DialogMode.VIEW" class="text-surface-500">{{
            t('giroReceipts.labels.varianceReasonHint')
          }}</small>
          <Message v-if="varianceReasonError" severity="error" size="small" variant="simple">{{
            t('giroReceipts.validation.varianceReasonRequired')
          }}</Message>
        </div>

        <div class="flex flex-col gap-1">
          <label for="remark" class="text-sm font-semibold">{{
            t('giroReceipts.fields.remark')
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

      <GiroReceiptSummary
        v-model:actual-count="actualCount"
        v-model:actual-amount="actualAmount"
        :recorded="recorded"
        :readonly="mode === DialogMode.VIEW"
        :saved-recorded="savedTotals?.recorded"
        :saved-actual="savedTotals?.actual"
        :saved-variance="savedTotals?.variance"
      />
    </div>

    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button
        v-if="mode === DialogMode.VIEW && canWrite && currentStatus === 'draft'"
        type="button"
        :label="t('giroReceipts.actions.editGiroReceipt')"
        icon="pi pi-pencil"
        @click="router.push(`/giro-receipts/${giroReceiptId}/edit`)"
      />
      <!-- D7: void only while every giro is still held; explain why when one has moved on. -->
      <span
        v-if="mode === DialogMode.VIEW && canWrite && currentStatus === 'completed'"
        v-tooltip.top="allHeld ? null : t('giroReceipts.labels.voidBlockedHint')"
      >
        <Button
          type="button"
          severity="danger"
          data-testid="void"
          :label="t('giroReceipts.actions.void')"
          icon="pi pi-ban"
          :disabled="!allHeld"
          @click="openVoidDialog"
        />
      </span>
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('giroReceipts.actions.saveDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          data-testid="submit"
          :label="t('giroReceipts.actions.submit')"
          :loading="isSaving"
          @click="chosenStatus = 'completed'"
        />
      </template>
    </div>
  </Form>

  <Dialog
    v-model:visible="voidDialogVisible"
    modal
    :header="t('giroReceipts.void.title')"
    :style="{ width: '32rem', maxWidth: '95vw' }"
  >
    <p class="mb-3 text-sm">{{ t('giroReceipts.void.message') }}</p>
    <div class="flex flex-col gap-1">
      <label for="voidReason" class="text-sm font-semibold">{{
        t('giroReceipts.void.reason')
      }}</label>
      <Textarea id="voidReason" v-model="voidReason" rows="3" class="w-full" />
      <Message v-if="voidReasonError" severity="error" size="small" variant="simple">{{
        t('giroReceipts.void.reasonRequired')
      }}</Message>
    </div>
    <template #footer>
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        @click="voidDialogVisible = false"
      />
      <Button
        type="button"
        severity="danger"
        data-testid="void-confirm"
        :label="t('giroReceipts.actions.void')"
        :loading="isVoiding"
        @click="onVoidConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
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
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import GiroLinesTable from './components/GiroLinesTable.vue'
import GiroReceiptSummary from './components/GiroReceiptSummary.vue'
import { recordedTotals, toPayload, variances, type GiroRow } from './giroReceiptLines'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import {
  GiroReceiptsService,
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
  GiroReceiptStatus,
  GiroReceiptSource,
  GiroReceiptResponse,
  CreateGiroReceiptRequest,
} from '@/types/giroReceipt.type'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries, usePermissions } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/giro-receipts')

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('giro_receipts')

const toastGroup = 'giroReceiptForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  giroReceiptId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: [receipt: GiroReceiptResponse]
}>()

// Status
const chosenStatus = ref<'draft' | 'completed'>('draft')
const currentStatus = ref<GiroReceiptStatus | undefined>()
const source = ref<GiroReceiptSource>('manual')
const notEditable = ref(false)

function statusSeverity(status: GiroReceiptStatus) {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)

const linesRef = ref<InstanceType<typeof GiroLinesTable> | null>(null)

// ---------------------------------------------------------------------------
// Employee — any active employee; the type is shown read-only after the pick (D5).
// ---------------------------------------------------------------------------

const initialEmployee = ref<Employee | undefined>()
const employeeTypeName = ref('')

const employeeFilters = [
  { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

function onEmployeeSelect(employee: Employee) {
  employeeTypeName.value = employee.employeeType?.name ?? ''
}

function onEmployeeIdUpdate(value: unknown) {
  if (typeof value !== 'number') employeeTypeName.value = ''
}

// ---------------------------------------------------------------------------
// Header: date, received by, company, branch
// ---------------------------------------------------------------------------

function endOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

// Custody is recorded after the giros change hands, so it can't be dated ahead of today.
// Backdating is allowed (master assumption 7).
const maxReceiptDate = computed(() => endOfToday())

const savedReceivedBy = ref('')
const receivedByLabel = computed(() =>
  props.mode === DialogMode.ADD ? (authStore.email ?? '') : savedReceivedBy.value,
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
 * Resolve the legal entity from a branch. A branch mapping to no company is a hard 400 on
 * save, so surface the blank here rather than at submit.
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
    // Leave the field blank — the hint under Company explains the unmapped branch.
  }
}

async function onBranchIdUpdate(value: unknown) {
  selectedBranchId.value = typeof value === 'number' ? value : undefined
  await resolveCompanyForBranch(selectedBranchId.value)
}

// ---------------------------------------------------------------------------
// Lines + custody check (D4)
// ---------------------------------------------------------------------------

const rows = ref<GiroRow[]>([])
const actualCount = ref<number | null>(null)
const actualAmount = ref<number | null>(null)

const recorded = computed(() => recordedTotals(rows.value))
const variance = computed(() =>
  variances(recorded.value, { count: actualCount.value, amount: actualAmount.value }),
)
const hasVariance = computed(() => variance.value.count !== 0 || variance.value.amount !== 0)

interface Totals {
  count: number
  amount: number
}
const savedTotals = ref<{ recorded: Totals; actual: Totals; variance: Totals } | undefined>()
const savedVarianceReason = ref('')

// D4: the reason is UI-required on Submit only; a half-counted draft must still save.
const showVarianceReason = computed(() =>
  props.mode === DialogMode.VIEW ? !!savedVarianceReason.value : hasVariance.value,
)
const varianceReasonError = ref(false)

const allHeld = ref(false)

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const initialValues = reactive({
  no: '',
  employeeId: undefined as number | undefined,
  receiptDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
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
          : z.string().min(1, t('giroReceipts.validation.noRequired')),
      employeeId: z.number({ message: t('giroReceipts.validation.employeeRequired') }),
      receiptDate: z
        .date({ message: t('giroReceipts.validation.receiptDateRequired') })
        .refine((date) => date <= endOfToday(), {
          message: t('giroReceipts.validation.receiptDateFuture'),
        }),
      varianceReason: z.string().optional().nullable(),
      remark: z.string().optional().nullable(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('giroReceipts.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateGiroReceiptRequest | null>(null)

function failValidation(key: string) {
  toast.add(commonErrorToast(new Error(t(key)), toastGroup))
}

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    let saved: GiroReceiptResponse
    if (props.mode === DialogMode.EDIT && props.giroReceiptId) {
      // Number and branch are stamped at creation and ignored on update.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { no, branchId, ...req } = pendingRequest.value
      saved = await GiroReceiptsService.update(props.giroReceiptId, req)
      toast.add(commonSuccessToast(t('giroReceipts.messages.updated'), toastGroup))
    } else {
      saved = await GiroReceiptsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('giroReceipts.messages.created'), toastGroup))
    }
    emit('submitted', saved)
  } catch (e) {
    // ErrCustomerNotGiroEnabled / ErrDuplicateGiro name no row, so the server's message is
    // all there is to show.
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  const completing = chosenStatus.value === 'completed'
  const reason = (event.states.varianceReason?.value as string | undefined)?.trim()
  varianceReasonError.value = completing && hasVariance.value && !reason

  if (!event.valid) return

  if (completing && rows.value.length === 0)
    return failValidation('giroReceipts.validation.noGiros')

  if (linesRef.value && !linesRef.value.validate()) {
    return failValidation('giroReceipts.validation.girosInvalid')
  }

  if (completing && (actualCount.value === null || actualAmount.value === null)) {
    return failValidation('giroReceipts.validation.actualRequired')
  }

  if (varianceReasonError.value) {
    return failValidation('giroReceipts.validation.varianceReasonRequired')
  }

  // Auto mode sends no number — the backend assigns one from the series on save.
  let no: string | null = null
  if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  pendingRequest.value = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    // dayjs, never toISOString() — UTC+7 lands a day early.
    receiptDate: dayjs(event.states.receiptDate.value as Date).format('YYYY-MM-DD'),
    employeeId: event.states.employeeId.value as number,
    // A draft may be saved before the count is done; it round-trips as "not counted yet".
    actualCount: actualCount.value ?? 0,
    actualAmount: (actualAmount.value ?? 0).toFixed(2),
    varianceReason: hasVariance.value && reason ? reason : null,
    remark: (event.states.remark?.value as string | undefined)?.trim() || null,
    status: chosenStatus.value,
    giros: toPayload(rows.value),
  }

  if (completing) {
    confirm.require({
      group: 'giroReceiptConfirm',
      header: t('giroReceipts.confirm.header'),
      message: t('giroReceipts.confirm.submit', {
        n: recorded.value.count,
        amount: formatNumber(recorded.value.amount),
      }),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('giroReceipts.actions.submit') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Void (completed, every giro held)
// ---------------------------------------------------------------------------

const voidDialogVisible = ref(false)
const voidReason = ref('')
const voidReasonError = ref(false)
const isVoiding = ref(false)
const voidInfo = ref<{ at?: string | null; reason?: string | null } | null>(null)

function openVoidDialog() {
  voidReason.value = ''
  voidReasonError.value = false
  voidDialogVisible.value = true
}

async function onVoidConfirm() {
  const reason = voidReason.value.trim()
  voidReasonError.value = !reason
  if (!reason || !props.giroReceiptId) return

  isVoiding.value = true
  try {
    await GiroReceiptsService.void(props.giroReceiptId, reason)
    voidDialogVisible.value = false
    toast.add(commonSuccessToast(t('giroReceipts.messages.voided'), toastGroup))
    await loadReceipt()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isVoiding.value = false
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadReceipt() {
  if (!props.giroReceiptId) return

  isLoading.value = true
  try {
    const receipt = await GiroReceiptsService.get(props.giroReceiptId)

    // Only a draft is editable. The list never offers Edit otherwise, but a typed URL can get here.
    if (props.mode === DialogMode.EDIT && receipt.status !== 'draft') {
      notEditable.value = true
      return
    }

    initialValues.no = receipt.no
    initialValues.employeeId = receipt.employeeId
    initialValues.receiptDate = dayjs(receipt.receiptDate.slice(0, 10)).toDate()
    initialValues.varianceReason = receipt.varianceReason ?? ''
    initialValues.remark = receipt.remark ?? ''
    initialValues.branchId = receipt.branchId

    currentStatus.value = receipt.status
    source.value = receipt.source
    selectedBranchId.value = receipt.branchId
    initialEmployee.value = { id: receipt.employeeId, name: receipt.employeeName ?? '' } as Employee
    employeeTypeName.value = receipt.employeeTypeName ?? ''
    companyName.value = receipt.companyName ?? ''
    savedReceivedBy.value = receipt.receivedByUserName ?? ''
    savedVarianceReason.value = receipt.varianceReason ?? ''
    voidInfo.value = { at: receipt.voidedAt, reason: receipt.voidReason }
    allHeld.value = receipt.giros.length > 0 && receipt.giros.every((g) => g.status === 'held')

    const recordedAmount = parseFloat(receipt.recordedAmount) || 0
    const savedActualAmount = parseFloat(receipt.actualAmount) || 0
    savedTotals.value = {
      recorded: { count: receipt.recordedCount, amount: recordedAmount },
      actual: { count: receipt.actualCount, amount: savedActualAmount },
      variance: {
        count: receipt.varianceCount,
        amount: parseFloat(receipt.varianceAmount) || 0,
      },
    }

    // A draft saved before counting stored 0/0; show it as "not counted yet" rather than as a
    // full variance, so reopening it doesn't demand a reason for a count nobody made.
    const uncounted =
      receipt.status === 'draft' && receipt.actualCount === 0 && savedActualAmount === 0
    actualCount.value = uncounted ? null : receipt.actualCount
    actualAmount.value = uncounted ? null : savedActualAmount

    rows.value = receipt.giros.map((g) => ({
      _key: crypto.randomUUID(),
      giroNo: g.giroNo,
      issuingBank: g.issuingBank,
      customerId: g.customerId,
      customer: {
        id: g.customerId,
        name: g.customerName ?? '',
        code: g.customerCode ?? undefined,
      },
      giroDate: dayjs(g.giroDate.slice(0, 10)).toDate(),
      dueDate: dayjs(g.dueDate.slice(0, 10)).toDate(),
      amount: parseFloat(g.amount) || 0,
      status: g.status,
      clearedDate: g.clearedDate,
      rejectedDate: g.rejectedDate,
      rejectionNote: g.rejectionNote,
    }))

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, receipt.branchId)
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

onBeforeMount(async () => {
  if (props.mode !== DialogMode.ADD && props.giroReceiptId) {
    await loadReceipt()
    return
  }

  isLoading.value = true
  try {
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
    isLoading.value = false
  }
})
</script>
