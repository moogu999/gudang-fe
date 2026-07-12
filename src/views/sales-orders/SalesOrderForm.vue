<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="soApproveConfirm" />

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
        :value="t(`salesOrders.status.${currentStatus}`)"
      />
    </div>

    <!-- Two Column Layout for Header Fields -->
    <div v-if="!hideHeader" class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left Column: Order Information -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('salesOrders.sections.orderInfo') }}
        </h3>

        <!-- Order Number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('salesOrders.fields.no') }}</label>
          <!-- Auto/Manual toggle — ADD mode only -->
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('salesOrders.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('salesOrders.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('salesOrders.codeMode.assignedOnSave') }}</small>
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

        <!-- Dates: Order Date, Price Date, Delivery Date, Expiry Date -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="flex flex-col gap-1">
            <label for="orderDate" class="text-sm font-semibold">{{
              t('salesOrders.fields.orderDate')
            }}</label>
            <DatePicker
              id="orderDate"
              name="orderDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
              @date-select="onOrderDateSelect"
            />
            <Message
              v-if="$form.orderDate?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.orderDate.error.message }}</Message
            >
          </div>

          <div class="flex flex-col gap-1">
            <label for="priceDate" class="text-sm font-semibold">{{
              t('salesOrders.fields.priceDate')
            }}</label>
            <DatePicker
              id="priceDate"
              name="priceDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
              @date-select="onPriceDateSelect"
              @clear-click="currentPriceDate = undefined"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label for="deliveryDate" class="text-sm font-semibold">{{
              t('salesOrders.fields.deliveryDate')
            }}</label>
            <DatePicker
              id="deliveryDate"
              v-model="deliveryDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
              @date-select="onDeliveryDateChange"
              @clear-click="onDeliveryDateChange(undefined)"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label for="expiredDate" class="text-sm font-semibold">{{
              t('salesOrders.fields.expiredDate')
            }}</label>
            <DatePicker
              id="expiredDate"
              v-model="expiredDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
              @date-select="onExpiredDateChange"
              @clear-click="onExpiredDateChange(undefined)"
            />
          </div>
        </div>

        <!-- Salesman + Customer -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Salesman -->
          <div class="flex flex-col gap-1">
            <label for="employeeId" class="text-sm font-semibold">{{
              t('salesOrders.fields.salesman')
            }}</label>
            <InfiniteSelect
              v-if="salesmanTypeId"
              id="employeeId"
              name="employeeId"
              option-label="name"
              option-value="id"
              :fetch-fn="(query) => EmployeesService.list(query)"
              :custom-filters="salesmanFilters"
              :initial-option="initialSalesman"
              :disabled="mode === DialogMode.VIEW"
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @select-option="(opt) => onSalesmanSelect(opt as Employee)"
            />
            <div
              v-if="selectedSalesmanBranch || selectedSalesmanCompany"
              class="flex flex-wrap gap-3 text-xs text-stone-500"
            >
              <span v-if="selectedSalesmanCompany" class="flex items-center gap-1">
                <i class="pi pi-building" />
                {{ selectedSalesmanCompany }}
              </span>
              <span v-if="selectedSalesmanBranch" class="flex items-center gap-1">
                <i class="pi pi-map-marker" />
                {{ selectedSalesmanBranch }}
              </span>
            </div>
            <Message
              v-if="$form.employeeId?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.employeeId.error.message }}</Message
            >
          </div>

          <!-- Customer -->
          <div class="flex flex-col gap-1">
            <label for="customerId" class="text-sm font-semibold">{{
              t('salesOrders.fields.customer')
            }}</label>
            <InfiniteSelect
              id="customerId"
              name="customerId"
              option-label="name"
              option-value="id"
              :fetch-fn="(query) => CustomersService.list(query)"
              :initial-option="initialCustomer"
              :disabled="mode === DialogMode.VIEW"
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @select-option="(opt) => onCustomerSelect(opt as CustomerLite)"
            />
            <Message
              v-if="$form.customerId?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.customerId.error.message }}</Message
            >
          </div>
        </div>
      </div>

      <!-- Right Column: Payment & Financial -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('salesOrders.sections.paymentInfo') }}
        </h3>

        <!-- Is Cash -->
        <div class="flex items-center gap-2">
          <Checkbox id="isCash" name="isCash" :binary="true" :disabled="mode === DialogMode.VIEW" />
          <label for="isCash" class="text-sm font-semibold">{{
            t('salesOrders.fields.isCash')
          }}</label>
        </div>

        <!-- Down Payment -->
        <div class="flex flex-col gap-1">
          <label for="downPaymentAmount" class="text-sm font-semibold">{{
            t('salesOrders.fields.downPaymentAmount')
          }}</label>
          <InputNumber
            id="downPaymentAmount"
            name="downPaymentAmount"
            :locale="locale"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <Divider v-if="!hideHeader" class="my-6" />

    <!-- Details Section -->
    <SalesOrderDetailsTable
      v-model="details"
      :mode="mode"
      :is-resolving="isResolving"
      :header-discounts="headerDiscounts"
      :header-bonuses="headerBonuses"
      :header-choice-offers="headerChoiceOffers"
      v-model:header-choice-picks="headerChoicePicks"
    />

    <!-- Invoice-level Manual Discounts -->
    <div class="mt-4 rounded-lg border border-stone-200 p-4">
      <ManualDiscountEditor
        :model-value="headerManualDiscountsPreview"
        @update:model-value="headerManualDiscounts = $event"
        :disabled="mode === DialogMode.VIEW"
        :gross="calculatedTotals.grossTotal"
      />
    </div>

    <Divider />

    <!-- Remarks + Summary Section -->
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Remark -->
      <div class="flex flex-col gap-1">
        <label for="remark" class="text-sm font-semibold">{{
          t('salesOrders.fields.remark')
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
          {{ t('salesOrders.summary.title') }}
        </h4>

        <div class="space-y-2">
          <div class="flex justify-between">
            <span>{{ t('salesOrders.summary.grossTotal') }}</span>
            <span>{{ formatCurrency(calculatedTotals.netSubtotal) }}</span>
          </div>

          <div class="flex justify-between text-red-600">
            <span>{{ t('salesOrders.summary.discountTotal') }}</span>
            <span>- {{ formatCurrency(calculatedTotals.discountTotal) }}</span>
          </div>

          <Divider />

          <!-- Total = Tax Base + Tax always holds under the bottom-up model, unlike
               Subtotal - Discount + Tax above, which only holds for all-exclusive orders. -->
          <div class="flex justify-between">
            <span>{{ t('salesOrders.summary.taxBase') }}</span>
            <span>{{ formatCurrency(calculatedTotals.taxBase) }}</span>
          </div>

          <div v-if="calculatedTotals.taxAmount > 0" class="flex justify-between text-orange-600">
            <span>{{ t('salesOrders.summary.tax') }}</span>
            <span>+ {{ formatCurrency(calculatedTotals.taxAmount) }}</span>
          </div>

          <Divider />

          <div class="flex justify-between text-lg">
            <span class="font-bold">{{ t('salesOrders.summary.total') }}</span>
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
          :label="t('salesOrders.actions.saveAsDraft')"
          :loading="isSaving || isResolving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="t('salesOrders.actions.saveAndApprove')"
          :loading="isSaving || isResolving"
          @click="chosenStatus = 'approved'"
        />
      </template>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { useDebounceFn } from '@vueuse/core'
import { z } from 'zod'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import SalesOrderDetailsTable from './SalesOrderDetailsTable.vue'
import ManualDiscountEditor from './ManualDiscountEditor.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import {
  CustomersService,
  EmployeesService,
  EmployeeTypesService,
  SalesOrdersService,
  SalesOrderHeadersService,
  SalesOrderDetailsService,
  TaxConfigurationService,
  SalesOrderConfigService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { SalesOrderConfig, SalesOrderStatus } from '@/types'
import type {
  SalesOrderDetailRow,
  CreateSalesOrderRequest,
  CustomerLite,
  ResolveSalesOrderRequest,
  EmployeeLite,
  Employee,
  ManualDiscount,
} from '@/types'
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
} = useNumberSeries('sales_orders')

const toastGroup = 'salesOrderForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  salesOrderId?: number
  hideHeader?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

// Status tracking
const chosenStatus = ref<'draft' | 'approved'>('approved')
const currentStatus = ref<SalesOrderStatus | undefined>()

function statusSeverity(status: SalesOrderStatus) {
  if (status === 'approved') return 'success'
  if (status === 'applied') return 'info'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

// State
const isLoading = ref(false)
const isSaving = ref(false)
const isResolving = ref(false)
const details = ref<SalesOrderDetailRow[]>([])
const headerDiscountAmount = ref(0)
const taxRate = ref(0)
const customerTaxable = ref(false)
const savedTaxAmount = ref(0)
const savedTotalAmount = ref(0)
const savedSubtotalAmount = ref(0)
const savedTaxBaseAmount = ref(0)
const headerDiscounts = ref<import('@/types').LineDiscount[]>([])
const headerBonuses = ref<import('@/types').LineBonus[]>([])
const headerChoiceOffers = ref<import('@/types').ChoiceOffer[]>([])
const headerChoicePicks = ref<Record<string, number[]>>({})
const headerManualDiscounts = ref<ManualDiscount[]>([])
const initialCustomer = ref<CustomerLite>()
const initialSalesman = ref<EmployeeLite>()
const salesmanTypeId = ref<number | undefined>()

// Tracked for live resolve trigger (ADD mode only)
const currentCustomerId = ref<number | undefined>()
const currentEmployeeId = ref<number | undefined>()
const currentOrderDate = ref<Date>(new Date())
const currentPriceDate = ref<Date | undefined>()

// Salesman metadata for display
const selectedSalesmanBranch = ref<string | undefined>()
const selectedSalesmanCompany = ref<string | undefined>()

// SO config auto-fill
const soConfig = ref<SalesOrderConfig | null>(null)
const deliveryDate = ref<Date | undefined>()
const expiredDate = ref<Date | undefined>()
const deliveryDateAutoFilled = ref(true)
const expiredDateAutoFilled = ref(true)

// Computed custom filters for the salesman InfiniteSelect
const salesmanFilters = computed(() => {
  const filters: { filterBy: string; filterOperator: string; filterValue: string | number }[] = []
  if (salesmanTypeId.value) {
    filters.push({
      filterBy: 'employeeTypeId',
      filterOperator: '0',
      filterValue: salesmanTypeId.value,
    })
  }
  if (authStore.branchIds.length === 1) {
    filters.push({ filterBy: 'branchId', filterOperator: '0', filterValue: authStore.branchIds[0] })
  }
  return filters
})

// Form initial values
const initialValues = reactive({
  no: '',
  orderDate: undefined as Date | undefined,
  priceDate: undefined as Date | undefined,
  customerId: undefined as number | undefined,
  employeeId: undefined as number | undefined,
  remark: '',
  isCash: false,
  downPaymentAmount: 0,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('salesOrders.validation.noRequired')),
      orderDate: z.date({ message: t('salesOrders.validation.orderDateRequired') }),
      customerId: z.number({ message: t('salesOrders.validation.customerRequired') }),
      employeeId: z.number({ message: t('salesOrders.validation.salesmanRequired') }),
      priceDate: z.date().optional().nullable(),
      remark: z.string().optional(),
      isCash: z.boolean().optional(),
      downPaymentAmount: z.number().min(0).optional(),
    }),
  ),
)

