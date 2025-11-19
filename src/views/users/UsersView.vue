<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Users</h1>

    <Toolbar class="mb-5">
      <template #end>
        <Button label="New" icon="pi pi-plus" @click="toggleDialog"></Button>
      </template>
    </Toolbar>

    <Card>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.header === 'Created At'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <div v-if="col.header === 'Actions'">
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

    <Dialog class="min-w-100" header="Add User" v-model:visible="isDialogShown" @hide="onHide">
      <UserDialog @close="toggleDialog" />
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

const overlayGroup = 'usersView'

// Dialog
const isDialogShown = ref(false)
async function toggleDialog() {
  isDialogShown.value = !isDialogShown.value
  if (!isDialogShown.value) {
    await onHide()
  }
}

async function onHide() {
  await table.value.clearSearch()
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
