<template>
  <Dialog
    :visible="true"
    :header="t('mustSellLists.products.pickerTitle')"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '60vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="mb-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('mustSellLists.products.search')"
          data-testid="picker-search"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
    </div>

    <DataTable
      :value="rows"
      data-key="productId"
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
      <Column field="code" :header="t('mustSellLists.products.columns.code')" class="font-mono" />
      <Column field="name" :header="t('mustSellLists.products.columns.product')" />
      <Column :header="t('mustSellLists.products.columns.category')">
        <template #body="{ data }">
          <Tag
            v-if="excludeIds.includes(data.productId)"
            :value="t('mustSellLists.products.added')"
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
          t('mustSellLists.products.selected', { n: selected.size })
        }}</span>
        <div class="flex gap-2">
          <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('close')" />
          <Button
            :label="t('mustSellLists.products.addSelected', { n: selected.size })"
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { MustSellListsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { MslProductOption } from '@/types/mustSellList.type'

const props = defineProps<{
  /** Only products carrying this principal can be listed. */
  principalOptionId: number
  /** Products already in the list, shown as added and not selectable. */
  excludeIds: number[]
  toastGroup?: string
}>()

const emit = defineEmits<{ select: [products: MslProductOption[]]; close: [] }>()

const { t } = useI18n()
const toast = useToast()

const pageSize = 20

const search = ref('')
const rows = ref<MslProductOption[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)

// Kept across pages and searches, so it lives apart from the table's page-scoped state.
const selected = ref(new Map<number, MslProductOption>())

async function fetchPage(p: number) {
  loading.value = true
  page.value = p
  try {
    const res = await MustSellListsService.productOptions({
      principalOptionId: props.principalOptionId,
      q: search.value.trim() || undefined,
      limit: pageSize,
      offset: p * pageSize,
    })
    rows.value = res.data ?? []
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup ?? ''))
  } finally {
    loading.value = false
  }
}

const selectableOnPage = computed(() =>
  rows.value.filter((r) => !props.excludeIds.includes(r.productId)),
)
const selectionForPage = computed(() => rows.value.filter((r) => selected.value.has(r.productId)))
const allSelectableOnPage = computed(
  () =>
    selectableOnPage.value.length > 0 &&
    selectableOnPage.value.every((r) => selected.value.has(r.productId)),
)

function rowClass(row: MslProductOption) {
  return props.excludeIds.includes(row.productId) ? 'opacity-50 pointer-events-none' : ''
}

function onRowSelect(event: { data: MslProductOption }) {
  if (props.excludeIds.includes(event.data.productId)) return
  selected.value.set(event.data.productId, event.data)
}

function onRowUnselect(event: { data: MslProductOption }) {
  selected.value.delete(event.data.productId)
}

function onSelectAllChange(event: { checked: boolean }) {
  for (const row of selectableOnPage.value) {
    if (event.checked) selected.value.set(row.productId, row)
    else selected.value.delete(row.productId)
  }
}

function confirm() {
  emit('select', [...selected.value.values()])
}

onMounted(() => fetchPage(0))
</script>
