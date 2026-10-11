<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('salesmanTargetConfigs.title') }}
    </h1>

    <Toolbar v-if="!embedded && canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addConfig" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="configs" :loading="isLoading" striped-rows>
          <Column field="branchName" :header="t('salesmanTargetConfigs.fields.branch')" />
          <Column :header="t('salesmanTargetConfigs.fields.targetLevel')">
            <template #body="{ data }">
              <Tag
                :severity="data.targetLevel === 'category' ? 'info' : 'secondary'"
                :value="t(`salesmanTargetConfigs.levels.${data.targetLevel}`)"
              />
            </template>
          </Column>
          <Column :header="t('salesmanTargetConfigs.fields.updatedAt')">
            <template #body="{ data }">
              {{ dayjs(data.updatedAt ?? data.createdAt).format(DateFormat.DATE_TIME) }}
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
      <SalesmanTargetConfigDialog
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
import dayjs from 'dayjs'
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
import SalesmanTargetConfigDialog from './SalesmanTargetConfigDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { SalesmanTargetConfigService } from '@/services'
import type { SalesmanTargetConfig } from '@/types'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'salesmanTargetConfigsView'
const { canWrite } = usePermissions('/salesman-target-configs')

const isLoading = ref(false)
const configs = ref<SalesmanTargetConfig[]>([])
const dialogMode = ref(DialogMode.ADD)
const selectedConfig = ref<SalesmanTargetConfig | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('salesmanTargetConfigs.addConfig')
  if (dialogMode.value === DialogMode.EDIT) return t('salesmanTargetConfigs.editConfig')
  return t('salesmanTargetConfigs.viewConfig')
})

const { isVisible: isDialogShown, open, close } = useDialog()

async function loadConfigs() {
  isLoading.value = true
  try {
    configs.value = await SalesmanTargetConfigService.list()
  } finally {
    isLoading.value = false
  }
}

function addConfig() {
  dialogMode.value = DialogMode.ADD
  selectedConfig.value = undefined
  open()
}

function editConfig(config: SalesmanTargetConfig) {
  dialogMode.value = DialogMode.EDIT
  selectedConfig.value = config
  open()
}

function viewConfig(config: SalesmanTargetConfig) {
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

function onDeleteClick(config: SalesmanTargetConfig) {
  confirmDelete(() => SalesmanTargetConfigService.delete(config.branchId))
}

onMounted(loadConfigs)

defineExpose({ openAddDialog: addConfig })
</script>
