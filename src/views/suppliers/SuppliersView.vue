<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('suppliers.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addSupplier" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'code'" class="font-mono">{{ data[col.field] }}</span>

            <span v-if="col.field === 'paymentTerm.name'">{{ data.paymentTerm?.name ?? '-' }}</span>

            <span v-if="col.field === 'isActive'">
              <Tag
                :value="data[col.field] ? t('common.labels.active') : t('common.labels.inactive')"
                :severity="data[col.field] ? 'success' : 'secondary'"
              />
            </span>

            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editSupplier(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewSupplier(data)"
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
      <SupplierDialog :mode="dialogMode" :supplier="supplier" @close="close" />
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
import Tag from 'primevue/tag'
import { ref, computed } from 'vue'
import { SuppliersService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import SupplierDialog from './SupplierDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Supplier } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'suppliersView'

// Permissions
const { canWrite } = usePermissions('/suppliers')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const supplier = ref<Supplier | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('suppliers.addSupplier')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('suppliers.editSupplier')
  } else {
    return t('suppliers.viewSupplier')
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

function addSupplier() {
  dialogMode.value = DialogMode.ADD
  supplier.value = undefined
  open()
}

function editSupplier(selectedSupplier: Supplier) {
  dialogMode.value = DialogMode.EDIT
  supplier.value = selectedSupplier
  open()
}

function viewSupplier(selectedSupplier: Supplier) {
  dialogMode.value = DialogMode.VIEW
  supplier.value = selectedSupplier
  open()
}

// Table
const url = API_ENDPOINTS.SUPPLIERS

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('suppliers.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'name',
    header: t('suppliers.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'npwp',
    header: t('suppliers.fields.npwp'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'picName',
    header: t('suppliers.fields.picName'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'paymentTerm.name',
    header: t('suppliers.fields.paymentTerm'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: 'isActive',
    header: t('common.labels.status'),
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
  entityName: 'supplier',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => SuppliersService.delete(id))
}
</script>
