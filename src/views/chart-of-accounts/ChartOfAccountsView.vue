<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('chartOfAccounts.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #start>
        <div class="flex flex-wrap items-center gap-2">
          <InfiniteSelect
            v-model="selectedCompanyId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => CompaniesService.list(query)"
            :placeholder="t('chartOfAccounts.labels.selectCompany')"
            :initial-option="initialCompany"
            sort-by="name"
            sort-operator="asc"
            class="w-48 sm:w-64"
            @update:model-value="onCompanyChange"
          />

          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchInput"
              :placeholder="t('common.actions.search')"
              class="w-40 sm:w-56"
              @update:model-value="onSearchInput"
            />
          </IconField>

          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="showInactive" input-id="showInactive" />
            <label for="showInactive" class="text-sm">{{
              t('chartOfAccounts.labels.showInactive')
            }}</label>
          </div>

          <Button
            :label="t('chartOfAccounts.labels.collapseAll')"
            severity="secondary"
            text
            size="small"
            @click="collapseAll"
          />
          <Button
            :label="t('chartOfAccounts.labels.expandAll')"
            severity="secondary"
            text
            size="small"
            @click="expandAll"
          />
        </div>
      </template>
      <template #end>
        <ResponsiveButton
          v-if="canWrite"
          :label="t('chartOfAccounts.addAccount')"
          @click="addAccount()"
        />
      </template>
    </Toolbar>

    <div class="mb-4 flex flex-wrap gap-2">
      <Button
        :label="t('chartOfAccounts.labels.all')"
        :severity="selectedTypeId === 'all' ? 'primary' : 'secondary'"
        size="small"
        :outlined="selectedTypeId !== 'all'"
        @click="selectedTypeId = 'all'"
      />
      <Button
        v-for="type in accountTypes"
        :key="type.id"
        :label="type.name"
        :severity="selectedTypeId === type.id ? 'primary' : 'secondary'"
        size="small"
        :outlined="selectedTypeId !== type.id"
        @click="selectedTypeId = type.id"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <div class="w-full overflow-x-auto">
          <TreeTable
            :value="displayNodes"
            v-model:expanded-keys="expandedKeys"
            data-key="key"
            :loading="loading"
            class="w-full"
          >
            <Column field="name" :header="t('chartOfAccounts.fields.codeAndName')" expander>
              <template #body="{ node }">
                <span class="font-mono">{{ (node.data as ChartOfAccount).code }}</span>
                <span
                  :class="
                    (node.data as ChartOfAccount).isHeader
                      ? 'text-surface-600 ml-2 font-semibold'
                      : 'ml-2'
                  "
                >
                  {{ (node.data as ChartOfAccount).name }}
                </span>
              </template>
            </Column>

            <Column
              v-if="!isMobile"
              field="accountType"
              :header="t('chartOfAccounts.fields.accountType')"
            >
              <template #body="{ node }">
                <Tag
                  v-if="(node.data as ChartOfAccount).accountType"
                  :value="(node.data as ChartOfAccount).accountType!.name"
                  severity="secondary"
                />
              </template>
            </Column>

            <Column
              v-if="!isMobile"
              field="normalBalance"
              :header="t('chartOfAccounts.fields.normalBalance')"
            >
              <template #body="{ node }">
                <span class="font-mono">{{
                  (node.data as ChartOfAccount).normalBalance === 'DEBIT'
                    ? t('chartOfAccounts.labels.debit')
                    : t('chartOfAccounts.labels.credit')
                }}</span>
              </template>
            </Column>

            <Column field="flags" :header="t('chartOfAccounts.fields.flags')">
              <template #body="{ node }">
                <span class="flex items-center gap-2">
                  <i
                    v-if="(node.data as ChartOfAccount).controlAccountTypeId"
                    class="pi pi-lock text-surface-500"
                    v-tooltip.top="(node.data as ChartOfAccount).controlAccountType?.name"
                  />
                  <i
                    v-if="(node.data as ChartOfAccount).isRetainedEarnings"
                    class="pi pi-star-fill text-yellow-500"
                    v-tooltip.top="t('chartOfAccounts.fields.retainedEarnings')"
                  />
                </span>
              </template>
            </Column>

            <Column field="isActive" :header="t('common.labels.status')">
              <template #body="{ node }">
                <Tag
                  :value="
                    (node.data as ChartOfAccount).isActive
                      ? t('common.labels.active')
                      : t('common.labels.inactive')
                  "
                  :severity="(node.data as ChartOfAccount).isActive ? 'success' : 'secondary'"
                />
              </template>
            </Column>

            <Column field="actions" :header="t('common.labels.actions')">
              <template #body="{ node }">
                <div class="flex items-center gap-1">
                  <TableActionButtons
                    :can-write="canWrite"
                    @edit="editAccount(node.data as ChartOfAccount)"
                    @delete="onDeleteClick((node.data as ChartOfAccount).id)"
                    @view="viewAccount(node.data as ChartOfAccount)"
                  />
                  <Button
                    v-if="canWrite && (node.data as ChartOfAccount).isHeader"
                    icon="pi pi-plus"
                    severity="contrast"
                    text
                    rounded
                    outlined
                    :aria-label="t('chartOfAccounts.addAccount')"
                    class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:!rounded-md"
                    @click="addAccount(node.data as ChartOfAccount)"
                  />
                </div>
              </template>
            </Column>

            <template #empty>
              <div class="text-surface-500 p-4 text-center">{{ t('common.messages.noData') }}</div>
            </template>
          </TreeTable>
        </div>
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
      <ChartOfAccountDialog
        v-if="selectedCompanyId"
        :mode="dialogMode"
        :company-id="selectedCompanyId"
        :account="account"
        :default-parent="defaultParent"
        :parent-candidates="parentCandidates"
        @close="close"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TreeTable from 'primevue/treetable'
import Column from 'primevue/column'
import Toolbar from 'primevue/toolbar'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ToggleSwitch from 'primevue/toggleswitch'
import { ref, computed, onMounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ChartOfAccountDialog from './ChartOfAccountDialog.vue'
import {
  toTreeNodes,
  filterTree,
  expandedKeysFor,
  allExpandedKeys,
  flattenTree,
  normalizeTree,
} from './treeFilter'
import { useConfirmDelete, useDialog, usePermissions, useResponsiveSize } from '@/composables'
import { ChartOfAccountsService, AccountTypesService, CompaniesService } from '@/services'
import type { ChartOfAccount, ChartOfAccountNode, AccountType, Company } from '@/types'
import DialogMode from '@/constants/dialogMode'

const { t } = useI18n()
const { isMobile } = useResponsiveSize()

const overlayGroup = 'chartOfAccountsView'

const { canWrite } = usePermissions('/chart-of-accounts')

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

function onCompanyChange() {
  loadTree()
}

// ---------------------------------------------------------------------------
// Tree data
// ---------------------------------------------------------------------------

const rawTree = ref<ChartOfAccountNode[]>([])
const loading = ref(false)
const expandedKeys = ref<Record<string, boolean>>({})

async function loadTree() {
  if (!selectedCompanyId.value) {
    return
  }

  loading.value = true
  try {
    rawTree.value = normalizeTree(await ChartOfAccountsService.tree(selectedCompanyId.value, true))
    expandedKeys.value = {}
  } finally {
    loading.value = false
  }
}

// Every account is a legal parent, not just Header ones — a Detail parent is
// allowed (mockup rule 3), only warned about client-side in the dialog.
const parentCandidates = computed(() => flattenTree(rawTree.value))

// ---------------------------------------------------------------------------
// Search + filters
// ---------------------------------------------------------------------------

const searchInput = ref('')
const searchQuery = ref('')
const onSearchInput = useDebounceFn((value: string | undefined) => {
  searchQuery.value = value ?? ''
}, 300)

const accountTypes = ref<AccountType[]>([])
const selectedTypeId = ref<number | 'all'>('all')
const showInactive = ref(true)

async function loadAccountTypes() {
  const result = await AccountTypesService.list('sortBy=sortOrder&sortOperator=asc&limit=100')
  accountTypes.value = result.data
}

const isFiltering = computed(
  () => searchQuery.value.trim() !== '' || selectedTypeId.value !== 'all' || !showInactive.value,
)

const filteredTree = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return filterTree(rawTree.value, (n) => {
    const matchesSearch =
      query === '' || n.code.toLowerCase().includes(query) || n.name.toLowerCase().includes(query)
    const matchesType = selectedTypeId.value === 'all' || n.accountTypeId === selectedTypeId.value
    const matchesActive = showInactive.value || n.isActive

    return matchesSearch && matchesType && matchesActive
  })
})

