<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('mustSellListConfigs.title') }}
    </h1>

    <Toolbar v-if="!embedded && canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addConfig" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="configs" :loading="isLoading" striped-rows>
          <Column field="branchName" :header="t('mustSellListConfigs.fields.branch')" />
          <Column :header="t('mustSellListConfigs.fields.scopeLevel')">
            <template #body="{ data }">
              <Tag severity="info" :value="t(`mustSellListConfigs.levels.${data.scopeLevel}`)" />
            </template>
          </Column>
          <Column :header="t('mustSellListConfigs.fields.reasonRequired')">
            <template #body="{ data }">
              {{ data.reasonRequired ? t('common.labels.yes') : t('common.labels.no') }}
            </template>
          </Column>
          <Column :header="t('mustSellListConfigs.fields.updatedAt')">
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
      <MustSellListConfigDialog
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
import MustSellListConfigDialog from './MustSellListConfigDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { MustSellListConfigService } from '@/services'
import type { MustSellListConfig } from '@/types'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'mustSellListConfigsView'
const { canWrite } = usePermissions('/must-sell-list-configs')

const isLoading = ref(false)
const configs = ref<MustSellListConfig[]>([])
const dialogMode = ref(DialogMode.ADD)
const selectedConfig = ref<MustSellListConfig | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('mustSellListConfigs.addConfig')
  if (dialogMode.value === DialogMode.EDIT) return t('mustSellListConfigs.editConfig')
  return t('mustSellListConfigs.viewConfig')
})

const { isVisible: isDialogShown, open, close } = useDialog()

async function loadConfigs() {
  isLoading.value = true
  try {
    configs.value = await MustSellListConfigService.list()
  } finally {
    isLoading.value = false
  }
}

function addConfig() {
  dialogMode.value = DialogMode.ADD
  selectedConfig.value = undefined
  open()
}

function editConfig(config: MustSellListConfig) {
  dialogMode.value = DialogMode.EDIT
  selectedConfig.value = config
  open()
}

function viewConfig(config: MustSellListConfig) {
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

function onDeleteClick(config: MustSellListConfig) {
  confirmDelete(() => MustSellListConfigService.delete(config.branchId))
}

onMounted(loadConfigs)

defineExpose({ openAddDialog: addConfig })
</script>
