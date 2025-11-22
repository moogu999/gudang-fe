<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Users</h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <Button label="New" icon="pi pi-plus" @click="addUser"></Button>
      </template>
    </Toolbar>

    <Card>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.header === 'Created At'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <div class="flex items-center" v-if="col.header === 'Actions' && canWrite">
              <Button
                icon="pi pi-pen-to-square"
                severity="contrast"
                @click="editUser(data)"
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
      <UserDialog :mode="dialogMode" :user="user" @close="close" />
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
import { UsersService } from '@/services/users.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import UserDialog from './UserDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { User } from '@/types/user.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'

const overlayGroup = 'usersView'

// Permissions
const { canWrite } = usePermissions('/users')

// Table
const table = ref()

// Dialog
const dialogHeader = ref('Add User')
const dialogMode = ref(DialogMode.ADD)
const user = ref<User | undefined>(undefined)

const {
  isVisible: isDialogShown,
  open,
  close,
} = useDialog({
  onClose: async () => {
    await table.value.clearSearch()
  },
})

function addUser() {
  dialogHeader.value = 'Add User'
  dialogMode.value = DialogMode.ADD
  user.value = undefined
  open()
}

function editUser(selectedUser: User) {
  dialogHeader.value = 'Edit User'
  dialogMode.value = DialogMode.EDIT
  user.value = selectedUser
  open()
}

// Table
const url = API_ENDPOINTS.GEN_USERS

const columns: Column[] = [
  {
    field: 'email',
    header: 'Email',
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
    field: 'createdBy',
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
  entityName: 'user',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => UsersService.delete(id))
}
</script>
