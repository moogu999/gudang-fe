<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('arClearings.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('arClearings.addArClearing')" @click="addArClearing" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'customerName'">{{ data.customerName || '-' }}</span>
            <span v-else-if="col.field === 'clearingDate'">{{
              dayjs(data.clearingDate).format(DateFormat.DATE)
            }}</span>
            <span v-else-if="col.field === 'availableAmount'">{{
              formatNumber(parseFloat(data.availableAmount || '0'))
            }}</span>
            <span v-else-if="col.field === 'allocatedAmount'">{{
              formatNumber(parseFloat(data.allocatedAmount || '0'))
            }}</span>
            <span
              v-else-if="col.field === 'unallocatedAmount'"
              :class="
                parseFloat(data.unallocatedAmount || '0') === 0
                  ? 'text-stone-700'
                  : 'text-amber-600'
              "
              >{{ formatNumber(parseFloat(data.unallocatedAmount || '0')) }}</span
            >
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`arClearings.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <!-- Only a draft is editable or deletable; completed and voided are terminal. -->
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editArClearing(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewArClearing(data.id)" />
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
import { ArClearingsService } from '@/services'
import type { Column } from '@/types'
import type { ArClearingStatus } from '@/types/arClearing.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/ar-clearings')

const overlayGroup = 'arClearingsView'
const table = ref()
const url = API_ENDPOINTS.GEN_AR_CLEARINGS

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('arClearings.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'customerName',
    header: t('arClearings.fields.customer'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'clearingDate',
    header: t('arClearings.fields.clearingDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'availableAmount',
    header: t('arClearings.summary.available'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'allocatedAmount',
    header: t('arClearings.summary.allocated'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'unallocatedAmount',
    header: t('arClearings.summary.unallocated'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'status',
    header: t('common.labels.status'),
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

function statusSeverity(status: ArClearingStatus) {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  return 'info'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function addArClearing() {
  router.push('/ar-clearings/create')
}

function editArClearing(id: number) {
  router.push(`/ar-clearings/${id}/edit`)
}

function viewArClearing(id: number) {
  router.push(`/ar-clearings/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'AR clearing',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ArClearingsService.remove(id))
}
</script>
