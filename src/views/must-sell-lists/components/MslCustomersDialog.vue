<template>
  <Dialog
    :visible="visible"
    :header="t('mustSellLists.customers.title')"
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
          :placeholder="t('mustSellLists.customers.search')"
          data-testid="customers-search"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
      <span class="text-sm text-stone-500">
        {{ t('mustSellLists.customers.total', { n: formatNumber(total, locale) }) }}
      </span>
    </div>

    <DataTable
      :value="rows"
      data-key="id"
      lazy
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :loading="loading"
      scrollable
      scroll-height="50vh"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
    >
      <Column field="code" :header="t('mustSellLists.customers.columns.code')" class="font-mono" />
      <Column field="name" :header="t('mustSellLists.customers.columns.name')" />
      <Column :header="t('mustSellLists.customers.columns.outletType')">
        <template #body="{ data }">{{ data.outletType ?? '—' }}</template>
      </Column>
      <Column :header="t('mustSellLists.customers.columns.channel')">
        <template #body="{ data }">{{ data.channel ?? '—' }}</template>
      </Column>
      <Column :header="t('mustSellLists.customers.columns.category')">
        <template #body="{ data }">{{ data.category ?? '—' }}</template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
      </template>
    </DataTable>

    <template #footer>
      <Button :label="t('common.actions.close')" @click="emit('close')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { MustSellListsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { MslCustomer, MslScopeLevel } from '@/types/mustSellList.type'
import { formatNumber } from '../mustSellListHelpers'

const props = defineProps<{
  visible: boolean
  branchId: number
  scopeLevel: MslScopeLevel
  scopeAll: boolean
  scopeValueIds: number[]
  toastGroup?: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const toast = useToast()

const pageSize = 20
const search = ref('')
const rows = ref<MslCustomer[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)

async function fetchPage(p: number) {
  loading.value = true
  page.value = p
  try {
    const res = await MustSellListsService.customers({
      branchId: props.branchId,
      scopeLevel: props.scopeLevel,
      scopeAll: props.scopeAll,
      scopeValueIds: props.scopeValueIds,
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

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    search.value = ''
    fetchPage(0)
  },
  { immediate: true },
)
</script>