// Compute one row's own DPP/tax on a gross amount, given whether it's tax-inclusive.
// Mirrors the backend's taxcalc.Compute (gudang-be/internal/pkg/taxcalc/taxcalc.go).
function computeRowTax(amount: number, taxIncluded: boolean): { taxBase: number; tax: number } {
  if (taxRate.value === 0 || amount === 0) return { taxBase: amount, tax: 0 }
  if (taxIncluded) {
    const tax = Math.round(((amount * taxRate.value) / (100 + taxRate.value)) * 100) / 100
    return { taxBase: amount - tax, tax }
  }
  if (!customerTaxable.value) return { taxBase: amount, tax: 0 }
  const tax = Math.round(((amount * taxRate.value) / 100) * 100) / 100
  return { taxBase: amount, tax }
}

// Compute a header-level discount row's own (negative) DPP/tax: the discount's amount is
// split proportionally across the order's inclusive/exclusive raw-gross mix, then the
// embedded/additive formula runs on each portion. Mirrors the backend's
// CalculateHeaderDiscountRowTax (gudang-be/internal/sales_order/domain/sales_order_header.go).
function computeHeaderDiscountTax(
  amount: number,
  grossInclusive: number,
  grossExclusive: number,
): { taxBase: number; tax: number } {
  const total = grossInclusive + grossExclusive
  if (total === 0) return { taxBase: 0, tax: 0 }
  const inclusivePortion = Math.round(((amount * grossInclusive) / total) * 100) / 100
  const exclusivePortion = amount - inclusivePortion
  const r1 = computeRowTax(inclusivePortion, true)
  const r2 = computeRowTax(exclusivePortion, false)
  return { taxBase: -(r1.taxBase + r2.taxBase), tax: -(r1.tax + r2.tax) }
}

