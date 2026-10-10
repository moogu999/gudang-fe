<template>
  <Dialog
    :visible="visible"
    :header="t('salesTeams.banner.dialogTitle', { branch: branchName })"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '50vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
    @show="fetchPage(0)"
  >
    <p class="mb-3 text-sm text-stone-500">{{ t('salesTeams.banner.caveat') }}</p>
    <DataTable
      :value="rows"
      data-key="productId"
      lazy
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :loading="loading"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
    >
      <Column field="code" :header="t('salesTeams.products.columns.code')" />
      <Column field="name" :header="t('salesTeams.products.columns.name')" />
      <Column :header="t('salesTeams.products.columns.principal')">
        <template #body="{ data }">
          {{ data.principal?.value ?? t('salesTeams.noPrincipal') }}
        </template>
      </Column>
      <Column :header="t('salesTeams.banner.addedAt')">
        <template #body="{ data }">
          {{ data.createdAt ? dayjs(data.createdAt).format(DateFormat.DATE) : '—' }}
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
      </template>
    </DataTable>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Dialog from 'primevue/dialog'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import DateFormat from '@/constants/dateFormat'
import type { UncoveredProduct } from '@/types/salesTeam.type'

const props = defineProps<{
  visible: boolean
  branchId: number
  branchName: string
  toastGroup: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()

const pageSize = 20
const rows = ref<UncoveredProduct[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)

async function fetchPage(p: number) {
  loading.value = true
  page.value = p
  try {
    const res = await SalesTeamsService.uncoveredProducts(props.branchId, {
      limit: pageSize,
      offset: p * pageSize,
    })
    rows.value = res.data
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
