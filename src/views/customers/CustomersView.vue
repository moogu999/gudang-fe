<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('customers.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addCustomer" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
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
import { ref, computed } from 'vue'
import { CustomersService } from '@/services/customers.service'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { useConfirmDelete, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

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

// Table
const url = API_ENDPOINTS.GEN_CUSTOMERS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('customers.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
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
    sortable: true,
    filterable: true,
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
    sortable: true,
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
  confirmDelete(() => CustomersService.delete(id))
}
</script>
