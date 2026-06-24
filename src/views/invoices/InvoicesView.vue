<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('invoices.title') }}
    </h1>

    <ResponsiveCard>
      <template #content>
        <DataTable
          :value="items"
          data-key="id"
          :lazy="true"
          :paginator="true"
          :rows="pageSize"
          :total-records="total"
          :rows-per-page-options="[10, 25, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          :loading="isLoading"
          class="text-sm"
          @page="onPage"
        >
          <Column :header="t('invoices.fields.no')">
            <template #body="{ data }">
              {{ data.no }}
            </template>
          </Column>
          <Column :header="t('invoices.fields.doNo')">
            <template #body="{ data }">
              <RouterLink
                :to="{ name: 'DeliveryOrderDetail', params: { id: data.deliveryOrderId } }"
                class="text-primary font-medium hover:underline"
                >{{ data.deliveryOrderNo }}</RouterLink
              >
            </template>
          </Column>
          <Column :header="t('invoices.fields.customer')">
            <template #body="{ data }">
              {{ data.customerName ?? '-' }}
            </template>
          </Column>
          <Column :header="t('invoices.fields.totalAmount')" class="text-right">
            <template #body="{ data }">
              {{ formatAmount(data.totalAmount) }}
            </template>
          </Column>
          <Column :header="t('invoices.fields.status')">
            <template #body="{ data }">
              <Tag
                :severity="statusSeverity(data.status)"
                :value="t(`invoices.status.${data.status}`)"
              />
            </template>
          </Column>
          <Column :header="t('invoices.fields.createdAt')">
            <template #body="{ data }">
              {{ dayjs(data.createdAt).format(DateFormat.DATE_TIME) }}
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <Button
                icon="pi pi-eye"
                :aria-label="t('common.actions.view')"
                severity="info"
                size="small"
                outlined
                @click="router.push({ name: 'InvoiceDetail', params: { id: data.id } })"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useRouter, RouterLink } from 'vue-router'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { DataTablePageEvent } from 'primevue/datatable'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { InvoicesService, commonErrorToast } from '@/services'
import type { InvoiceListItem, InvoiceStatus } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

const overlayGroup = 'invoices'

const items = ref<InvoiceListItem[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(0)
const isLoading = ref(false)

function statusSeverity(status: InvoiceStatus) {
  if (status === 'applied') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'secondary'
}

function formatAmount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

async function fetchData(page: number) {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(pageSize.value),
    })
    const res = await InvoicesService.list(params.toString())
    items.value = res.data
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    isLoading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page
  pageSize.value = event.rows
  fetchData(event.page)
}

fetchData(0)
</script>
