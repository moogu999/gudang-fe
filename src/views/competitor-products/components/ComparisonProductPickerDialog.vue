<template>
  <Dialog
    :visible="true"
    :header="t('competitorProducts.comparisons.pickerTitle')"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '60vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('competitorProducts.comparisons.search')"
          data-testid="picker-search"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
      <div v-if="categoryOptionId" class="flex items-center gap-2">
        <ToggleSwitch v-model="sameCategoryOnly" input-id="sameCategory" data-testid="same-category" />
        <label for="sameCategory" class="text-sm">{{
          t('competitorProducts.comparisons.sameCategoryOnly')
        }}</label>
      </div>
    </div>

    <DataTable
      :value="rows"
      data-key="id"
      selection-mode="multiple"
      :selection="selectionForPage"
      :select-all="allSelectableOnPage"
      lazy
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :loading="loading"
      :row-class="rowClass"
      scrollable
      scroll-height="50vh"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
      @row-select="onRowSelect"
      @row-unselect="onRowUnselect"
      @select-all-change="onSelectAllChange"
    >
      <Column selection-mode="multiple" header-style="width: 3rem" />
      <Column
        field="code"
        :header="t('competitorProducts.comparisons.columnCode')"
        class="font-mono"
      />
      <Column field="name" :header="t('competitorProducts.comparisons.columnName')" />
      <Column :header="t('competitorProducts.comparisons.columnPrincipal')">
        <template #body="{ data }">{{ data.principalName ?? '—' }}</template>
      </Column>
      <Column :header="t('competitorProducts.comparisons.columnCategory')">
        <template #body="{ data }">
          <Tag
            v-if="excludeIds.includes(data.id)"
            :value="t('competitorProducts.comparisons.added')"
            severity="secondary"
          />
          <span v-else>{{ data.categoryName ?? '—' }}</span>
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
      </template>
    </DataTable>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <span class="text-sm">{{
          t('competitorProducts.comparisons.selected', { n: selected.size })
        }}</span>
        <div class="flex gap-2">
          <Button
            :label="t('common.actions.cancel')"
            severity="secondary"
            @click="emit('close')"
          />
          <Button
            :label="t('competitorProducts.comparisons.addSelected', { n: selected.size })"
            icon="pi pi-plus"
            :disabled="selected.size === 0"
            data-testid="picker-add"
            @click="confirm"
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
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import { ProductLabelDefinitionsService, ProductsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { ProductWithLabels } from '@/types/product.type'

export interface PickedProduct {
  id: number
  code: string
  name: string
  categoryName?: string
  principalName?: string
}

const props = defineProps<{
  /** The competitor product's category, which "same category only" filters by. */
  categoryOptionId?: number
  /** Products already in the comparison list, shown as added and not selectable. */
  excludeIds: number[]
  toastGroup?: string
}>()

const emit = defineEmits<{ select: [products: PickedProduct[]]; close: [] }>()

const { t } = useI18n()
const toast = useToast()

const pageSize = 20

const search = ref('')
const sameCategoryOnly = ref(!!props.categoryOptionId)
const categoryDefinitionId = ref<number | undefined>()
const principalDefinitionId = ref<number | undefined>()

const rows = ref<PickedProduct[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)

// Kept across pages and searches, so it lives apart from the table's page-scoped state.
const selected = ref(new Map<number, PickedProduct>())

function toPicked(p: ProductWithLabels): PickedProduct {
  const labelOf = (definitionId?: number) =>
    definitionId ? p.labels?.find((l) => l.labelDefinitionId === definitionId)?.optionValue : undefined
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    categoryName: labelOf(categoryDefinitionId.value),
    principalName: labelOf(principalDefinitionId.value),
  }
}

async function fetchPage(p: number) {
  loading.value = true
  page.value = p
  try {
    const params = new URLSearchParams({ page: String(p + 1), limit: String(pageSize) })
    if (search.value.trim()) params.set('search', search.value.trim())
    const parts = [params.toString()]
    if (sameCategoryOnly.value && props.categoryOptionId && categoryDefinitionId.value) {
      parts.push(ProductsService.labelFilterParam(categoryDefinitionId.value, props.categoryOptionId))
    }
    const res = await ProductsService.searchWithLabels(parts.join('&'))
    rows.value = (res.data ?? []).map(toPicked)
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup ?? ''))
  } finally {
    loading.value = false
  }
}

const selectableOnPage = computed(() => rows.value.filter((r) => !props.excludeIds.includes(r.id)))
const selectionForPage = computed(() => rows.value.filter((r) => selected.value.has(r.id)))
const allSelectableOnPage = computed(
  () =>
    selectableOnPage.value.length > 0 && selectableOnPage.value.every((r) => selected.value.has(r.id)),
)

function rowClass(row: PickedProduct) {
  return props.excludeIds.includes(row.id) ? 'opacity-50 pointer-events-none' : ''
}

function onRowSelect(event: { data: PickedProduct }) {
  if (props.excludeIds.includes(event.data.id)) return
  selected.value.set(event.data.id, event.data)
}

function onRowUnselect(event: { data: PickedProduct }) {
  selected.value.delete(event.data.id)
}

function onSelectAllChange(event: { checked: boolean }) {
  for (const row of selectableOnPage.value) {
    if (event.checked) selected.value.set(row.id, row)
    else selected.value.delete(row.id)
  }
}

function confirm() {
  emit('select', [...selected.value.values()])
}

watch(sameCategoryOnly, () => fetchPage(0))

onMounted(async () => {
  try {
    const [category, principal] = await Promise.all([
      ProductLabelDefinitionsService.findSystem('category'),
      ProductLabelDefinitionsService.findSystem('principal'),
    ])
    categoryDefinitionId.value = category?.id
    principalDefinitionId.value = principal?.id
  } catch {
    // Without the definitions the list still works, just unfiltered and without label columns.
  }
  await fetchPage(0)
})
</script>
