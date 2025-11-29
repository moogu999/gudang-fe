<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('companies.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addCompany" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <span v-if="col.field === 'updatedAt' && data[col.field]">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editCompany(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewCompany(data)"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>

    <Dialog
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw'
      }"
      :style="{ width: '80vw', maxWidth: '1200px' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl'
      }"
    >
      <CompanyDialog :mode="dialogMode" :company="company" @close="close" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DateFormat from '@/constants/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import type { Column } from '@/types/table.type'
import dayjs from 'dayjs'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import Toolbar from 'primevue/toolbar'
import Dialog from 'primevue/dialog'
import { ref, computed } from 'vue'
import { CompaniesService } from '@/services/companies.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import CompanyDialog from './CompanyDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Company } from '@/types/company.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'companiesView'

// Permissions
const { canWrite } = usePermissions('/companies')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const company = ref<Company | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('companies.addCompany')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('companies.editCompany')
  } else {
    return t('companies.viewCompany')
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

function addCompany() {
  dialogMode.value = DialogMode.ADD
  company.value = undefined
  open()
}

function editCompany(selectedCompany: Company) {
  dialogMode.value = DialogMode.EDIT
  company.value = selectedCompany
  open()
}

function viewCompany(selectedCompany: Company) {
  dialogMode.value = DialogMode.VIEW
  company.value = selectedCompany
  open()
}

// Table
const url = API_ENDPOINTS.GEN_COMPANIES

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('companies.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'name',
    header: t('companies.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'address',
    header: t('companies.fields.address'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'taxId',
    header: t('companies.fields.taxId'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'currency.code',
    underlyingField: 'currencyId',
    header: t('companies.fields.currency'),
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
  entityName: 'company',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => CompaniesService.delete(id))
}
</script>
