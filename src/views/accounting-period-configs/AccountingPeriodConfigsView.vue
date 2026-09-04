<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />

    <h1 v-if="!embedded" class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('accountingPeriodConfigs.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #start>
        <InfiniteSelect
          v-model="selectedCompanyId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => CompaniesService.list(query)"
          :placeholder="t('accountingPeriodConfigs.labels.selectCompany')"
          :initial-option="initialCompany"
          sort-by="name"
          sort-operator="asc"
          class="w-48 sm:w-64"
          @select-option="onCompanySelect"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="tableRows" :loading="isLoading" striped-rows>
          <Column field="companyName" :header="t('accountingPeriodConfigs.fields.company')" />
          <Column :header="t('accountingPeriodConfigs.fields.reopenFlow')">
            <template #body="{ data }">
              <Tag
                :severity="data.reopenFlowId ? 'success' : 'secondary'"
                :value="
                  data.reopenFlowId
                    ? t('accountingPeriodConfigs.labels.approvalConfigured')
                    : t('accountingPeriodConfigs.labels.noApprovalRequired')
                "
              />
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body>
              <Button
                v-if="canWrite"
                icon="pi pi-pen-to-square"
                severity="contrast"
                text
                rounded
                outlined
                :aria-label="t('common.actions.edit')"
                class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                @click="editConfig()"
              />
            </template>
          </Column>
          <template #empty>
            <div class="text-surface-500 p-4 text-center">
              {{ t('accountingPeriodConfigs.labels.selectCompanyFirst') }}
            </div>
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>

    <Dialog
      :header="t('accountingPeriodConfigs.editConfig')"
      v-model:visible="isDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw',
      }"
      :style="{ width: '32vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
      @hide="onDialogClose"
    >
      <AccountingPeriodConfigDialog
        v-if="selectedCompanyId"
        :company-id="selectedCompanyId"
        :config="config"
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
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import AccountingPeriodConfigDialog from './AccountingPeriodConfigDialog.vue'
import { useDialog, usePermissions } from '@/composables'
import { AccountingPeriodsService, CompaniesService } from '@/services'
import { ApiError } from '@/types/api.type'
import type { AccountingPeriodConfig, Company } from '@/types'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const { embedded } = props

const { t } = useI18n()

const overlayGroup = 'accountingPeriodConfigsView'
// Reuses the accounting-periods route permission — the backend gates this
// module's config endpoints with the same read/write permission as periods
// themselves, so there is no separate config permission to check.
const { canWrite } = usePermissions('/accounting-periods')

const isLoading = ref(false)
const selectedCompanyId = ref<number | undefined>(undefined)
const initialCompany = ref<Company | undefined>(undefined)
const config = ref<AccountingPeriodConfig | null>(null)

const tableRows = computed(() => {
  if (!selectedCompanyId.value || !initialCompany.value) return []
  return [
    {
      companyName: initialCompany.value.name,
      reopenFlowId: config.value?.reopenFlowId ?? null,
    },
  ]
})

async function loadDefaultCompany() {
  const result = await CompaniesService.list('sortBy=name&sortOperator=asc&limit=1')
  const first = result.data[0]
  if (first) {
    selectedCompanyId.value = first.id
    initialCompany.value = first
  }
}

async function onCompanySelect(company: Company) {
  initialCompany.value = company
  await loadConfig()
}

async function loadConfig() {
  if (!selectedCompanyId.value) return

  isLoading.value = true
  try {
    config.value = await AccountingPeriodsService.getConfig(selectedCompanyId.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      config.value = null
      return
    }
    throw e
  } finally {
    isLoading.value = false
  }
}

const { isVisible: isDialogShown, open, close } = useDialog()

function editConfig() {
  if (!selectedCompanyId.value) return
  open()
}

async function onDialogClose() {
  close()
  await loadConfig()
}

onMounted(async () => {
  await loadDefaultCompany()
  await loadConfig()
})

defineExpose({ openAddDialog: editConfig })
</script>