// Computed totals for summary section
const calculatedTotals = computed(() => {
  // Split line subAmounts by tax inclusion status
  let subTotalInclusive = 0
  let subTotalExclusive = 0
  let grossInclusive = 0
  let grossExclusive = 0
  let lineDiscountTotal = 0
  let rawGrossTotal = 0
  // Bottom-up header DPP/tax: sum of every row's real value (product lines + all discount rows).
  let taxBaseSum = 0
  let taxSum = 0

  details.value.forEach((row) => {
    const gross = (row.quantity || 0) * (row.price || 0)
    rawGrossTotal += gross
    const taxIncluded = row._taxIncluded ?? false
    if (taxIncluded) grossInclusive += gross
    else grossExclusive += gross

    const lineDisc = row.discount || 0

    // In VIEW mode the backend has already folded manual discounts into detail.discount,
    // so we must not add them again. In ADD mode detail.discount is promotion-only.
    let totalLineDisc: number
    if (props.mode === DialogMode.VIEW) {
      totalLineDisc = lineDisc
    } else {
      const manualDisc = (row._manualDiscounts ?? []).reduce((s, d) => {
        const v = parseFloat(d.value) || 0
        return s + (d.discountType === 'flat' ? v : Math.round(((gross * v) / 100) * 100) / 100)
      }, 0)
      totalLineDisc = lineDisc + manualDisc

      // Real per-row DPP/tax from resolve: the product line's own tax (on full gross) plus
      // every line promo discount's own (negative) tax.
      taxBaseSum += parseFloat(row._taxBaseAmount ?? '0') || 0
      taxSum += parseFloat(row._taxAmount ?? '0') || 0
      ;(row._discounts ?? []).forEach((d) => {
        taxBaseSum += parseFloat(d.taxBaseAmount) || 0
        taxSum += parseFloat(d.taxAmount) || 0
      })

      // Line manual discounts aren't previewed by resolve — replicate the backend's per-row
      // formula locally so the live preview stays consistent with what gets persisted.
      ;(row._manualDiscounts ?? []).forEach((d) => {
        const { taxBase, tax } = computeRowTax(parseFloat(d.amount) || 0, taxIncluded)
        taxBaseSum -= taxBase
        taxSum -= tax
      })
    }

    lineDiscountTotal += totalLineDisc
    const sub = gross - totalLineDisc
    if (taxIncluded) subTotalInclusive += sub
    else subTotalExclusive += sub
  })

  // grossTotal = sum of line sub-amounts (post line-discount); mirrors backend SubtotalAmount.
  const grossTotal = subTotalInclusive + subTotalExclusive

  // Header manual discount percentage must be applied to the raw gross (before any discounts),
  // matching the backend's ApplyManualDiscounts logic.
  // In VIEW mode headerDiscountAmount already includes header manual discounts (saved by backend).
  const headerManualDiscountTotal =
    props.mode === DialogMode.VIEW
      ? 0
      : headerManualDiscounts.value.reduce((sum, d) => {
          const v = parseFloat(d.value) || 0
          return (
            sum +
            (d.discountType === 'flat' ? v : Math.round(((rawGrossTotal * v) / 100) * 100) / 100)
          )
        }, 0)

  const discountTotal = lineDiscountTotal + headerDiscountAmount.value + headerManualDiscountTotal

  if (props.mode !== DialogMode.VIEW) {
    // Real per-row DPP/tax from resolve for header promo discounts.
    headerDiscounts.value.forEach((d) => {
      taxBaseSum += parseFloat(d.taxBaseAmount) || 0
      taxSum += parseFloat(d.taxAmount) || 0
    })

    // Header manual discounts aren't previewed by resolve — replicate the backend's
    // proportional-split formula locally (decision #4 of the master plan).
    headerManualDiscounts.value.forEach((d) => {
      const { taxBase, tax } = computeHeaderDiscountTax(
        parseFloat(d.amount) || 0,
        grossInclusive,
        grossExclusive,
      )
      taxBaseSum += taxBase
      taxSum += tax
    })
  }

  const taxAmount =
    props.mode === DialogMode.VIEW ? savedTaxAmount.value : Math.round(taxSum * 100) / 100

  // Backend's TotalAmount = TaxBaseAmount + TaxAmount — the only invariant that holds
  // universally under the bottom-up model, regardless of inclusive/exclusive mix.
  const taxBase =
    props.mode === DialogMode.VIEW ? savedTaxBaseAmount.value : Math.round(taxBaseSum * 100) / 100
  const total =
    props.mode === DialogMode.VIEW
      ? savedTotalAmount.value
      : Math.round((taxBase + taxAmount) * 100) / 100

  // Subtotal = sum of every line's raw undiscounted gross (quantity*price), matching the
  // backend's persisted SubtotalAmount (decision #3 of the master plan). This is shown as
  // informational context only — it does NOT chain arithmetically into Total via Discount/Tax
  // except in the all-tax-exclusive special case (see taxBase/total above for the real formula).
  // In VIEW mode, read the persisted value directly to avoid any client-side rounding drift.
  const netSubtotal = props.mode === DialogMode.VIEW ? savedSubtotalAmount.value : rawGrossTotal

  return {
    grossTotal,
    netSubtotal,
    discountTotal,
    taxBase,
    taxAmount,
    total,
    grossInclusive,
    grossExclusive,
  }
})

