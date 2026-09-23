<template>
  <!-- A tab of GiroView (/giro); the page title and the Add action live in its header. -->
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <div v-if="col.field === 'employeeName'" class="flex flex-wrap items-center gap-2">
              <span>{{ data.employeeName || '-' }}</span>
              <Tag v-if="data.employeeTypeName" severity="info" :value="data.employeeTypeName" />
            </div>
            <span v-else-if="col.field === 'receiptDate'">
              {{ dayjs(data.receiptDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'recordedAmount'">
              {{ t('giroReceipts.summary.giroCount', { n: data.recordedCount ?? 0 }) }} ·
              {{ formatNumber(parseFloat(data.recordedAmount || '0')) }}
            </span>
            <span
              v-else-if="col.field === 'varianceAmount'"
              :class="
                parseFloat(data.varianceAmount || '0') === 0 && !data.varianceCount
                  ? 'text-green-700'
                  : 'text-amber-600'
              "
            >
              {{ data.varianceCount > 0 ? `+${data.varianceCount}` : data.varianceCount }} ·
              {{ formatNumber(parseFloat(data.varianceAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`giroReceipts.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="router.push(`/giro-receipts/${data.id}/edit`)"
              />
              <Button
                icon="pi pi-eye"
                size="small"
                text
                @click="router.push(`/giro-receipts/${data.id}`)"
              />
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
import Tag from 'primevue/tag'
import dayjs from 'dayjs'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import { useConfirmDelete, usePermissions } from '@/composables'
import { GiroReceiptsService } from '@/services'
import type { Column } from '@/types'
import type { GiroReceiptStatus } from '@/types/giroReceipt.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/giro-receipts')

const overlayGroup = 'giroReceiptsView'
const table = ref()
const url = API_ENDPOINTS.GEN_GIRO_RECEIPTS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('giroReceipts.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'receiptDate',
    header: t('giroReceipts.fields.receiptDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'employeeName',
    header: t('giroReceipts.fields.employee'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'recordedAmount',
    header: t('giroReceipts.fields.recordedAmount'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'varianceAmount',
    header: t('giroReceipts.fields.varianceAmount'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
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

function statusSeverity(status: GiroReceiptStatus) {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  return 'secondary'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'giro receipt',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => GiroReceiptsService.remove(id))
}
</script>
