<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('returnDeliveryOrders.createTitle') }}
      </h1>
    </div>

    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">
              {{ t('returnDeliveryOrders.numberMode.label') }}
            </label>
            <div class="flex gap-2">
              <Button
                type="button"
                :label="t('returnDeliveryOrders.numberMode.auto')"
                :severity="numberMode === 'auto' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'auto'"
              />
              <Button
                type="button"
                :label="t('returnDeliveryOrders.numberMode.manual')"
                :severity="numberMode === 'manual' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'manual'"
              />
            </div>
            <div v-if="numberMode === 'auto'" class="mt-1 flex flex-col gap-1">
              <InputText
                :value="previewLoading ? '' : previewNo"
                :placeholder="previewLoading ? t('common.messages.loading') : ''"
                readonly
                class="w-full sm:w-80"
              />
              <small class="text-surface-500">
                {{ t('returnDeliveryOrders.numberMode.assignedOnSave') }}
              </small>
            </div>
            <InputText
              v-else
              v-model="manualNo"
              class="mt-1 w-full sm:w-80"
              :placeholder="t('returnDeliveryOrders.numberMode.manualPlaceholder')"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{
              t('returnDeliveryOrders.fields.salesOrder')
            }}</label>
            <InfiniteSelect
              v-model="salesOrderId"
              option-label="no"
              option-value="id"
              :fetch-fn="(query) => SalesOrderHeadersService.list(query)"
              :custom-filters="soFilters"
              :initial-option="initialSalesOrder"
              :disabled="returnTypeId === undefined"
              :placeholder="t('returnDeliveryOrders.labels.selectSalesOrder')"
              sort-by="no"
              sort-operator="desc"
              @select-option="(opt) => onSalesOrderSelect(opt as SalesOrderHeader)"
            >
              <template #option="{ option }">
                {{ option.no }} — {{ option.customer?.name }}
              </template>
            </InfiniteSelect>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{
              t('returnDeliveryOrders.fields.driver')
            }}</label>
            <InfiniteSelect
              v-model="driverEmployeeId"
              option-label="name"
              option-value="id"
              :fetch-fn="(query) => EmployeesService.listForSelect(query)"
              :placeholder="t('returnDeliveryOrders.labels.selectDriver')"
              sort-by="name"
              sort-operator="asc"
            />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-if="salesOrderHeader" class="mb-4">
      <template #content>
        <p class="mb-4 text-xs font-semibold tracking-wide text-stone-500 uppercase">
          {{ t('salesOrders.details.title') }}
        </p>

        <div class="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-stone-400">{{ t('salesOrders.fields.no') }}</span>
            <span>{{ salesOrderHeader.no }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-stone-400">{{ t('salesOrders.fields.customer') }}</span>
            <span>{{ salesOrderHeader.customer?.name ?? '-' }}</span>
          </div>
        </div>

        <DataTable :value="salesOrderDetails" data-key="id" class="text-sm" size="small">
          <Column :header="t('salesOrders.details.productCode')">
            <template #body="{ data }">{{ data.product?.code }}</template>
          </Column>
          <Column :header="t('salesOrders.details.product')">
            <template #body="{ data }">{{ data.product?.name }}</template>
          </Column>
          <Column :header="t('salesOrders.details.quantity')" class="text-right">
            <template #body="{ data }">
              <div class="flex flex-col gap-0.5">
                <span>
                  <template v-if="(resolveLineLevels(data)?.length ?? 0) > 1">
                    {{
                      decomposeBaseQty(parseFloat(data.quantity), resolveLineLevels(data)!).join(
                        ' / ',
                      )
                    }}
                  </template>
                  <template v-else>{{ formatQty(data.quantity) }}</template>
                </span>
                <span v-if="getUomLabel(data)" class="text-xs text-stone-400">
                  {{ getUomLabel(data) }}
                </span>
              </div>
            </template>
          </Column>
          <Column :header="t('salesOrders.details.price')" class="text-right">
            <template #body="{ data }">
              <div class="flex flex-col gap-0.5">
                <span>{{ formatAmount(data.price) }}</span>
                <span
                  v-if="data.taxIncluded"
                  class="w-fit rounded bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-700"
                >
                  {{ t('priceLists.fields.taxIncluded') }}
                </span>
              </div>
            </template>
          </Column>
          <Column :header="t('salesOrders.details.gross')" class="text-right">
            <template #body="{ data }">{{ formatAmount(String(lineGross(data))) }}</template>
          </Column>
          <Column :header="t('salesOrders.details.discount')" class="text-right">
            <template #body="{ data }">
              {{ parseFloat(data.discount) > 0 ? formatAmount(data.discount) : '-' }}
            </template>
          </Column>
          <Column :header="t('salesOrders.details.subAmount')" class="text-right">
            <template #body="{ data }">{{ formatAmount(data.subAmount) }}</template>
          </Column>
          <Column :header="t('salesOrders.details.taxBase')" class="text-right">
            <template #body="{ data }">{{ formatAmount(data.taxBaseAmount) }}</template>
          </Column>
          <Column :header="t('salesOrders.details.tax')" class="text-right">
            <template #body="{ data }">{{ formatAmount(data.taxAmount) }}</template>
          </Column>
          <template #empty>
            <div class="py-4 text-center text-sm text-stone-400">{{ t('table.noItems') }}</div>
          </template>
        </DataTable>

        <!-- Order summary -->
        <div class="mt-4 flex justify-end">
          <div class="w-full max-w-xs rounded-lg border border-stone-200 p-4">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-stone-500">{{ t('salesOrders.summary.grossTotal') }}</span>
                <span class="tabular-nums">{{
                  formatAmount(salesOrderHeader.subtotalAmount)
                }}</span>
              </div>
              <div
                v-if="parseFloat(salesOrderHeader.discountAmount) !== 0"
                class="flex justify-between text-red-600"
              >
                <span>{{ t('salesOrders.summary.discountTotal') }}</span>
                <span class="tabular-nums">{{
                  formatAmount(salesOrderHeader.discountAmount)
                }}</span>
              </div>
              <Divider class="my-1" />
              <div class="flex justify-between">
                <span class="text-stone-500">{{ t('salesOrders.summary.taxBase') }}</span>
                <span class="tabular-nums">{{ formatAmount(salesOrderHeader.taxBaseAmount) }}</span>
              </div>
              <div
                v-if="parseFloat(salesOrderHeader.taxAmount) !== 0"
                class="flex justify-between text-orange-600"
              >
                <span>{{ t('salesOrders.summary.tax') }}</span>
                <span class="tabular-nums">{{ formatAmount(salesOrderHeader.taxAmount) }}</span>
              </div>
              <Divider class="my-1" />
              <div class="flex justify-between text-base font-bold">
                <span>{{ t('salesOrders.summary.total') }}</span>
                <span class="text-red-600 tabular-nums">{{
                  formatAmount(salesOrderHeader.totalAmount)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <div class="flex justify-end gap-3">
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        outlined
        @click="router.back()"
      />
      <Button
        :label="t('returnDeliveryOrders.actions.submit')"
        icon="pi pi-check"
        :loading="submitting"
        @click="onSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import {
  SalesOrderHeadersService,
  SalesOrderDetailsService,
  SalesOrderTypesService,
  EmployeesService,
  ReturnDeliveryOrdersService,
  NumberSeriesService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import FilterOperator from '@/constants/filterOperator'
import { SALES_ORDER_TYPE_CODE_RETURN } from '@/types/salesOrderType.type'
import type { SalesOrderHeader, SalesOrderDetail, UomConversionLevel } from '@/types'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'returnDeliveryOrderCreate'

const returnTypeId = ref<number | undefined>()
const salesOrderId = ref<number | undefined>()
const driverEmployeeId = ref<number | undefined>()
const initialSalesOrder = ref<SalesOrderHeader>()
const salesOrderHeader = ref<SalesOrderHeader | undefined>()
const salesOrderDetails = ref<SalesOrderDetail[]>([])
const submitting = ref(false)
const numberMode = ref<'auto' | 'manual'>('auto')
const manualNo = ref('')
const previewNo = ref('')
const previewLoading = ref(false)

const soFilters = computed(() => {
  if (returnTypeId.value === undefined) return []
  return [
    {
      filterBy: 'salesOrderTypeId',
      filterOperator: FilterOperator.EQUAL,
      filterValue: returnTypeId.value,
    },
    { filterBy: 'status', filterOperator: FilterOperator.EQUAL, filterValue: 'approved' },
  ]
})

function formatAmount(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function resolveLineLevels(line: SalesOrderDetail): UomConversionLevel[] | undefined {
  return pinnedToLevels(line.pinnedUom) ?? line.product?.uomGroup?.levels
}

function getUomLabel(line: SalesOrderDetail): string | undefined {
  const levels = resolveLineLevels(line)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function lineGross(line: SalesOrderDetail): number {
  return parseFloat(line.quantity) * parseFloat(line.price)
}

async function loadPreview() {
  previewLoading.value = true
  try {
    const res = await NumberSeriesService.preview('delivery_orders')
    previewNo.value = res.code
  } catch {
    previewNo.value = ''
  } finally {
    previewLoading.value = false
  }
}

async function loadSalesOrderDetails(id: number) {
  try {
    salesOrderHeader.value = await SalesOrderHeadersService.getById(id)
    const query = new GenericQueryBuilder()
      .withFilter('salesOrderHeaderId', FilterOperator.EQUAL, id)
      .build()
    const res = await SalesOrderDetailsService.list(query)
    salesOrderDetails.value = res.data
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

function onSalesOrderSelect(opt: SalesOrderHeader) {
  salesOrderId.value = opt.id
}

watch(salesOrderId, (id) => {
  if (id) {
    loadSalesOrderDetails(id)
  } else {
    salesOrderHeader.value = undefined
    salesOrderDetails.value = []
  }
})

async function onSubmit() {
  if (!salesOrderId.value) {
    toast.add(
      commonErrorToast(
        new Error(t('returnDeliveryOrders.validation.salesOrderRequired')),
        toastGroup,
      ),
    )
    return
  }
  if (!driverEmployeeId.value) {
    toast.add(
      commonErrorToast(new Error(t('returnDeliveryOrders.validation.driverRequired')), toastGroup),
    )
    return
  }
  if (numberMode.value === 'manual' && !manualNo.value.trim()) {
    toast.add(
      commonErrorToast(new Error(t('returnDeliveryOrders.validation.noManualNo')), toastGroup),
    )
    return
  }

  submitting.value = true
  try {
    const res = await ReturnDeliveryOrdersService.create({
      salesOrderId: salesOrderId.value,
      driverEmployeeId: driverEmployeeId.value,
      no: numberMode.value === 'manual' ? manualNo.value.trim() : null,
    })

    toast.add(
      commonSuccessToast(
        t('returnDeliveryOrders.messages.created', { no: res.deliveryOrderNo }),
        toastGroup,
      ),
    )

    setTimeout(() => {
      router.push(`/delivery-orders/${res.deliveryOrderId}`)
    }, 1200)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loadPreview()

  try {
    const types = await SalesOrderTypesService.list()
    const returnType = types.data.find((t) => t.code === SALES_ORDER_TYPE_CODE_RETURN)
    returnTypeId.value = returnType?.id
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }

  const soIdParam = Number(route.query.soId)
  if (!isNaN(soIdParam) && soIdParam > 0) {
    salesOrderId.value = soIdParam
    try {
      const header = await SalesOrderHeadersService.getById(soIdParam)
      initialSalesOrder.value = header
    } catch {
      toast.add(
        commonErrorToast(new Error(t('returnDeliveryOrders.messages.notFound')), toastGroup),
      )
    }
  }
})
</script>