// Live-preview DPP/tax for each header manual discount row (blank from ManualDiscountEditor
// until save, since resolve doesn't preview manual discounts — see decision #4 of the master
// plan for the formula). VIEW mode already has the real persisted values, so pass through as-is.
const headerManualDiscountsPreview = computed(() => {
  if (props.mode === DialogMode.VIEW) return headerManualDiscounts.value
  const { grossInclusive, grossExclusive } = calculatedTotals.value
  return headerManualDiscounts.value.map((d) => {
    const { taxBase, tax } = computeHeaderDiscountTax(
      parseFloat(d.amount) || 0,
      grossInclusive,
      grossExclusive,
    )
    return { ...d, taxBaseAmount: String(taxBase), taxAmount: String(tax) }
  })
})

// Format number with decimals
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ─── Live Resolve ────────────────────────────────────────────────────────────

async function resolveOrder() {
  const customerId = currentCustomerId.value
  const employeeId = currentEmployeeId.value
  if (!customerId || !employeeId) return

  const resolveDetails = details.value
    .filter((row) => row.productId)
    .map((row) => ({
      productId: row.productId!,
      quantity: String(row.quantity ?? 0),
    }))

  if (resolveDetails.length === 0) return

  const request: ResolveSalesOrderRequest = {
    customerId,
    employeeId,
    orderDate: currentOrderDate.value.toISOString().split('T')[0],
    priceDate: currentPriceDate.value?.toISOString().split('T')[0] ?? null,
    details: resolveDetails,
  }

  isResolving.value = true
  try {
    const response = await SalesOrdersService.resolve(request)

    headerDiscountAmount.value = parseFloat(response.headerDiscountAmount) || 0
    headerDiscounts.value = response.headerDiscounts ?? []
    headerBonuses.value = response.headerBonuses ?? []

    // Preserve only valid picks for still-offered choice offers
    const validHeaderPicks: Record<string, number[]> = {}
    ;(response.headerChoiceOffers ?? []).forEach((offer) => {
      const key = String(offer.promotionId)
      const validPool = offer.pool.map((p) => p.productId)
      validHeaderPicks[key] = (headerChoicePicks.value[key] ?? []).filter((id) =>
        validPool.includes(id),
      )
    })
    headerChoiceOffers.value = response.headerChoiceOffers ?? []
    headerChoicePicks.value = validHeaderPicks

    const resolvedMap = new Map(response.details.map((d) => [d.productId, d]))
    details.value = details.value.map((row) => {
      if (!row.productId) return row
      const resolved = resolvedMap.get(row.productId)
      if (!resolved) return row

      // Preserve only still-valid choice picks
      const validPicks: Record<string, number[]> = {}
      resolved.choiceOffers.forEach((offer) => {
        const key = String(offer.promotionId)
        const validPool = offer.pool.map((p) => p.productId)
        validPicks[key] = (row._choicePicks?.[key] ?? []).filter((id) => validPool.includes(id))
      })

      return {
        ...row,
        price: parseFloat(resolved.price),
        discount: parseFloat(resolved.discount),
        _priceListId: resolved.priceListId,
        _priceListCode: resolved.priceListCode,
        _taxIncluded: resolved.taxIncluded ?? false,
        _taxBaseAmount: resolved.taxBaseAmount,
        _taxAmount: resolved.taxAmount,
        _discounts: resolved.discounts,
        _bonuses: resolved.bonuses,
        _choiceOffers: resolved.choiceOffers,
        _choicePicks: validPicks,
      }
    })
  } catch {
    // Non-fatal: resolve preview failure does not block the user
  } finally {
    isResolving.value = false
  }
}

