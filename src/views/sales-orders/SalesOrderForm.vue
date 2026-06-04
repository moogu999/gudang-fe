<template>
  <Toast position="top-center" :group="toastGroup" />

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
          <!-- Manual mode (ADD) or VIEW mode: editable / read-only -->
          <InputText
            v-else
            id="no"
            name="no"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
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
        v-model="headerManualDiscounts"
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
      <Button
        v-if="mode !== DialogMode.VIEW"
        type="submit"
        :label="t('common.actions.save')"
        :loading="isSaving || isResolving"
      />
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { useDebounceFn } from '@vueuse/core'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
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
import type { SalesOrderConfig } from '@/types'
import type {
  SalesOrderDetailRow,
  CreateSalesOrderRequest,
  CustomerLite,
  ResolveSalesOrderRequest,
  EmployeeLite,
  Employee,
  ManualDiscount,
} from '@/types'
import { decomposeBaseQty } from '@/utils/uomHelper'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries } from '@/composables'

const { t } = useI18n()
const toast = useToast()
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
  mode: DialogMode.ADD | DialogMode.VIEW
  salesOrderId?: number
  hideHeader?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

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

// Computed totals for summary section
const calculatedTotals = computed(() => {
  // Split line subAmounts by tax inclusion status
  let subTotalInclusive = 0
  let subTotalExclusive = 0
  let lineDiscountTotal = 0

  details.value.forEach((row) => {
    const gross = (row.quantity || 0) * (row.price || 0)
    const lineDisc = row.discount || 0
    const manualDisc = (row._manualDiscounts ?? []).reduce((s, d) => {
      const v = parseFloat(d.value) || 0
      return s + (d.discountType === 'flat' ? v : Math.round(((gross * v) / 100) * 100) / 100)
    }, 0)
    lineDiscountTotal += lineDisc + manualDisc
    const sub = gross - lineDisc - manualDisc
    if (row._taxIncluded) subTotalInclusive += sub
    else subTotalExclusive += sub
  })

  const grossTotal = subTotalInclusive + subTotalExclusive

  const headerManualDiscountTotal = headerManualDiscounts.value.reduce((sum, d) => {
    const v = parseFloat(d.value) || 0
    return sum + (d.discountType === 'flat' ? v : Math.round(((grossTotal * v) / 100) * 100) / 100)
  }, 0)

  const discountTotal = lineDiscountTotal + headerDiscountAmount.value + headerManualDiscountTotal
  const dppGross = grossTotal - discountTotal

  // Proportionally split dppGross between inclusive and exclusive line portions
  const inclusiveFraction = grossTotal > 0 ? subTotalInclusive / grossTotal : 0
  const dppInclusive = dppGross * inclusiveFraction
  const dppExclusive = dppGross - dppInclusive

  // Embedded tax extracted from inclusive-price lines (always shown)
  const embeddedTax =
    taxRate.value > 0
      ? Math.round(((dppInclusive * taxRate.value) / (100 + taxRate.value)) * 100) / 100
      : 0

  // Additive tax on exclusive-price lines (only if customer is taxable)
  const additiveTax = customerTaxable.value
    ? Math.round(((dppExclusive * taxRate.value) / 100) * 100) / 100
    : 0

  const taxAmount =
    props.mode === DialogMode.VIEW
      ? savedTaxAmount.value
      : Math.round((embeddedTax + additiveTax) * 100) / 100

  // In VIEW mode use the saved total to avoid double-counting embedded tax
  const total =
    props.mode === DialogMode.VIEW
      ? savedTotalAmount.value
      : Math.round((dppGross + additiveTax) * 100) / 100

  // Net subtotal: gross minus embedded tax, so summary math holds:
  // netSubtotal - discountTotal + taxAmount = total
  const netSubtotal = total + discountTotal - taxAmount

  return { grossTotal, netSubtotal, discountTotal, taxAmount, total }
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
  if (props.mode !== DialogMode.ADD) return
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
  if (props.mode !== DialogMode.ADD) return
  scheduleResolve()
})

// Trigger resolve when a product or quantity changes (but NOT when only resolved fields change)
const detailsResolveKey = computed(() =>
  details.value.map((r) => `${r._localId}:${r.productId}:${r.quantity}`).join(','),
)

watch(detailsResolveKey, () => {
  if (props.mode !== DialogMode.ADD) return
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

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return
  if (!validateDetails()) return

  let no: string
  if (noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else {
    no = event.states.no.value
  }

  const request: CreateSalesOrderRequest = {
    no,
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

  isSaving.value = true
  try {
    await SalesOrdersService.create(request)
    toast.add(commonSuccessToast(t('salesOrders.messages.created'), toastGroup))
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
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

    headerDiscountAmount.value = parseFloat(header.discountAmount)
    savedTaxAmount.value = parseFloat(header.taxAmount) || 0
    savedTotalAmount.value = parseFloat(header.totalAmount) || 0
    headerManualDiscounts.value = header.manualDiscounts ?? []

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
      const levels = detail.product?.uomGroup?.levels
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
        _discounts: detail.discounts ?? [],
        _bonuses: detail.bonuses ?? [],
        _choiceOffers: [],
        _choicePicks: {},
        _manualDiscounts: detail.manualDiscounts ?? [],
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

  if (props.mode === DialogMode.VIEW && props.salesOrderId) {
    await loadSalesOrder()
  }
})
</script>
