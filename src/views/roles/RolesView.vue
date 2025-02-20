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
      @hide="onHide"
      v-model:visible="isDialogShown"
      modal
    >
      <RoleDialog :mode="dialogMode" :role="role" @close="toggleDialog" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import DateFormat from '@/common/enum/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import type { Column } from '@/components/table/table.type'
import dayjs from 'dayjs'
import Card from 'primevue/card'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { ref } from 'vue'
import RoleDialog from './RoleDialog.vue'
import ApiService from '@/services/api'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ToastLife from '@/common/enum/toastLife'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import type { Role } from './role.type'
import DialogMode from '@/common/enum/dialogMode'
import { commonErrorToast } from '@/services/toast'

const overlayGroup = 'rolesView'

// Toast
const toast = useToast()

const confirm = useConfirm()

// Dialog
const dialogHeader = ref('Add Role')
const isDialogShown = ref(false)
const dialogMode = ref(DialogMode.ADD)
const role = ref<Role | undefined>(undefined)

async function addRole() {
  dialogHeader.value = 'Add Role'
  dialogMode.value = DialogMode.ADD
  role.value = undefined
  await toggleDialog()
}

async function onHide() {
  await table.value.clearSearch()
}

async function editRole(selectedRole: Role) {
  dialogHeader.value = 'Edit Role'
  dialogMode.value = DialogMode.EDIT
  role.value = selectedRole
  await toggleDialog()
}

async function toggleDialog() {
  isDialogShown.value = !isDialogShown.value
  if (!isDialogShown.value) {
    await onHide()
  }
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

const table = ref()

const deleteAcceptanceHandler = ref(async () => {})
function onDeleteClick(id: number) {
  deleteAcceptanceHandler.value = deleteRole(id)
  confirm.require({
    group: overlayGroup,
    message: 'Are you sure you want to delete the role?',
    header: 'Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'No',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Yes',
    },
  })
}

function deleteRole(id: number) {
  return async function () {
    try {
      await ApiService.delete(`/gen/v1/roles/${id}`)

      // @TODO make common success toast
      toast.add({
        severity: 'success',
        summary: 'Role is deleted.',
        life: ToastLife.TWO_SECONDS,
        group: overlayGroup,
      })
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }

    await table.value.clearSearch()
  }
}
</script>
