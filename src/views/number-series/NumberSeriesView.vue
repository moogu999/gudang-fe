<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('numberSeries.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addNumberSeries" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'isDefault'">
              <Tag
                :value="data[col.field] ? t('common.labels.yes') : t('common.labels.no')"
                :severity="data[col.field] ? 'success' : 'secondary'"
              />
            </span>

            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editNumberSeries(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewNumberSeries(data)"
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
      <NumberSeriesDialog :mode="dialogMode" :number-series="numberSeries" @close="close" />
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
import { NumberSeriesService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import NumberSeriesDialog from './NumberSeriesDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { NumberSeries } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'numberSeriesView'

// Permissions
const { canWrite } = usePermissions('/number-series')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const numberSeries = ref<NumberSeries | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('numberSeries.addNumberSeries')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('numberSeries.editNumberSeries')
  } else {
    return t('numberSeries.viewNumberSeries')
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

function addNumberSeries() {
  dialogMode.value = DialogMode.ADD
  numberSeries.value = undefined
  open()
}

function editNumberSeries(selected: NumberSeries) {
  dialogMode.value = DialogMode.EDIT
  numberSeries.value = selected
  open()
}

function viewNumberSeries(selected: NumberSeries) {
  dialogMode.value = DialogMode.VIEW
  numberSeries.value = selected
  open()
}

// Table
const url = API_ENDPOINTS.GEN_NUMBER_SERIES

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('common.labels.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'prefix',
    header: t('numberSeries.fields.prefix'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'entityType',
    header: t('numberSeries.fields.entityType'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'isDefault',
    header: t('numberSeries.fields.isDefault'),
    exportable: true,
    sortable: false,
    filterable: true,
  },
  {
    field: 'currentNumber',
    header: t('numberSeries.fields.currentNumber'),
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
  entityName: 'number series',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => NumberSeriesService.delete(id))
}
</script>
