<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('purchaseOrderConfigs.title') }}
    </h1>

    <Toolbar v-if="!embedded && canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addConfig" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="configs" :loading="isLoading" striped-rows>
          <Column field="branchName" :header="t('purchaseOrderConfigs.fields.branch')" />
          <Column :header="t('purchaseOrderConfigs.fields.approvalFlow')">
            <template #body="{ data }">
              <Tag
                :severity="data.approvalFlowId ? 'success' : 'secondary'"
                :value="
                  data.approvalFlowId
                    ? t('purchaseOrderConfigs.labels.approvalConfigured')
                    : t('purchaseOrderConfigs.labels.noApprovalRequired')
                "
              />
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
      :header="dialogHeader"
      v-model:visible="isDialogShown"
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
      <PurchaseOrderConfigDialog
        :mode="dialogMode"
        :config="selectedConfig"
        @close="onDialogClose"
      />
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
import PurchaseOrderConfigDialog from './PurchaseOrderConfigDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { PurchaseOrderConfigService } from '@/services'
import type { PurchaseOrderConfig } from '@/types'
import DialogMode from '@/constants/dialogMode'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'purchaseOrderConfigsView'
const { canWrite } = usePermissions('/purchase-order-configs')

const isLoading = ref(false)
const configs = ref<PurchaseOrderConfig[]>([])
const dialogMode = ref(DialogMode.ADD)
const selectedConfig = ref<PurchaseOrderConfig | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('purchaseOrderConfigs.addConfig')
  if (dialogMode.value === DialogMode.EDIT) return t('purchaseOrderConfigs.editConfig')
  return t('purchaseOrderConfigs.viewConfig')
})

const { isVisible: isDialogShown, open, close } = useDialog()

async function loadConfigs() {
  isLoading.value = true
  try {
    configs.value = await PurchaseOrderConfigService.list()
  } finally {
    isLoading.value = false
  }
}

function addConfig() {
  dialogMode.value = DialogMode.ADD
  selectedConfig.value = undefined
  open()
}

function editConfig(config: PurchaseOrderConfig) {
  dialogMode.value = DialogMode.EDIT
  selectedConfig.value = config
  open()
}

function viewConfig(config: PurchaseOrderConfig) {
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

function onDeleteClick(config: PurchaseOrderConfig) {
  confirmDelete(() => PurchaseOrderConfigService.delete(config.branchId))
}

onMounted(loadConfigs)

defineExpose({ openAddDialog: addConfig })
</script>
