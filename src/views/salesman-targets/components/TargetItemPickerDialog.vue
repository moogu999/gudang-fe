<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('salesmanTargets.picker.title', { level: t(`salesmanTargets.levels.${level}`) })"
    :style="{ width: '56rem' }"
    :breakpoints="{ '960px': '90vw' }"
    @update:visible="(v) => !v && emit('close')"
  >
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <IconField class="min-w-56 flex-1">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          class="w-full"
          :placeholder="t('salesmanTargets.picker.search')"
          @keydown.enter.prevent="reload"
        />
      </IconField>
      <Select
        v-if="source === 'internal'"
        v-model="principalFilter"
        :options="principalOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('salesmanTargets.items.allPrincipals')"
        show-clear
        filter
        class="min-w-48"
        @update:model-value="reload"
      />
    </div>

    <DataTable
      v-model:selection="selection"
      :value="rows"
      data-key="rowId"
      lazy
      paginator
      :rows="limit"
      :first="first"
      :total-records="total"
      :loading="isLoading"
      :is-row-selectable="isRowSelectable"
      scrollable
      scroll-height="22rem"
      @page="onPage"
    >
      <Column selection-mode="multiple" header-style="width: 3rem" />
      <template v-if="level === 'product'">
        <Column field="productCode" :header="t('salesmanTargets.picker.code')" />
        <Column field="productName" :header="t('salesmanTargets.picker.name')" />
      </template>
      <template v-else>
        <Column field="categoryName" :header="t('salesmanTargets.picker.category')" />
        <Column :header="t('salesmanTargets.picker.principal')">
          <template #body="{ data }">
            {{ data.principalName ?? t('salesmanTargets.items.allPrincipals') }}
          </template>
        </Column>
        <Column field="skuCount" :header="t('salesmanTargets.picker.skus')" />
        <Column :header="t('salesmanTargets.picker.units')">
          <template #body="{ data }">
            <span v-if="data.uniformUnits && data.units.length > 1">
              {{ data.units.map((u: TargetUnit) => u.symbol).join(' / ') }}
            </span>
            <span v-else class="text-stone-500">{{ t('salesmanTargets.picker.baseOnly') }}</span>
          </template>
        </Column>
      </template>
      <template #empty>
        <p class="py-4 text-center text-stone-500">{{ t('salesmanTargets.picker.empty') }}</p>
      </template>
    </DataTable>

    <template #footer>
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        @click="emit('close')"
      />
      <Button
        type="button"
        :label="t('salesmanTargets.picker.add', { n: selection.length })"
        :disabled="selection.length === 0"
        @click="onAdd"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { SalesmanTargetsService } from '@/services'
import type {
  SalesmanTargetItemOption,
  TargetLevel,
  TargetSource,
  TargetUnit,
} from '@/types/salesmanTarget.type'
import { NO_LABEL, loadLabelFilterOptions } from '@/views/sales-teams/salesTeamHelpers'
import { type FormItem, newItemKey } from '../salesmanTargetGrid'

type PickerRow = SalesmanTargetItemOption & { rowId: string; taken: boolean }

const props = defineProps<{
  visible: boolean
  branchId: number
  level: TargetLevel
  source: TargetSource
  /** The header principal of a principal document. */
  principalOptionId?: number
  /** Items already in the document. */
  existing: FormItem[]
}>()

const emit = defineEmits<{
  close: []
  add: [items: FormItem[]]
}>()

const { t } = useI18n()

const limit = 10
const search = ref('')
const principalFilter = ref<number | undefined>()
const principalOptions = ref<{ label: string; value: number }[]>([])
const rows = ref<PickerRow[]>([])
const selection = ref<PickerRow[]>([])
const total = ref(0)
const first = ref(0)
const isLoading = ref(false)

/** Identifies what an option or an item covers, so an item can't be added twice. */
function identity(o: {
  productId?: number
  categoryOptionId?: number
  principalOptionId?: number
}): string {
  if (o.productId) return `p:${o.productId}`
  // Only an internal document tells the same category of different principals apart.
  const principal = props.source === 'internal' ? (o.principalOptionId ?? 0) : 0
  return `c:${o.categoryOptionId}:${principal}`
}

async function load() {
  isLoading.value = true
  try {
    const taken = new Set(props.existing.map(identity))
    const res = await SalesmanTargetsService.itemOptions({
      branchId: props.branchId,
      level: props.level,
      principalOptionId:
        props.source === 'principal' ? props.principalOptionId : principalFilter.value,
      q: search.value.trim() || undefined,
      limit,
      offset: first.value,
    })
    rows.value = res.data.map((o) => ({ ...o, rowId: identity(o), taken: taken.has(identity(o)) }))
    total.value = res.meta.total
  } finally {
    isLoading.value = false
  }
}

function isRowSelectable(e: { data: PickerRow }): boolean {
  return !e.data.taken
}

function reload() {
  first.value = 0
  load()
}

function onPage(e: DataTablePageEvent) {
  first.value = e.first
  load()
}

function onAdd() {
  const items: FormItem[] = selection.value.map((o) => ({
    key: newItemKey(),
    productId: o.productId,
    productCode: o.productCode,
    productName: o.productName,
    categoryOptionId: o.categoryOptionId,
    categoryName: o.categoryName,
    principalOptionId: o.principalOptionId,
    principalName: o.principalName,
    uomId: o.defaultUomId ?? null,
    units: o.uniformUnits ? o.units : [],
    skuCount: o.skuCount,
    skuSample: o.skuSample,
    alsoIn: [],
  }))
  emit('add', items)
}

// nextTick: the dialog's props (branch, principal) must have settled before the fetch.
watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    selection.value = []
    search.value = ''
    principalFilter.value = undefined
    first.value = 0
    if (props.source === 'internal' && principalOptions.value.length === 0) {
      try {
        const options = await loadLabelFilterOptions('principal', '')
        principalOptions.value = options
          .filter((o) => o.value !== NO_LABEL)
          .map((o) => ({ label: o.label, value: o.value as number }))
      } catch {
        // The principal filter just stays empty.
      }
    }
    await load()
  },
  { immediate: true },
)
</script>
