<template>
  <div>
    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('apOutstanding.title') }}
    </h1>

    <!-- Only rendered when the user has more than one assigned branch — the backend
         requires branchId explicitly in that case (ErrBranchRequired otherwise). -->
    <Toolbar v-if="showBranchPicker" class="mb-5">
      <template #start>
        <Select
          v-model="selectedBranchId"
          :options="branches"
          option-label="name"
          option-value="id"
          :placeholder="t('creditDebitNotes.fields.branch')"
          class="min-w-48"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent v-if="url" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'documentType'">
              <Tag
                :severity="documentTypeSeverity(data.documentType)"
                :value="t(`apOutstanding.documentType.${data.documentType}`)"
              />
            </span>
            <span v-else-if="col.field === 'documentDate'">
              {{ dayjs(data.documentDate).format(DateFormat.DATE) }}
            </span>
            <span v-else-if="col.field === 'dueDate'">
              {{ dayjs(data.dueDate).format(DateFormat.DATE) }}
            </span>
            <span
              v-else-if="col.field === 'signedTotalAmount'"
              :class="signedClass(data.signedTotalAmount)"
            >
              {{ formatNumber(parseFloat(data.signedTotalAmount || '0')) }}
            </span>
            <span
              v-else-if="col.field === 'outstandingAmount'"
              :class="signedClass(data.outstandingAmount)"
            >
              {{ formatNumber(parseFloat(data.outstandingAmount || '0')) }}
            </span>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Toolbar from 'primevue/toolbar'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import { BranchesService, GenericQueryBuilder } from '@/services'
import { useAuthStore } from '@/stores/auth'
import type { Column, Branch } from '@/types'
import type { ApOutstandingDocumentType } from '@/types/apOutstanding.type'

const { t } = useI18n()
const authStore = useAuthStore()

const showBranchPicker = computed(() => authStore.branchIds.length > 1)
const branches = ref<Branch[]>([])
const selectedBranchId = ref<number | undefined>()

const url = computed(() => {
  if (showBranchPicker.value) {
    return selectedBranchId.value
      ? `${API_ENDPOINTS.AP_OUTSTANDING}?branchId=${selectedBranchId.value}`
      : ''
  }
  return API_ENDPOINTS.AP_OUTSTANDING
})

onBeforeMount(async () => {
  if (!showBranchPicker.value) return
  const branchResults = await Promise.all(
    authStore.branchIds.map(async (id) => {
      const query = new GenericQueryBuilder().withFilter('id', FilterOperator.EQUAL, id).build()
      const result = await BranchesService.list(query)
      return result.data[0]
    }),
  )
  branches.value = branchResults.filter((b): b is Branch => !!b)
  selectedBranchId.value = authStore.primaryBranchId ?? branches.value[0]?.id
})

const columns = computed<Column[]>(() => [
  {
    field: 'documentType',
    header: t('apOutstanding.fields.documentType'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'documentNo',
    header: t('apOutstanding.fields.documentNo'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'supplierName',
    header: t('apOutstanding.fields.supplier'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'documentDate',
    header: t('apOutstanding.fields.documentDate'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'dueDate',
    header: t('apOutstanding.fields.dueDate'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'signedTotalAmount',
    header: t('apOutstanding.fields.signedTotalAmount'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'outstandingAmount',
    header: t('apOutstanding.fields.outstandingAmount'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
])

function documentTypeSeverity(type: ApOutstandingDocumentType) {
  if (type === 'credit_note') return 'success'
  if (type === 'debit_note') return 'danger'
  return 'info'
}

/** Negative (a credit note) renders in emerald; everything else in the default colour. */
function signedClass(value: string): string {
  return parseFloat(value || '0') < 0 ? 'text-emerald-700' : ''
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
