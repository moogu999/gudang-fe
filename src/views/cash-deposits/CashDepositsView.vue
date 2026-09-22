<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('cashDeposits.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('cashDeposits.addCashDeposit')" @click="addCashDeposit" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <div v-if="col.field === 'employeeName'" class="flex flex-wrap items-center gap-2">
              <span>{{ data.employeeName || '-' }}</span>
              <Tag v-if="data.employeeTypeName" severity="info" :value="data.employeeTypeName" />
            </div>
            <span v-else-if="col.field === 'depositDate'">
              {{ dayjs(data.depositDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'actualAmount'">
              {{ formatNumber(parseFloat(data.actualAmount || '0')) }}
            </span>
            <span
              v-else-if="col.field === 'varianceAmount'"
              :class="
                parseFloat(data.varianceAmount || '0') === 0 ? 'text-green-700' : 'text-amber-600'
              "
            >
              {{ formatNumber(parseFloat(data.varianceAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`cashDeposits.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editCashDeposit(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewCashDeposit(data.id)" />
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
import { CashDepositsService } from '@/services'
import type { Column } from '@/types'
import type { CashDepositStatus } from '@/types/cashDeposit.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/cash-deposits')

const overlayGroup = 'cashDepositsView'
const table = ref()
const url = API_ENDPOINTS.GEN_CASH_DEPOSITS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('cashDeposits.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'depositDate',
    header: t('cashDeposits.fields.depositDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'employeeName',
    header: t('cashDeposits.fields.employee'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'actualAmount',
    header: t('cashDeposits.fields.actualAmount'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'varianceAmount',
    header: t('cashDeposits.fields.varianceAmount'),
    sortable: true,
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

function statusSeverity(status: CashDepositStatus) {
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

function addCashDeposit() {
  router.push('/cash-deposits/create')
}

function editCashDeposit(id: number) {
  router.push(`/cash-deposits/${id}/edit`)
}

function viewCashDeposit(id: number) {
  router.push(`/cash-deposits/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'cash deposit',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => CashDepositsService.remove(id))
}
</script>
