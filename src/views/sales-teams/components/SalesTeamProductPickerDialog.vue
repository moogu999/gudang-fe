<template>
  <Dialog
    :visible="true"
    :header="t('salesTeams.picker.title', { code: team.code })"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '75vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <!-- Segment (a local ref: SelectButton doesn't repaint on programmatic writes through a form) -->
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <SelectButton
        v-model="segment"
        :options="segmentOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        data-testid="segment"
      />
      <IconField class="ml-auto">
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('salesTeams.products.searchPlaceholder')"
          @keydown.enter="fetchCandidates(0)"
        />
      </IconField>
    </div>

    <div class="flex flex-col gap-3 md:flex-row">
      <!-- Principal → category tree, used as a filter -->
      <div class="w-full shrink-0 overflow-auto rounded-md border md:w-72" style="max-height: 60vh">
        <Tree
          v-model:selection-keys="selectedTreeKeys"
          v-model:expanded-keys="expandedTreeKeys"
          :value="treeNodes"
          selection-mode="single"
          :loading="treeLoading"
          class="p-1 text-sm"
          @node-select="onNodeSelect"
          @node-unselect="onNodeUnselect"
        />
      </div>

      <!-- Candidates -->
      <div class="min-w-0 flex-1">
        <DataTable
          :value="candidates"
          data-key="productId"
          selection-mode="multiple"
          :selection="selectionForPage"
          :select-all="allSelectableOnPage"
          lazy
          paginator
          :rows="pageSize"
          :first="page * pageSize"
          :total-records="total"
          :loading="candidatesLoading"
          :row-class="rowClass"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
          :current-page-report-template="
            t('salesTeams.picker.pageReport', {
              first: '{first}',
              last: '{last}',
              total: '{totalRecords}',
            })
          "
          scrollable
          scroll-height="50vh"
          class="text-sm"
          @page="(e: DataTablePageEvent) => fetchCandidates(e.page)"
          @row-select="onRowSelect"
          @row-unselect="onRowUnselect"
          @select-all-change="onSelectAllChange"
        >
          <Column selection-mode="multiple" header-style="width: 3rem" />
          <Column field="code" :header="t('salesTeams.products.columns.code')" class="font-mono" />
          <Column :header="t('salesTeams.products.columns.name')">
            <template #body="{ data }">
              <div>{{ data.name }}</div>
              <div class="text-xs text-stone-500">
                {{ data.principal?.value ?? t('salesTeams.noPrincipal') }} ›
                {{ data.category?.value ?? t('salesTeams.noCategory') }}
              </div>
            </template>
          </Column>
          <Column :header="t('salesTeams.products.columns.uomGroup')">
            <template #body="{ data }">{{ data.uomGroup?.name ?? '—' }}</template>
          </Column>
          <Column :header="t('salesTeams.picker.otherTeams')">
            <template #body="{ data }">
              <Tag
                v-if="data.inThisTeam"
                :value="t('salesTeams.picker.alreadyInTeam')"
                severity="secondary"
              />
              <div v-else-if="data.otherTeams.length" class="flex flex-wrap gap-1">
                <Tag
                  v-for="other in data.otherTeams"
                  :key="other.id"
                  :value="other.code"
                  severity="info"
                />
              </div>
              <span v-else class="text-stone-400">—</span>
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
          </template>
        </DataTable>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <span class="text-sm" data-testid="picker-summary">
          {{ t('salesTeams.picker.selected', { n: selected.size, m: team.skuCount }) }}
        </span>
        <div class="flex gap-2">
          <Button
            :label="t('common.actions.cancel')"
            severity="secondary"
            :disabled="isAdding"
            @click="emit('close')"
          />
          <Button
            :label="t('salesTeams.picker.add', { n: selected.size })"
            :icon="isAdding ? 'pi pi-spinner pi-spin' : 'pi pi-plus'"
            :disabled="selected.size === 0 || isAdding"
            data-testid="picker-add"
            @click="addSelected"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Tree, { type TreeExpandedKeys, type TreeSelectionKeys } from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type {
  LabelBucketFilter,
  PickerCandidate,
  PickerSegment,
  PickerTreeNode,
  SalesTeam,
} from '@/types/salesTeam.type'

const props = defineProps<{
  team: Pick<SalesTeam, 'id' | 'code' | 'skuCount'>
  /** The page's toast group, so the result outlives the dialog. */
  toastGroup?: string
}>()

const emit = defineEmits<{ added: []; close: [] }>()

const { t } = useI18n()
const toast = useToast()
const toastGroup = computed(() => props.toastGroup ?? 'salesTeamEdit')

const pageSize = 100

const segment = ref<PickerSegment>('notInTeam')
const segmentOptions = computed(() => [
  { label: t('salesTeams.picker.segments.notInTeam'), value: 'notInTeam' },
  { label: t('salesTeams.picker.segments.all'), value: 'all' },
  { label: t('salesTeams.picker.segments.uncovered'), value: 'uncovered' },
])
const search = ref('')

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

const ALL_KEY = 'all'
const NONE = 'none'

