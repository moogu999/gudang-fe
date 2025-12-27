<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('uomConversions.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addUomConversion" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'isActive'">
              <Tag
                :value="data[col.field] ? t('common.labels.active') : t('common.labels.inactive')"
                :severity="data[col.field] ? 'success' : 'secondary'"
              />
            </span>

            <span v-if="col.field === 'createdAt'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="editUomConversion(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewUomConversion(data)"
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
      <UomConversionDialog
        :mode="dialogMode"
        :uom-conversion="uomConversion"
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
import { UomConversionHeadersService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import UomConversionDialog from './UomConversionDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { UomConversionHeader } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'uomConversionsView'

// Permissions
const { canWrite } = usePermissions('/uom-conversions')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const uomConversion = ref<UomConversionHeader | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('uomConversions.addUomConversion')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('uomConversions.editUomConversion')
  } else {
    return t('uomConversions.viewUomConversion')
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

function addUomConversion() {
  dialogMode.value = DialogMode.ADD
  uomConversion.value = undefined
  open()
}

function editUomConversion(selectedUomConversion: UomConversionHeader) {
  dialogMode.value = DialogMode.EDIT
  uomConversion.value = selectedUomConversion
  open()
}

function viewUomConversion(selectedUomConversion: UomConversionHeader) {
  dialogMode.value = DialogMode.VIEW
  uomConversion.value = selectedUomConversion
  open()
}

// Table
const url = API_ENDPOINTS.GEN_UOM_CONVERSION_HEADERS

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('common.labels.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'description',
    header: t('common.labels.description'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'isActive',
    header: t('common.labels.status'),
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
  entityName: 'UOM conversion',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => UomConversionHeadersService.delete(id))
}
</script>
