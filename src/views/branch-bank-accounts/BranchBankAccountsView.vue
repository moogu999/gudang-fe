<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('branchBankAccounts.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addBranchBankAccount" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'isDefault'">
              <Tag
                v-if="data[col.field]"
                :value="t('branchBankAccounts.labels.default')"
                severity="info"
              />
            </span>

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
              @edit="editBranchBankAccount(data)"
              @delete="onDeleteClick(data['id'])"
              @view="viewBranchBankAccount(data)"
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
      <BranchBankAccountDialog
        :mode="dialogMode"
        :branch-bank-account="branchBankAccount"
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
import { BranchBankAccountsService } from '@/services'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import BranchBankAccountDialog from './BranchBankAccountDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import type { BranchBankAccount } from '@/types'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'

const { t } = useI18n()

const overlayGroup = 'branchBankAccountsView'

const { canWrite } = usePermissions('/branch-bank-accounts')

const table = ref()

const dialogMode = ref(DialogMode.ADD)
const branchBankAccount = ref<BranchBankAccount | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('branchBankAccounts.addBranchBankAccount')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('branchBankAccounts.editBranchBankAccount')
  } else {
    return t('branchBankAccounts.viewBranchBankAccount')
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

function addBranchBankAccount() {
  dialogMode.value = DialogMode.ADD
  branchBankAccount.value = undefined
  open()
}

function editBranchBankAccount(selected: BranchBankAccount) {
  dialogMode.value = DialogMode.EDIT
  branchBankAccount.value = selected
  open()
}

function viewBranchBankAccount(selected: BranchBankAccount) {
  dialogMode.value = DialogMode.VIEW
  branchBankAccount.value = selected
  open()
}

const url = API_ENDPOINTS.BRANCH_BANK_ACCOUNTS

const columns = computed<Column[]>(() => [
  {
    field: 'branchName',
    header: t('branchBankAccounts.fields.branch'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'bankName',
    header: t('branchBankAccounts.fields.bankName'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'accountNumber',
    header: t('branchBankAccounts.fields.accountNumber'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'accountHolderName',
    header: t('branchBankAccounts.fields.accountHolderName'),
    exportable: true,
    sortable: true,
    filterable: true,
    hideOnMobile: true,
  },
  {
    field: 'isDefault',
    header: t('branchBankAccounts.labels.default'),
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
  entityName: 'branch bank account',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => BranchBankAccountsService.delete(id))
}
</script>
