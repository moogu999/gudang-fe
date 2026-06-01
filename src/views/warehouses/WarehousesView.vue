<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('warehouses.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addWarehouse" />
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
              @edit="editWarehouse(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewWarehouse(data)"
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
        '640px': '90vw',
      }"
      :style="{ width: '50vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
    >
      <WarehouseDialog :mode="dialogMode" :warehouse="warehouse" @close="close" />
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
import { WarehousesService } from '@/services/warehouses.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import WarehouseDialog from './WarehouseDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Warehouse } from '@/types/warehouse.type'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'warehousesView'

const { canWrite } = usePermissions('/warehouses')

const table = ref()

const dialogMode = ref(DialogMode.ADD)
const warehouse = ref<Warehouse | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('warehouses.addWarehouse')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('warehouses.editWarehouse')
  } else {
    return t('warehouses.viewWarehouse')
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

function addWarehouse() {
  dialogMode.value = DialogMode.ADD
  warehouse.value = undefined
  open()
}

function editWarehouse(selectedWarehouse: Warehouse) {
  dialogMode.value = DialogMode.EDIT
  warehouse.value = selectedWarehouse
  open()
}

function viewWarehouse(selectedWarehouse: Warehouse) {
  dialogMode.value = DialogMode.VIEW
  warehouse.value = selectedWarehouse
  open()
}

const url = API_ENDPOINTS.GEN_WAREHOUSES

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('warehouses.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'name',
    header: t('warehouses.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'branchCode',
    underlyingField: 'branchId',
    header: t('warehouses.fields.branch'),
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
    field: 'createdByEmail',
    underlyingField: 'createdBy',
    header: t('common.labels.createdBy'),
    exportable: true,
    sortable: false,
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

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'warehouse',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => WarehousesService.delete(id))
}
</script>
