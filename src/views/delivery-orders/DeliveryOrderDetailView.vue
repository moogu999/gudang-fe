<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="cancelAcceptHandler" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('deliveryOrders.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-primary text-3xl" />
    </div>

    <template v-else-if="detail">
      <!-- DO header card -->
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.no')
              }}</span>
              <span class="font-medium">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.status')
              }}</span>
              <div class="flex items-center gap-2">
                <Tag
                  class="w-fit"
                  :severity="detail.status === 'open' ? 'success' : 'danger'"
                  :value="t(`deliveryOrders.status.${detail.status}`)"
                />
                <Tag
                  v-if="detail.isPartial"
                  class="w-fit"
                  severity="warn"
                  :value="t('deliveryOrders.status.partial')"
                />
                <Tag
                  v-if="detail.isPartial && detail.pricingMode"
                  class="w-fit"
                  :severity="detail.pricingMode === 'new' ? 'info' : 'secondary'"
                  :value="t(`deliveryOrders.pricingMode.${detail.pricingMode}`)"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.createdAt')
              }}</span>
              <span>{{ dayjs(detail.createdAt).format(DateFormat.DATE_TIME) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.warehouse')
              }}</span>
              <span>{{ detail.warehouseName }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.soNo')
              }}</span>
              <RouterLink
                :to="{ name: 'SalesOrderDetail', params: { id: detail.salesOrderHeaderId } }"
                class="text-primary font-medium hover:underline"
                >{{ detail.soNo }}</RouterLink
              >
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.customer')
              }}</span>
              <span>{{ detail.customerName }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.deliveryDate')
              }}</span>
              <span>{{
                detail.deliveryDate ? dayjs(detail.deliveryDate).format(DateFormat.DATE) : '-'
              }}</span>
            </div>
            <div v-if="detail.invoiceId" class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.invoice')
              }}</span>
              <RouterLink
                :to="{ name: 'InvoiceDetail', params: { id: detail.invoiceId } }"
                class="text-primary font-medium hover:underline"
                >{{ detail.invoiceNo }}</RouterLink
              >
            </div>
            <div v-if="detail.remark" class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryOrders.fields.remark')
              }}</span>
              <span class="whitespace-pre-line">{{ detail.remark }}</span>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <Button
              :label="t('deliveryOrders.actions.print')"
              severity="secondary"
              icon="pi pi-print"
              @click="onPrintClick"
            />
            <Button
              v-if="canCancel && detail.status === 'open'"
              :label="t('deliveryOrders.actions.cancel')"
              severity="danger"
              icon="pi pi-times"
              @click="onCancelClick"
            />
          </div>
        </template>
      </ResponsiveCard>

      <!-- DO lines table -->
      <ResponsiveCard>
        <template #content>
          <DataTable :value="detail.lines" class="mb-4 text-sm" size="small">
            <Column :header="t('deliveryOrders.fields.product')">
              <template #body="{ data }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ data.productCode }}</span>
                  <span class="text-xs text-stone-500">{{ data.productName }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('deliveryOrders.fields.soQuantity')" class="text-right">
              <template #body="{ data }">
                <div class="flex flex-col gap-0.5">
                  <span>
                    <template v-if="(resolveLineLevels(data)?.length ?? 0) > 1">
                      {{
                        decomposeBaseQty(
                          parseFloat(data.soQuantity),
                          resolveLineLevels(data)!,
                        ).join(' / ')
                      }}
                    </template>
                    <template v-else>{{ formatQty(data.soQuantity) }}</template>
                  </span>
                  <span v-if="getUomLabel(data)" class="text-xs text-stone-400">
                    {{ getUomLabel(data) }}
                  </span>
                  <span
                    v-if="(resolveLineLevels(data)?.length ?? 0) > 1"
                    class="text-xs text-stone-400"
                  >
                    {{ formatQty(data.soQuantity) }}
                    {{ resolveLineLevels(data)!.at(-1)?.uom?.symbol }}
                  </span>
                </div>
              </template>
            </Column>
            <Column :header="t('deliveryOrders.fields.fulfilledQuantity')" class="text-right">
              <template #body="{ data }">
                <div
                  class="flex flex-col gap-0.5"
                  :class="{
                    'text-amber-600': parseFloat(data.quantity) < parseFloat(data.soQuantity),
                  }"
                >
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
                  <span
                    v-if="(resolveLineLevels(data)?.length ?? 0) > 1"
                    class="text-xs text-stone-400"
                  >
                    {{ formatQty(data.quantity) }}
                    {{ resolveLineLevels(data)!.at(-1)?.uom?.symbol }}
                  </span>
                </div>
              </template>
            </Column>
            <Column :header="t('deliveryOrders.fields.price')" class="text-right">
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
            <Column :header="t('deliveryOrders.fields.discount')" class="text-right">
              <template #body="{ data }">
                {{ parseFloat(data.discount) > 0 ? formatAmount(data.discount) : '-' }}
              </template>
            </Column>
            <Column :header="t('deliveryOrders.fields.subAmount')" class="text-right">
              <template #body="{ data }">{{ formatAmount(data.subAmount) }}</template>
            </Column>
            <template #empty>
              <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
            </template>
          </DataTable>

          <!-- Financial summary -->
          <div class="flex justify-end">
            <div class="w-full max-w-xs rounded-lg border border-stone-200 p-4">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-stone-500">{{ t('deliveryOrders.fields.subtotal') }}</span>
                  <span class="tabular-nums">{{
                    formatAmount(String(summaryTotals.netSubtotal))
                  }}</span>
                </div>
                <div
                  v-if="summaryTotals.discountTotal > 0"
                  class="flex flex-col gap-0.5 text-red-600"
                >
                  <div class="flex justify-between">
                    <span>{{ t('deliveryOrders.fields.discount') }}</span>
                    <span class="tabular-nums"
                      >- {{ formatAmount(String(summaryTotals.discountTotal)) }}</span
                    >
                  </div>
                  <template v-if="detail.headerDiscounts?.length">
                    <div
                      v-for="disc in detail.headerDiscounts"
                      :key="disc.promotionId"
                      class="flex justify-between text-xs text-red-400"
                    >
                      <span>{{ disc.promotionCode }}</span>
                      <span>
                        {{
                          disc.discountType === 'percentage'
                            ? `${disc.value}%`
                            : formatAmount(disc.amount)
                        }}
                      </span>
                    </div>
                  </template>
                </div>
                <div
                  v-if="parseFloat(detail.taxAmount) > 0"
                  class="flex justify-between text-orange-600"
                >
                  <span>{{ t('deliveryOrders.fields.tax') }}</span>
                  <span class="tabular-nums">+ {{ formatAmount(detail.taxAmount) }}</span>
                </div>
                <Divider class="my-1" />
                <div class="flex justify-between text-base font-bold">
                  <span>{{ t('deliveryOrders.fields.total') }}</span>
                  <span class="text-green-600 tabular-nums">{{
                    formatAmount(detail.totalAmount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <!-- Bonus lines card -->
      <ResponsiveCard v-if="detail.bonusLines.length > 0" class="mt-4">
        <template #content>
          <p class="mb-3 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {{ t('deliveryOrders.bonus.title') }}
          </p>
          <DataTable :value="detail.bonusLines" class="text-sm" size="small">
            <Column :header="t('deliveryOrders.bonus.promotionCode')">
              <template #body="{ data }">
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-green-700">{{ data.promotionCode }}</span>
                  <span v-if="data.promotionDescription" class="text-xs text-stone-500">{{
                    data.promotionDescription
                  }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('deliveryOrders.fields.product')">
              <template #body="{ data }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ data.productCode }}</span>
                  <span class="text-xs text-stone-500">{{ data.productName }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('deliveryOrders.bonus.quantity')" class="text-right">
              <template #body="{ data }">
                <div class="flex flex-col gap-0.5 text-green-700">
                  <span>
                    <template v-if="(resolveBonusLineLevels(data)?.length ?? 0) > 1">
                      +{{
                        decomposeBaseQty(
                          parseFloat(data.quantity),
                          resolveBonusLineLevels(data)!,
                        ).join(' / ')
                      }}
                    </template>
                    <template v-else>+{{ formatQty(data.quantity) }}</template>
                  </span>
                  <span v-if="getBonusUomLabel(data)" class="text-xs text-green-600/70">
                    {{ getBonusUomLabel(data) }}
                  </span>
                  <span
                    v-if="(resolveBonusLineLevels(data)?.length ?? 0) > 1"
                    class="text-xs text-green-600/70"
                  >
                    +{{ formatQty(data.quantity) }}
                    {{ resolveBonusLineLevels(data)!.at(-1)?.uom?.symbol }}
                  </span>
                </div>
              </template>
            </Column>
            <template #empty>
              <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
            </template>
          </DataTable>
        </template>
      </ResponsiveCard>
    </template>

    <Message v-else-if="!isLoading" severity="error">
      {{ t('deliveryOrders.messages.notFound') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { DeliveryOrdersService, commonSuccessToast, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type {
  DeliveryOrderDetail,
  DeliveryOrderViewLine,
  DeliveryOrderBonusLine,
  DeliveryOrderUomLevel,
  UomConversionLevel,
} from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const confirm = useConfirm()
const toast = useToast()
const { hasPermission } = usePermissions()

const toastGroup = 'deliveryOrderDetail'
const detail = ref<DeliveryOrderDetail | null>(null)
const isLoading = ref(false)

const canCancel = computed(() => hasPermission(PERMISSIONS.DELIVERY_ORDER_CANCEL))

const summaryTotals = computed(() => {
  if (!detail.value) return { netSubtotal: 0, discountTotal: 0 }
  let discountTotal = 0
  for (const line of detail.value.lines) {
    discountTotal += parseFloat(line.discount)
  }
  discountTotal += parseFloat(detail.value.discountAmount)
  const total = parseFloat(detail.value.totalAmount)
  const taxAmount = parseFloat(detail.value.taxAmount)
  // netSubtotal - discountTotal + taxAmount = total  (mirrors SO form pattern)
  const netSubtotal = total + discountTotal - taxAmount
  return { netSubtotal, discountTotal }
})

const cancelAcceptHandler = ref(async () => {})

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await DeliveryOrdersService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

function formatAmount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function doLevelsToUomLevels(levels: DeliveryOrderUomLevel[]): UomConversionLevel[] {
  return levels.map((l) => ({
    id: l.id,
    uomGroupId: 0,
    levelOrder: l.levelOrder,
    uomId: 0,
    qtyPerParent: l.qtyPerParent,
    uom: { id: l.id, name: l.uomSymbol, symbol: l.uomSymbol },
  }))
}

function resolveLineLevels(line: DeliveryOrderViewLine): UomConversionLevel[] | undefined {
  return (
    pinnedToLevels(line.pinnedUom) ??
    (line.uomGroup?.levels?.length ? doLevelsToUomLevels(line.uomGroup.levels) : undefined)
  )
}

function resolveBonusLineLevels(line: DeliveryOrderBonusLine): UomConversionLevel[] | undefined {
  return (
    pinnedToLevels(line.pinnedUom) ??
    (line.uomGroup?.levels?.length ? doLevelsToUomLevels(line.uomGroup.levels) : undefined)
  )
}

function getUomLabel(line: DeliveryOrderViewLine): string | undefined {
  const levels = resolveLineLevels(line)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function getBonusUomLabel(line: DeliveryOrderBonusLine): string | undefined {
  const levels = resolveBonusLineLevels(line)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function onPrintClick() {
  if (!detail.value) return
  const url = router.resolve({ name: 'DeliveryOrderPrint', params: { id: detail.value.id } }).href
  window.open(url, '_blank')
}

function onCancelClick() {
  if (!detail.value) return
  const id = detail.value.id

  cancelAcceptHandler.value = async () => {
    try {
      await DeliveryOrdersService.cancel(id)
      toast.add(commonSuccessToast(t('deliveryOrders.messages.cancelSuccess'), toastGroup))
      await fetchDetail(id)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    }
  }

  confirm.require({
    group: toastGroup,
    header: t('deliveryOrders.actions.cancel'),
    message: t('deliveryOrders.messages.confirmCancel'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('deliveryOrders.actions.cancel'), severity: 'danger' },
  })
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/delivery-orders')
    return
  }
  fetchDetail(id)
})
</script>
