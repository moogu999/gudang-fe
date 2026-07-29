<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="grConfirm" />

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
        :value="t(`goodsReceipts.status.${currentStatus}`)"
      />
    </div>

    <!-- Approval timeline + actions -->
    <Panel
      v-if="mode !== DialogMode.ADD && goodsReceiptId"
      v-model:collapsed="isApprovalCollapsed"
      toggleable
      :header="t('approvals.sectionTitle')"
      class="mb-4"
    >
      <ApprovalTimeline
        ref="approvalTimelineRef"
        module-key="goods_receipt"
        :reference-id="goodsReceiptId"
        :show-status-header="false"
      />
      <Divider />
      <ApprovalActionBar
        module-key="goods_receipt"
        :reference-id="goodsReceiptId"
        @changed="onApprovalChanged"
      />
    </Panel>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('goodsReceipts.sections.receiptInfo') }}
        </h3>

        <!-- Receipt Number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('goodsReceipts.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('goodsReceipts.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('goodsReceipts.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('goodsReceipts.codeMode.assignedOnSave') }}</small>
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

        <!-- Receipt Date -->
        <div class="flex flex-col gap-1">
          <label for="receiptDate" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.receiptDate')
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

        <!-- Warehouse -->
        <div class="flex flex-col gap-1">
          <label for="warehouseId" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.warehouse')
          }}</label>
          <InfiniteSelect
            id="warehouseId"
            name="warehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => WarehousesService.list(q)"
            :initial-option="initialWarehouse"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <Message
            v-if="$form.warehouseId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.warehouseId.error.message }}</Message
          >
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.branch')
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

      <!-- Right column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('goodsReceipts.sections.typeInfo') }}
        </h3>

        <!-- Purchase Order reference — ADD mode picker, read-only link otherwise -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('goodsReceipts.fields.purchaseOrder') }}</label>
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            :model-value="selectedPoId"
            :option-label="poOptionLabel"
            option-value="id"
            :fetch-fn="(q) => GoodsReceiptsService.listAvailablePurchaseOrders(q)"
            :placeholder="t('goodsReceipts.labels.selectPurchaseOrder')"
            show-clear
            class="w-full"
            @update:model-value="onPoUpdate"
            @select-option="(opt) => onPoSelect(opt as AvailablePurchaseOrder)"
          >
            <template #option="{ option }">
              <div class="flex flex-col">
                <span class="font-medium"
                  >{{ (option as AvailablePurchaseOrder).no }} ·
                  {{ (option as AvailablePurchaseOrder).supplierName }}</span
                >
                <span class="text-xs text-stone-500">
                  {{ dayjs((option as AvailablePurchaseOrder).orderDate).format(DateFormat.DATE) }}
                  ·
                  {{ formatCurrency(parseFloat((option as AvailablePurchaseOrder).totalAmount)) }}
                </span>
              </div>
            </template>
          </InfiniteSelect>
          <Button
            v-else-if="linkedPurchaseOrderId"
            type="button"
            :label="linkedPurchaseOrderNo || String(linkedPurchaseOrderId)"
            link
            class="!justify-start !p-0"
            @click="router.push(`/purchase-orders/${linkedPurchaseOrderId}`)"
          />
          <span v-else class="text-sm text-stone-400">{{
            t('goodsReceipts.labels.noPurchaseOrder')
          }}</span>
        </div>

        <!-- Supplier -->
        <div class="flex flex-col gap-1">
          <label for="supplierId" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.supplier')
          }}</label>
          <InfiniteSelect
            id="supplierId"
            :model-value="currentSupplierId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => SuppliersService.list(q)"
            :initial-option="initialSupplier"
            :disabled="mode === DialogMode.VIEW || !!effectivePoId"
            sort-by="name"
            sort-operator="asc"
            show-clear
            class="w-full"
            @update:model-value="(v) => (currentSupplierId = typeof v === 'number' ? v : undefined)"
            @select-option="(opt) => (currentSupplierId = (opt as Supplier).id)"
          />
        </div>

        <!-- Supplier DO No -->
        <div class="flex flex-col gap-1">
          <label for="supplierDoNo" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.supplierDoNo')
          }}</label>
          <InputText
            id="supplierDoNo"
            name="supplierDoNo"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>

        <!-- Arrival Type -->
        <div class="flex flex-col gap-1">
          <label for="arrivalType" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.arrivalType')
          }}</label>
          <Select
            id="arrivalType"
            name="arrivalType"
            :options="arrivalTypeOptions"
            option-label="label"
            option-value="value"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.arrivalType?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.arrivalType.error.message }}</Message
          >
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Details Table -->
    <PurchaseOrderReceiptLinesTable
      v-if="effectivePoId"
      v-model="details"
      :mode="mode"
      :toast-group="toastGroup"
      :tax-rate="taxRate"
    />
    <GoodsReceiptDetailsTable
      v-else
      v-model="details"
      :mode="mode"
      :toast-group="toastGroup"
      :tax-rate="taxRate"
    />

    <Divider class="my-6" />

    <!-- Remark + Summary -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Remark -->
      <div class="flex flex-col gap-1">
        <label for="remark" class="text-sm font-semibold">{{
          t('goodsReceipts.fields.remark')
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
          {{ t('goodsReceipts.summary.title') }}
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>{{ t('goodsReceipts.summary.totalQty') }}</span>
            <span>{{ formatQty(totals.totalQty) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('goodsReceipts.summary.subtotal') }}</span>
            <span>{{ formatNumber(totals.grossTotal) }}</span>
          </div>
          <Divider />
          <div class="flex justify-between">
            <span>{{ t('goodsReceipts.summary.taxBase') }}</span>
            <span>{{ formatNumber(totals.taxBase) }}</span>
          </div>
          <div class="flex justify-between text-orange-600">
            <span>{{ t('goodsReceipts.summary.tax') }}</span>
            <span>{{ formatNumber(totals.tax) }}</span>
          </div>
          <Divider />
          <div class="flex justify-between text-lg">
            <span class="font-bold">{{ t('goodsReceipts.summary.total') }}</span>
            <span class="font-bold text-green-600">{{ formatNumber(totals.total) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('goodsReceipts.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="t('goodsReceipts.actions.submitForApproval')"
          :loading="isSaving"
          @click="chosenStatus = 'approved'"
        />
      </template>
    </div>
  </Form>
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
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Panel from 'primevue/panel'
import ConfirmDialog from 'primevue/confirmdialog'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import GoodsReceiptDetailsTable from './GoodsReceiptDetailsTable.vue'
import PurchaseOrderReceiptLinesTable from './PurchaseOrderReceiptLinesTable.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import DateFormat from '@/constants/dateFormat'
import {
  WarehousesService,
  BranchesService,
  SuppliersService,
  GoodsReceiptsService,
  PurchaseOrderHeadersService,
  PurchaseOrderDetailsService,
  TaxConfigurationService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Supplier } from '@/types/supplier.type'
import type { Branch, Warehouse } from '@/types'
import type { Base } from '@/types/api.type'
import type {
  GoodsReceiptStatus,
  GoodsReceiptDetailRow,
  GoodsReceiptDetailResponse,
  CreateGoodsReceiptRequest,
  ArrivalType,
  StockType,
  AvailablePurchaseOrder,
} from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries } from '@/composables'

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const authStore = useAuthStore()

const {
  codeMode: noMode,
  previewCode,
  seriesId: numberSeriesId,
  loading: numberSeriesLoading,
  hasDefaultSeries,
  generateCode,
} = useNumberSeries('goods_receipts')

const toastGroup = 'goodsReceiptForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  goodsReceiptId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

// Status / approval
const chosenStatus = ref<'draft' | 'approved'>('draft')
const currentStatus = ref<GoodsReceiptStatus | undefined>()
const approvalTimelineRef = ref<InstanceType<typeof ApprovalTimeline> | null>(null)
const isApprovalCollapsed = ref(false)

function statusSeverity(status: GoodsReceiptStatus) {
  if (status === 'approved') return 'success'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)
const details = ref<GoodsReceiptDetailRow[]>([])
const goodsReceiptId = computed(() => props.goodsReceiptId)

// Tax rate for computing per-line Tax Base / Tax on the detail tables and the summary.
const taxRate = ref(0)

// Backend-computed totals — used in VIEW mode instead of recomputing from rows, so the
// figures shown always match what was actually saved even if the tax rate config changes later.
const savedSubtotalAmount = ref(0)
const savedTaxAmount = ref(0)
const savedTotalAmount = ref(0)

// Warehouse
const initialWarehouse = ref<Warehouse | undefined>()

// Branch — only rendered when the user has more than one assigned branch.
const showBranchPicker = computed(() => authStore.branchIds.length > 1)
const initialBranch = ref<Branch | undefined>()

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

// Purchase Order reference
const selectedPoId = ref<number | undefined>()
const linkedPurchaseOrderId = ref<number | undefined>()
const linkedPurchaseOrderNo = ref<string>('')
const effectivePoId = computed(() =>
  props.mode === DialogMode.ADD ? selectedPoId.value : linkedPurchaseOrderId.value,
)

// Supplier — kept outside the Form/zod schema so it can be programmatically driven by the PO pick.
const currentSupplierId = ref<number | undefined>()
const initialSupplier = ref<Supplier | undefined>()

function poOptionLabel(po: AvailablePurchaseOrder): string {
  return po.no
}

function onPoUpdate(v: unknown) {
  if (typeof v !== 'number') {
    selectedPoId.value = undefined
    details.value = []
  }
}

async function onPoSelect(po: AvailablePurchaseOrder) {
  selectedPoId.value = po.id
  currentSupplierId.value = po.supplierId
  initialSupplier.value = { id: po.supplierId, name: po.supplierName } as Supplier
  await hydrateFromPurchaseOrder(po.id)
}

// Seeds the line table from an open PO's remaining lines (ADD), or re-hydrates the PO-derived
// context (_poQuantity / _poReceivedQuantity) around an already-saved receipt's own lines
// (VIEW / EDIT) — see hydrateFromPurchaseOrder's `existingDetails` branch.
async function hydrateFromPurchaseOrder(
  poId: number,
  existingDetails?: GoodsReceiptDetailResponse[],
) {
  const query = new GenericQueryBuilder()
    .withFilter('purchaseOrderHeaderId', FilterOperator.EQUAL, poId)
    .build()
  const poDetailsResponse = await PurchaseOrderDetailsService.list(query)
  const poDetailsById = new Map(poDetailsResponse.data.map((d) => [d.id, d]))

  if (existingDetails?.length) {
    details.value = existingDetails.map((d) => {
      const pod = d.purchaseOrderDetailId ? poDetailsById.get(d.purchaseOrderDetailId) : undefined
      return {
        _localId: crypto.randomUUID(),
        productId: d.productId,
        product: { id: d.productId, code: d.productCode, name: d.productName },
        quantity: parseFloat(d.quantity),
        price: parseFloat(d.price),
        stockType: d.stockType,
        purchaseOrderDetailId: d.purchaseOrderDetailId ?? undefined,
        pinnedUom: d.pinnedUom,
        _poQuantity: pod ? parseFloat(pod.quantity) : undefined,
        _poReceivedQuantity: pod ? parseFloat(pod.receivedQuantity) : undefined,
      }
    })
    return
  }

  details.value = poDetailsResponse.data
    .filter((d) => parseFloat(d.quantity) - parseFloat(d.receivedQuantity) > 0)
    .map((d) => {
      const poQty = parseFloat(d.quantity)
      const poReceived = parseFloat(d.receivedQuantity)
      const taxBase = parseFloat(d.taxBaseAmount)
      const unitCost = poQty !== 0 && !isNaN(taxBase) ? taxBase / poQty : parseFloat(d.price)
      return {
        _localId: crypto.randomUUID(),
        productId: d.productId,
        product: { id: d.productId, code: d.product?.code ?? '', name: d.product?.name ?? '' },
        quantity: poQty - poReceived,
        price: unitCost,
        stockType: 'good' as StockType,
        purchaseOrderDetailId: d.id,
        pinnedUom: d.pinnedUom,
        _poQuantity: poQty,
        _poReceivedQuantity: poReceived,
      }
    })
}

// Goods are recorded as they arrive, so a receipt can never be dated ahead of today.
// The picker blocks later days; the resolver re-checks against a freshly read clock,
// which also covers a form left open past midnight.
function endOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

const maxReceiptDate = computed(() => endOfToday())

const arrivalTypeOptions = computed(() => [
  { value: 'regular', label: t('goodsReceipts.arrivalTypes.regular') },
  { value: 'consignment', label: t('goodsReceipts.arrivalTypes.consignment') },
  { value: 'bonus', label: t('goodsReceipts.arrivalTypes.bonus') },
  { value: 'transfer', label: t('goodsReceipts.arrivalTypes.transfer') },
  { value: 'return_in', label: t('goodsReceipts.arrivalTypes.returnIn') },
  { value: 'other', label: t('goodsReceipts.arrivalTypes.other') },
])

const initialValues = reactive({
  no: '',
  receiptDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  warehouseId: undefined as number | undefined,
  arrivalType: 'regular' as ArrivalType,
  supplierDoNo: '',
  remark: '',
  branchId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('goodsReceipts.validation.noRequired')),
      receiptDate: z
        .date({ message: t('goodsReceipts.validation.receiptDateRequired') })
        .refine((date) => date <= endOfToday(), {
          message: t('goodsReceipts.validation.receiptDateFuture'),
        }),
      warehouseId: z.number({ message: t('goodsReceipts.validation.warehouseRequired') }),
      arrivalType: z.string().min(1, t('goodsReceipts.validation.arrivalTypeRequired')),
      supplierDoNo: z.string().optional(),
      remark: z.string().optional(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('goodsReceipts.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// No discount concept on Goods Receipt, so grossTotal and taxBase both equal the plain
// qty × price subtotal (mirrors Purchase Order's summary, minus the discount line).
const totals = computed(() => {
  const validRows = details.value.filter((r) => !r._isPlaceholder && r.quantity)
  const totalQty = validRows.reduce((sum, r) => sum + (r.quantity ?? 0), 0)

  if (props.mode === DialogMode.VIEW) {
    return {
      totalQty,
      grossTotal: savedSubtotalAmount.value,
      taxBase: savedSubtotalAmount.value,
      tax: savedTaxAmount.value,
      total: savedTotalAmount.value,
    }
  }

  const grossTotal = validRows.reduce((sum, r) => sum + (r.quantity ?? 0) * (r.price ?? 0), 0)
  const taxBase = grossTotal
  const tax = Math.round(((taxBase * taxRate.value) / 100) * 100) / 100
  const total = Math.round((taxBase + tax) * 100) / 100
  return { totalQty, grossTotal, taxBase, tax, total }
})

function formatQty(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function validateDetails(): boolean {
  const isPoLinked = !!effectivePoId.value
  const validRows = isPoLinked
    ? details.value.filter((r) => (r.quantity ?? 0) > 0)
    : details.value.filter((r) => !r._isPlaceholder)

  if (validRows.length === 0) {
    toast.add(
      commonErrorToast(new Error(t('goodsReceipts.validation.detailsRequired')), toastGroup),
    )
    return false
  }

  if (isPoLinked) return true

  for (const [index, row] of validRows.entries()) {
    if (!row.productId) {
      toast.add(
        commonErrorToast(
          new Error(t('goodsReceipts.validation.detailProductRequired', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
    if (!row.quantity || row.quantity <= 0) {
      toast.add(
        commonErrorToast(
          new Error(t('goodsReceipts.validation.detailQtyRequired', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
    if (row.price === undefined || row.price === null || row.price < 0) {
      toast.add(
        commonErrorToast(
          new Error(t('goodsReceipts.validation.detailPriceRequired', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
  }
  return true
}

const pendingRequest = ref<CreateGoodsReceiptRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    if (props.mode === DialogMode.EDIT && props.goodsReceiptId) {
      await GoodsReceiptsService.update(props.goodsReceiptId, pendingRequest.value)
      toast.add(commonSuccessToast(t('goodsReceipts.messages.updated'), toastGroup))
    } else {
      await GoodsReceiptsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('goodsReceipts.messages.created'), toastGroup))
    }
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return
  if (!validateDetails()) return

  const isPoLinked = !!effectivePoId.value
  const validRows = isPoLinked
    ? details.value.filter((r) => (r.quantity ?? 0) > 0)
    : details.value.filter((r) => !r._isPlaceholder)

  let no: string | null = null
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  const request: CreateGoodsReceiptRequest = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    status: chosenStatus.value,
    purchaseOrderHeaderId: effectivePoId.value ?? null,
    supplierId: currentSupplierId.value ?? null,
    supplierDoNo: (event.states.supplierDoNo.value as string) || null,
    receiptDate: dayjs(event.states.receiptDate.value as Date).format('YYYY-MM-DD'),
    warehouseId: event.states.warehouseId.value as number,
    arrivalType: event.states.arrivalType.value as ArrivalType,
    remark: (event.states.remark.value as string) || null,
    details: validRows.map((row) => ({
      productId: row.productId!,
      quantity: String(row.quantity!),
      price: String(row.price ?? 0),
      stockType: row.stockType,
      ...(row.purchaseOrderDetailId ? { purchaseOrderDetailId: row.purchaseOrderDetailId } : {}),
    })),
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'grConfirm',
      header: t('goodsReceipts.confirm.header'),
      message: t('goodsReceipts.confirm.message'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('goodsReceipts.actions.submitForApproval') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

async function loadGoodsReceipt() {
  if (!props.goodsReceiptId) return

  isLoading.value = true
  try {
    const receipt = await GoodsReceiptsService.get(props.goodsReceiptId)

    initialValues.no = receipt.no
    initialValues.receiptDate = new Date(receipt.receiptDate)
    initialValues.warehouseId = receipt.warehouseId
    initialValues.arrivalType = receipt.arrivalType as ArrivalType
    initialValues.supplierDoNo = receipt.supplierDoNo || ''
    initialValues.remark = receipt.remark || ''
    initialValues.branchId = receipt.branchId

    currentStatus.value = receipt.status
    currentSupplierId.value = receipt.supplierId ?? undefined
    initialWarehouse.value = {
      id: receipt.warehouseId,
      name: receipt.warehouseName || '',
    } as Warehouse

    savedSubtotalAmount.value = parseFloat(receipt.subtotalAmount) || 0
    savedTaxAmount.value = parseFloat(receipt.taxAmount) || 0
    savedTotalAmount.value = parseFloat(receipt.totalAmount) || 0

    if (receipt.supplierId) {
      const supplier = await SuppliersService.get(receipt.supplierId).catch(() => null)
      if (supplier) initialSupplier.value = supplier
    }

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, receipt.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }

    if (receipt.purchaseOrderHeaderId) {
      linkedPurchaseOrderId.value = receipt.purchaseOrderHeaderId
      const po = await PurchaseOrderHeadersService.getById(receipt.purchaseOrderHeaderId).catch(
        () => null,
      )
      if (po) linkedPurchaseOrderNo.value = po.no
      await hydrateFromPurchaseOrder(receipt.purchaseOrderHeaderId, receipt.details)
    } else {
      details.value = receipt.details.map((d) => ({
        _localId: crypto.randomUUID(),
        productId: d.productId,
        product: { id: d.productId, code: d.productCode, name: d.productName },
        quantity: parseFloat(d.quantity),
        price: parseFloat(d.price),
        stockType: d.stockType,
        pinnedUom: d.pinnedUom,
      }))
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function onApprovalChanged() {
  await approvalTimelineRef.value?.refresh()
  if (!props.goodsReceiptId) return
  try {
    const receipt = await GoodsReceiptsService.get(props.goodsReceiptId)
    currentStatus.value = receipt.status
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

    if (
      (props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) &&
      props.goodsReceiptId
    ) {
      await loadGoodsReceipt()
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
