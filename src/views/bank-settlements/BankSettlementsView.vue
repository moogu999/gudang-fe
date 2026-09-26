<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('bankSettlements.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton
          :label="t('bankSettlements.addBankSettlement')"
          @click="addBankSettlement"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <div v-if="col.field === 'no'" class="flex flex-wrap items-center gap-2">
              <span>{{ data.no }}</span>
              <Tag
                v-if="data.splitFromNo"
                severity="secondary"
                :value="t('bankSettlements.labels.splitFrom', { no: data.splitFromNo })"
              />
            </div>
            <span v-else-if="col.field === 'bankAccountLabel'">{{
              data.bankAccountLabel || '-'
            }}</span>
            <span v-else-if="col.field === 'periodStart'">
              {{ dayjs(data.periodStart).format(DateFormat.DATE) }} –
              {{ dayjs(data.periodEnd).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'totalCreditAmount'">
              {{ formatNumber(parseFloat(data.totalCreditAmount || '0')) }}
            </span>
            <span
              v-else-if="col.field === 'untaggedAmount'"
              :class="
                parseFloat(data.untaggedAmount || '0') === 0 ? 'text-stone-700' : 'text-amber-600'
              "
            >
              {{ formatNumber(parseFloat(data.untaggedAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`bankSettlements.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <!-- Completed is terminal — no Edit, no Delete. -->
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editBankSettlement(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewBankSettlement(data.id)" />
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
import { BankSettlementsService } from '@/services'
import type { Column } from '@/types'
import type { BankSettlementStatus } from '@/types/bankSettlement.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/bank-settlements')

const overlayGroup = 'bankSettlementsView'
const table = ref()
const url = API_ENDPOINTS.GEN_BANK_SETTLEMENTS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('bankSettlements.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'bankAccountLabel',
    header: t('bankSettlements.fields.bankAccount'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'periodStart',
    header: t('bankSettlements.fields.period'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'totalCreditAmount',
    header: t('bankSettlements.fields.totalCredit'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'untaggedAmount',
    header: t('bankSettlements.summary.untagged'),
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

function statusSeverity(status: BankSettlementStatus) {
  return status === 'completed' ? 'success' : 'secondary'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function addBankSettlement() {
  router.push('/bank-settlements/create')
}

function editBankSettlement(id: number) {
  router.push(`/bank-settlements/${id}/edit`)
}

function viewBankSettlement(id: number) {
  router.push(`/bank-settlements/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'bank settlement',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => BankSettlementsService.remove(id))
}
</script>
