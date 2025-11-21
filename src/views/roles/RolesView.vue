<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Roles</h1>

    <Toolbar class="mb-5">
      <template #end>
        <Button label="New" icon="pi pi-plus" @click="addRole"></Button>
      </template>
    </Toolbar>

    <Card>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.header === 'Created At'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <div class="flex items-center" v-if="col.header === 'Actions'">
              <Button
                icon="pi pi-pen-to-square"
                severity="contrast"
                @click="editRole(data)"
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
      <RoleDialog :mode="dialogMode" :role="role" @close="close" />
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
import RoleDialog from './RoleDialog.vue'
import { RolesService } from '@/services/roles.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import type { Role } from '@/types/role.type'
import DialogMode from '@/constants/dialogMode'
import { useConfirmDelete, useDialog } from '@/composables'

const overlayGroup = 'rolesView'

// Table
const table = ref()

// Dialog
const dialogHeader = ref('Add Role')
const dialogMode = ref(DialogMode.ADD)
const role = ref<Role | undefined>(undefined)

const { isVisible: isDialogShown, open, close } = useDialog({
  onClose: async () => {
    await table.value.clearSearch()
  },
})

function addRole() {
  dialogHeader.value = 'Add Role'
  dialogMode.value = DialogMode.ADD
  role.value = undefined
  open()
}

function editRole(selectedRole: Role) {
  dialogHeader.value = 'Edit Role'
  dialogMode.value = DialogMode.EDIT
  role.value = selectedRole
  open()
}

// Table
const url = '/gen/v1/roles'

const columns: Column[] = [
  {
    field: 'name',
    header: 'Name',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'description',
    header: 'Description',
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-50',
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
  entityName: 'role',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => RolesService.delete(id))
}
</script>
