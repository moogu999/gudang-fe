<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('approvalFlows.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton
          :label="t('common.actions.add')"
          @click="router.push('/approval-flows/create')"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <Tag
              v-if="col.field === 'isActive'"
              :severity="data.isActive ? 'success' : 'secondary'"
              :value="data.isActive ? t('common.labels.active') : t('common.labels.inactive')"
            />
            <span v-else-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>
            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @view="router.push(`/approval-flows/${data['id']}`)"
              @edit="router.push(`/approval-flows/${data['id']}/edit`)"
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
import { ApprovalsService } from '@/services/approvals.service'
import DateFormat from '@/constants/dateFormat'

const { t } = useI18n()
const router = useRouter()

const overlayGroup = 'approvalFlowsView'
const { canWrite } = usePermissions('/approval-flows')
const table = ref()
const url = API_ENDPOINTS.GEN_APPROVAL_FLOWS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('approvalFlows.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'moduleKey',
    header: t('approvalFlows.fields.module'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'isActive',
    header: t('approvalFlows.fields.isActive'),
    exportable: true,
    sortable: true,
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
  entityName: 'approval flow',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ApprovalsService.deleteFlow(id))
}
</script>
