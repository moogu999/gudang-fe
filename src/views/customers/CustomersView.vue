<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('customers.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #start>
        <Button
          :label="t('customers.labels.addLabelFilter')"
          icon="pi pi-filter"
          severity="secondary"
          size="small"
          @click="addLabelFilter"
        />
      </template>
      <template #end>
        <ResponsiveButton v-if="canWrite" :label="t('common.actions.add')" @click="addCustomer" />
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
          >{{ t('customers.labels.labelFilter') }} {{ index + 1 }}</span
        >
        <InfiniteSelect
          v-model="filter.definitionId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => CustomerLabelDefinitionsService.list(query)"
          :placeholder="t('customers.labels.selectDefinition')"
          sort-by="name"
          sort-operator="asc"
          class="min-w-40"
          @update:model-value="onDefinitionChange(index)"
        />
        <InfiniteSelect
          v-model="filter.optionId"
          option-label="value"
          option-value="id"
          :fetch-fn="(query) => CustomerLabelOptionsService.list(query)"
          :custom-filters="
            filter.definitionId
              ? [
                  {
                    filterBy: 'customer_label_definition_id',
                    filterOperator: FilterOperator.EQUAL,
                    filterValue: filter.definitionId,
                  },
                ]
              : []
          "
          :placeholder="t('customers.labels.selectOption')"
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
        <TableComponent ref="table" :url="url" :columns="columns" :query-adapter="queryAdapter">
          <template #content="{ col, data }">
            <span v-if="col.field === 'taxable'">
              <i v-if="data[col.field]" class="pi pi-check text-green-500" />
              <i v-else class="pi pi-times text-red-500" />
            </span>

            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <span v-if="col.field === 'updatedAt' && data[col.field]">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editCustomer(data['id'])"
              @delete="onDeleteClick(data['id'])"
              @view="viewCustomer(data['id'])"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DateFormat from '@/constants/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import type { Column } from '@/types/table.type'
import dayjs from 'dayjs'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import { ref, computed } from 'vue'
import {
  CustomersService,
  CustomerLabelDefinitionsService,
  CustomerLabelOptionsService,
} from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { useConfirmDelete, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'
import { FilterOperator } from '@/constants'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()
const router = useRouter()

const overlayGroup = 'customersView'

// Permissions
const { canWrite } = usePermissions('/customers')

// Table
const table = ref()

// Navigation
function addCustomer() {
  router.push('/customers/create')
}

function editCustomer(id: number) {
  router.push(`/customers/${id}/edit`)
}

function viewCustomer(id: number) {
  router.push(`/customers/${id}`)
}

// Label Filters
type LabelFilter = { definitionId?: number; optionId?: number }
const labelFilters = ref<LabelFilter[]>([])

function addLabelFilter() {
  labelFilters.value.push({})
}

function removeLabelFilter(index: number) {
  labelFilters.value.splice(index, 1)
}

function onDefinitionChange(index: number) {
  labelFilters.value[index].optionId = undefined
}

const activeLabelFilters = computed(() =>
  labelFilters.value.filter((f) => f.definitionId && f.optionId),
)

// Only `/v1/customers` knows label filters, so the table moves there once one is
// set. The two endpoints read different query dialects and support different
// controls, which is why the adapter and the columns below follow this flag.
const isLabelFiltered = computed(() => activeLabelFilters.value.length > 0)

const url = computed(() => {
  if (!isLabelFiltered.value) return API_ENDPOINTS.GEN_CUSTOMERS

  const params = activeLabelFilters.value
    .map((f) => CustomersService.labelFilterParam(f.definitionId!, f.optionId!))
    .join('&')
  return `${API_ENDPOINTS.CUSTOMERS_V1}?${params}`
})

// `/gen/v1/customers` speaks the generic dialect TableComponent already builds;
// translating it there would break the very search this adapts for elsewhere.
const queryAdapter = computed(() =>
  isLabelFiltered.value ? CustomersService.toListQuery : undefined,
)

// Sorting and column filters belong to the generic endpoint. `/v1/customers`
// orders by created_at DESC and reads only its named filters, so while a label
// filter is on, those controls are withdrawn rather than left to do nothing.
const supportsColumnControls = computed(() => !isLabelFiltered.value)

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('customers.fields.code'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
  },
  {
    field: 'name',
    header: t('customers.fields.name'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
  },
  {
    field: 'currency.code',
    underlyingField: 'currencyId',
    header: t('customers.fields.currency'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'taxable',
    header: t('customers.fields.taxable'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'address',
    header: t('customers.fields.address'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'country.name',
    underlyingField: 'countryId',
    header: t('customers.fields.country'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: supportsColumnControls.value,
    hideOnMobile: true,
  },
  {
    field: 'province.name',
    underlyingField: 'provinceId',
    header: t('customers.fields.province'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'city.name',
    underlyingField: 'cityId',
    header: t('customers.fields.city'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'createdAt',
    header: t('common.labels.createdAt'),
    exportable: true,
    sortable: supportsColumnControls.value,
    filterable: false,
    class: 'min-w-45',
    hideOnMobile: true,
  },
  {
    field: 'createdByUser.email',
    underlyingField: 'createdBy',
    header: t('common.labels.createdBy'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
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
  entityName: 'customer',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  // Use the v1 endpoint: soft-deletes the customer and records an audit trail,
  // unlike the generic CRUD delete which hard-deletes without audit.
  confirmDelete(() => CustomersService.v1Delete(id))
}
</script>