const scheduleResolve = useDebounceFn(resolveOrder, 400)

// Trigger resolve when customer or salesman changes
watch(currentCustomerId, async (id) => {
  if (props.mode !== DialogMode.ADD && props.mode !== DialogMode.EDIT) return
  scheduleResolve()
  if (!id) {
    customerTaxable.value = false
    return
  }
  try {
    const customer = await CustomersService.getById(id)
    customerTaxable.value = customer.taxable ?? false
  } catch {
    customerTaxable.value = false
  }
})

watch(currentEmployeeId, () => {
  if (props.mode !== DialogMode.ADD && props.mode !== DialogMode.EDIT) return
  scheduleResolve()
})

// Trigger resolve when a product or quantity changes (but NOT when only resolved fields change)
const detailsResolveKey = computed(() =>
  details.value.map((r) => `${r._localId}:${r.productId}:${r.quantity}`).join(','),
)

watch(detailsResolveKey, () => {
  if (props.mode !== DialogMode.ADD && props.mode !== DialogMode.EDIT) return
  scheduleResolve()
})

// ─── Date change handlers ─────────────────────────────────────────────────────

function onOrderDateSelect(date: Date) {
  currentOrderDate.value = date
}

function onPriceDateSelect(date: Date) {
  currentPriceDate.value = date
}

