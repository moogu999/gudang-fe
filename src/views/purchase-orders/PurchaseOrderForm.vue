<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="poApproveConfirm" />

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
        :value="t(`purchaseOrders.status.${currentStatus}`)"
      />
    </div>

    <!-- Approval timeline + actions (VIEW / EDIT modes only — submission to approval is automatic) -->
    <Panel
      v-if="mode !== DialogMode.ADD && purchaseOrderId"
      v-model:collapsed="isApprovalCollapsed"
      toggleable
      :header="t('approvals.sectionTitle')"
      class="mb-4"
    >
      <ApprovalTimeline
        ref="approvalTimelineRef"
        module-key="purchase_order"
        :reference-id="purchaseOrderId"
        :show-status-header="false"
      />
      <Divider />
      <ApprovalActionBar
        module-key="purchase_order"
        :reference-id="purchaseOrderId"
        @changed="onApprovalChanged"
      />
    </Panel>

    <!-- Two Column Layout for Header Fields -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left Column: Supplier Information -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('purchaseOrders.sections.supplier') }}
        </h3>

        <!-- PO Number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('purchaseOrders.fields.no') }}</label>
          <!-- Auto/Manual toggle — ADD mode only -->
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('purchaseOrders.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('purchaseOrders.codeMode.manual')"
              :severity="noMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="noMode = 'manual'"
            />
          </div>
          <!-- Auto mode: read-only preview -->
          <div v-if="mode === DialogMode.ADD && noMode === 'auto'" class="flex flex-col gap-1">
            <InputText
              :value="numberSeriesLoading ? '' : previewCode"
              :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
              readonly
              class="w-full"
            />
            <small class="text-surface-500">{{
              t('purchaseOrders.codeMode.assignedOnSave')
            }}</small>
          </div>
          <!-- Manual mode (ADD) or VIEW/EDIT mode: editable / read-only -->
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
            t('purchaseOrders.fields.supplier')
          }}</label>
          <InfiniteSelect
            id="supplierId"
            name="supplierId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => SuppliersService.list(query)"
            :initial-option="initialSupplier"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @select-option="(opt) => onSupplierSelect(opt as Supplier)"
          />
          <p v-if="currentSupplier" class="text-xs text-stone-500">
            {{ currentSupplier.address }} · NPWP {{ currentSupplier.npwp }} · PIC:
            {{ currentSupplier.picName }}
          </p>
          <Message
            v-if="$form.supplierId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.supplierId.error.message }}</Message
          >
        </div>

        <!-- Term of Payment (never "TOP") -->
        <div class="flex flex-col gap-1">
          <label for="paymentTermId" class="text-sm font-semibold">{{
            t('purchaseOrders.fields.paymentTerm')
          }}</label>
          <InfiniteSelect
            id="paymentTermId"
            :model-value="currentPaymentTermId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => PaymentTermsService.list(query)"
            :initial-option="initialPaymentTerm"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onPaymentTermUpdate"
            @select-option="(opt) => onPaymentTermSelect(opt as PaymentTermRef)"
          />
          <Message v-if="showPaymentTermError" severity="error" size="small" variant="simple">{{
            t('purchaseOrders.validation.paymentTermRequired')
          }}</Message>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('purchaseOrders.fields.branch')
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
          />
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">{{
            $form.branchId.error.message
          }}</Message>
        </div>
      </div>

      <!-- Right Column: Order Detail -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('purchaseOrders.sections.orderDetail') }}
        </h3>

        <div class="grid grid-cols-2 gap-3">
          <!-- PO Date -->
          <div class="flex flex-col gap-1">
            <label for="orderDate" class="text-sm font-semibold">{{
              t('purchaseOrders.fields.orderDate')
            }}</label>
            <DatePicker
              id="orderDate"
              name="orderDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
            <Message
              v-if="$form.orderDate?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.orderDate.error.message }}</Message
            >
          </div>

          <!-- Expected Delivery Date -->
          <div class="flex flex-col gap-1">
            <label for="expectedDeliveryDate" class="text-sm font-semibold">{{
              t('purchaseOrders.fields.expectedDeliveryDate')
            }}</label>
            <DatePicker
              id="expectedDeliveryDate"
              name="expectedDeliveryDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
          </div>
        </div>

        <!-- Reference -->
        <div class="flex flex-col gap-1">
          <label for="reference" class="text-sm font-semibold">{{
            t('purchaseOrders.fields.reference')
          }}</label>
          <InputText
            id="reference"
            name="reference"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Details Section -->
    <PurchaseOrderDetailsTable v-model="details" :mode="mode" :tax-rate="taxRate" />

    <Divider />

    <!-- Remark + Summary Section -->
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Remark -->
      <div class="flex flex-col gap-1">
        <label for="remark" class="text-sm font-semibold">{{
          t('purchaseOrders.fields.remark')
        }}</label>
        <Textarea
          id="remark"
          name="remark"
          rows="4"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
      </div>

      <!-- Summary -->
      <div class="rounded-lg border border-stone-200 p-4">
        <h4 class="mb-3 text-sm font-semibold sm:text-base">
          {{ t('purchaseOrders.summary.title') }}
        </h4>

        <div class="space-y-2">
          <div class="flex justify-between">
            <span>{{ t('purchaseOrders.summary.grossTotal') }}</span>
            <span>{{ formatCurrency(calculatedTotals.grossTotal) }}</span>
          </div>

          <div class="flex justify-between text-red-600">
            <span>{{ t('purchaseOrders.summary.discountTotal') }}</span>
            <span>- {{ formatCurrency(calculatedTotals.discountTotal) }}</span>
          </div>

          <Divider />

          <div class="flex justify-between">
            <span>{{ t('purchaseOrders.summary.taxBase') }}</span>
            <span>{{ formatCurrency(calculatedTotals.taxBase) }}</span>
          </div>

          <div class="flex justify-between text-orange-600">
            <span>{{ t('purchaseOrders.summary.tax') }}</span>
            <span>+ {{ formatCurrency(calculatedTotals.taxAmount) }}</span>
          </div>

          <Divider />

          <div class="flex justify-between text-lg">
            <span class="font-bold">{{ t('purchaseOrders.summary.total') }}</span>
            <span class="font-bold text-green-600">{{
              formatCurrency(calculatedTotals.total)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('purchaseOrders.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="t('purchaseOrders.actions.submitForApproval')"
          :loading="isSaving"
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
import ConfirmDialog from 'primevue/confirmdialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Panel from 'primevue/panel'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import PurchaseOrderDetailsTable from './PurchaseOrderDetailsTable.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import {
  SuppliersService,
  PaymentTermsService,
  BranchesService,
  PurchaseOrdersService,
  PurchaseOrderHeadersService,
  PurchaseOrderDetailsService,
  TaxConfigurationService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Supplier, PaymentTermRef } from '@/types/supplier.type'
import type { Branch } from '@/types'
import type { Base } from '@/types/api.type'
import type {
  PurchaseOrderStatus,
  PurchaseOrderDetailRow,
  CreatePurchaseOrderRequest,
} from '@/types/purchaseOrder.type'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries } from '@/composables'

const { t, locale } = useI18n()
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
} = useNumberSeries('purchase_orders')

const toastGroup = 'purchaseOrderForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  purchaseOrderId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

// Status tracking
const chosenStatus = ref<'draft' | 'approved'>('draft')
const currentStatus = ref<PurchaseOrderStatus | undefined>()
const approvalTimelineRef = ref<InstanceType<typeof ApprovalTimeline> | null>(null)
const isApprovalCollapsed = ref(false)

function statusSeverity(status: PurchaseOrderStatus) {
  if (status === 'approved') return 'success'
  if (status === 'applied') return 'info'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

// State
const isLoading = ref(false)
const isSaving = ref(false)
const details = ref<PurchaseOrderDetailRow[]>([])
const taxRate = ref(0)
const savedSubtotalAmount = ref(0)
const savedDiscountAmount = ref(0)
const savedTaxBaseAmount = ref(0)
const savedTaxAmount = ref(0)
const savedTotalAmount = ref(0)

// Supplier
const currentSupplier = ref<Supplier | undefined>()
const initialSupplier = ref<Supplier | undefined>()

// Term of Payment — kept outside the Form/zod schema (not name-bound) because it must be
// updated programmatically when the supplier changes, per the master plan's Assumptions.
const currentPaymentTermId = ref<number | undefined>()
const initialPaymentTerm = ref<PaymentTermRef | undefined>()
const paymentTermTouched = ref(false)
const paymentTermSubmitAttempted = ref(false)
const showPaymentTermError = computed(
  () => paymentTermSubmitAttempted.value && !currentPaymentTermId.value,
)

// Branch — only rendered when the user has more than one assigned branch (master plan,
// Branch resolution). Single-branch users never see this field; the backend resolves silently.
const showBranchPicker = computed(() => authStore.branchIds.length > 1)
const initialBranch = ref<Branch | undefined>()

// The picker must only offer the user's own assigned branches. The generic-CRUD filter DSL
// has no "IN (list)" operator, so instead of hitting the paginated /gen/v1/branches endpoint,
// fetch the user's (small, fixed) branch set once and filter it in memory.
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

async function fetchUserBranches(query: string): Promise<Base<Branch>> {
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

const purchaseOrderId = computed(() => props.purchaseOrderId)

function onSupplierSelect(opt: Supplier) {
  currentSupplier.value = opt
  if (props.mode === DialogMode.ADD && !paymentTermTouched.value) {
    currentPaymentTermId.value = opt.paymentTermId
    initialPaymentTerm.value = opt.paymentTerm ?? { id: opt.paymentTermId, name: '' }
  }
}

function onPaymentTermSelect(opt: PaymentTermRef) {
  currentPaymentTermId.value = opt.id
  paymentTermTouched.value = true
}

function onPaymentTermUpdate(v: unknown) {
  currentPaymentTermId.value = typeof v === 'number' ? v : undefined
  paymentTermTouched.value = true
}

// Form initial values
const initialValues = reactive({
  no: '',
  supplierId: undefined as number | undefined,
  orderDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  expectedDeliveryDate: undefined as Date | undefined,
  reference: '',
  remark: '',
  branchId: undefined as number | undefined,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('purchaseOrders.validation.noRequired')),
      supplierId: z.number({ message: t('purchaseOrders.validation.supplierRequired') }),
      orderDate: z.date({ message: t('purchaseOrders.validation.orderDateRequired') }),
      expectedDeliveryDate: z.date().optional().nullable(),
      reference: z.string().optional(),
      remark: z.string().optional(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('purchaseOrders.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// Computed totals for summary section — bottom-up, always tax-exclusive and taxable
// (master plan decision 3), so this is simpler than Sales Order's inclusive/exclusive split.
const calculatedTotals = computed(() => {
  if (props.mode === DialogMode.VIEW) {
    return {
      grossTotal: savedSubtotalAmount.value,
      discountTotal: savedDiscountAmount.value,
      taxBase: savedTaxBaseAmount.value,
      taxAmount: savedTaxAmount.value,
      total: savedTotalAmount.value,
    }
  }

  let grossTotal = 0
  let discountTotal = 0
  details.value.forEach((row) => {
    const gross = (row.quantity || 0) * (row.price || 0)
    grossTotal += gross
    discountTotal += (row._manualDiscounts ?? []).reduce(
      (s, d) => s + (parseFloat(d.amount) || 0),
      0,
    )
  })

  const taxBase = Math.round((grossTotal - discountTotal) * 100) / 100
  const taxAmount = Math.round(((taxBase * taxRate.value) / 100) * 100) / 100
  const total = Math.round((taxBase + taxAmount) * 100) / 100

  return { grossTotal, discountTotal, taxBase, taxAmount, total }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ─── Validate details ─────────────────────────────────────────────────────────

function validateDetails(): boolean {
  if (details.value.length === 0) {
    toast.add(
      commonErrorToast(new Error(t('purchaseOrders.validation.detailsRequired')), toastGroup),
    )
    return false
  }

  for (const [index, row] of details.value.entries()) {
    if (!row.productId || !row.quantity || row.price === undefined || row.price === null) {
      toast.add(
        commonErrorToast(
          new Error(t('purchaseOrders.validation.detailIncomplete', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
  }

  return true
}

// ─── Form submission ──────────────────────────────────────────────────────────

const pendingRequest = ref<CreatePurchaseOrderRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    if (props.mode === DialogMode.EDIT) {
      await PurchaseOrdersService.update(props.purchaseOrderId!, pendingRequest.value)
      toast.add(commonSuccessToast(t('purchaseOrders.messages.updated'), toastGroup))
    } else {
      await PurchaseOrdersService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('purchaseOrders.messages.created'), toastGroup))
    }
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  paymentTermSubmitAttempted.value = true
  if (!event.valid) return
  if (!currentPaymentTermId.value) return
  if (!validateDetails()) return

  let no: string
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else {
    no = event.states.no.value
  }

  const request: CreatePurchaseOrderRequest = {
    no,
    supplierId: event.states.supplierId.value,
    paymentTermId: currentPaymentTermId.value,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    orderDate: dayjs(event.states.orderDate.value).format('YYYY-MM-DD'),
    expectedDeliveryDate: event.states.expectedDeliveryDate.value
      ? dayjs(event.states.expectedDeliveryDate.value).format('YYYY-MM-DD')
      : null,
    reference: event.states.reference.value || null,
    remark: event.states.remark.value || null,
    status: chosenStatus.value,
    details: details.value.map((row) => ({
      productId: row.productId!,
      quantity: String(row.quantity!),
      price: String(row.price!),
      ...(row._manualDiscounts?.length
        ? {
            manualDiscounts: row._manualDiscounts.map((d) => ({
              discountType: d.discountType,
              value: d.value,
              reason: d.reason,
            })),
          }
        : {}),
    })),
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'poApproveConfirm',
      header: t('purchaseOrders.confirm.header'),
      message: t('purchaseOrders.confirm.message'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('purchaseOrders.actions.submitForApproval') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ─── Load purchase order (VIEW / EDIT mode) ──────────────────────────────────

async function loadPurchaseOrder() {
  if (!props.purchaseOrderId) return

  isLoading.value = true
  try {
    const header = await PurchaseOrderHeadersService.getById(props.purchaseOrderId)

    initialValues.no = header.no
    initialValues.supplierId = header.supplierId
    initialValues.orderDate = new Date(header.orderDate)
    initialValues.expectedDeliveryDate = header.expectedDeliveryDate
      ? new Date(header.expectedDeliveryDate)
      : undefined
    initialValues.reference = header.reference || ''
    initialValues.remark = header.remark || ''
    initialValues.branchId = header.branchId

    currentStatus.value = header.status
    currentPaymentTermId.value = header.paymentTermId
    if (header.paymentTerm) {
      initialPaymentTerm.value = { id: header.paymentTermId, name: header.paymentTerm.name }
    }

    savedSubtotalAmount.value = parseFloat(header.subtotalAmount) || 0
    savedDiscountAmount.value = parseFloat(header.discountAmount) || 0
    savedTaxBaseAmount.value = parseFloat(header.taxBaseAmount) || 0
    savedTaxAmount.value = parseFloat(header.taxAmount) || 0
    savedTotalAmount.value = parseFloat(header.totalAmount) || 0

    // The gen/v1 header response only nests a lite supplier (code + name) — fetch the full
    // record for the address/NPWP/PIC display line and as the InfiniteSelect's initial option.
    const supplier = await SuppliersService.get(header.supplierId)
    currentSupplier.value = supplier
    initialSupplier.value = supplier

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, header.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }

    const query = new GenericQueryBuilder()
      .withFilter('purchaseOrderHeaderId', FilterOperator.EQUAL, props.purchaseOrderId)
      .build()

    const detailsResponse = await PurchaseOrderDetailsService.list(query)

    details.value = detailsResponse.data.map((detail) => {
      const levels = pinnedToLevels(detail.pinnedUom) ?? detail.product?.uomGroup?.levels
      const qty = parseFloat(detail.quantity)
      return {
        _localId: crypto.randomUUID(),
        productId: detail.productId,
        product: detail.product,
        quantity: qty,
        _quantityTiers: levels?.length ? decomposeBaseQty(qty, levels) : undefined,
        price: parseFloat(detail.price),
        subAmount: parseFloat(detail.subAmount),
        _taxBaseAmount: detail.taxBaseAmount,
        _taxAmount: detail.taxAmount,
        _manualDiscounts: detail.manualDiscounts ?? [],
        pinnedUom: detail.pinnedUom ?? null,
      }
    })
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

// Re-syncs just the status tag after an approve/reject action — a full loadPurchaseOrder()
// would flash the whole form to its loading spinner.
async function onApprovalChanged() {
  await approvalTimelineRef.value?.refresh()
  if (!props.purchaseOrderId) return
  try {
    const header = await PurchaseOrderHeadersService.getById(props.purchaseOrderId)
    currentStatus.value = header.status
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

// Lifecycle
onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    isLoading.value = true
  }

  try {
    const taxConfig = await TaxConfigurationService.get().catch(() => ({ percentage: '0' }))
    taxRate.value = parseFloat(taxConfig.percentage) || 0

    if (
      (props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) &&
      props.purchaseOrderId
    ) {
      await loadPurchaseOrder()
    } else if (
      props.mode === DialogMode.ADD &&
      showBranchPicker.value &&
      authStore.primaryBranchId
    ) {
      const branches = await loadUserBranches()
      const defaultBranch = branches.find((b) => b.id === authStore.primaryBranchId)
      if (defaultBranch) {
        initialValues.branchId = defaultBranch.id
        initialBranch.value = defaultBranch
      }
    }
  } finally {
    if (props.mode === DialogMode.ADD) {
      isLoading.value = false
    }
  }
})
</script>
