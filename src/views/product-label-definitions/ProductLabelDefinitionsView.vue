<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('productLabelDefinitions.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addDefinition" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editDefinition(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewDefinition(data)"
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
      <ProductLabelDefinitionDialog :mode="dialogMode" :definition="definition" @close="close" />
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
import { ProductLabelDefinitionsService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ProductLabelDefinitionDialog from './ProductLabelDefinitionDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { ProductLabelDefinition } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'productLabelDefinitionsView'

// Permissions
const { canWrite } = usePermissions('/product-label-definitions')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const definition = ref<ProductLabelDefinition | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('productLabelDefinitions.addDefinition')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('productLabelDefinitions.editDefinition')
  } else {
    return t('productLabelDefinitions.viewDefinition')
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

function addDefinition() {
  dialogMode.value = DialogMode.ADD
  definition.value = undefined
  open()
}

function editDefinition(selectedDefinition: ProductLabelDefinition) {
  dialogMode.value = DialogMode.EDIT
  definition.value = selectedDefinition
  open()
}

function viewDefinition(selectedDefinition: ProductLabelDefinition) {
  dialogMode.value = DialogMode.VIEW
  definition.value = selectedDefinition
  open()
}

// Table
const url = API_ENDPOINTS.GEN_PRODUCT_LABEL_DEFINITIONS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('productLabelDefinitions.fields.name'),
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
  entityName: 'label definition',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ProductLabelDefinitionsService.delete(id))
}
</script>