function onDeliveryDateChange(val: Date | undefined) {
  deliveryDateAutoFilled.value = false
  deliveryDate.value = val
}

function onExpiredDateChange(val: Date | undefined) {
  expiredDateAutoFilled.value = false
  expiredDate.value = val
}

// Auto-fill delivery/expiry dates from SO config when order date changes
watch(
  currentOrderDate,
  (newDate) => {
    if (!soConfig.value || !newDate || props.mode !== DialogMode.ADD) return
    if (deliveryDateAutoFilled.value) {
      const d = new Date(newDate)
      d.setDate(d.getDate() + soConfig.value.deliveryDateOffset)
      deliveryDate.value = d
    }
    if (expiredDateAutoFilled.value) {
      const d = new Date(newDate)
      d.setDate(d.getDate() + soConfig.value.expiredDateOffset)
      expiredDate.value = d
    }
  },
  { immediate: true },
)

// ─── Customer change handler ──────────────────────────────────────────────────

function onCustomerSelect(opt: CustomerLite) {
  currentCustomerId.value = opt.id
}

// ─── Salesman change handler ──────────────────────────────────────────────────

function onSalesmanSelect(opt: Employee) {
  currentEmployeeId.value = opt.id
  selectedSalesmanBranch.value = opt.branch?.name
  selectedSalesmanCompany.value = opt.company?.name
}

