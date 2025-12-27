<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('products.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addProduct" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'taxable'">
              <Tag
                :value="data[col.field] ? t('common.labels.yes') : t('common.labels.no')"
                :severity="data[col.field] ? 'success' : 'secondary'"
              />
            </span>

            <span v-if="col.field === 'trackingType.name'">{{
              data['trackingType']?.name || '-'
            }}</span>

            <span v-if="col.field === 'productBaseUom.name'">{{
              data['productBaseUom']?.name || '-'
            }}</span>

            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editProduct(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewProduct(data)"
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
      <ProductDialog :mode="dialogMode" :product="product" @close="close" />
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
import { ProductsService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ProductDialog from './ProductDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Product } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'productsView'

// Permissions
const { canWrite } = usePermissions('/products')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const product = ref<Product | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('products.addProduct')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('products.editProduct')
  } else {
    return t('products.viewProduct')
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

function addProduct() {
  dialogMode.value = DialogMode.ADD
  product.value = undefined
  open()
}

function editProduct(selectedProduct: Product) {
  dialogMode.value = DialogMode.EDIT
  product.value = selectedProduct
  open()
}

function viewProduct(selectedProduct: Product) {
  dialogMode.value = DialogMode.VIEW
  product.value = selectedProduct
  open()
}

// Table
const url = API_ENDPOINTS.GEN_PRODUCTS

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('products.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'name',
    header: t('products.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'description',
    header: t('products.fields.description'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'taxable',
    header: t('products.fields.taxable'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'trackingType.name',
    header: t('products.fields.trackingType'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'productBaseUom.name',
    header: t('products.fields.productBaseUom'),
    exportable: true,
    sortable: false,
    filterable: false,
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
  entityName: 'product',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ProductsService.delete(id))
}
</script>
