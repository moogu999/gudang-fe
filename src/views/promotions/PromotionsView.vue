<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('promotions.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton
          :label="t('common.actions.add')"
          @click="router.push('/promotions/create')"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'startDate'">{{ data[col.field] }}</span>
            <span v-if="col.field === 'endDate'">{{ data[col.field] ?? '—' }}</span>
            <Tag
              v-if="col.field === 'active'"
              :value="data[col.field] ? t('common.labels.active') : t('common.labels.inactive')"
              :severity="data[col.field] ? 'success' : 'secondary'"
            />
            <Tag
              v-if="col.field === 'promoType'"
              :value="t(`promotions.labels.promoTypes.${data[col.field]}`)"
              severity="info"
            />
            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>
            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @view="router.push(`/promotions/${data['id']}`)"
              @edit="router.push(`/promotions/${data['id']}/edit`)"
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
import Tag from 'primevue/tag'
import TableComponent from '@/components/table/TableComponent.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import type { Column } from '@/types/table.type'
import { useConfirmDelete, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'
import { PromotionsService } from '@/services/promotions.service'
import DateFormat from '@/constants/dateFormat'

const { t } = useI18n()
const router = useRouter()

const overlayGroup = 'promotionsView'
const { canWrite } = usePermissions('/promotions')
const table = ref()
const url = API_ENDPOINTS.GEN_PROMOTIONS

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('promotions.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'description',
    header: t('promotions.fields.description'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'promoType',
    header: t('promotions.fields.promoType'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'startDate',
    header: t('promotions.fields.startDate'),
    exportable: true,
    sortable: true,
    filterable: false,
  },
  {
    field: 'endDate',
    header: t('promotions.fields.endDate'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'active',
    header: t('promotions.fields.active'),
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

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'promotion',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => PromotionsService.delete(id))
}
</script>
