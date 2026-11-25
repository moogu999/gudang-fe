<template>
  <Dialog
    :visible="visible"
    :header="t('routes.unrouted.title')"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '50vw' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="mb-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('routes.unrouted.search')"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
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
      scroll-height="45vh"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
    >
      <Column field="code" :header="t('routes.unrouted.columns.code')" class="font-mono" />
      <Column field="name" :header="t('routes.unrouted.columns.name')" />
      <Column :header="t('routes.unrouted.columns.customerType')">
        <template #body="{ data }">{{ data.outletType ?? '—' }}</template>
      </Column>
      <Column :header="t('routes.unrouted.columns.address')">
        <template #body="{ data }">{{ data.address ?? '—' }}</template>
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
import { RoutesService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { UnroutedCustomer } from '@/types'

const props = defineProps<{ visible: boolean; branchId: number; toastGroup: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()

const pageSize = 10
const rows = ref<UnroutedCustomer[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const search = ref('')

async function fetchPage(nextPage: number) {
  loading.value = true
  try {
    const res = await RoutesService.unroutedCustomers(props.branchId, {
      search: search.value.trim() || undefined,
      limit: pageSize,
      offset: nextPage * pageSize,
    })
    rows.value = res.data
    total.value = res.meta.total
    page.value = nextPage
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (shown) => {
    if (shown) fetchPage(0)
  },
  { immediate: true },
)
</script>
