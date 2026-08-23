<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('products.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #start>
        <Button
          :label="t('products.labels.addLabelFilter')"
          icon="pi pi-filter"
          severity="secondary"
          size="small"
          @click="addLabelFilter"
        />
      </template>
      <template #end>
        <div class="flex gap-2">
          <ResponsiveButton
            v-if="canWrite"
            :label="t('csv.import')"
            icon="pi pi-upload"
            severity="secondary"
            @click="openCsvDialog"
          />
          <ResponsiveButton v-if="canWrite" :label="t('common.actions.add')" @click="addProduct" />
        </div>
      </template>
    </Toolbar>

    <!-- Label Filters -->
    <div v-if="labelFilters.length > 0" class="mb-4 rounded border p-3">
      <div
        v-for="(filter, index) in labelFilters"
        :key="index"
        class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <span class="text-sm font-medium text-gray-600"
          >{{ t('products.labels.labelFilter') }} {{ index + 1 }}</span
        >
        <InfiniteSelect
          v-model="filter.definitionId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => ProductLabelDefinitionsService.list(query)"
          :placeholder="t('products.labels.selectDefinition')"
          sort-by="name"
          sort-operator="asc"
          class="min-w-40"
          @update:model-value="onDefinitionChange(index)"
        />
        <InfiniteSelect
          v-model="filter.optionId"
          option-label="value"
          option-value="id"
          :fetch-fn="(query) => ProductLabelOptionsService.list(query)"
          :custom-filters="
            filter.definitionId
              ? [
                  {
                    filterBy: 'product_label_definition_id',
                    filterOperator: FilterOperator.EQUAL,
                    filterValue: filter.definitionId,
                  },
                ]
              : []
          "
          :placeholder="t('products.labels.selectOption')"
          :disabled="!filter.definitionId"
          sort-by="value"
          sort-operator="asc"
          class="min-w-40"
        />
        <Button
          icon="pi pi-times"
          severity="secondary"
          size="small"
          text
          @click="removeLabelFilter(index)"
        />
      </div>
    </div>

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

            <span v-if="col.field === 'uomGroup.name'">{{ data['uomGroup']?.name || '-' }}</span>

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
        '640px': '90vw',
      }"
      :style="{ width: '50vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
    >
      <ProductDialog :mode="dialogMode" :product="product" @close="close" />
    </Dialog>

    <CsvUploadDialog
      :visible="isCsvDialogShown"
      entity-name="product"
      :template-url="`${API_ENDPOINTS.GEN_PRODUCTS}/csv-template`"
      :upload-url="`${API_ENDPOINTS.GEN_PRODUCTS}/csv-upload`"
      @close="closeCsvDialog"
      @success="onCsvSuccess"
    />
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
import Button from 'primevue/button'
import { ref, computed } from 'vue'
import {
  ProductsService,
  ProductLabelDefinitionsService,
  ProductLabelOptionsService,
} from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ProductDialog from './ProductDialog.vue'
import CsvUploadDialog from '@/components/csv/CsvUploadDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { Product } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import { FilterOperator } from '@/constants'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

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

// Label filters
const labelFilters = ref<{ definitionId: number | undefined; optionId: number | undefined }[]>([])

function addLabelFilter() {
  labelFilters.value.push({ definitionId: undefined, optionId: undefined })
}

function removeLabelFilter(index: number) {
  labelFilters.value.splice(index, 1)
}

function onDefinitionChange(index: number) {
  labelFilters.value[index].optionId = undefined
}

// Table
const activeLabelFilters = computed(() =>
  labelFilters.value.filter((f) => f.definitionId && f.optionId),
)

// Only `/v1/products` knows label filters, so the table moves there once one is
// set. The two endpoints read different query dialects and support different
// controls, which is why the adapter and the columns below follow this flag.
const isLabelFiltered = computed(() => activeLabelFilters.value.length > 0)

const url = computed(() => {
  if (!isLabelFiltered.value) return API_ENDPOINTS.GEN_PRODUCTS

  const params = activeLabelFilters.value
    .map((f) => ProductsService.labelFilterParam(f.definitionId!, f.optionId!))
    .join('&')
  return `${API_ENDPOINTS.PRODUCTS_V1}?${params}`
})

// No query adapter here, unlike the customers list: `/v1/products` already
// reads `search` and `page`, the same dialect TableComponent builds. Only its
// sort and column filters are missing.

// `/v1/products` reads no sort parameter and no named column filters, so while
// a label filter is on those controls are withdrawn rather than left inert.
const supportsColumnControls = computed(() => !isLabelFiltered.value)

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('products.fields.code'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
  },
  {
    field: 'name',
    header: t('products.fields.name'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
  },
  {
    field: 'description',
    header: t('products.fields.description'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
  },
  {
    field: 'taxable',
    header: t('products.fields.taxable'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
  },
  {
    field: 'trackingType.name',
    header: t('products.fields.trackingType'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'uomGroup.name',
    header: t('products.fields.uomGroup'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'createdAt',
    header: t('common.labels.createdAt'),
    exportable: true,
    sortable: supportsColumnControls.value,
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

// CSV upload dialog
const { isVisible: isCsvDialogShown, open: openCsvDialog, close: closeCsvDialog } = useDialog()

async function onCsvSuccess() {
  await table.value.clearSearch()
}

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
