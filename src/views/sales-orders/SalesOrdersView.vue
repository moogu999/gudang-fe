<template>
  <div>
    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('salesOrders.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('salesOrders.addSalesOrder')" @click="addSalesOrder" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
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
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`salesOrders.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft'"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editSalesOrder(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewSalesOrder(data.id)" />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Toolbar from 'primevue/toolbar'
import Tag from 'primevue/tag'
import dayjs from 'dayjs'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import type { Column, SalesOrderStatus } from '@/types'

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

function statusSeverity(status: SalesOrderStatus) {
  if (status === 'approved') return 'success'
  if (status === 'applied') return 'info'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

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

function editSalesOrder(id: number) {
  router.push(`/sales-orders/${id}/edit`)
}

function viewSalesOrder(id: number) {
  router.push(`/sales-orders/${id}`)
}
</script>