const displayNodes = computed(() => toTreeNodes(filteredTree.value))

watch([filteredTree, isFiltering], () => {
  if (isFiltering.value) {
    expandedKeys.value = expandedKeysFor(filteredTree.value)
  }
})

watch(isFiltering, (filtering) => {
  if (!filtering) {
    expandedKeys.value = {}
  }
})

function collapseAll() {
  expandedKeys.value = {}
}

function expandAll() {
  expandedKeys.value = allExpandedKeys(rawTree.value)
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

const dialogMode = ref(DialogMode.ADD)
const account = ref<ChartOfAccount | undefined>(undefined)
const defaultParent = ref<ChartOfAccount | undefined>(undefined)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) {
    return t('chartOfAccounts.addAccount')
  } else if (dialogMode.value === DialogMode.EDIT) {
    return t('chartOfAccounts.editAccount')
  } else {
    return t('chartOfAccounts.viewAccount')
  }
})

const {
  isVisible: isDialogShown,
  open,
  close,
} = useDialog({
  onClose: async () => {
    await loadTree()
  },
})

function addAccount(parent?: ChartOfAccount) {
  dialogMode.value = DialogMode.ADD
  account.value = undefined
  defaultParent.value = parent
  open()
}

function editAccount(selected: ChartOfAccount) {
  dialogMode.value = DialogMode.EDIT
  account.value = selected
  defaultParent.value = undefined
  open()
}

function viewAccount(selected: ChartOfAccount) {
  dialogMode.value = DialogMode.VIEW
  account.value = selected
  defaultParent.value = undefined
  open()
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'account',
  onSuccess: async () => {
    await loadTree()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => ChartOfAccountsService.delete(id))
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

onMounted(async () => {
  await loadDefaultCompany()
  await Promise.all([loadTree(), loadAccountTypes()])
})
</script>
