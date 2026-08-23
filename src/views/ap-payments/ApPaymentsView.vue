<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('apPayments.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('apPayments.addApPayment')" @click="addApPayment" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'supplierName'">
              {{ data.supplierName || '-' }}
            </span>
            <span v-else-if="col.field === 'paymentDate'">
              {{ dayjs(data.paymentDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'paymentMethodName'">
              {{ data.paymentMethodName || '-' }}
            </span>
            <span v-else-if="col.field === 'netAmount'">
              {{ formatNumber(parseFloat(data.netAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`apPayments.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editApPayment(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewApPayment(data.id)" />
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
import { ApPaymentsService } from '@/services'
import type { Column } from '@/types'
import type { ApPaymentStatus } from '@/types/apPayment.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/ap-payments')

const overlayGroup = 'apPaymentsView'
const table = ref()
const url = API_ENDPOINTS.GEN_AP_PAYMENTS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('apPayments.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'paymentDate',
    header: t('apPayments.fields.paymentDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'supplierName',
    header: t('apPayments.fields.supplier'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'paymentMethodName',
    header: t('apPayments.fields.paymentMethod'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'netAmount',
    header: t('apPayments.summary.net'),
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

function statusSeverity(status: ApPaymentStatus) {
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

function addApPayment() {
  router.push('/ap-payments/create')
}

function editApPayment(id: number) {
  router.push(`/ap-payments/${id}/edit`)
}

function viewApPayment(id: number) {
  router.push(`/ap-payments/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'AP payment',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ApPaymentsService.remove(id))
}
</script>
