<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('salesOrganizations.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addSalesOrganization" />
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
              @edit="editSalesOrganization(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewSalesOrganization(data)"
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
      :style="{ width: '50vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl'
      }"
    >
      <SalesOrganizationDialog
        :mode="dialogMode"
        :sales-organization="salesOrganization"
        @close="close"
      />
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
import { SalesOrganizationsService } from '@/services/salesOrganizations.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import SalesOrganizationDialog from './SalesOrganizationDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { SalesOrganization } from '@/types/salesOrganization.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'salesOrganizationsView'

// Permissions
const { canWrite } = usePermissions('/sales-organizations')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const salesOrganization = ref<SalesOrganization | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('salesOrganizations.addSalesOrganization')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('salesOrganizations.editSalesOrganization')
  } else {
    return t('salesOrganizations.viewSalesOrganization')
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

function addSalesOrganization() {
  dialogMode.value = DialogMode.ADD
  salesOrganization.value = undefined
  open()
}

function editSalesOrganization(selectedSalesOrganization: SalesOrganization) {
  dialogMode.value = DialogMode.EDIT
  salesOrganization.value = selectedSalesOrganization
  open()
}

function viewSalesOrganization(selectedSalesOrganization: SalesOrganization) {
  dialogMode.value = DialogMode.VIEW
  salesOrganization.value = selectedSalesOrganization
  open()
}

// Table
const url = API_ENDPOINTS.GEN_SALES_ORGANIZATIONS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('salesOrganizations.fields.name'),
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
  entityName: 'sales organization',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => SalesOrganizationsService.delete(id))
}
</script>
