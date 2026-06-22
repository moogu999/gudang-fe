<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('stockMovements.title') }}
    </h1>

    <ResponsiveCard class="mb-4">
      <template #content>
        <StockMovementFilterPanel @change="onFiltersChange" />
      </template>
    </ResponsiveCard>

    <!-- Opening / Closing summary (only when product + warehouse + stockType all set) -->
    <ResponsiveCard v-if="openingBalance" class="mb-4">
      <template #content>
        <div class="flex flex-wrap gap-6 text-sm">
          <div>
            <p class="text-surface-500 mb-1 font-semibold">
              {{ t('stockMovements.balance.opening') }}
            </p>
            <p>{{ t('stockMovements.balance.onHand') }}: {{ openingBalance.onHand }}</p>
            <p>{{ t('stockMovements.balance.reserved') }}: {{ openingBalance.reserved }}</p>
            <p>{{ t('stockMovements.balance.inTransit') }}: {{ openingBalance.inTransit }}</p>
          </div>
          <div v-if="closingBalance">
            <p class="text-surface-500 mb-1 font-semibold">
              {{ t('stockMovements.balance.closing') }}
            </p>
            <p>{{ t('stockMovements.balance.onHand') }}: {{ closingBalance.onHand }}</p>
            <p>{{ t('stockMovements.balance.reserved') }}: {{ closingBalance.reserved }}</p>
            <p>{{ t('stockMovements.balance.inTransit') }}: {{ closingBalance.inTransit }}</p>
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'createdAt'">
              {{ dayjs(data[col.field]).format(DateFormat.DATE_TIME) }}
            </span>
            <span v-if="col.field === 'movementType'">
              {{ t(`stockMovements.movementTypes.${data[col.field]}`) }}
            </span>
            <span v-if="col.field === 'createdBy'">
              {{ getEmail(data['createdByUser']) }}
            </span>
            <span
              v-if="
                col.field === 'onHandDelta' ||
                col.field === 'reservedDelta' ||
                col.field === 'inTransitDelta'
              "
              :class="getDeltaClass(data[col.field])"
            >
              {{ formatDelta(data[col.field]) }}
            </span>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import type { Column } from '@/types/table.type'
import type { BalanceSnapshot, StockMovementFilters } from '@/types/stockMovement.type'
import { API_ENDPOINTS } from '@/constants/api'
import DateFormat from '@/constants/dateFormat'
import { StockMovementsService } from '@/services'
import StockMovementFilterPanel from './components/StockMovementFilters.vue'

const { t } = useI18n()

const overlayGroup = 'stockMovementsView'
const table = ref()

function defaultDateRange(): [string, string] {
  const now = new Date()
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)]
}

const activeFilters = ref<StockMovementFilters>({ dateRange: defaultDateRange() })
const openingBalance = ref<BalanceSnapshot | undefined>(undefined)
const closingBalance = ref<BalanceSnapshot | undefined>(undefined)

const url = computed(() => {
  const base = API_ENDPOINTS.STOCK_MOVEMENTS
  const params = new URLSearchParams()

  if (activeFilters.value.productId != null) {
    params.set('productId', String(activeFilters.value.productId))
  }
  if (activeFilters.value.warehouseId != null) {
    params.set('warehouseId', String(activeFilters.value.warehouseId))
  }
  if (activeFilters.value.stockType) {
    params.set('stockType', activeFilters.value.stockType)
  }
  if (activeFilters.value.dateRange) {
    params.set('startDate', activeFilters.value.dateRange[0])
    params.set('endDate', activeFilters.value.dateRange[1])
  }

  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
})

const columns = computed<Column[]>(() => [
  {
    field: 'createdAt',
    header: t('stockMovements.columns.createdAt'),
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
  },
  {
    field: 'productName',
    header: t('stockMovements.columns.product'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'warehouseName',
    header: t('stockMovements.columns.warehouse'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'stockType',
    header: t('stockMovements.columns.stockType'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'movementType',
    header: t('stockMovements.columns.movementType'),
    exportable: true,
    sortable: false,
    filterable: false,
  },
  {
    field: 'onHandDelta',
    header: t('stockMovements.columns.onHandDelta'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'reservedDelta',
    header: t('stockMovements.columns.reservedDelta'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'inTransitDelta',
    header: t('stockMovements.columns.inTransitDelta'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'onHandAfter',
    header: t('stockMovements.columns.onHandAfter'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'reservedAfter',
    header: t('stockMovements.columns.reservedAfter'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'inTransitAfter',
    header: t('stockMovements.columns.inTransitAfter'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'referenceNo',
    header: t('stockMovements.columns.referenceNo'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'createdBy',
    header: t('stockMovements.columns.createdBy'),
    exportable: true,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
])

// Fetch opening/closing balance when all three stock-card filters are present
watch(
  activeFilters,
  async (filters) => {
    const canShowSummary =
      filters.productId != null && filters.warehouseId != null && filters.stockType != null

    if (!canShowSummary) {
      openingBalance.value = undefined
      closingBalance.value = undefined
      return
    }

    const params = new URLSearchParams()
    params.set('productId', String(filters.productId))
    params.set('warehouseId', String(filters.warehouseId))
    params.set('stockType', filters.stockType!)
    if (filters.dateRange) {
      params.set('startDate', filters.dateRange[0])
      params.set('endDate', filters.dateRange[1])
    }
    params.set('limit', '1000')

    try {
      const res = await StockMovementsService.list(params.toString())
      openingBalance.value = res.opening
      const last = res.data[res.data.length - 1]
      closingBalance.value = last
        ? { onHand: last.onHandAfter, reserved: last.reservedAfter, inTransit: last.inTransitAfter }
        : undefined
    } catch {
      openingBalance.value = undefined
      closingBalance.value = undefined
    }
  },
  { deep: true },
)

function onFiltersChange(filters: StockMovementFilters) {
  activeFilters.value = filters
}

function getEmail(user: unknown): string {
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

function formatDelta(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return num > 0 ? `+${value}` : value
}

function getDeltaClass(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num) || num === 0) return ''
  return num > 0 ? 'text-green-600' : 'text-red-500'
}
</script>
