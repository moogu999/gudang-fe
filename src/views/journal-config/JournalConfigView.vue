<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="noopAcceptHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('journalConfig.title') }}
    </h1>

    <ResponsiveCard class="mb-5">
      <template #content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('journalConfig.fields.company') }}</label>
            <InfiniteSelect
              v-model="selectedCompanyId"
              option-label="name"
              option-value="id"
              :fetch-fn="(query) => CompaniesService.list(query)"
              :placeholder="t('journalConfig.labels.selectCompany')"
              :initial-option="initialCompany"
              sort-by="name"
              sort-operator="asc"
              class="w-full"
              @update:model-value="onCompanyChange"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('journalConfig.fields.document') }}</label>
            <Select
              v-model="selectedDocumentTypeId"
              :options="documentTypes"
              option-label="displayName"
              option-value="id"
              option-disabled="disabled"
              class="w-full"
              @update:model-value="onDocumentTypeChange"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('journalConfig.fields.category') }}</label>
            <InputText
              v-model="category"
              :disabled="!canWrite || !config"
              autocomplete="off"
              @blur="onHeaderFieldChange"
            />
          </div>
          <div class="flex flex-col justify-end gap-1">
            <div class="flex items-center gap-2">
              <ToggleSwitch
                v-model="includePosting"
                input-id="includePosting"
                :disabled="!canWrite || !config"
                @update:model-value="onHeaderFieldChange"
              />
              <label for="includePosting" class="text-sm">{{
                t('journalConfig.fields.includePosting')
              }}</label>
            </div>
            <Tag v-if="config" :severity="statusSeverity" :value="statusLabel" class="w-fit" />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-if="config">
      <template #content>
        <Tabs v-model:value="activeTab">
          <TabList>
            <Tab v-for="role in config.roles" :key="role.roleCode" :value="role.roleCode">
              <span class="flex items-center gap-1">
                {{ t(`journalConfig.roles.${role.roleCode}`) }}
                <i
                  v-if="role.unmappedRows > 0"
                  class="pi pi-exclamation-circle text-xs text-red-500"
                  v-tooltip.top="
                    t('journalConfig.warnings.unmappedRows', { count: role.unmappedRows })
                  "
                />
              </span>
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel v-for="role in config.roles" :key="role.roleCode" :value="role.roleCode">
              <JournalConfigMatrix
                :ref="(el) => setMatrixRef(role.roleCode, el)"
                :document-type-code="documentTypeCode"
                :config-id="config.id"
                :company-id="config.companyId"
                :role="role"
                :can-write="canWrite"
                :overlay-group="overlayGroup"
                @refresh="reloadConfig"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </ResponsiveCard>

    <Message
      v-else-if="selectedCompanyId && !loading"
      severity="info"
      :closable="false"
      class="mt-4 text-sm"
    >
      {{ t('common.messages.noData') }}
    </Message>

    <div v-if="config" class="mt-5 flex justify-end gap-3">
      <Button :label="t('journalConfig.labels.cancel')" severity="secondary" @click="onCancel" />
      <Button
        v-if="canWrite"
        :label="t('journalConfig.labels.saveAsDraft')"
        severity="secondary"
        outlined
        @click="onSaveAsDraft"
      />
      <Button
        v-if="canWrite"
        :label="t('journalConfig.labels.saveAndActivate')"
        icon="pi pi-lock"
        :disabled="!canActivate"
        :loading="activating"
        @click="onActivate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import JournalConfigMatrix from './JournalConfigMatrix.vue'
