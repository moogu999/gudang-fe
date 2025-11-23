<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">{{ t('users.title') }}</h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <Button :label="t('common.actions.add')" icon="pi pi-plus" @click="addUser"></Button>
      </template>
    </Toolbar>

    <Card>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <div class="flex items-center" v-if="col.field === ''">
              <template v-if="canWrite">
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
              </template>
              <template v-else>
                <Button
                  icon="pi pi-eye"
                  severity="contrast"
                  @click="viewUser(data)"
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
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw'
      }"
      :style="{ width: '50vw' }"
    >
      <UserDialog :mode="dialogMode" :user="user" @close="close" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DateFormat from '@/constants/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import type { Column } from '@/types/table.type'
import dayjs from 'dayjs'
import Card from 'primevue/card'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { ref, computed } from 'vue'
import { UsersService } from '@/services/users.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import UserDialog from './UserDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { User } from '@/types/user.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'

const { t } = useI18n()

const overlayGroup = 'usersView'

// Permissions
const { canWrite } = usePermissions('/users')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const user = ref<User | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('users.addUser')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('users.editUser')
  } else {
    return t('users.viewUser')
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

function addUser() {
  dialogMode.value = DialogMode.ADD
  user.value = undefined
  open()
}

function editUser(selectedUser: User) {
  dialogMode.value = DialogMode.EDIT
  user.value = selectedUser
  open()
}

function viewUser(selectedUser: User) {
  dialogMode.value = DialogMode.VIEW
  user.value = selectedUser
  open()
}

// Table
const url = API_ENDPOINTS.GEN_USERS

const columns = computed<Column[]>(() => [
  {
    field: 'email',
    header: t('users.fields.email'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'department.name',
    underlyingField: 'departmentId',
    header: t('users.fields.department'),
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
    field: 'createdBy',
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
  entityName: 'user',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => UsersService.delete(id))
}
</script>
