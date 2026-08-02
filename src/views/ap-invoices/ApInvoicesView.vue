<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('apInvoices.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('apInvoices.addApInvoice')" @click="addApInvoice" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'supplierName'">
              {{ data.supplierName || '-' }}
            </span>
            <span v-else-if="col.field === 'invoiceDate'">
              {{ dayjs(data.invoiceDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'dueDate'">
              {{ dayjs(data.dueDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'totalAmount'">
              {{ formatNumber(parseFloat(data.totalAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`apInvoices.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editApInvoice(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewApInvoice(data.id)" />
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
import { useConfirmDelete, usePermissions } from '@/composables'
import { ApInvoicesService } from '@/services'
import type { Column } from '@/types'
import type { ApInvoiceStatus } from '@/types/apInvoice.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/ap-invoices')

const overlayGroup = 'apInvoicesView'
const table = ref()
const url = API_ENDPOINTS.GEN_AP_INVOICE_HEADERS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('apInvoices.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'supplierName',
    header: t('apInvoices.fields.supplier'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'supplierInvoiceNo',
    header: t('apInvoices.fields.supplierInvoiceNo'),
    sortable: false,
    exportable: true,
    filterable: true,
    hideOnMobile: true,
  },
  {
    field: 'invoiceDate',
    header: t('apInvoices.fields.invoiceDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'dueDate',
    header: t('apInvoices.fields.dueDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'totalAmount',
    header: t('apInvoices.summary.total'),
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

function statusSeverity(status: ApInvoiceStatus) {
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

function addApInvoice() {
  router.push('/ap-invoices/create')
}

function editApInvoice(id: number) {
  router.push(`/ap-invoices/${id}/edit`)
}

function viewApInvoice(id: number) {
  router.push(`/ap-invoices/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'AP invoice',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ApInvoicesService.remove(id))
}
</script>
