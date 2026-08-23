<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('creditDebitNotes.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('creditDebitNotes.addCreditDebitNote')" @click="addNote" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'noteType'">
              <Tag
                :severity="data.noteType === 'credit' ? 'success' : 'danger'"
                :value="t(`creditDebitNotes.type.${data.noteType}`)"
              />
            </span>
            <span v-else-if="col.field === 'supplierName'">
              {{ data.supplierName || '-' }}
            </span>
            <span v-else-if="col.field === 'noteDate'">
              {{ dayjs(data.noteDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'correctionCategoryName'">
              {{ data.correctionCategoryName || '-' }}
            </span>
            <span v-else-if="col.field === 'signedTotalAmount'">
              {{ formatNumber(parseFloat(data.signedTotalAmount || '0')) }}
            </span>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status"
                :severity="statusSeverity(data.status)"
                :value="t(`creditDebitNotes.status.${data.status}`)"
              />
            </div>
            <div v-else-if="col.header === t('common.labels.actions')" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="editNote(data.id)"
              />
              <Button icon="pi pi-eye" size="small" text @click="viewNote(data.id)" />
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
import { CreditDebitNotesService } from '@/services'
import type { Column } from '@/types'
import type { CreditDebitNoteStatus } from '@/types/creditDebitNote.type'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/credit-debit-notes')

const overlayGroup = 'creditDebitNotesView'
const table = ref()
const url = API_ENDPOINTS.GEN_CREDIT_DEBIT_NOTES

const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('creditDebitNotes.fields.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'noteType',
    header: t('creditDebitNotes.fields.noteType'),
    sortable: false,
    exportable: true,
    filterable: true,
  },
  {
    field: 'supplierName',
    header: t('creditDebitNotes.fields.supplier'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'supplierNoteNo',
    header: t('creditDebitNotes.fields.supplierNoteNo'),
    sortable: false,
    exportable: true,
    filterable: true,
    hideOnMobile: true,
  },
  {
    field: 'noteDate',
    header: t('creditDebitNotes.fields.noteDate'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'correctionCategoryName',
    header: t('creditDebitNotes.fields.correctionCategory'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'signedTotalAmount',
    header: t('creditDebitNotes.fields.total'),
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

function statusSeverity(status: CreditDebitNoteStatus) {
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

function addNote() {
  router.push('/credit-debit-notes/create')
}

function editNote(id: number) {
  router.push(`/credit-debit-notes/${id}/edit`)
}

function viewNote(id: number) {
  router.push(`/credit-debit-notes/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'credit/debit note',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => CreditDebitNotesService.remove(id))
}
</script>