// ─── Validate details ─────────────────────────────────────────────────────────

function validateDetails(): boolean {
  if (details.value.length === 0) {
    toast.add(commonErrorToast(new Error(t('salesOrders.validation.detailsRequired')), toastGroup))
    return false
  }

  for (const [index, row] of details.value.entries()) {
    if (!row.productId || !row.quantity) {
      toast.add(
        commonErrorToast(
          new Error(t('salesOrders.validation.detailIncomplete', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }

    // Validate all choice offers have complete picks
    for (const offer of row._choiceOffers ?? []) {
      const picks = row._choicePicks?.[String(offer.promotionId)] ?? []
      if (picks.length < offer.pickableCount) {
        toast.add(
          commonErrorToast(
            new Error(t('salesOrders.validation.choicePickRequired', { row: index + 1 })),
            toastGroup,
          ),
        )
        return false
      }
    }
  }

  // Validate header-level choice offers have complete picks
  for (const offer of headerChoiceOffers.value) {
    const picks = headerChoicePicks.value[String(offer.promotionId)] ?? []
    if (picks.length < offer.pickableCount) {
      toast.add(
        commonErrorToast(
          new Error(t('salesOrders.validation.invoiceChoicePickRequired')),
          toastGroup,
        ),
      )
      return false
    }
  }

  return true
}

// ─── Form submission ──────────────────────────────────────────────────────────

const pendingRequest = ref<CreateSalesOrderRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    if (props.mode === DialogMode.EDIT) {
      await SalesOrdersService.update(props.salesOrderId!, pendingRequest.value)
      toast.add(commonSuccessToast(t('salesOrders.messages.updated'), toastGroup))
    } else {
      await SalesOrdersService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('salesOrders.messages.created'), toastGroup))
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

  let no: string
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else {
    no = event.states.no.value
  }

  const request: CreateSalesOrderRequest = {
    no,
    status: chosenStatus.value,
    orderDate: event.states.orderDate.value.toISOString().split('T')[0],
    priceDate: event.states.priceDate.value?.toISOString().split('T')[0] || null,
    deliveryDate: deliveryDate.value?.toISOString().split('T')[0] || null,
    expiredDate: expiredDate.value?.toISOString().split('T')[0] || null,
    customerId: event.states.customerId.value,
    employeeId: event.states.employeeId.value,
    remark: event.states.remark.value || null,
    downPaymentAmount: String(event.states.downPaymentAmount.value || 0),
    isCash: event.states.isCash.value || false,
    details: details.value.map((row) => {
      const choiceOffers = row._choiceOffers ?? []
      const customerChoices =
        choiceOffers.length > 0
          ? choiceOffers
              .map((offer) => ({
                promotionId: offer.promotionId,
                productIds: row._choicePicks?.[String(offer.promotionId)] ?? [],
              }))
              .filter((c) => c.productIds.length > 0)
          : undefined

      const lineManualDiscounts =
        (row._manualDiscounts ?? []).length > 0
          ? (row._manualDiscounts ?? []).map((d) => ({
              discountType: d.discountType,
              value: d.value,
              reason: d.reason,
            }))
          : undefined

      return {
        productId: row.productId!,
        quantity: String(row.quantity!),
        ...(customerChoices ? { customerChoices } : {}),
        ...(lineManualDiscounts ? { manualDiscounts: lineManualDiscounts } : {}),
      }
    }),
    headerCustomerChoices:
      headerChoiceOffers.value.length > 0
        ? headerChoiceOffers.value
            .map((offer) => ({
              promotionId: offer.promotionId,
              productIds: headerChoicePicks.value[String(offer.promotionId)] ?? [],
            }))
            .filter((c) => c.productIds.length > 0)
        : undefined,
    manualDiscounts:
      headerManualDiscounts.value.length > 0
        ? headerManualDiscounts.value.map((d) => ({
            discountType: d.discountType,
            value: d.value,
            reason: d.reason,
          }))
        : undefined,
    createdBy: authStore.userId!,
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'soApproveConfirm',
      header: t('salesOrders.confirm.header'),
      message: t('salesOrders.confirm.message'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('salesOrders.actions.saveAndApprove') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ─── Load sales order (VIEW mode) ────────────────────────────────────────────

async function loadSalesOrder() {
  if (!props.salesOrderId) return

  isLoading.value = true
  try {
    const header = await SalesOrderHeadersService.getById(props.salesOrderId)

    initialValues.no = header.no
    initialValues.orderDate = new Date(header.orderDate)
    initialValues.priceDate = header.priceDate ? new Date(header.priceDate) : undefined
    deliveryDate.value = header.deliveryDate ? new Date(header.deliveryDate) : undefined
    expiredDate.value = header.expiredDate ? new Date(header.expiredDate) : undefined
    initialValues.customerId = header.customerId
    initialValues.employeeId = header.employeeId ?? undefined
    initialValues.remark = header.remark || ''
    initialValues.isCash = header.isCash
    initialValues.downPaymentAmount = parseFloat(header.downPaymentAmount)

    currentStatus.value = header.status
    currentOrderDate.value = new Date(header.orderDate)
    currentPriceDate.value = header.priceDate ? new Date(header.priceDate) : undefined
    currentCustomerId.value = header.customerId
    currentEmployeeId.value = header.employeeId ?? undefined

    headerDiscountAmount.value = parseFloat(header.discountAmount)
    savedTaxAmount.value = parseFloat(header.taxAmount) || 0
    savedTotalAmount.value = parseFloat(header.totalAmount) || 0
    savedSubtotalAmount.value = parseFloat(header.subtotalAmount) || 0
    savedTaxBaseAmount.value = parseFloat(header.taxBaseAmount) || 0
    headerManualDiscounts.value = header.manualDiscounts ?? []
    headerDiscounts.value = header.headerDiscounts ?? []
    headerBonuses.value = header.headerBonuses ?? []

    if (header.customer) {
      initialCustomer.value = { id: header.customerId, name: header.customer.name }
    }

    if (header.employeeId) {
      const employee = await EmployeesService.get(header.employeeId)
      initialSalesman.value = { id: employee.id, name: employee.name, nip: employee.nip }
      selectedSalesmanBranch.value = employee.branch?.name
      selectedSalesmanCompany.value = employee.company?.name
    }

    const query = new GenericQueryBuilder()
      .withFilter('salesOrderHeaderId', FilterOperator.EQUAL, props.salesOrderId)
      .build()

    const detailsResponse = await SalesOrderDetailsService.list(query)

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
        discount: parseFloat(detail.discount),
        subAmount: parseFloat(detail.subAmount),
        _priceListId: detail.priceListId ?? null,
        _priceListCode: null,
        _taxIncluded: detail.taxIncluded ?? false,
        _taxBaseAmount: detail.taxBaseAmount,
        _taxAmount: detail.taxAmount,
        _discounts: detail.discounts ?? [],
        _bonuses: detail.bonuses ?? [],
        _choiceOffers: [],
        _choicePicks: {},
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

// Lifecycle
onBeforeMount(async () => {
  const [typesResponse, taxConfig, config] = await Promise.all([
    EmployeeTypesService.list(),
    TaxConfigurationService.get().catch(() => ({ percentage: '0' })),
    props.mode === DialogMode.ADD ? SalesOrderConfigService.getMyBranch() : Promise.resolve(null),
  ])
  const salesmanType = typesResponse.data.find((t) => t.name === 'Salesman')
  salesmanTypeId.value = salesmanType?.id
  taxRate.value = parseFloat(taxConfig.percentage) || 0
  soConfig.value = config

  if ((props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) && props.salesOrderId) {
    await loadSalesOrder()
  }
})
</script>
