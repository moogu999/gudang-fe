<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="arClearingConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Message v-else-if="notEditable" severity="error">{{
    t('arClearings.messages.notEditable')
  }}</Message>

  <Form
    v-else
    v-slot="$form"
    ref="formRef"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <!-- Status (VIEW / EDIT) -->
    <div
      v-if="mode !== DialogMode.ADD && currentStatus"
      class="mb-4 flex flex-wrap items-center gap-2"
    >
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`arClearings.status.${currentStatus}`)"
      />
    </div>

    <!-- Voided banner: the document stays readable, nothing on it is editable. -->
    <Message
      v-if="currentStatus === 'voided'"
      severity="warn"
      class="mb-4"
      data-testid="void-banner"
    >
      <div class="font-semibold">{{ t('arClearings.void.voidedBanner') }}</div>
      <div v-if="voidInfo?.at" class="text-sm">
        {{ dayjs(voidInfo.at).format(DateFormat.DATE_TIME) }}
      </div>
      <div class="text-sm">{{ t('arClearings.void.reason') }}: {{ voidInfo?.reason }}</div>
    </Message>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column: document number, branch, date -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('arClearings.sections.header') }}
        </h3>

        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('arClearings.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('arClearings.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('arClearings.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('arClearings.codeMode.assignedOnSave') }}</small>
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

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('arClearings.fields.branch')
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

        <!-- Not bound through the Form (`name`): validated on submit — see onDateUpdate. -->
        <div class="flex flex-col gap-1">
          <label for="clearingDate" class="text-sm font-semibold">{{
            t('arClearings.fields.clearingDate')
          }}</label>
          <DatePicker
            id="clearingDate"
            :model-value="clearingDate"
            date-format="dd/mm/yy"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @update:model-value="onDateUpdate"
          />
          <Message v-if="dateError" severity="error" size="small" variant="simple">{{
            t('arClearings.validation.clearingDateRequired')
          }}</Message>
        </div>
      </div>

      <!-- Right column: customer + remark -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('arClearings.fields.customer') }}
        </h3>

        <div class="flex flex-col gap-1">
          <label for="customerId" class="text-sm font-semibold">{{
            t('arClearings.fields.customer')
          }}</label>
          <InfiniteSelect
            id="customerId"
            name="customerId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => CustomersService.list(q)"
            :initial-option="initialCustomer"
            :placeholder="t('arClearings.fields.selectCustomer')"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onCustomerUpdate"
            @select-option="(opt: object) => onCustomerSelect(opt as Customer)"
          />
          <Message
            v-if="$form.customerId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.customerId.error.message }}</Message
          >
          <small v-if="mode !== DialogMode.VIEW" class="text-surface-500">{{
            t('arClearings.fields.customerHint')
          }}</small>
        </div>

        <div class="flex flex-col gap-1">
          <label for="remark" class="text-sm font-semibold">{{
            t('arClearings.fields.remark')
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
    </div>

    <Divider class="my-6" />

    <!-- Sources -->
    <div class="mb-6">
      <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('arClearings.sections.sources') }}
      </h3>
      <ArClearingSourceTable
        :customer-id="selectedCustomerId"
        :items="sourceItems"
        :picked="picked"
        :loading="poolLoading"
        :readonly="readonly"
        @update:picked="onPickedUpdate"
      />
    </div>

    <!-- Invoices -->
    <div class="mb-6">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('arClearings.sections.invoices') }}
        </h3>
        <Button
          v-if="!readonly"
          type="button"
          icon="pi pi-bolt"
          size="small"
          severity="secondary"
          data-testid="auto-allocate"
          :label="t('arClearings.invoices.autoAllocate')"
          :disabled="picked.length === 0 || invoiceRows.length === 0"
          @click="onAutoAllocate"
        />
      </div>
      <ArClearingInvoiceTable
        v-model:rows="invoiceRows"
        :customer-id="selectedCustomerId"
        :loading="poolLoading"
        :readonly="readonly"
      />
    </div>

    <Message v-if="droppedCount > 0" severity="warn" class="mb-4">
      {{ t('arClearings.messages.staleDropped', { count: droppedCount }) }}
    </Message>

    <ArClearingSummary
      :available="liveTotals.available"
      :allocated="liveTotals.allocated"
      :unallocated="liveTotals.unallocated"
      :readonly="readonly"
      :saved-available="savedTotals?.available"
      :saved-allocated="savedTotals?.allocated"
      :saved-unallocated="savedTotals?.unallocated"
    />

    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button
        v-if="mode === DialogMode.VIEW && canWrite && currentStatus === 'draft'"
        type="button"
        :label="t('arClearings.actions.editArClearing')"
        icon="pi pi-pencil"
        @click="router.push(`/ar-clearings/${arClearingId}/edit`)"
      />
      <Button
        v-if="mode === DialogMode.VIEW && canWrite && currentStatus === 'completed'"
        type="button"
        severity="danger"
        data-testid="void"
        :label="t('arClearings.actions.void')"
        icon="pi pi-ban"
        @click="openVoidDialog"
      />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('arClearings.actions.saveDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          data-testid="submit"
          :label="t('arClearings.actions.submit')"
          :loading="isSaving"
          @click="chosenStatus = 'completed'"
        />
      </template>
    </div>
  </Form>

  <Dialog
    v-model:visible="voidDialogVisible"
    modal
    :header="t('arClearings.void.title')"
    :style="{ width: '32rem', maxWidth: '95vw' }"
  >
    <p class="mb-3 text-sm">{{ t('arClearings.confirm.void') }}</p>
    <div class="flex flex-col gap-1">
      <label for="voidReason" class="text-sm font-semibold">{{
        t('arClearings.void.reason')
      }}</label>
      <Textarea id="voidReason" v-model="voidReason" rows="3" class="w-full" />
      <Message v-if="voidReasonError" severity="error" size="small" variant="simple">{{
        t('arClearings.void.reasonRequired')
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
        :label="t('arClearings.actions.void')"
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
import ArClearingSourceTable from './components/ArClearingSourceTable.vue'
import ArClearingInvoiceTable from './components/ArClearingInvoiceTable.vue'
import ArClearingSummary from './components/ArClearingSummary.vue'
import {
  autoAllocate,
  keyOf,
  toAllocationRow,
  toSourceRow,
  totals,
  type AllocationRow,
  type SourceRow,
} from './arClearingLines'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import {
  ArClearingsService,
  ArOutstandingService,
  BranchesService,
  CustomersService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Branch, Customer } from '@/types'
import type {
  ArClearingResponse,
  ArClearingStatus,
  CreateArClearingRequest,
} from '@/types/arClearing.type'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries, usePermissions } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/ar-clearings')

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('ar_clearings')

const toastGroup = 'arClearingForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  arClearingId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: [clearing: ArClearingResponse]
}>()

const chosenStatus = ref<Exclude<ArClearingStatus, 'voided'>>('draft')
const currentStatus = ref<ArClearingStatus | undefined>()
const notEditable = ref(false)
const isLoading = ref(false)
const isSaving = ref(false)
const formRef = ref()

/** Draft and voided documents are shown from what was saved; nothing is re-read from the live pool. */
const readonly = computed(() => props.mode === DialogMode.VIEW)

function statusSeverity(status: ArClearingStatus) {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  return 'info'
}

// ---------------------------------------------------------------------------
// Header: branch, date, customer
// ---------------------------------------------------------------------------

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

// Not bound through the Form (`name`) — the clearing date is validated on submit instead, the
// same way Bank Settlement's period is, since a Form-managed PrimeVue date value can leave the
// picker's own `modelValue` undefined.
const clearingDate = ref<Date | null>(null)
const dateError = ref(false)

function onDateUpdate(value: unknown) {
  clearingDate.value = value instanceof Date ? value : null
  if (clearingDate.value) dateError.value = false
}

const selectedCustomerId = ref<number | undefined>()
const selectedCustomerName = ref('')
const initialCustomer = ref<Customer | undefined>()

// ---------------------------------------------------------------------------
// Pool: sources, invoices, allocations
// ---------------------------------------------------------------------------

const sourceItems = ref<SourceRow[]>([])
const picked = ref<SourceRow[]>([])
const invoiceRows = ref<AllocationRow[]>([])
const poolLoading = ref(false)
const droppedCount = ref(0)
const savedTotals = ref<{ available: number; allocated: number; unallocated: number } | undefined>()

const liveTotals = computed(() => totals(picked.value, invoiceRows.value))

// Guards against a slow response for a previous customer landing after a switch.
let poolRequest = 0

function clearPool() {
  poolRequest++
  sourceItems.value = []
  picked.value = []
  invoiceRows.value = []
  droppedCount.value = 0
  poolLoading.value = false
}

/**
 * Load the customer's whole pool. `saved` (EDIT of a draft) re-ticks the sources and refills the
 * allocations that are still valid; anything that has since left the pool is dropped and counted,
 * since the server re-snapshots on submit anyway (D9).
 */
async function loadPool(saved?: ArClearingResponse) {
  const customerId = selectedCustomerId.value
  if (!customerId) return clearPool()

  const request = ++poolRequest
  poolLoading.value = true
  droppedCount.value = 0
  const params = {
    customerId,
    branchId: showBranchPicker.value ? selectedBranchId.value : undefined,
  }
  try {
    const [cash, invoices] = await Promise.all([
      ArOutstandingService.allUnappliedCash(params),
      ArOutstandingService.allOpenItems(params),
    ])
    if (request !== poolRequest) return

    sourceItems.value = cash.map(toSourceRow)

    const savedAmounts = new Map(
      (saved?.allocations ?? []).map((a) => [a.invoiceId, parseFloat(a.appliedAmount) || 0]),
    )
    invoiceRows.value = invoices.map((i) => toAllocationRow(i, savedAmounts.get(i.documentId) ?? 0))

    if (saved) {
      const savedKeys = new Set(saved.sources.map((s) => keyOf(s.sourceType, s.sourceLineId)))
      picked.value = sourceItems.value.filter((s) => savedKeys.has(s._key))
      const openIds = new Set(invoices.map((i) => i.documentId))
      droppedCount.value =
        saved.sources.length -
        picked.value.length +
        saved.allocations.filter((a) => !openIds.has(a.invoiceId)).length
    }
  } catch (e) {
    if (request === poolRequest) toast.add(commonErrorToast(e, toastGroup))
  } finally {
    if (request === poolRequest) poolLoading.value = false
  }
}

/** Everything below the header is scoped to one customer (D5), so a switch invalidates it all. */
async function switchCustomer(next: number | undefined) {
  if (next === selectedCustomerId.value) return
  selectedCustomerId.value = next
  if (!next) selectedCustomerName.value = ''
  clearPool()
  await loadPool()
}

function onCustomerUpdate(value: unknown) {
  return switchCustomer(typeof value === 'number' ? value : undefined)
}

// InfiniteSelect emits `update:model-value` and `select-option` back to back; the id is taken
// from the former and the label from the latter, so neither depends on the order.
function onCustomerSelect(customer: Customer) {
  selectedCustomerName.value = customer.name
}

async function onBranchIdUpdate(value: unknown) {
  const next = typeof value === 'number' ? value : undefined
  if (next === selectedBranchId.value) return
  selectedBranchId.value = next
  clearPool()
  await loadPool()
}

function onPickedUpdate(next: SourceRow[]) {
  picked.value = next
}

function onAutoAllocate() {
  const run = () => {
    invoiceRows.value = autoAllocate(picked.value, invoiceRows.value)
  }
  // Advisory (D12), but it overwrites hand-typed values, so ask first.
  if (invoiceRows.value.some((r) => r.allocated > 0)) {
    confirm.require({
      group: 'arClearingConfirm',
      header: t('arClearings.confirm.header'),
      message: t('arClearings.confirm.autoAllocate'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('arClearings.invoices.autoAllocate') },
      accept: run,
    })
  } else {
    run()
  }
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const initialValues = reactive({
  no: '',
  branchId: undefined as number | undefined,
  customerId: undefined as number | undefined,
  remark: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('arClearings.validation.noRequired')),
      customerId: z.number({ message: t('arClearings.validation.customerRequired') }),
      remark: z.string().optional().nullable(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('arClearings.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateArClearingRequest | null>(null)

function failValidation(key: string) {
  toast.add(commonErrorToast(new Error(t(key)), toastGroup))
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    let saved: ArClearingResponse
    if (props.mode === DialogMode.EDIT && props.arClearingId) {
      // Number, branch and company are stamped at creation and ignored on update.
      const req = pendingRequest.value
      saved = await ArClearingsService.update(props.arClearingId, {
        customerId: req.customerId,
        clearingDate: req.clearingDate,
        remark: req.remark,
        status: req.status,
        sources: req.sources,
        allocations: req.allocations,
      })
      toast.add(commonSuccessToast(t('arClearings.messages.updated'), toastGroup))
    } else {
      saved = await ArClearingsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('arClearings.messages.created'), toastGroup))
    }
    emit('submitted', saved)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  dateError.value = !clearingDate.value
  if (!event.valid || !clearingDate.value) return
  if (!selectedCustomerId.value) return failValidation('arClearings.validation.customerRequired')
  if (picked.value.length === 0) return failValidation('arClearings.validation.noSources')

  const allocations = invoiceRows.value.filter((r) => r.allocated > 0)
  if (allocations.length === 0) return failValidation('arClearings.validation.noAllocations')
  if (liveTotals.value.unallocated < 0)
    return failValidation('arClearings.validation.insufficientCash')

  // Auto mode sends no number — the backend assigns one from the series on save.
  let no: string | null = null
  if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  pendingRequest.value = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    customerId: selectedCustomerId.value,
    // dayjs, never toISOString().split('T')[0] — the latter converts to UTC and lands a day
    // early at UTC+7.
    clearingDate: dayjs(clearingDate.value).format('YYYY-MM-DD'),
    remark: (event.states.remark?.value as string | undefined)?.trim() || null,
    status: chosenStatus.value,
    // No amounts on the sources — the server derives what each one gives (D7).
    sources: picked.value.map((s) => ({ sourceType: s.sourceType, sourceLineId: s.sourceLineId })),
    allocations: allocations.map((r) => ({
      invoiceId: r.documentId,
      appliedAmount: r.allocated.toFixed(2),
    })),
  }

  if (chosenStatus.value === 'completed') {
    confirm.require({
      group: 'arClearingConfirm',
      header: t('arClearings.confirm.header'),
      message: t('arClearings.confirm.submit', {
        customer: selectedCustomerName.value,
        total: formatNumber(liveTotals.value.allocated),
      }),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('arClearings.actions.submit') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ---------------------------------------------------------------------------
// Void (completed only)
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
  if (!reason || !props.arClearingId) return

  isVoiding.value = true
  try {
    await ArClearingsService.void(props.arClearingId, { reason })
    voidDialogVisible.value = false
    toast.add(commonSuccessToast(t('arClearings.messages.voided'), toastGroup))
    await loadClearing()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isVoiding.value = false
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/** A saved document rendered as the two tables' row shapes, so VIEW reuses them read-only. */
function showSaved(clearing: ArClearingResponse) {
  sourceItems.value = clearing.sources.map((s) =>
    toSourceRow({
      sourceType: s.sourceType,
      sourceLineId: s.sourceLineId,
      sourceDocumentId: 0,
      sourceDocumentNo: s.sourceDocumentNo,
      customerId: clearing.customerId,
      sourceDate: s.sourceDate,
      amount: s.consumedAmount,
      appliedAmount: '0',
      unappliedAmount: s.consumedAmount,
      sourceDetail: '',
      description: '',
    }),
  )
  picked.value = []
  invoiceRows.value = clearing.allocations.map((a) => ({
    documentType: 'invoice',
    documentId: a.invoiceId,
    documentNo: a.invoiceNo,
    customerId: clearing.customerId,
    customerName: clearing.customerName ?? '',
    documentDate: '',
    ageDays: null,
    totalAmount: a.referenceAmount,
    settledAmount: '0',
    outstandingAmount: a.outstandingAmount,
    allocated: parseFloat(a.appliedAmount) || 0,
  }))
}

async function loadClearing() {
  if (!props.arClearingId) return

  isLoading.value = true
  try {
    const clearing = await ArClearingsService.get(props.arClearingId)

    // Only a draft is editable; the list never offers Edit otherwise, but a typed URL can get here.
    if (props.mode === DialogMode.EDIT && clearing.status !== 'draft') {
      notEditable.value = true
      return
    }

    initialValues.no = clearing.no
    initialValues.branchId = clearing.branchId
    initialValues.customerId = clearing.customerId
    initialValues.remark = clearing.remark ?? ''

    clearingDate.value = dayjs(clearing.clearingDate.slice(0, 10)).toDate()
    currentStatus.value = clearing.status
    selectedBranchId.value = clearing.branchId
    selectedCustomerId.value = clearing.customerId
    selectedCustomerName.value = clearing.customerName ?? ''
    initialCustomer.value = {
      id: clearing.customerId,
      name: clearing.customerName ?? '',
      code: clearing.customerCode ?? '',
    } as Customer
    voidInfo.value = { at: clearing.voidedAt, reason: clearing.voidReason }
    savedTotals.value = {
      available: parseFloat(clearing.availableAmount) || 0,
      allocated: parseFloat(clearing.allocatedAmount) || 0,
      unallocated: parseFloat(clearing.unallocatedAmount) || 0,
    }

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, clearing.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }

    if (props.mode === DialogMode.VIEW) {
      showSaved(clearing)
    } else {
      await loadPool(clearing)
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    clearingDate.value = new Date()
    isLoading.value = true
  }

  try {
    if ((props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) && props.arClearingId) {
      await loadClearing()
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
  } finally {
    if (props.mode === DialogMode.ADD) {
      isLoading.value = false
    }
  }
})
</script>
