<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('invoices.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-primary text-3xl" />
    </div>

    <template v-else-if="detail">
      <!-- Invoice header card -->
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('invoices.fields.no')
              }}</span>
              <span class="font-medium">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('invoices.fields.status')
              }}</span>
              <Tag
                class="w-fit"
                :severity="statusSeverity(detail.status)"
                :value="t(`invoices.status.${detail.status}`)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('invoices.fields.createdAt')
              }}</span>
              <span>{{ dayjs(detail.createdAt).format(DateFormat.DATE_TIME) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('invoices.fields.doNo')
              }}</span>
              <RouterLink
                :to="{ name: 'DeliveryOrderDetail', params: { id: detail.deliveryOrderId } }"
                class="text-primary font-medium hover:underline"
                >{{ detail.deliveryOrderNo }}</RouterLink
              >
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('invoices.fields.customer')
              }}</span>
              <span>{{ detail.customerName ?? '-' }}</span>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <!-- Line items card -->
      <ResponsiveCard>
        <template #content>
          <DataTable
            v-model:expanded-rows="expandedRows"
            :value="detail.lines"
            data-key="productId"
            class="mb-4 text-sm"
            size="small"
          >
            <Column expander style="width: 3rem" />
            <Column :header="t('invoices.fields.product')">
              <template #body="{ data }">
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ data.productCode }}</span>
                    <Tag
                      v-if="data.isBonus"
                      severity="success"
                      :value="t('invoices.fields.bonus')"
                      class="text-xs"
                    />
                  </div>
                  <span class="text-xs text-stone-500">{{ data.productName }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('invoices.fields.quantity')">
              <template #body="{ data }">
                <div class="flex flex-col items-start gap-0.5">
                  <span>
                    <template v-if="(pinnedToLevels(data.pinnedUom)?.length ?? 0) > 1">
                      {{
                        decomposeBaseQty(
                          parseFloat(data.quantity),
                          pinnedToLevels(data.pinnedUom)!,
                        ).join(' / ')
                      }}
                    </template>
                    <template v-else>{{ formatQty(data.quantity) }}</template>
                  </span>
                  <span v-if="uomLabel(data)" class="text-xs text-stone-400">{{
                    uomLabel(data)
                  }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('invoices.fields.price')" class="text-right">
              <template #body="{ data }">
                {{ data.isBonus ? '-' : formatAmount(data.price) }}
              </template>
            </Column>
            <Column :header="t('invoices.fields.gross')" class="text-right">
              <template #body="{ data }">
                {{ data.isBonus ? '-' : formatAmount(String(lineGross(data))) }}
              </template>
            </Column>
            <Column :header="t('invoices.fields.discount')" class="text-right">
              <template #body="{ data }">
                {{ parseFloat(data.discount) > 0 ? formatAmount(data.discount) : '-' }}
              </template>
            </Column>
            <Column :header="t('invoices.fields.subAmount')" class="text-right">
              <template #body="{ data }">
                {{ data.isBonus ? '-' : formatAmount(data.subAmount) }}
              </template>
            </Column>
            <Column :header="t('invoices.fields.taxBase')" class="text-right">
              <template #body="{ data }">
                {{ data.isBonus ? '-' : formatAmount(data.taxBaseAmount) }}
              </template>
            </Column>
            <Column :header="t('invoices.fields.tax')" class="text-right">
              <template #body="{ data }">
                {{ data.isBonus ? '-' : formatAmount(data.taxAmount) }}
              </template>
            </Column>
            <template #empty>
              <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
            </template>

            <!-- Row expansion: per-line promotion / manual discount breakdown -->
            <template #expansion="{ data }">
              <div class="bg-stone-50 px-4 py-3">
                <template v-if="promotionDiscounts((data as InvoiceDetailLine).discounts).length">
                  <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                    {{ t('invoices.fields.promotionDiscounts') }}
                  </p>
                  <table class="mb-3 w-full text-xs">
                    <thead>
                      <tr class="border-b border-stone-200 text-stone-400">
                        <th class="pb-1 text-left">{{ t('invoices.fields.promotionCode') }}</th>
                        <th class="pb-1 text-left">{{ t('invoices.fields.discountType') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.discountValue') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.discountAmount') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.taxBase') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.tax') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(disc, i) in promotionDiscounts(
                          (data as InvoiceDetailLine).discounts,
                        )"
                        :key="i"
                        class="border-b border-stone-100"
                      >
                        <td class="py-0.5">{{ disc.promotionCode }}</td>
                        <td class="py-0.5 capitalize">{{ disc.discountType }}</td>
                        <td class="py-0.5 text-right">
                          {{
                            disc.discountType === 'percentage'
                              ? `${disc.value}%`
                              : formatAmount(disc.value)
                          }}
                        </td>
                        <td class="py-0.5 text-right text-red-600">
                          -{{ formatAmount(disc.amount) }}
                        </td>
                        <td class="py-0.5 text-right text-red-600">
                          {{ formatAmount(disc.taxBaseAmount) }}
                        </td>
                        <td class="py-0.5 text-right text-red-600">
                          {{ formatAmount(disc.taxAmount) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>

                <template v-if="manualDiscounts((data as InvoiceDetailLine).discounts).length">
                  <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                    {{ t('invoices.fields.manualDiscounts') }}
                  </p>
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-stone-200 text-stone-400">
                        <th class="pb-1 text-left">{{ t('invoices.fields.reason') }}</th>
                        <th class="pb-1 text-left">{{ t('invoices.fields.discountType') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.discountValue') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.discountAmount') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.taxBase') }}</th>
                        <th class="pb-1 text-right">{{ t('invoices.fields.tax') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(disc, i) in manualDiscounts((data as InvoiceDetailLine).discounts)"
                        :key="i"
                        class="border-b border-stone-100"
                      >
                        <td class="py-0.5">
                          {{ disc.reason || t('invoices.fields.manualDiscount') }}
                        </td>
                        <td class="py-0.5 capitalize">{{ disc.discountType }}</td>
                        <td class="py-0.5 text-right">
                          {{
                            disc.discountType === 'percentage'
                              ? `${disc.value}%`
                              : formatAmount(disc.value)
                          }}
                        </td>
                        <td class="py-0.5 text-right text-red-600">
                          -{{ formatAmount(disc.amount) }}
                        </td>
                        <td class="py-0.5 text-right text-red-600">
                          {{ formatAmount(disc.taxBaseAmount) }}
                        </td>
                        <td class="py-0.5 text-right text-red-600">
                          {{ formatAmount(disc.taxAmount) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>

                <p
                  v-if="!(data as InvoiceDetailLine).discounts?.length"
                  class="text-xs text-stone-400"
                >
                  {{ t('salesOrders.details.noPromotions') }}
                </p>
              </div>
            </template>
          </DataTable>

          <!-- Header-level discounts, kept out of the summary panel -->
          <div v-if="detail.headerDiscounts?.length" class="mb-4">
            <p class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('invoices.fields.headerDiscounts') }}
            </p>
            <template v-if="promotionDiscounts(detail.headerDiscounts).length">
              <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                {{ t('invoices.fields.promotionDiscounts') }}
              </p>
              <table class="mb-3 w-full text-xs">
                <thead>
                  <tr class="border-b border-stone-200 text-stone-400">
                    <th class="pb-1 text-left">{{ t('invoices.fields.promotionCode') }}</th>
                    <th class="pb-1 text-left">{{ t('invoices.fields.discountType') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.discountValue') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.discountAmount') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.taxBase') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.tax') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(disc, i) in promotionDiscounts(detail.headerDiscounts)"
                    :key="i"
                    class="border-b border-stone-100 text-red-600"
                  >
                    <td class="py-0.5">{{ disc.promotionCode }}</td>
                    <td class="py-0.5 capitalize">{{ disc.discountType }}</td>
                    <td class="py-0.5 text-right">
                      {{
                        disc.discountType === 'percentage'
                          ? `${disc.value}%`
                          : formatAmount(disc.value)
                      }}
                    </td>
                    <td class="py-0.5 text-right">-{{ formatAmount(disc.amount) }}</td>
                    <td class="py-0.5 text-right">{{ formatAmount(disc.taxBaseAmount) }}</td>
                    <td class="py-0.5 text-right">{{ formatAmount(disc.taxAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-if="manualDiscounts(detail.headerDiscounts).length">
              <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                {{ t('invoices.fields.manualDiscounts') }}
              </p>
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-stone-200 text-stone-400">
                    <th class="pb-1 text-left">{{ t('invoices.fields.reason') }}</th>
                    <th class="pb-1 text-left">{{ t('invoices.fields.discountType') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.discountValue') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.discountAmount') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.taxBase') }}</th>
                    <th class="pb-1 text-right">{{ t('invoices.fields.tax') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(disc, i) in manualDiscounts(detail.headerDiscounts)"
                    :key="i"
                    class="border-b border-stone-100 text-red-600"
                  >
                    <td class="py-0.5">{{ disc.reason || t('invoices.fields.manualDiscount') }}</td>
                    <td class="py-0.5 capitalize">{{ disc.discountType }}</td>
                    <td class="py-0.5 text-right">
                      {{
                        disc.discountType === 'percentage'
                          ? `${disc.value}%`
                          : formatAmount(disc.value)
                      }}
                    </td>
                    <td class="py-0.5 text-right">-{{ formatAmount(disc.amount) }}</td>
                    <td class="py-0.5 text-right">{{ formatAmount(disc.taxBaseAmount) }}</td>
                    <td class="py-0.5 text-right">{{ formatAmount(disc.taxAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>

          <!-- Financial summary -->
          <div class="flex justify-end">
            <div class="w-full max-w-xs rounded-lg border border-stone-200 p-4">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-stone-500">{{ t('invoices.fields.subtotal') }}</span>
                  <span class="tabular-nums">{{ formatAmount(detail.subtotalAmount) }}</span>
                </div>
                <div
                  v-if="summaryTotals.discountTotal > 0"
                  class="flex justify-between text-red-600"
                >
                  <span>{{ t('invoices.fields.discount') }}</span>
                  <span class="tabular-nums"
                    >- {{ formatAmount(String(summaryTotals.discountTotal)) }}</span
                  >
                </div>
                <Divider class="my-1" />
                <!-- Total = Tax Base + Tax always holds under the bottom-up model, unlike
                     Subtotal - Discount + Tax above, which only holds for all-exclusive orders. -->
                <div class="flex justify-between">
                  <span class="text-stone-500">{{ t('invoices.fields.taxBase') }}</span>
                  <span class="tabular-nums">{{ formatAmount(detail.taxBaseAmount) }}</span>
                </div>
                <div
                  v-if="parseFloat(detail.taxAmount) > 0"
                  class="flex justify-between text-orange-600"
                >
                  <span>{{ t('invoices.fields.tax') }}</span>
                  <span class="tabular-nums">+ {{ formatAmount(detail.taxAmount) }}</span>
                </div>
                <Divider class="my-1" />
                <div class="flex justify-between text-base font-bold">
                  <span>{{ t('invoices.fields.total') }}</span>
                  <span class="text-green-600 tabular-nums">{{
                    formatAmount(detail.totalAmount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </ResponsiveCard>
    </template>

    <Message v-else-if="!isLoading" severity="error">
      {{ t('invoices.messages.notFound') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { InvoicesService, commonErrorToast } from '@/services'
import type { InvoiceDetail, InvoiceDetailLine, InvoiceDiscountItem, InvoiceStatus } from '@/types'
import type { UomConversionLevel } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'
import { pinnedToLevels, decomposeBaseQty } from '@/utils/uomHelper'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'invoiceDetail'
const detail = ref<InvoiceDetail | null>(null)
const isLoading = ref(false)
const expandedRows = ref<Record<number, boolean>>({})

function lineGross(line: InvoiceDetailLine): number {
  return parseFloat(line.quantity) * parseFloat(line.price)
}

function promotionDiscounts(discounts: InvoiceDiscountItem[] | undefined): InvoiceDiscountItem[] {
  return (discounts ?? []).filter((d) => d.source === 'promotion')
}

function manualDiscounts(discounts: InvoiceDiscountItem[] | undefined): InvoiceDiscountItem[] {
  return (discounts ?? []).filter((d) => d.source === 'manual')
}

// Sums line-level discounts on top of the header discount so the on-screen
// Subtotal − Discount + Tax = Total equation holds (mirrors DeliveryOrderDetailView.vue).
const summaryTotals = computed(() => {
  if (!detail.value) return { discountTotal: 0 }
  let discountTotal = parseFloat(detail.value.discountAmount)
  for (const line of detail.value.lines) {
    discountTotal += parseFloat(line.discount)
  }
  return { discountTotal }
})

function statusSeverity(status: InvoiceStatus) {
  if (status === 'applied') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'secondary'
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
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(num)
}

function uomLabel(line: InvoiceDetailLine): string | undefined {
  const levels: UomConversionLevel[] | undefined = pinnedToLevels(line.pinnedUom)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await InvoicesService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/invoices')
    return
  }
  fetchDetail(id)
})
</script>