import { usePermissions } from '@/composables'
import { JournalConfigService, CompaniesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { ApiError } from '@/types/api.type'
import type { Company } from '@/types'
import type {
  JournalConfig,
  JournalConfigStatus,
  JournalDocumentType,
} from '@/types/journalConfig.type'
import { isActivatable } from './journalConfigMatrix'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

const overlayGroup = 'journalConfigView'
const { canWrite } = usePermissions('/journal-config')

const loading = ref(false)

// This view only mounts the shared Toast/ConfirmDialog visuals for
// `overlayGroup`; each JournalConfigMatrix tab drives its own confirmation
// (basis-change warning) via `confirm.require({ accept, reject })`, so
// nothing needs to happen here.
const noopAcceptHandler = async () => {}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

const selectedCompanyId = ref<number | undefined>(undefined)
const initialCompany = ref<Company | undefined>(undefined)

async function loadDefaultCompany() {
  const result = await CompaniesService.list('sortBy=name&sortOperator=asc&limit=1')
  const first = result.data[0]
  if (first) {
    selectedCompanyId.value = first.id
    initialCompany.value = first
  }
}

async function onCompanyChange() {
  await flushActiveMatrix()
  await loadCompanyData()
}

// ---------------------------------------------------------------------------
// Document type — the Select already disables any document type that isn't
// active, so every selectable option here is safe to auto-create a config
// for.
// ---------------------------------------------------------------------------

const documentTypes = ref<JournalDocumentType[]>([])
const selectedDocumentTypeId = ref<number | undefined>(undefined)
const documentTypeCode = computed(
  () => documentTypes.value.find((d) => d.id === selectedDocumentTypeId.value)?.code ?? 'invoice',
)

async function loadDocumentTypes() {
  const result = await JournalConfigService.documentTypes()
  documentTypes.value = result.data
    .map((d) => ({ ...d, displayName: d.name, disabled: !d.isActive }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const active = documentTypes.value.find((d) => d.isActive)
  selectedDocumentTypeId.value = active?.id ?? documentTypes.value[0]?.id
}

async function onDocumentTypeChange() {
  await flushActiveMatrix()
  await loadConfigForSelection()
}

// ---------------------------------------------------------------------------
// Config header
// ---------------------------------------------------------------------------

const config = ref<JournalConfig | null>(null)
const category = ref('')
const includePosting = ref(true)
const activeTab = ref<string>('')

const STATUS_SEVERITY: Record<JournalConfigStatus, 'success' | 'warn' | 'secondary'> = {
  active: 'success',
  draft: 'warn',
  inactive: 'secondary',
}

const statusSeverity = computed(() => STATUS_SEVERITY[config.value?.status ?? 'draft'])
const statusLabel = computed(() => {
  const status = config.value?.status ?? 'draft'
  return t(`journalConfig.labels.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)
})

async function loadConfigForSelection() {
  if (!selectedCompanyId.value || !selectedDocumentTypeId.value) {
    return
  }

  loading.value = true
  try {
    // `find()` hits the list endpoint, which returns the header only — no
    // `roles`. Resolve to the full detail before ever assigning `config.value`,
    // so the reactive ref never briefly holds a roles-less object.
    let found = await JournalConfigService.find(
      selectedCompanyId.value,
      selectedDocumentTypeId.value,
    )
    if (!found) {
      found = await JournalConfigService.create({
        companyId: selectedCompanyId.value,
        documentTypeCode: documentTypeCode.value,
      })
      toast.add(commonSuccessToast(t('journalConfig.messages.created'), overlayGroup))
    } else if (found) {
      found = await JournalConfigService.get(found.id)
    }
    config.value = found
    if (config.value) {
      category.value = config.value.category ?? ''
      includePosting.value = config.value.includePosting
      if (!activeTab.value || !config.value.roles.some((r) => r.roleCode === activeTab.value)) {
        activeTab.value = config.value.roles[0]?.roleCode ?? ''
      }
    }
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    loading.value = false
  }
}

/** Refreshes the header + role completeness counts only — called after any
 *  child action (bases replaced, generated, mappings saved) so tab badges
 *  and the activation button never go stale. */
async function reloadConfig() {
  if (!config.value) {
    return
  }
  try {
    config.value = await JournalConfigService.get(config.value.id)
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  }
}

async function onHeaderFieldChange() {
  if (!config.value) {
    return
  }
  try {
    config.value = await JournalConfigService.update(config.value.id, {
      category: category.value || null,
      includePosting: includePosting.value,
    })
    toast.add(commonSuccessToast(t('journalConfig.messages.saved'), overlayGroup))
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  }
}

// ---------------------------------------------------------------------------
// Role tabs — flush the outgoing tab's dirty rows before switching
// ---------------------------------------------------------------------------

const matrixRefs = ref<Record<string, InstanceType<typeof JournalConfigMatrix> | null>>({})

function setMatrixRef(roleCode: string, el: unknown) {
  matrixRefs.value[roleCode] = el as InstanceType<typeof JournalConfigMatrix> | null
}

async function flushActiveMatrix() {
  await matrixRefs.value[activeTab.value]?.flushDirty()
}

// ---------------------------------------------------------------------------
// Footer actions
// ---------------------------------------------------------------------------

const canActivate = computed(() => !!config.value && isActivatable(config.value))
const activating = ref(false)

async function onSaveAsDraft() {
  await flushActiveMatrix()
  await onHeaderFieldChange()
}

async function onActivate() {
  if (!config.value) {
    return
  }
  await flushActiveMatrix()
  activating.value = true
  try {
    config.value = await JournalConfigService.activate(config.value.id)
    toast.add(commonSuccessToast(t('journalConfig.messages.activated'), overlayGroup))
  } catch (e) {
    // The 409 body carries a per-role breakdown (ConfigIncompleteError), but
    // the shared ApiService only surfaces `message` from an error response —
    // reload instead so the tab badges (already driven by unmappedRows) show
    // exactly which roles are still incomplete.
    if (e instanceof ApiError && e.status === 409) {
      toast.add(commonErrorToast(t('journalConfig.messages.incomplete'), overlayGroup))
      await reloadConfig()
    } else {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  } finally {
    activating.value = false
  }
}

function onCancel() {
  router.back()
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

async function loadCompanyData() {
  if (!selectedCompanyId.value) {
    return
  }
  await loadConfigForSelection()
}

onMounted(async () => {
  await loadDocumentTypes()
  await loadDefaultCompany()
  await loadCompanyData()
})
</script>