const treeNodes = ref<TreeNode[]>([])
const treeLoading = ref(false)
const selectedTreeKeys = ref<TreeSelectionKeys>({ [ALL_KEY]: true })
const expandedTreeKeys = ref<TreeExpandedKeys>({ [ALL_KEY]: true })
/** What each tree node filters the candidates by. */
const nodeFilters = new Map<string, LabelBucketFilter>()
const activeFilter = ref<LabelBucketFilter>({})

function principalBucket(node: PickerTreeNode): LabelBucketFilter {
  return node.principalOptionId
    ? { principalOptionId: node.principalOptionId }
    : { noPrincipal: true }
}

function buildTree(nodes: PickerTreeNode[]): TreeNode[] {
  nodeFilters.clear()
  nodeFilters.set(ALL_KEY, {})
  const total = nodes.reduce((sum, n) => sum + n.count, 0)
  const children = nodes.map((node): TreeNode => {
    const principalKey = `p:${node.principalOptionId ?? NONE}`
    const principal = principalBucket(node)
    nodeFilters.set(principalKey, principal)
    return {
      key: principalKey,
      label: `${node.name ?? t('salesTeams.noPrincipal')} (${node.count})`,
      children: node.categories.map((category) => {
        const key = `${principalKey}|c:${category.categoryOptionId ?? NONE}`
        nodeFilters.set(key, {
          ...principal,
          ...(category.categoryOptionId
            ? { categoryOptionId: category.categoryOptionId }
            : { noCategory: true }),
        })
        return {
          key,
          label: `${category.name ?? t('salesTeams.noCategory')} (${category.count})`,
        }
      }),
    }
  })
  return [{ key: ALL_KEY, label: `${t('salesTeams.picker.allProducts')} (${total})`, children }]
}

async function fetchTree() {
  treeLoading.value = true
  try {
    treeNodes.value = buildTree(await SalesTeamsService.pickerTree(props.team.id, segment.value))
    // The selected node may not exist in the new segment; fall back to everything.
    const selectedKey = Object.keys(selectedTreeKeys.value)[0]
    if (!selectedKey || !nodeFilters.has(selectedKey)) {
      selectedTreeKeys.value = { [ALL_KEY]: true }
      activeFilter.value = {}
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup.value))
  } finally {
    treeLoading.value = false
  }
}

function onNodeSelect(node: TreeNode) {
  activeFilter.value = nodeFilters.get(String(node.key)) ?? {}
  fetchCandidates(0)
}

function onNodeUnselect() {
  // Clicking the selected node again clears the filter, like picking "All".
  selectedTreeKeys.value = { [ALL_KEY]: true }
  activeFilter.value = {}
  fetchCandidates(0)
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

const candidates = ref<PickerCandidate[]>([])
const total = ref(0)
const page = ref(0)
const candidatesLoading = ref(false)

async function fetchCandidates(p: number) {
  candidatesLoading.value = true
  page.value = p
  try {
    const res = await SalesTeamsService.pickerCandidates(props.team.id, {
      segment: segment.value,
      ...activeFilter.value,
      q: search.value.trim() || undefined,
      limit: pageSize,
      offset: p * pageSize,
    })
    candidates.value = res.data
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup.value))
  } finally {
    candidatesLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Selection: kept across pages, segments and tree nodes, so it lives in a map
// of its own rather than in the table's page-scoped state.
// ---------------------------------------------------------------------------

const selected = ref(new Map<number, PickerCandidate>())

const selectableOnPage = computed(() => candidates.value.filter((c) => !c.inThisTeam))

const selectionForPage = computed(() =>
  candidates.value.filter((c) => selected.value.has(c.productId)),
)

// PrimeVue only emits `select-all-change` while `select-all` is non-null.
const allSelectableOnPage = computed(
  () =>
    selectableOnPage.value.length > 0 &&
    selectableOnPage.value.every((c) => selected.value.has(c.productId)),
)

function rowClass(row: PickerCandidate) {
  return row.inThisTeam ? 'opacity-50 pointer-events-none' : ''
}

function onRowSelect(event: { data: PickerCandidate }) {
  // A product the team already carries can't be added again.
  if (event.data.inThisTeam) return
  selected.value.set(event.data.productId, event.data)
}

function onRowUnselect(event: { data: PickerCandidate }) {
  selected.value.delete(event.data.productId)
}

function onSelectAllChange(event: { checked: boolean }) {
  for (const candidate of selectableOnPage.value) {
    if (event.checked) selected.value.set(candidate.productId, candidate)
    else selected.value.delete(candidate.productId)
  }
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const isAdding = ref(false)

async function addSelected() {
  isAdding.value = true
  try {
    const res = await SalesTeamsService.addProducts(props.team.id, [...selected.value.keys()])
    toast.add(
      commonSuccessToast(
        t('salesTeams.messages.productsAdded', { added: res.added, skipped: res.skipped }),
        toastGroup.value,
      ),
    )
    emit('added')
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup.value))
  } finally {
    isAdding.value = false
  }
}

watch(segment, async () => {
  await fetchTree()
  await fetchCandidates(0)
})

onMounted(async () => {
  await Promise.all([fetchTree(), fetchCandidates(0)])
})
</script>
