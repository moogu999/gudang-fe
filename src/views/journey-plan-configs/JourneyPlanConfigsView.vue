<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('journeyPlanConfigs.title') }}
    </h1>

    <Toolbar v-if="!embedded && canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('common.actions.add')" @click="addConfig" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="configs" :loading="isLoading" striped-rows>
          <Column field="branchName" :header="t('journeyPlanConfigs.fields.branch')" />
          <Column field="cycleAnchorDate" :header="t('journeyPlanConfigs.fields.cycleAnchorDate')" />
          <Column field="horizonDays" :header="t('journeyPlanConfigs.fields.horizonDays')" />
          <Column field="maxVisitsPerDay" :header="t('journeyPlanConfigs.fields.maxVisitsPerDay')" />
          <Column :header="t('journeyPlanConfigs.fields.allowSunday')">
            <template #body="{ data }">
              {{ data.allowSunday ? t('common.labels.yes') : t('common.labels.no') }}
            </template>
          </Column>
          <Column field="customReminderDay" :header="t('journeyPlanConfigs.fields.customReminderDay')" />
          <Column :header="t('journeyPlanConfigs.fields.updatedAt')">
            <template #body="{ data }">
              {{ data.updatedAt ?? data.createdAt ? dayjs(data.updatedAt ?? data.createdAt).format(DateFormat.DATE_TIME) : '—' }}
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
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('journeyPlanConfigs.empty') }}</div>
          </template>
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
      <JourneyPlanConfigDialog
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
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import JourneyPlanConfigDialog from './JourneyPlanConfigDialog.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { JourneyPlanConfigService } from '@/services'
import type { JourneyPlanConfig } from '@/types'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'journeyPlanConfigsView'
const { canWrite } = usePermissions('/journey-plan-configs')

const isLoading = ref(false)
const configs = ref<JourneyPlanConfig[]>([])
const dialogMode = ref(DialogMode.ADD)
const selectedConfig = ref<JourneyPlanConfig | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('journeyPlanConfigs.addConfig')
  if (dialogMode.value === DialogMode.EDIT) return t('journeyPlanConfigs.editConfig')
  return t('journeyPlanConfigs.viewConfig')
})

const { isVisible: isDialogShown, open, close } = useDialog()

async function loadConfigs() {
  isLoading.value = true
  try {
    configs.value = await JourneyPlanConfigService.list()
  } finally {
    isLoading.value = false
  }
}

function addConfig() {
  dialogMode.value = DialogMode.ADD
  selectedConfig.value = undefined
  open()
}

function editConfig(config: JourneyPlanConfig) {
  dialogMode.value = DialogMode.EDIT
  selectedConfig.value = config
  open()
}

function viewConfig(config: JourneyPlanConfig) {
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

function onDeleteClick(config: JourneyPlanConfig) {
  confirmDelete(() => JourneyPlanConfigService.delete(config.branchId))
}

onMounted(loadConfigs)

defineExpose({ openAddDialog: addConfig })
</script>
