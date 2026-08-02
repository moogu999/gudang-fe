<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('goodsReceipts.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('goodsReceipts.addGoodsReceipt')" @click="addGoodsReceipt" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns" :search-transform="toSearchTerm">
          <template #content="{ col, data }">
            <span v-if="col.field === 'receiptDate'">
              {{ dayjs(data.receiptDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'warehouseName'">
              {{ data.warehouseName || '-' }}
            </span>
            <span v-else-if="col.field === 'arrivalType'">
              {{ arrivalTypeLabel(data.arrivalType) }}
            </span>
            <span v-else-if="col.field === 'totalAmount'">
              {{ formatNumber(parseFloat(data.totalAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`goodsReceipts.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editGoodsReceipt(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewGoodsReceipt(data.id)" />
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                @click="onDeleteClick(data.id)"
              />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Toolbar from 'primevue/toolbar'
import Tag from 'primevue/tag'
import dayjs from 'dayjs'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import { useGoodsReceiptLabels, useConfirmDelete, usePermissions } from '@/composables'
import { GoodsReceiptsService } from '@/services'
import type { Column } from '@/types'
import type { GoodsReceiptStatus } from '@/types/goodsReceipt.type'

const { t } = useI18n()
const router = useRouter()
const { arrivalTypeLabel, toSearchTerm } = useGoodsReceiptLabels()
const { canWrite } = usePermissions('/goods-receipts')

const overlayGroup = 'goodsReceiptsView'
const table = ref()
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
    hideOnMobile: true,
  },
  {
    field: 'totalAmount',
    header: t('goodsReceipts.fields.total'),
    sortable: true,
    exportable: true,
    filterable: false,
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

function statusSeverity(status: GoodsReceiptStatus) {
  if (status === 'approved') return 'success'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function addGoodsReceipt() {
  router.push('/goods-receipts/create')
}

function editGoodsReceipt(id: number) {
  router.push(`/goods-receipts/${id}/edit`)
}

function viewGoodsReceipt(id: number) {
  router.push(`/goods-receipts/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'goods receipt',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => GoodsReceiptsService.remove(id))
}
</script>
