<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('divisions.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addDivision" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <span v-if="col.field === 'updatedAt' && data[col.field]">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editDivision(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewDivision(data)"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>

    <Dialog
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw'
      }"
      :style="{ width: '50vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl'
      }"
    >
      <DivisionDialog :mode="dialogMode" :division="division" @close="close" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DateFormat from '@/constants/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import type { Column } from '@/types/table.type'
import dayjs from 'dayjs'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import Toolbar from 'primevue/toolbar'
import Dialog from 'primevue/dialog'
import { ref, computed } from 'vue'
import { DivisionsService } from '@/services/divisions.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import DivisionDialog from './DivisionDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Division } from '@/types/division.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'divisionsView'

// Permissions
const { canWrite } = usePermissions('/divisions')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const division = ref<Division | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('divisions.addDivision')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('divisions.editDivision')
  } else {
    return t('divisions.viewDivision')
  }
})

const {
  isVisible: isDialogShown,
  open,
  close,
} = useDialog({
  onClose: async () => {
    await table.value.clearSearch()
  },
})

function addDivision() {
  dialogMode.value = DialogMode.ADD
  division.value = undefined
  open()
}

function editDivision(selectedDivision: Division) {
  dialogMode.value = DialogMode.EDIT
  division.value = selectedDivision
  open()
}

function viewDivision(selectedDivision: Division) {
  dialogMode.value = DialogMode.VIEW
  division.value = selectedDivision
  open()
}

// Table
const url = API_ENDPOINTS.GEN_DIVISIONS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('common.labels.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'createdAt',
    header: t('common.labels.createdAt'),
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
  },
  {
    field: 'createdByUser.email',
    underlyingField: 'createdBy',
    header: t('common.labels.createdBy'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: '',
    header: t('common.labels.actions'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
])

// Delete confirmation
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'division',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => DivisionsService.delete(id))
}
</script>
