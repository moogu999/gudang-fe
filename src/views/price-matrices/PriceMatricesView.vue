<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('priceMatrix.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="router.push('/price-matrices/create')" />
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
              @view="router.push(`/price-matrices/${data['id']}`)"
              @edit="router.push(`/price-matrices/${data['id']}/edit`)"
              @delete="onDeleteClick(data['id'])"
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
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import Toolbar from 'primevue/toolbar'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import type { Column } from '@/types/table.type'
import { useConfirmDelete, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'
import { PriceMatricesService } from '@/services/price-matrices.service'
import DateFormat from '@/constants/dateFormat'

const { t } = useI18n()
const router = useRouter()

const overlayGroup = 'priceMatricesView'
const { canWrite } = usePermissions('/price-matrices')
const table = ref()
const url = API_ENDPOINTS.GEN_PRICE_MATRICES

const columns = computed<Column[]>(() => [
  { field: 'code', header: t('priceMatrix.fields.code'), exportable: true, sortable: true, filterable: true },
  { field: 'description', header: t('priceMatrix.fields.description'), exportable: true, sortable: false, filterable: false, hideOnMobile: true },
  { field: 'createdAt', header: t('common.labels.createdAt'), exportable: true, sortable: true, filterable: false, class: 'min-w-45', hideOnMobile: true },
  { field: '', header: t('common.labels.actions'), exportable: false, sortable: false, filterable: false },
])

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'price matrix',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => PriceMatricesService.delete(id))
}
</script>
