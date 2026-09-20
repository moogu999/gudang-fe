<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('cashDepositConfigs.title') }}
    </h1>

    <Toolbar v-if="!embedded && canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addConfig" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="configs" :loading="isLoading" striped-rows>
          <Column field="branchName" :header="t('cashDepositConfigs.fields.branch')" />
          <Column :header="t('cashDepositConfigs.fields.approvalFlow')">
            <template #body="{ data }">
              <Tag
                :severity="data.approvalFlowId ? 'success' : 'secondary'"
                :value="
                  data.approvalFlowId
                    ? t('cashDepositConfigs.labels.approvalConfigured')
                    : t('cashDepositConfigs.labels.noApprovalRequired')
                "
              />
            </template>
          </Column>
          <Column :header="t('cashDepositConfigs.fields.varianceThreshold')">
            <template #body="{ data }">
              <span v-if="!data.approvalFlowId">—</span>
              <span v-else-if="data.varianceThreshold == null">{{
                t('cashDepositConfigs.labels.anyVariance')
              }}</span>
              <span v-else>{{ formatNumber(parseFloat(data.varianceThreshold)) }}</span>
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <TableActionButtons
                :can-write="canWrite"
                @edit="editConfig(data)"
                @delete="onDeleteClick(data)"
                @view="viewConfig(data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </ResponsiveCard>

    <Dialog
      v-model:visible="isDialogShown"
      :header="dialogHeader"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw',
      }"
      :style="{ width: '40vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
      @hide="close"
    >
      <CashDepositConfigDialog :mode="dialogMode" :config="selectedConfig" @close="onDialogClose" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Toolbar from 'primevue/toolbar'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import CashDepositConfigDialog from './CashDepositConfigDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { CashDepositConfigService } from '@/services'
import type { CashDepositConfig } from '@/types'
import DialogMode from '@/constants/dialogMode'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'cashDepositConfigsView'
const { canWrite } = usePermissions('/cash-deposit-configs')

const isLoading = ref(false)
const configs = ref<CashDepositConfig[]>([])
const dialogMode = ref(DialogMode.ADD)
const selectedConfig = ref<CashDepositConfig | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('cashDepositConfigs.addConfig')
  if (dialogMode.value === DialogMode.EDIT) return t('cashDepositConfigs.editConfig')
  return t('cashDepositConfigs.viewConfig')
})

const { isVisible: isDialogShown, open, close } = useDialog()

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

async function loadConfigs() {
  isLoading.value = true
  try {
    configs.value = await CashDepositConfigService.list()
  } finally {
    isLoading.value = false
  }
}

function addConfig() {
  dialogMode.value = DialogMode.ADD
  selectedConfig.value = undefined
  open()
}

function editConfig(config: CashDepositConfig) {
  dialogMode.value = DialogMode.EDIT
  selectedConfig.value = config
  open()
}

function viewConfig(config: CashDepositConfig) {
  dialogMode.value = DialogMode.VIEW
  selectedConfig.value = config
  open()
}

async function onDialogClose() {
  close()
  await loadConfigs()
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'config',
  onSuccess: loadConfigs,
})

function onDeleteClick(config: CashDepositConfig) {
  confirmDelete(() => CashDepositConfigService.delete(config.branchId))
}

onMounted(loadConfigs)

defineExpose({ openAddDialog: addConfig })
</script>
