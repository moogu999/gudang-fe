<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('salesOrders.title') }}
      </h1>
      <Button :label="t('salesOrders.addSalesOrder')" icon="pi pi-plus" @click="addSalesOrder" />
    </div>

    <TableComponent :url="url" :columns="columns">
      <template #content="{ col, data }">
        <span v-if="col.field === 'customer.name'">
          {{ data.customer?.name || '-' }}
        </span>
        <span v-else-if="col.field === 'orderDate'">
          {{ dayjs(data.orderDate).format(DateFormat.DATE) }}
        </span>
        <span v-else-if="col.field === 'totalAmount'">
          {{ formatCurrency(parseFloat(data.totalAmount)) }}
        </span>
        <div v-else-if="col.field === 'status'" class="flex gap-2">
          <Tag v-if="data.isPaid" severity="success" :value="t('common.labels.paid')" />
          <Tag v-if="data.isCash" severity="info" :value="t('common.labels.cash')" />
        </div>
        <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
          <Button icon="pi pi-eye" size="small" text @click="viewSalesOrder(data.id)" />
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
import Tag from 'primevue/tag'
import dayjs from 'dayjs'
import TableComponent from '@/components/table/TableComponent.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import type { Column } from '@/types'

const { t } = useI18n()
const router = useRouter()

const url = API_ENDPOINTS.GEN_SALES_ORDER_HEADERS

// Table columns
const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('salesOrders.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'customer.name',
    header: t('salesOrders.fields.customer'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'orderDate',
    header: t('salesOrders.fields.orderDate'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'totalAmount',
    header: t('salesOrders.fields.totalAmount'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'status',
    header: t('common.labels.status'),
    sortable: false,
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

// Format number with decimals
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function addSalesOrder() {
  router.push('/sales-orders/create')
}

function viewSalesOrder(id: number) {
  router.push(`/sales-orders/${id}`)
}
</script>
