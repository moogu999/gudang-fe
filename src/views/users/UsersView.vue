<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Users</h1>

    <Toolbar class="mb-5">
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

            <div class="flex items-center" v-if="col.header === 'Actions'">
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
      @hide="onHide"
      v-model:visible="isDialogShown"
      modal
    >
      <UserDialog :mode="dialogMode" :user="user" @close="toggleDialog" />
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
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import type { User } from '@/types/user.type'
import DialogMode from '@/constants/dialogMode'

const overlayGroup = 'usersView'

// Dialog
const dialogHeader = ref('Add User')
const isDialogShown = ref(false)
const dialogMode = ref(DialogMode.ADD)
const user = ref<User | undefined>(undefined)

async function addUser() {
  dialogHeader.value = 'Add User'
  dialogMode.value = DialogMode.ADD
  user.value = undefined
  await toggleDialog()
}

async function onHide() {
  await table.value.clearSearch()
}

async function editUser(selectedUser: User) {
  dialogHeader.value = 'Edit User'
  dialogMode.value = DialogMode.EDIT
  user.value = selectedUser
  await toggleDialog()
}

async function toggleDialog() {
  isDialogShown.value = !isDialogShown.value
  if (!isDialogShown.value) {
    await onHide()
  }
}

// Table
const url = '/gen/v1/users'

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

const table = ref()

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
