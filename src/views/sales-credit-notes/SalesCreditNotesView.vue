<template>
  <div>
    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('salesCreditNotes.title') }}
    </h1>

    <Message severity="info" variant="simple" size="small" class="mb-4" data-testid="list-hint">
      {{ t('salesCreditNotes.list.hint') }}
    </Message>

    <ResponsiveCard>
      <template #content>
        <TableComponent :url="url" :columns="columns">
          <template #content="{ col, data }">
            <RouterLink
              v-if="col.field === 'no'"
              :to="{ name: 'SalesCreditNoteDetail', params: { id: data.id } }"
              class="text-primary font-medium hover:underline"
              >{{ data.no }}</RouterLink
            >
            <span v-else-if="col.field === 'noteDate'">{{
              dayjs(data.noteDate).format(DateFormat.DATE)
            }}</span>
            <span v-else-if="col.field === 'customerName'"
              >{{ data.customerCode }} — {{ data.customerName }}</span
            >
            <span v-else-if="col.field === 'salesmanName'">{{ data.salesmanName || '-' }}</span>
            <RouterLink
              v-else-if="col.field === 'deliveryOrderNo'"
              :to="{ name: 'DeliveryOrderDetail', params: { id: data.deliveryOrderId } }"
              class="text-primary hover:underline"
              >{{ data.deliveryOrderNo }}</RouterLink
            >
            <template v-else-if="col.field === 'sourceInvoiceNo'">
              <RouterLink
                v-if="data.sourceInvoiceId"
                :to="{ name: 'InvoiceDetail', params: { id: data.sourceInvoiceId } }"
                class="text-primary hover:underline"
                >{{ data.sourceInvoiceNo }}</RouterLink
              >
              <span v-else>-</span>
            </template>
            <span v-else-if="col.field === 'totalAmount'" class="tabular-nums">{{
              formatAmount(data.totalAmount)
            }}</span>
            <span v-else-if="col.field === 'appliedAmount'" class="tabular-nums">{{
              formatAmount(data.appliedAmount)
            }}</span>
            <Tag
              v-else-if="col.field === 'appliedStatus'"
              :severity="appliedSeverity(appliedStatus(data.appliedAmount, data.totalAmount))"
              :value="
                t(`salesCreditNotes.applied.${appliedStatus(data.appliedAmount, data.totalAmount)}`)
              "
            />
            <span v-else-if="col.field === 'taxReturnNoteNo'">{{
              data.taxReturnNoteNo || '-'
            }}</span>
            <div v-else-if="col.field === 'actions'">
              <Button
                icon="pi pi-eye"
                size="small"
                text
                :aria-label="t('common.actions.view')"
                @click="router.push({ name: 'SalesCreditNoteDetail', params: { id: data.id } })"
              />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import dayjs from 'dayjs'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import type { Column } from '@/types'
import { appliedSeverity, appliedStatus } from './salesCreditNoteStatus'

const { t } = useI18n()
const router = useRouter()

const url = API_ENDPOINTS.GEN_SALES_CREDIT_NOTES

// Only no / noteDate / totalAmount / postedAt are in the backend SortMap, and only no is in
// its FilterMap: sorting or filtering on any other column answers 400.
const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('salesCreditNotes.columns.no'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'noteDate',
    header: t('salesCreditNotes.columns.date'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'customerName',
    header: t('salesCreditNotes.columns.customer'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'salesmanName',
    header: t('salesCreditNotes.columns.salesman'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'deliveryOrderNo',
    header: t('salesCreditNotes.columns.returnDo'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'sourceInvoiceNo',
    header: t('salesCreditNotes.columns.sourceInvoice'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'totalAmount',
    header: t('salesCreditNotes.columns.total'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'appliedAmount',
    header: t('salesCreditNotes.columns.applied'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'appliedStatus',
    header: t('salesCreditNotes.columns.appliedStatus'),
    sortable: false,
    exportable: false,
    filterable: false,
  },
  {
    field: 'taxReturnNoteNo',
    header: t('salesCreditNotes.columns.taxReturnNoteNo'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'actions',
    header: t('common.labels.actions'),
    sortable: false,
    exportable: false,
    filterable: false,
  },
])

function formatAmount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}
</script>
