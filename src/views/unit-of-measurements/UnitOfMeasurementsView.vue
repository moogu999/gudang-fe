<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('unitOfMeasurements.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addUnitOfMeasurement" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'isCustom'">
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
              :can-write="canWrite && data['isCustom']"
              @edit="editUnitOfMeasurement(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewUnitOfMeasurement(data)"
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
      <UnitOfMeasurementDialog
        :mode="dialogMode"
        :unit-of-measurement="unitOfMeasurement"
        @close="close"
      />
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
import { UnitOfMeasurementsService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import UnitOfMeasurementDialog from './UnitOfMeasurementDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { UnitOfMeasurement } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'unitOfMeasurementsView'

// Permissions
const { canWrite } = usePermissions('/unit-of-measurements')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const unitOfMeasurement = ref<UnitOfMeasurement | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('unitOfMeasurements.addUnitOfMeasurement')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('unitOfMeasurements.editUnitOfMeasurement')
  } else {
    return t('unitOfMeasurements.viewUnitOfMeasurement')
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

function addUnitOfMeasurement() {
  dialogMode.value = DialogMode.ADD
  unitOfMeasurement.value = undefined
  open()
}

function editUnitOfMeasurement(selectedUnitOfMeasurement: UnitOfMeasurement) {
  dialogMode.value = DialogMode.EDIT
  unitOfMeasurement.value = selectedUnitOfMeasurement
  open()
}

function viewUnitOfMeasurement(selectedUnitOfMeasurement: UnitOfMeasurement) {
  dialogMode.value = DialogMode.VIEW
  unitOfMeasurement.value = selectedUnitOfMeasurement
  open()
}

// Table
const url = API_ENDPOINTS.GEN_UNIT_OF_MEASUREMENTS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('common.labels.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'symbol',
    header: t('unitOfMeasurements.fields.symbol'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'isCustom',
    header: t('unitOfMeasurements.fields.isCustom'),
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
  entityName: 'unit of measurement',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => UnitOfMeasurementsService.delete(id))
}
</script>
