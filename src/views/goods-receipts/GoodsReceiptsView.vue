<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('goodsReceipts.title') }}
      </h1>
      <Button
        :label="t('goodsReceipts.addGoodsReceipt')"
        icon="pi pi-plus"
        @click="addGoodsReceipt"
      />
    </div>

    <TableComponent :url="url" :columns="columns">
      <template #content="{ col, data }">
        <span v-if="col.field === 'receiptDate'">
          {{ dayjs(data.receiptDate).format(DateFormat.DATE) }}
        </span>
        <span v-else-if="col.field === 'warehouseName'">
          {{ data.warehouseName || '-' }}
        </span>
        <span v-else-if="col.field === 'arrivalType'" class="capitalize">
          {{ data.arrivalType || '-' }}
        </span>
        <span v-else-if="col.field === 'stockType'" class="capitalize">
          {{ data.stockType || '-' }}
        </span>
        <span v-else-if="col.field === 'totalAmount'">
          {{ formatNumber(parseFloat(data.totalAmount || '0')) }}
        </span>
        <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
          <Button icon="pi pi-eye" size="small" text @click="viewGoodsReceipt(data.id)" />
        </div>
      </template>
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import dayjs from 'dayjs'
import TableComponent from '@/components/table/TableComponent.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import type { Column } from '@/types'

const { t } = useI18n()
const router = useRouter()

const url = API_ENDPOINTS.GEN_GOODS_RECEIPT_HEADERS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('goodsReceipts.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'receiptDate',
    header: t('goodsReceipts.fields.receiptDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'warehouseName',
    header: t('goodsReceipts.fields.warehouse'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'arrivalType',
    header: t('goodsReceipts.fields.arrivalType'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'stockType',
    header: t('goodsReceipts.fields.stockType'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'totalAmount',
    header: t('goodsReceipts.fields.total'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'actions',
    header: t('common.labels.actions'),
    sortable: false,
    exportable: false,
    filterable: false,
  },
])

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function addGoodsReceipt() {
  router.push('/goods-receipts/create')
}

function viewGoodsReceipt(id: number) {
  router.push(`/goods-receipts/${id}`)
}
</script>
