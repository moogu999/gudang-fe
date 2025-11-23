<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Departments</h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <Button label="New" icon="pi pi-plus" @click="addDepartment"></Button>
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
                  @click="editDepartment(data)"
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
                  @click="viewDepartment(data)"
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
      class="w-[90vw] max-w-[1200px]"
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
    >
      <DepartmentDialog :mode="dialogMode" :department="department" @close="close" />
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
import { DepartmentsService } from '@/services/departments.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import DepartmentDialog from './DepartmentDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Department } from '@/types/department.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'

const overlayGroup = 'departmentsView'

// Permissions
const { canWrite } = usePermissions('/departments')

// Table
const table = ref()

// Dialog
const dialogHeader = ref('Add Department')
const dialogMode = ref(DialogMode.ADD)
const department = ref<Department | undefined>(undefined)

const {
  isVisible: isDialogShown,
  open,
  close,
} = useDialog({
  onClose: async () => {
    await table.value.clearSearch()
  },
})

function addDepartment() {
  dialogHeader.value = 'Add Department'
  dialogMode.value = DialogMode.ADD
  department.value = undefined
  open()
}

function editDepartment(selectedDepartment: Department) {
  dialogHeader.value = 'Edit Department'
  dialogMode.value = DialogMode.EDIT
  department.value = selectedDepartment
  open()
}

function viewDepartment(selectedDepartment: Department) {
  dialogHeader.value = 'View Department'
  dialogMode.value = DialogMode.VIEW
  department.value = selectedDepartment
  open()
}

// Table
const url = API_ENDPOINTS.GEN_DEPARTMENTS

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
  entityName: 'department',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => DepartmentsService.delete(id))
}
</script>
