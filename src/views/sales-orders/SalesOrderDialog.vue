<template>
  <Dialog
    :visible="visible"
    modal
    :header="dialogTitle"
    :style="{ width: '90vw' }"
    :breakpoints="{ '1024px': '75vw', '640px': '95vw' }"
    @update:visible="emit('close')"
  >
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
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <!-- Left Column: Order Information -->
        <div class="space-y-4">
          <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
            {{ t('salesOrders.sections.orderInfo') }}
          </h3>

          <!-- Order Number -->
          <div class="flex flex-col gap-1">
            <label for="no" class="text-sm font-semibold">{{ t('salesOrders.fields.no') }}</label>
            <InputText
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

          <!-- Order Date -->
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
            />
            <Message
              v-if="$form.orderDate?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.orderDate.error.message }}</Message
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
            />
            <Message
              v-if="$form.customerId?.invalid"
              severity="error"
              size="small"
              variant="simple"
              >{{ $form.customerId.error.message }}</Message
            >
          </div>

          <!-- Price Date -->
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
            />
          </div>

          <!-- Delivery Date -->
          <div class="flex flex-col gap-1">
            <label for="deliveryDate" class="text-sm font-semibold">{{
              t('salesOrders.fields.deliveryDate')
            }}</label>
            <DatePicker
              id="deliveryDate"
              name="deliveryDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
          </div>

          <!-- Expiry Date -->
          <div class="flex flex-col gap-1">
            <label for="expiredDate" class="text-sm font-semibold">{{
              t('salesOrders.fields.expiredDate')
            }}</label>
            <DatePicker
              id="expiredDate"
              name="expiredDate"
              date-format="dd/mm/yy"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
          </div>
        </div>

        <!-- Right Column: Payment & Financial -->
        <div class="space-y-4">
          <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
            {{ t('salesOrders.sections.paymentInfo') }}
          </h3>

          <!-- Is Cash -->
          <div class="flex items-center gap-2">
            <Checkbox
              id="isCash"
              name="isCash"
              :binary="true"
              :disabled="mode === DialogMode.VIEW"
            />
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

          <!-- Discount Amount -->
          <div class="flex flex-col gap-1">
            <label for="discountAmount" class="text-sm font-semibold">{{
              t('salesOrders.fields.discountAmount')
            }}</label>
            <InputNumber
              id="discountAmount"
              v-model="headerDiscountAmount"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
          </div>

          <!-- Tax Amount -->
          <div class="flex flex-col gap-1">
            <label for="taxAmount" class="text-sm font-semibold">{{
              t('salesOrders.fields.taxAmount')
            }}</label>
            <InputNumber
              id="taxAmount"
              v-model="headerTaxAmount"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              :disabled="mode === DialogMode.VIEW"
              class="w-full"
            />
          </div>

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
        </div>
      </div>

      <Divider class="my-6" />

      <!-- Details Section -->
      <InlineEditableTable
        v-model="details"
        :columns="detailColumns"
        :mode="mode"
        :title="t('salesOrders.details.title')"
        :add-button-label="t('salesOrders.details.addDetail')"
        :empty-message="t('salesOrders.details.empty')"
      />

      <Divider />

      <!-- Summary Section -->
      <div class="mt-4 rounded-lg border border-stone-200 p-4">
        <h4 class="mb-3 text-sm font-semibold sm:text-base">
          {{ t('salesOrders.summary.title') }}
        </h4>

        <div class="space-y-2">
          <div class="flex justify-between">
            <span>{{ t('salesOrders.summary.subtotal') }}</span>
            <span>{{ formatCurrency(calculatedTotals.subtotal) }}</span>
          </div>

          <div class="flex justify-between">
            <span>{{ t('salesOrders.summary.discount') }}</span>
            <span>{{ formatCurrency(headerDiscountAmount) }}</span>
          </div>

          <div class="flex justify-between">
            <span>{{ t('salesOrders.summary.dpp') }}</span>
            <span>{{ formatCurrency(calculatedTotals.dpp) }}</span>
          </div>

          <div class="flex justify-between">
            <span>{{ t('salesOrders.summary.tax') }}</span>
            <span>{{ formatCurrency(headerTaxAmount) }}</span>
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

      <!-- Action Buttons -->
      <div class="mt-6 flex justify-end gap-2">
        <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('close')" />
        <Button
          v-if="mode !== DialogMode.VIEW"
          type="submit"
          :label="t('common.actions.save')"
          :loading="isSaving"
        />
      </div>
    </Form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Dialog from 'primevue/dialog'
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
import InlineEditableTable, {
  type EditableColumn,
} from '@/components/table/InlineEditableTable.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import {
  CustomersService,
  ProductsService,
  SalesOrdersService,
  SalesOrderHeadersService,
  SalesOrderDetailsService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { SalesOrderDetailRow, CreateSalesOrderRequest, CustomerLite } from '@/types'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()

const toastGroup = 'salesOrderDialog'

interface Props {
  visible: boolean
  mode: DialogMode
  salesOrderId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const details = ref<SalesOrderDetailRow[]>([])
const headerDiscountAmount = ref(0)
const headerTaxAmount = ref(0)
const initialCustomer = ref<CustomerLite>()

// Form initial values
const initialValues = reactive({
  no: '',
  orderDate: undefined as Date | undefined,
  priceDate: undefined as Date | undefined,
  deliveryDate: undefined as Date | undefined,
  expiredDate: undefined as Date | undefined,
  customerId: undefined as number | undefined,
  remark: '',
  isCash: false,
  downPaymentAmount: 0,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      no: z.string().min(1, t('salesOrders.validation.noRequired')),
      orderDate: z.date({ message: t('salesOrders.validation.orderDateRequired') }),
      customerId: z.number({ message: t('salesOrders.validation.customerRequired') }),
      priceDate: z.date().optional().nullable(),
      deliveryDate: z.date().optional().nullable(),
      expiredDate: z.date().optional().nullable(),
      remark: z.string().optional(),
      isCash: z.boolean().optional(),
      downPaymentAmount: z.number().min(0).optional(),
    }),
  ),
)

