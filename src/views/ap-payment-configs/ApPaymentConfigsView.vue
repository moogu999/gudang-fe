<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('apPaymentConfigs.title') }}
    </h1>

    <Toolbar v-if="!embedded && canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addConfig" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="configs" :loading="isLoading" striped-rows>
          <Column field="branchName" :header="t('apPaymentConfigs.fields.branch')" />
          <Column :header="t('apPaymentConfigs.fields.approvalFlow')">
            <template #body="{ data }">
              <Tag :severity="approvalStatusSeverity(data)" :value="approvalStatusLabel(data)" />
            </template>
          </Column>
          <Column :header="t('apPaymentConfigs.fields.approvalThreshold')">
            <template #body="{ data }">
              <span v-if="data.approvalThreshold === null">{{
                t('apPaymentConfigs.labels.alwaysApproval')
              }}</span>
              <span v-else>{{ formatNumber(parseFloat(data.approvalThreshold)) }}</span>
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
      <ApPaymentConfigDialog :mode="dialogMode" :config="selectedConfig" @close="onDialogClose" />
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
import ApPaymentConfigDialog from './ApPaymentConfigDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { ApPaymentConfigService } from '@/services'
import type { ApPaymentConfig } from '@/types'
import DialogMode from '@/constants/dialogMode'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'apPaymentConfigsView'
const { canWrite } = usePermissions('/ap-payment-configs')

const isLoading = ref(false)
const configs = ref<ApPaymentConfig[]>([])
const dialogMode = ref(DialogMode.ADD)
const selectedConfig = ref<ApPaymentConfig | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('apPaymentConfigs.addConfig')
  if (dialogMode.value === DialogMode.EDIT) return t('apPaymentConfigs.editConfig')
  return t('apPaymentConfigs.viewConfig')
})

const { isVisible: isDialogShown, open, close } = useDialog()

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// A null approvalFlowId only ever skips submission-time approval when the threshold
// caps which payments would need it; with no threshold either, every submission from
// this branch fails with "no approval flow configured", so that combination is flagged.
function approvalStatusSeverity(config: ApPaymentConfig): string {
  if (config.approvalFlowId) return 'success'
  if (config.approvalThreshold !== null) return 'secondary'
  return 'danger'
}

function approvalStatusLabel(config: ApPaymentConfig): string {
  if (config.approvalFlowId) return t('apPaymentConfigs.labels.approvalConfigured')
  if (config.approvalThreshold !== null)
    return t('apPaymentConfigs.labels.noApprovalBelowThreshold')
  return t('apPaymentConfigs.labels.approvalMisconfigured')
}

async function loadConfigs() {
  isLoading.value = true
  try {
    configs.value = await ApPaymentConfigService.list()
  } finally {
    isLoading.value = false
  }
}

function addConfig() {
  dialogMode.value = DialogMode.ADD
  selectedConfig.value = undefined
  open()
}

function editConfig(config: ApPaymentConfig) {
  dialogMode.value = DialogMode.EDIT
  selectedConfig.value = config
  open()
}

function viewConfig(config: ApPaymentConfig) {
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

function onDeleteClick(config: ApPaymentConfig) {
  confirmDelete(() => ApPaymentConfigService.delete(config.branchId))
}

onMounted(loadConfigs)

defineExpose({ openAddDialog: addConfig })
</script>
