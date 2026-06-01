<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('goodsReceipts.viewGoodsReceipt') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <Message v-else-if="!receipt" severity="error">{{
      t('goodsReceipts.messages.notFound')
    }}</Message>

    <template v-else>
      <ResponsiveCard class="mb-6">
        <template #content>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <!-- Left column -->
            <div class="space-y-4">
              <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
                {{ t('goodsReceipts.sections.receiptInfo') }}
              </h3>

              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold">{{ t('goodsReceipts.fields.no') }}</span>
                <span class="text-sm">{{ receipt.no }}</span>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold">{{
                  t('goodsReceipts.fields.receiptDate')
                }}</span>
                <span class="text-sm">{{
                  dayjs(receipt.receiptDate).format(DateFormat.DATE)
                }}</span>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold">{{ t('goodsReceipts.fields.warehouse') }}</span>
                <span class="text-sm">{{ receipt.warehouseName || receipt.warehouseId }}</span>
              </div>
            </div>

            <!-- Right column -->
            <div class="space-y-4">
              <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
                {{ t('goodsReceipts.sections.typeInfo') }}
              </h3>

              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold">{{
                  t('goodsReceipts.fields.arrivalType')
                }}</span>
                <span class="text-sm capitalize">{{ arrivalTypeLabel }}</span>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold">{{ t('goodsReceipts.fields.stockType') }}</span>
                <span class="text-sm capitalize">{{ stockTypeLabel }}</span>
              </div>

              <div v-if="receipt.remark" class="flex flex-col gap-1">
                <span class="text-sm font-semibold">{{ t('goodsReceipts.fields.remark') }}</span>
                <span class="text-sm">{{ receipt.remark }}</span>
              </div>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <!-- Line Items -->
      <ResponsiveCard class="mb-6">
        <template #content>
          <h4 class="mb-3 text-sm font-semibold sm:text-base">
            {{ t('goodsReceipts.details.title') }}
          </h4>
          <DataTable
            :value="receipt.details"
            striped-rows
            responsive-layout="scroll"
            class="text-sm"
          >
            <Column header="#" style="width: 3rem">
              <template #body="{ index }">
                <span class="text-stone-400">{{ index + 1 }}</span>
              </template>
            </Column>
            <Column :header="t('goodsReceipts.details.productCode')">
              <template #body="{ data }">
                {{ data.productId }}
              </template>
            </Column>
            <Column :header="t('goodsReceipts.details.quantity')">
              <template #body="{ data }">
                {{ formatQty(data.quantity) }}
              </template>
            </Column>
            <Column :header="t('goodsReceipts.details.price')">
              <template #body="{ data }">
                {{ formatNumber(data.price) }}
              </template>
            </Column>
            <Column :header="t('goodsReceipts.details.subAmount')">
              <template #body="{ data }">
                {{ formatNumber(data.subAmount) }}
              </template>
            </Column>
            <template #empty>{{ t('goodsReceipts.details.empty') }}</template>
          </DataTable>
        </template>
      </ResponsiveCard>

      <!-- Summary -->
      <ResponsiveCard>
        <template #content>
          <div class="flex justify-end">
            <div class="w-full rounded-lg border border-stone-200 p-4 lg:w-1/2">
              <h4 class="mb-3 text-sm font-semibold sm:text-base">
                {{ t('goodsReceipts.summary.title') }}
              </h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>{{ t('goodsReceipts.summary.subtotal') }}</span>
                  <span>{{ formatNumber(receipt.subtotalAmount) }}</span>
                </div>
                <div class="flex justify-between text-orange-600">
                  <span>{{ t('goodsReceipts.summary.tax') }}</span>
                  <span>{{ formatNumber(receipt.taxAmount) }}</span>
                </div>
                <Divider />
                <div class="flex justify-between text-lg">
                  <span class="font-bold">{{ t('goodsReceipts.summary.total') }}</span>
                  <span class="font-bold text-green-600">{{
                    formatNumber(receipt.totalAmount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </ResponsiveCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import dayjs from 'dayjs'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { GoodsReceiptsService, commonErrorToast } from '@/services'
import type { GoodsReceiptResponse } from '@/types'
import DateFormat from '@/constants/dateFormat'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'goodsReceiptDetail'
const isLoading = ref(true)
const receipt = ref<GoodsReceiptResponse | null>(null)

const arrivalTypeLabel = computed(() => {
  const map: Record<string, string> = {
    regular: t('goodsReceipts.arrivalTypes.regular'),
    consignment: t('goodsReceipts.arrivalTypes.consignment'),
    bonus: t('goodsReceipts.arrivalTypes.bonus'),
    transfer: t('goodsReceipts.arrivalTypes.transfer'),
    return_in: t('goodsReceipts.arrivalTypes.returnIn'),
    other: t('goodsReceipts.arrivalTypes.other'),
  }
  return receipt.value ? (map[receipt.value.arrivalType] ?? receipt.value.arrivalType) : ''
})

const stockTypeLabel = computed(() => {
  const map: Record<string, string> = {
    good: t('goodsReceipts.stockTypes.good'),
    bad: t('goodsReceipts.stockTypes.bad'),
  }
  return receipt.value ? (map[receipt.value.stockType] ?? receipt.value.stockType) : ''
})

function formatQty(value: string): string {
  const n = parseFloat(value)
  return isNaN(n)
    ? value
    : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(
        n,
      )
}

function formatNumber(value: string): string {
  const n = parseFloat(value)
  return isNaN(n)
    ? value
    : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        n,
      )
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/goods-receipts')
    return
  }

  try {
    receipt.value = await GoodsReceiptsService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
})
</script>
