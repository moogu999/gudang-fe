<template>
  <!-- A tab of GiroView (/giro); the page title and the Add action live in its header. -->
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'depositDate'">
              {{ dayjs(data.depositDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'bankAccountLabel'">{{
              data.bankAccountLabel || '-'
            }}</span>
            <span v-else-if="col.field === 'totalAmount'">
              {{ t('giroReceipts.summary.giroCount', { n: data.lineCount ?? 0 }) }} ·
              {{ formatNumber(parseFloat(data.totalAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'clearedAmount'" class="flex flex-col text-xs">
              <span class="text-green-700">{{
                formatNumber(parseFloat(data.clearedAmount || '0'))
              }}</span>
              <span v-if="parseFloat(data.rejectedAmount || '0') > 0" class="text-red-600">{{
                formatNumber(parseFloat(data.rejectedAmount || '0'))
              }}</span>
              <span v-if="data.status === 'deposited'" class="text-stone-500">{{
                t('giroClearings.labels.pendingCount', { n: data.pendingCount ?? 0 })
              }}</span>
            </div>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`giroClearings.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="router.push(`/giro-clearings/${data.id}/edit`)"
              />
              <Button
                icon="pi pi-eye"
                size="small"
                text
                @click="router.push(`/giro-clearings/${data.id}`)"
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
import { GiroClearingsService } from '@/services'
import type { Column } from '@/types'
import type { GiroClearingStatus } from '@/types/giroClearing.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/giro-clearings')

const overlayGroup = 'giroClearingsView'
const table = ref()
const url = API_ENDPOINTS.GEN_GIRO_CLEARINGS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('giroClearings.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'depositDate',
    header: t('giroClearings.fields.depositDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'bankAccountLabel',
    header: t('giroClearings.fields.bankAccount'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'totalAmount',
    header: t('giroClearings.fields.total'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'clearedAmount',
    header: t('giroClearings.fields.outcome'),
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

function statusSeverity(status: GiroClearingStatus) {
  if (status === 'completed') return 'success'
  if (status === 'deposited') return 'info'
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
  entityName: 'giro clearing',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => GiroClearingsService.remove(id))
}
</script>
