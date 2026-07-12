<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('auditTrails.title') }}
    </h1>

    <ResponsiveCard class="mb-4">
      <template #content>
        <AuditTrailFilters :initial-filters="initialFiltersFromQuery" @change="onFiltersChange" />
      </template>
    </ResponsiveCard>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'referenceType'">
              {{ t(`auditTrails.references.${data[col.field]}`) }}
            </span>
            <span
              v-if="col.field === 'description'"
              :title="data[col.field]"
              class="block max-w-xs truncate"
            >
              {{ data[col.field] }}
            </span>
            <span v-if="col.field === 'createdBy'">
              {{ getCreatedByEmail(data['createdByUser']) }}
            </span>
            <span v-if="col.field === 'createdAt'">
              {{ dayjs(data[col.field]).format(DateFormat.DATE_TIME) }}
            </span>
            <a
              v-if="col.field === 'referenceId' && data['referenceType'] === 'employee'"
              class="text-primary-500 cursor-pointer hover:underline"
              @click.prevent="router.push(`/employees/${data['referenceId']}`)"
            >
              #{{ data['referenceId'] }}
            </a>
            <a
              v-else-if="col.field === 'referenceId' && data['referenceType'] === 'promotion'"
              class="text-primary-500 cursor-pointer hover:underline"
              @click.prevent="router.push(`/promotions/${data['referenceId']}`)"
            >
              #{{ data['referenceId'] }}
            </a>
            <a
              v-else-if="col.field === 'referenceId' && data['referenceType'] === 'customer'"
              class="text-primary-500 cursor-pointer hover:underline"
              @click.prevent="router.push(`/customers/${data['referenceId']}`)"
            >
              #{{ data['referenceId'] }}
            </a>
            <span v-else-if="col.field === 'referenceId'">{{ data['referenceId'] }}</span>
            <Button
              v-if="col.field === ''"
              icon="pi pi-eye"
              text
              rounded
              severity="secondary"
              :size="buttonSize"
              class="min-h-[44px] min-w-[44px]"
              @click="router.push(`/audit-trails/${data['id']}`)"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import type { Column } from '@/types/table.type'
import { API_ENDPOINTS } from '@/constants/api'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import FilterOperator from '@/constants/filterOperator'
import DateFormat from '@/constants/dateFormat'
import { useResponsiveSize } from '@/composables'
import AuditTrailFilters from './components/AuditTrailFilters.vue'
import type { AuditReferenceType } from '@/types/auditTrail.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { buttonSize } = useResponsiveSize()

const overlayGroup = 'auditTrailsView'
const table = ref()

type Filters = {
  referenceType?: AuditReferenceType
  referenceId?: number
  dateRange?: [string, string]
}

const initialFiltersFromQuery = computed(() => {
  const { referenceType, referenceId } = route.query
  if (typeof referenceType === 'string') {
    return {
      referenceType: referenceType as AuditReferenceType,
      referenceId: referenceId ? Number(referenceId) : undefined,
    }
  }
  return undefined
})

const activeFilters = ref<Filters>(initialFiltersFromQuery.value ?? {})

const url = computed(() => {
  const base = API_ENDPOINTS.GEN_AUDIT_TRAILS
  const qb = new GenericQueryBuilder()

  if (activeFilters.value.referenceType) {
    qb.withFilter('referenceType', FilterOperator.EQUAL, activeFilters.value.referenceType)
  }
  if (activeFilters.value.referenceId != null) {
    qb.withFilter('referenceId', FilterOperator.EQUAL, activeFilters.value.referenceId)
  }
  if (activeFilters.value.dateRange) {
    qb.withFilter('createdAt', FilterOperator.BETWEEN, activeFilters.value.dateRange.join(','))
  }

  const qs = qb.build()
  return qs ? `${base}?${qs}` : base
})

const columns = computed<Column[]>(() => [
  {
    field: 'referenceType',
    header: t('auditTrails.columns.referenceType'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'referenceId',
    header: t('auditTrails.columns.referenceId'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'description',
    header: t('auditTrails.columns.description'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'createdBy',
    header: t('auditTrails.columns.createdBy'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'createdAt',
    header: t('auditTrails.columns.createdAt'),
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
    hideOnMobile: true,
  },
  {
    field: '',
    header: t('common.labels.actions'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
])

function getCreatedByEmail(user: unknown): string {
  if (
    user &&
    typeof user === 'object' &&
    'email' in user &&
    typeof (user as { email: unknown }).email === 'string'
  ) {
    return (user as { email: string }).email
  }
  return '—'
}

async function onFiltersChange(filters: Filters) {
  activeFilters.value = filters
}
</script>
