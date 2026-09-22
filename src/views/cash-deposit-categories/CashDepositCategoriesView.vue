<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('cashDepositCategories.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addCategory" />
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
              @edit="editCategory(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewCategory(data)"
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
      <CashDepositCategoryDialog :mode="dialogMode" :category="category" @close="close" />
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
import { CashDepositCategoriesService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import CashDepositCategoryDialog from './CashDepositCategoryDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { CashDepositCategory } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'cashDepositCategoriesView'

const { canWrite } = usePermissions('/cash-deposit-categories')

const table = ref()

const dialogMode = ref(DialogMode.ADD)
const category = ref<CashDepositCategory | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('cashDepositCategories.addCategory')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('cashDepositCategories.editCategory')
  } else {
    return t('cashDepositCategories.viewCategory')
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

function addCategory() {
  dialogMode.value = DialogMode.ADD
  category.value = undefined
  open()
}

function editCategory(selected: CashDepositCategory) {
  dialogMode.value = DialogMode.EDIT
  category.value = selected
  open()
}

function viewCategory(selected: CashDepositCategory) {
  dialogMode.value = DialogMode.VIEW
  category.value = selected
  open()
}

const url = API_ENDPOINTS.GEN_CASH_DEPOSIT_CATEGORIES

const columns = computed<Column[]>(() => [
  {
    field: 'code',
    header: t('cashDepositCategories.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
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

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'category',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => CashDepositCategoriesService.delete(id))
}
</script>
