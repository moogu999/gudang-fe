<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('correctionCategories.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addCorrectionCategory" />
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
              @edit="editCorrectionCategory(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewCorrectionCategory(data)"
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
      <CorrectionCategoryDialog
        :mode="dialogMode"
        :correction-category="correctionCategory"
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
import { CorrectionCategoriesService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import CorrectionCategoryDialog from './CorrectionCategoryDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { CorrectionCategory } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'correctionCategoriesView'

// Permissions
const { canWrite } = usePermissions('/correction-categories')

// Table
const table = ref()

// Dialog
const dialogMode = ref(DialogMode.ADD)
const correctionCategory = ref<CorrectionCategory | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('correctionCategories.addCorrectionCategory')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('correctionCategories.editCorrectionCategory')
  } else {
    return t('correctionCategories.viewCorrectionCategory')
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

function addCorrectionCategory() {
  dialogMode.value = DialogMode.ADD
  correctionCategory.value = undefined
  open()
}

function editCorrectionCategory(selected: CorrectionCategory) {
  dialogMode.value = DialogMode.EDIT
  correctionCategory.value = selected
  open()
}

function viewCorrectionCategory(selected: CorrectionCategory) {
  dialogMode.value = DialogMode.VIEW
  correctionCategory.value = selected
  open()
}

// Table
const url = API_ENDPOINTS.CORRECTION_CATEGORIES

const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('common.labels.name'),
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
  entityName: 'correction category',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => CorrectionCategoriesService.delete(id))
}
</script>
