<template>
  <div class="flex flex-col gap-4">
    <!-- Basis Posting selectors -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-semibold">{{ t('journalConfig.labels.basisPosting') }}</label>
      <div class="flex flex-col flex-wrap gap-2 md:flex-row">
        <Select
          v-for="(_, i) in basisSlots"
          :key="i"
          v-model="basisSlots[i]"
          :options="slotOptions(i)"
          option-label="label"
          option-value="key"
          :placeholder="t('journalConfig.labels.basisSlot', { n: i + 1 })"
          :disabled="!canWrite || loadingCatalog"
          class="w-full md:w-48"
          @update:model-value="onBasisSlotChange"
        />
        <Button
          :label="t('journalConfig.labels.generate')"
          icon="pi pi-refresh"
          :loading="generating"
          :disabled="!canWrite"
          @click="onGenerate"
        />
      </div>
      <small class="text-surface-500">{{ t('journalConfig.helpers.generate') }}</small>
    </div>

    <!-- Matrix -->
    <div class="flex items-center justify-between">
      <span class="text-surface-500 text-xs">{{ t('journalConfig.helpers.notSetMeaning') }}</span>
      <div class="flex items-center gap-2">
        <ToggleSwitch
          v-model="onlyUnmapped"
          input-id="onlyUnmapped"
          @update:model-value="onToggleOnlyUnmapped"
        />
        <label for="onlyUnmapped" class="text-sm">{{
          t('journalConfig.labels.onlyUnmapped')
        }}</label>
      </div>
    </div>

    <div class="w-full overflow-x-auto">
      <DataTable
        :value="mappings"
        :loading="loadingMappings"
        lazy
        paginator
        :rows="rows"
        :total-records="meta.total"
        :first="meta.offset"
        data-key="id"
        @page="onPage"
      >
        <Column
          v-for="basis in role.bases ?? []"
          :key="`basis-${basis.position}`"
          :header="basisLabel(basis)"
        >
          <template #body="{ data }">
            <span>{{ valueLabelFor(data, basis) ?? t('journalConfig.labels.notSet') }}</span>
          </template>
        </Column>

        <Column :header="t('journalConfig.fields.account')" style="min-width: 220px">
          <template #body="{ data }">
            <InfiniteSelect
              :model-value="data.accountId ?? undefined"
              :option-label="accountOptionLabel"
              option-value="id"
              :fetch-fn="accountFetchFn"
              :initial-option="accountInitialOption(data)"
              :disabled="!canWrite"
              @update:model-value="(v) => markDirty(data, 'accountId', (v as number) ?? null)"
              @select-option="(opt) => onAccountSelected(data, opt)"
            />
          </template>
        </Column>

        <Column :header="t('journalConfig.fields.subAccount')" style="min-width: 160px">
          <template #body="{ data }">
            <InputText
              :model-value="data.subAccount ?? ''"
              :disabled="!canWrite"
              autocomplete="off"
              @update:model-value="(v) => markDirty(data, 'subAccount', (v as string) || null)"
            />
          </template>
        </Column>

        <Column :header="t('journalConfig.fields.status')" style="width: 5rem">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <i
                v-if="data.isStale"
                class="pi pi-history text-orange-500"
                v-tooltip.top="t('journalConfig.labels.stale')"
              />
              <i
                v-else-if="data.accountId"
                class="pi pi-check-circle text-green-500"
                v-tooltip.top="t('journalConfig.labels.mapped')"
              />
              <i
                v-else
                class="pi pi-exclamation-circle text-red-500"
                v-tooltip.top="t('journalConfig.labels.unmapped')"
              />
              <Button
                v-if="data.isStale && canWrite"
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                :aria-label="t('common.actions.delete')"
                @click="onDeleteRow(data)"
              />
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="text-surface-500 p-4 text-center">{{ t('common.messages.noData') }}</div>
        </template>
      </DataTable>
    </div>

    <Message v-if="role.unmappedRows > 0" severity="warn" :closable="false" class="text-sm">
      {{
        t('journalConfig.warnings.unmappedBanner', {
          unmapped: role.unmappedRows,
          total: role.totalRows,
          role: t(`journalConfig.roles.${role.roleCode}`),
        })
      }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { JournalConfigService, ChartOfAccountsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { basisChanged, dimensionOptionsFor } from './journalConfigMatrix'
import type { Base } from '@/types/api.type'
import type { ChartOfAccount } from '@/types/chartOfAccount.type'
import type {
  JournalBasisDto,
  JournalConfigBasis,
  JournalConfigRole,
  JournalDimension,
  JournalMapping,
  JournalMappingValue,
  SaveMappingDto,
} from '@/types/journalConfig.type'

const props = defineProps<{
  documentTypeCode: string
  configId: number
  companyId: number
  role: JournalConfigRole
  canWrite: boolean
  overlayGroup: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()

// Template-friendly aliases — `props` itself is accessible in the template,
// but `props.role.x` and `props.canWrite` read awkwardly inline.
const role = computed(() => props.role)
const canWrite = computed(() => props.canWrite)

const MAX_BASES = 5

// ---------------------------------------------------------------------------
// Dimension catalog + basis selectors
// ---------------------------------------------------------------------------

const catalog = ref<JournalDimension[]>([])
const loadingCatalog = ref(false)
const basisSlots = ref<(string | null)[]>(Array(MAX_BASES).fill(null))

function basesToSlots(bases: JournalConfigBasis[] | undefined): (string | null)[] {
  const sorted = (bases ?? []).slice().sort((a, b) => a.position - b.position)
  const slots: (string | null)[] = Array(MAX_BASES).fill(null)
  sorted.forEach((b, i) => {
    if (i < MAX_BASES) {
      slots[i] = b.refId != null ? `${b.source}:${b.refId}` : b.source
    }
  })
  return slots
}

async function loadCatalog() {
  loadingCatalog.value = true
  try {
    const result = await JournalConfigService.dimensions(
      props.documentTypeCode,
      props.role.roleCode,
    )
    catalog.value = result.data
  } catch (e) {
    toast.add(commonErrorToast(e, props.overlayGroup))
  } finally {
    loadingCatalog.value = false
  }
}

function slotOptions(index: number): { key: string; label: string }[] {
  const usedKeys = basisSlots.value.filter((k, i) => i !== index && k) as string[]
  const options = dimensionOptionsFor(catalog.value, usedKeys, basisSlots.value[index])
  return [
    { key: '', label: t('journalConfig.labels.none') },
    ...options.map((d) => ({ key: d.key, label: d.label ?? d.key })),
  ]
}

function slotsToBases(): JournalBasisDto[] {
  const selected = basisSlots.value
    .filter((k): k is string => !!k)
    .map((key) => catalog.value.find((d) => d.key === key))
    .filter((dim): dim is JournalDimension => !!dim)
  return selected.map((dim, idx) => ({
    position: idx + 1,
    source: dim.source,
    refId: dim.refId ?? null,
  }))
}

async function submitBases() {
  const newBases = slotsToBases()
  try {
    const result = await JournalConfigService.replaceBases(
      props.configId,
      props.role.roleId,
      newBases,
    )
    basisSlots.value = basesToSlots(result.bases)
    resetPagination()
    await loadMappings()
    toast.add(commonSuccessToast(t('journalConfig.messages.basesSaved'), props.overlayGroup))
    emit('refresh')
  } catch (e) {
    // Revert the UI to the last known-good bases on failure.
    basisSlots.value = basesToSlots(props.role.bases)
    toast.add(commonErrorToast(e, props.overlayGroup))
  }
}

async function onBasisSlotChange() {
  await flushDirty()
  const newBases = slotsToBases()
  if (!basisChanged(props.role.bases ?? [], newBases)) {
    return
  }
  if (props.role.totalRows > 0) {
    confirm.require({
      group: props.overlayGroup,
      message: t('journalConfig.warnings.basisChangeConfirm'),
      header: t('journalConfig.labels.basisPosting'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('common.confirmation.yes') },
      accept: submitBases,
      reject: () => {
        basisSlots.value = basesToSlots(props.role.bases)
      },
    })
  } else {
    await submitBases()
  }
}

const FIXED_DIMENSION_SOURCES = new Set([
  'company',
  'branch',
  'warehouse',
  'customer',
  'customer_category',
  'product',
])

/** Fixed dimensions are translated; label-derived ones (product_label,
 *  customer_label) come from the database and render as-is (master plan). */
function basisLabel(basis: JournalConfigBasis): string {
  if (FIXED_DIMENSION_SOURCES.has(basis.source)) {
    return t(`journalConfig.dimensions.${basis.source}`)
  }
  return basis.label ?? basis.source
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

const generating = ref(false)

async function onGenerate() {
  generating.value = true
  try {
    const result = await JournalConfigService.generate(props.configId, props.role.roleId)
    toast.add(
      commonSuccessToast(
        t('journalConfig.messages.generated', {
          added: result.added,
          kept: result.kept,
          staleMarked: result.staleMarked,
        }),
        props.overlayGroup,
      ),
    )
    resetPagination()
    await loadMappings()
    emit('refresh')
  } catch (e) {
    toast.add(commonErrorToast(e, props.overlayGroup))
  } finally {
    generating.value = false
  }
}

// ---------------------------------------------------------------------------
// Mappings matrix
// ---------------------------------------------------------------------------

const mappings = ref<JournalMapping[]>([])
const meta = ref({ total: 0, limit: 20, offset: 0 })
const rows = 20
const onlyUnmapped = ref(false)
const loadingMappings = ref(false)
const dirtyRows = ref<Map<number, SaveMappingDto>>(new Map())

function resetPagination() {
  meta.value.offset = 0
}

async function loadMappings() {
  loadingMappings.value = true
  try {
    const params = new URLSearchParams({
      limit: String(rows),
      offset: String(meta.value.offset),
      onlyUnmapped: String(onlyUnmapped.value),
    })
    const result = await JournalConfigService.mappings(
      props.configId,
      props.role.roleId,
      params.toString(),
    )
    mappings.value = result.data
    meta.value = result.meta
  } catch (e) {
    toast.add(commonErrorToast(e, props.overlayGroup))
  } finally {
    loadingMappings.value = false
  }
}

async function onPage(event: { first: number; rows: number }) {
  await flushDirty()
  meta.value.offset = event.first
  await loadMappings()
}

async function onToggleOnlyUnmapped() {
  await flushDirty()
  resetPagination()
  await loadMappings()
}

function valueLabelFor(row: JournalMapping, basis: JournalConfigBasis): string | null {
  const value = row.values.find((v: JournalMappingValue) => v.position === basis.position)
  return value?.label ?? null
}

function markDirty(
  row: JournalMapping,
  field: 'accountId' | 'subAccount',
  value: number | string | null,
) {
  if (field === 'accountId') {
    row.accountId = value as number | null
  } else {
    row.subAccount = value as string | null
  }
  const entry = dirtyRows.value.get(row.id) ?? { mappingId: row.id }
  if (field === 'accountId') {
    entry.accountId = value as number | null
  } else {
    entry.subAccount = value as string | null
  }
  dirtyRows.value.set(row.id, entry)
}

function accountOptionLabel(a: ChartOfAccount): string {
  return `${a.code} - ${a.name}`
}

function onAccountSelected(row: JournalMapping, opt: ChartOfAccount) {
  row.accountCode = opt.code
  row.accountName = opt.name
}

function accountInitialOption(row: JournalMapping): ChartOfAccount | undefined {
  if (!row.accountId) {
    return undefined
  }
  // Only id/code/name are read by the picker's label function and initial
  // render — the rest of ChartOfAccount is never accessed for this purpose.
  return {
    id: row.accountId,
    code: row.accountCode ?? '',
    name: row.accountName ?? '',
  } as ChartOfAccount
}

function accountFetchFn(query: string): Promise<Base<ChartOfAccount>> {
  // /v1/chart-of-accounts is a hand-written endpoint (companyId/isActive/
  // isHeader/q/limit/offset), not generic CRUD — translate InfiniteSelect's
  // generic query builder output instead of piping it through unchanged.
  const incoming = new URLSearchParams(query)
  const search = incoming.get('search') ?? ''
  const limit = incoming.get('limit') ?? '200'
  const qs = new URLSearchParams({
    companyId: String(props.companyId),
    isActive: 'true',
    isHeader: 'false',
    limit,
  })
  if (search) {
    qs.set('q', search)
  }
  return ChartOfAccountsService.list(qs.toString())
}

async function onDeleteRow(row: JournalMapping) {
  try {
    await JournalConfigService.deleteMapping(props.configId, props.role.roleId, row.id)
    await loadMappings()
    emit('refresh')
  } catch (e) {
    toast.add(commonErrorToast(e, props.overlayGroup))
  }
}

/** Bulk-saves dirty rows on the current page, dirty rows only. Called
 *  before switching page, tab, or company so edits are never silently
 *  lost. */
async function flushDirty() {
  if (dirtyRows.value.size === 0) {
    return
  }
  const rowsToSave = Array.from(dirtyRows.value.values())
  try {
    await JournalConfigService.saveMappings(props.configId, props.role.roleId, rowsToSave)
    dirtyRows.value = new Map()
    toast.add(commonSuccessToast(t('journalConfig.messages.mappingsSaved'), props.overlayGroup))
    emit('refresh')
  } catch (e) {
    toast.add(commonErrorToast(e, props.overlayGroup))
  }
}

defineExpose({ flushDirty })

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

// Keeps the slot selectors in sync whenever the parent refetches the config
// (e.g. after another tab's action changes role completeness) — `role` is a
// fresh object on every reload, so this also covers a bases change made
// elsewhere. Submitting from this component already sets basisSlots
// directly from the PUT response, so this mostly guards drift.
watch(
  () => props.role.bases,
  (newBases) => {
    basisSlots.value = basesToSlots(newBases)
  },
)

onMounted(async () => {
  basisSlots.value = basesToSlots(props.role.bases)
  await loadCatalog()
  await loadMappings()
})
</script>
