<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Divisions</h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <Button label="New" icon="pi pi-plus" @click="addDivision"></Button>
      </template>
    </Toolbar>

    <Card>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.header === 'Created At'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <span v-if="col.header === 'Updated At' && data[col.field]">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <div class="flex items-center" v-if="col.header === 'Actions'">
              <template v-if="canWrite">
                <Button
                  icon="pi pi-pen-to-square"
                  severity="contrast"
                  @click="editDivision(data)"
                  text
                  rounded
                  outlined
                />

                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  @click="onDeleteClick(data['id'])"
                  text
                  rounded
                  outlined
                />
              </template>
              <template v-else>
                <Button
                  icon="pi pi-eye"
                  severity="contrast"
                  @click="viewDivision(data)"
                  text
                  rounded
                  outlined
                />
              </template>
            </div>
          </template>
        </TableComponent>
      </template>
    </Card>

    <Dialog
      class="min-w-100"
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
    >
      <DivisionDialog :mode="dialogMode" :division="division" @close="close" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import DateFormat from '@/constants/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import type { Column } from '@/types/table.type'
import dayjs from 'dayjs'
import Card from 'primevue/card'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { ref } from 'vue'
import { DivisionsService } from '@/services/divisions.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import DivisionDialog from './DivisionDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Division } from '@/types/division.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'

const overlayGroup = 'divisionsView'

// Permissions
const { canWrite } = usePermissions('/divisions')

// Table
const table = ref()

// Dialog
const dialogHeader = ref('Add Division')
const dialogMode = ref(DialogMode.ADD)
const division = ref<Division | undefined>(undefined)

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
  dialogHeader.value = 'Add Division'
  dialogMode.value = DialogMode.ADD
  division.value = undefined
  open()
}

function editDivision(selectedDivision: Division) {
  dialogHeader.value = 'Edit Division'
  dialogMode.value = DialogMode.EDIT
  division.value = selectedDivision
  open()
}

function viewDivision(selectedDivision: Division) {
  dialogHeader.value = 'View Division'
  dialogMode.value = DialogMode.VIEW
  division.value = selectedDivision
  open()
}

// Table
const url = API_ENDPOINTS.GEN_DIVISIONS

const columns: Column[] = [
  {
    field: 'name',
    header: 'Name',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'createdAt',
    header: 'Created At',
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
  },
  {
    field: 'createdByUser.email',
    underlyingField: 'createdBy',
    header: 'Created By',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: '',
    header: 'Actions',
    exportable: false,
    sortable: false,
    filterable: false,
  },
]

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
