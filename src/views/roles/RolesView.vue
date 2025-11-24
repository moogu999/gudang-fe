<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('roles.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <Button :label="t('common.actions.add')" icon="pi pi-plus" @click="addRole"></Button>
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
              </template>
              <template v-else>
                <Button
                  icon="pi pi-eye"
                  severity="contrast"
                  @click="viewRole(data)"
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
      :pt="{
        header: 'text-base sm:text-lg md:text-xl'
      }"
    >
      <RoleDialog :mode="dialogMode" :role="role" @close="close" />
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
import RoleDialog from './RoleDialog.vue'
import { RolesService } from '@/services/roles.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import type { Role } from '@/types/role.type'
import DialogMode from '@/constants/dialogMode'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'

const { t } = useI18n()

const overlayGroup = 'rolesView'

// Permissions
const { canWrite } = usePermissions('/roles')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const role = ref<Role | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('roles.addRole')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('roles.editRole')
  } else {
    return t('roles.viewRole')
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

function addRole() {
  dialogMode.value = DialogMode.ADD
  role.value = undefined
  open()
}

function editRole(selectedRole: Role) {
  dialogMode.value = DialogMode.EDIT
  role.value = selectedRole
  open()
}

function viewRole(selectedRole: Role) {
  dialogMode.value = DialogMode.VIEW
  role.value = selectedRole
  open()
}

// Table
const url = API_ENDPOINTS.GEN_ROLES

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('common.labels.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'description',
    header: t('common.labels.description'),
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-50',
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
  entityName: 'role',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => RolesService.delete(id))
}
</script>
