<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Companies</h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <Button label="New" icon="pi pi-plus" @click="addCompany"></Button>
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

            <div class="flex items-center" v-if="col.header === 'Actions' && canWrite">
              <Button
                icon="pi pi-pen-to-square"
                severity="contrast"
                @click="editCompany(data)"
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
      class="w-[90vw] max-w-[1200px]"
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
    >
      <CompanyDialog :mode="dialogMode" :company="company" @close="close" />
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
import { CompaniesService } from '@/services/companies.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import CompanyDialog from './CompanyDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Company } from '@/types/company.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'

const overlayGroup = 'companiesView'

// Permissions
const { canWrite } = usePermissions('/companies')

// Table
const table = ref()

// Dialog
const dialogHeader = ref('Add Company')
const dialogMode = ref(DialogMode.ADD)
const company = ref<Company | undefined>(undefined)

const {
  isVisible: isDialogShown,
  open,
  close,
} = useDialog({
  onClose: async () => {
    await table.value.clearSearch()
  },
})

function addCompany() {
  dialogHeader.value = 'Add Company'
  dialogMode.value = DialogMode.ADD
  company.value = undefined
  open()
}

function editCompany(selectedCompany: Company) {
  dialogHeader.value = 'Edit Company'
  dialogMode.value = DialogMode.EDIT
  company.value = selectedCompany
  open()
}

// Table
const url = API_ENDPOINTS.GEN_COMPANIES

const columns: Column[] = [
  {
    field: 'code',
    header: 'Code',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'name',
    header: 'Name',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'address',
    header: 'Address',
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'taxId',
    header: 'Tax ID',
    exportable: true,
    sortable: false,
    filterable: false,
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
  entityName: 'company',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => CompaniesService.delete(id))
}
</script>