// Dialog title
const dialogTitle = computed(() => {
  if (props.mode === DialogMode.VIEW) return t('salesOrders.viewSalesOrder')
  return t('salesOrders.addSalesOrder')
})

// Detail columns configuration
const detailColumns = computed<EditableColumn[]>(() => [
  {
    field: 'productId',
    header: t('salesOrders.details.product'),
    type: 'select',
    fetchFn: (query: string) => ProductsService.list(query),
    optionLabel: 'name',
    optionValue: 'id',
    required: true,
  },
  {
    field: 'quantity',
    header: t('salesOrders.details.quantity'),
    type: 'number',
    required: true,
  },
  {
    field: 'price',
    header: t('salesOrders.details.price'),
    type: 'number',
    required: true,
  },
  {
    field: 'discount',
    header: t('salesOrders.details.discount'),
    type: 'number',
  },
  {
    field: 'subAmount',
    header: t('salesOrders.details.subAmount'),
    type: 'computed',
    editable: false,
    computeFn: (row) =>
      ((row.quantity || 0) as number) * ((row.price || 0) as number) -
      ((row.discount || 0) as number),
  },
])

// Computed totals for summary section
const calculatedTotals = computed(() => {
  // Calculate subtotal by computing each line's subAmount
  const subtotal = details.value.reduce((sum, row) => {
    const lineSubAmount = (row.quantity || 0) * (row.price || 0) - (row.discount || 0)
    return sum + lineSubAmount
  }, 0)
  const dpp = subtotal - headerDiscountAmount.value
  const total = dpp + headerTaxAmount.value
  return { subtotal, dpp, total }
})

// Format number with decimals
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Validate details
function validateDetails(): boolean {
  if (details.value.length === 0) {
    toast.add(commonErrorToast(new Error(t('salesOrders.validation.detailsRequired')), toastGroup))
    return false
  }

  for (const [index, row] of details.value.entries()) {
    if (!row.productId || !row.quantity || !row.price) {
      toast.add(
        commonErrorToast(
          new Error(t('salesOrders.validation.detailIncomplete', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
  }

  return true
}

// Form submission
async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return
  if (!validateDetails()) return

  const request: CreateSalesOrderRequest = {
    no: event.states.no.value,
    orderDate: event.states.orderDate.value.toISOString().split('T')[0],
    priceDate: event.states.priceDate.value?.toISOString().split('T')[0] || null,
    deliveryDate: event.states.deliveryDate.value?.toISOString().split('T')[0] || null,
    expiredDate: event.states.expiredDate.value?.toISOString().split('T')[0] || null,
    customerId: event.states.customerId.value,
    remark: event.states.remark.value || null,
    discountAmount: String(headerDiscountAmount.value || 0),
    taxAmount: String(headerTaxAmount.value || 0),
    downPaymentAmount: String(event.states.downPaymentAmount.value || 0),
    isCash: event.states.isCash.value || false,
    details: details.value.map((row) => ({
      productId: row.productId!,
      quantity: String(row.quantity!),
      price: String(row.price!),
      discount: String(row.discount || 0),
    })),
    createdBy: authStore.userId!,
  }

  isSaving.value = true
  try {
    await SalesOrdersService.create(request)
    toast.add(commonSuccessToast(t('salesOrders.messages.created'), toastGroup))
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

// Load sales order for VIEW mode
async function loadSalesOrder() {
  if (!props.salesOrderId) return

  isLoading.value = true
  try {
    // Fetch header
    const header = await SalesOrderHeadersService.getById(props.salesOrderId)

    // Populate form
    initialValues.no = header.no
    initialValues.orderDate = new Date(header.orderDate)
    initialValues.priceDate = header.priceDate ? new Date(header.priceDate) : undefined
    initialValues.deliveryDate = header.deliveryDate ? new Date(header.deliveryDate) : undefined
    initialValues.expiredDate = header.expiredDate ? new Date(header.expiredDate) : undefined
    initialValues.customerId = header.customerId
    initialValues.remark = header.remark || ''
    initialValues.isCash = header.isCash
    initialValues.downPaymentAmount = parseFloat(header.downPaymentAmount)

    headerDiscountAmount.value = parseFloat(header.discountAmount)
    headerTaxAmount.value = parseFloat(header.taxAmount)

    // Set initial customer for dropdown
    if (header.customer) {
      initialCustomer.value = {
        id: header.customerId,
        name: header.customer.name,
      }
    }

    // Fetch details
    const query = new GenericQueryBuilder()
      .withFilter('salesOrderHeaderId', FilterOperator.EQUAL, props.salesOrderId)
      .build()

    const detailsResponse = await SalesOrderDetailsService.list(query)

    details.value = detailsResponse.data.map((detail) => ({
      _localId: crypto.randomUUID(),
      productId: detail.productId,
      product: detail.product,
      quantity: parseFloat(detail.quantity),
      price: parseFloat(detail.price),
      discount: parseFloat(detail.discount),
      subAmount: parseFloat(detail.subAmount),
    }))
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onBeforeMount(async () => {
  if (props.mode === DialogMode.VIEW && props.salesOrderId) {
    await loadSalesOrder()
  }
})
</script>
