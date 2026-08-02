<template>
  <div>
    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('inventoryStatus.title') }}
    </h1>

    <!-- KPI Cards -->
    <div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div class="rounded-lg border border-stone-200 bg-white p-4">
        <div class="mb-1 text-xs font-medium text-stone-500 sm:text-sm">
          {{ t('inventoryStatus.kpi.onHand') }}
        </div>
        <div class="text-lg font-bold text-stone-800 sm:text-xl md:text-2xl">
          {{ formatQty(summary?.onHand) }}
        </div>
      </div>
      <div class="rounded-lg border border-stone-200 bg-white p-4">
        <div class="mb-1 text-xs font-medium text-stone-500 sm:text-sm">
          {{ t('inventoryStatus.kpi.inTransit') }}
        </div>
        <div class="text-lg font-bold text-blue-600 sm:text-xl md:text-2xl">
          {{ formatQty(summary?.inTransit) }}
        </div>
      </div>
      <div class="rounded-lg border border-stone-200 bg-white p-4">
        <div class="mb-1 text-xs font-medium text-stone-500 sm:text-sm">
          {{ t('inventoryStatus.kpi.reserved') }}
        </div>
        <div class="text-lg font-bold text-orange-600 sm:text-xl md:text-2xl">
          {{ formatQty(summary?.reserved) }}
        </div>
      </div>
      <div class="rounded-lg border border-stone-200 bg-white p-4">
        <div class="mb-1 text-xs font-medium text-stone-500 sm:text-sm">
          {{ t('inventoryStatus.kpi.available') }}
        </div>
        <div class="text-lg font-bold text-green-600 sm:text-xl md:text-2xl">
          {{ formatQty(summary?.available) }}
        </div>
      </div>
    </div>

    <!-- Filters -->
    <Toolbar class="mb-5">
      <template #start>
        <div class="flex flex-wrap items-center gap-3">
          <Select
            v-model="selectedWarehouseId"
            :options="warehouses"
            option-label="name"
            option-value="id"
            :placeholder="t('inventoryStatus.filters.allWarehouses')"
            show-clear
            class="w-48"
            @change="onWarehouseChange"
          />

          <div class="flex gap-2">
            <Button
              :severity="activeChip === 'all' ? 'primary' : 'secondary'"
              :label="t('inventoryStatus.chips.all')"
              size="small"
              @click="setChip('all')"
            />
            <Button
              :severity="activeChip === 'out' ? 'primary' : 'secondary'"
              :label="t('inventoryStatus.chips.stockout')"
              size="small"
              @click="setChip('out')"
            />
            <Button
              :severity="activeChip === 'inTransit' ? 'primary' : 'secondary'"
              :label="t('inventoryStatus.chips.inTransit')"
              size="small"
              @click="setChip('inTransit')"
            />
            <Button
              :severity="activeChip === 'reserved' ? 'primary' : 'secondary'"
              :label="t('inventoryStatus.chips.reserved')"
              size="small"
              @click="setChip('reserved')"
            />
          </div>
        </div>
      </template>
    </Toolbar>

    <!-- Table -->
    <ResponsiveCard>
      <template #content>
        <TableComponent :url="tableUrl" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.field === 'onHand'">{{ formatQty(data.onHand) }}</span>
            <span v-else-if="col.field === 'inTransit'">{{ formatQty(data.inTransit) }}</span>
            <span v-else-if="col.field === 'reserved'">{{ formatQty(data.reserved) }}</span>
            <span v-else-if="col.field === 'available'">{{ formatQty(data.available) }}</span>
            <span v-else-if="col.field === 'averageCost'">{{
              formatNumber(parseFloat(data.averageCost || '0'))
            }}</span>
            <span v-else-if="col.field === 'value'">{{
              formatNumber(parseFloat(data.value || '0'))
            }}</span>
            <Tag
              v-else-if="col.field === 'stockType'"
              :severity="data.stockType === 'bad' ? 'danger' : 'success'"
              :value="t(`inventoryStatus.stockTypes.${data.stockType}`)"
            />
            <div v-else-if="col.field === 'composition'">
              <div class="flex h-2 w-24 overflow-hidden rounded-full bg-stone-100">
                <template
                  v-if="
                    parseFloat(data.onHand || '0') +
                      parseFloat(data.inTransit || '0') +
                      parseFloat(data.reserved || '0') >
                    0
                  "
                >
                  <div
                    class="bg-green-500"
                    :style="`width:${onHandPct(data)}%`"
                    :title="`On Hand: ${onHandPct(data).toFixed(0)}%`"
                  />
                  <div
                    class="bg-blue-400"
                    :style="`width:${inTransitPct(data)}%`"
                    :title="`In Transit: ${inTransitPct(data).toFixed(0)}%`"
                  />
                  <div
                    class="bg-orange-400"
                    :style="`width:${reservedPct(data)}%`"
                    :title="`Reserved: ${reservedPct(data).toFixed(0)}%`"
                  />
                </template>
              </div>
            </div>
            <div v-else-if="col.field === 'status'">
              <Tag
                v-if="data.status === 'out'"
                severity="danger"
                :value="t('inventoryStatus.status.out')"
              />
              <Tag
                v-else-if="data.status === 'normal'"
                severity="success"
                :value="t('inventoryStatus.status.normal')"
              />
              <Tag v-else severity="secondary" :value="t('inventoryStatus.status.unknown')" />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import Toolbar from 'primevue/toolbar'
import { API_ENDPOINTS } from '@/constants/api'
import FilterOperator from '@/constants/filterOperator'
import { WarehousesService, InventoryService } from '@/services'
import type { Column } from '@/types'
import type { InventorySummary } from '@/types/inventoryBalance.type'
import type { Warehouse } from '@/types'

const { t } = useI18n()

const summary = ref<InventorySummary | null>(null)
const warehouses = ref<Warehouse[]>([])
const selectedWarehouseId = ref<number | undefined>()
const activeChip = ref<'all' | 'out' | 'inTransit' | 'reserved'>('all')

const columns = computed<Column[]>(() => [
  {
    field: 'productCode',
    header: t('inventoryStatus.fields.productCode'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'productName',
    header: t('inventoryStatus.fields.productName'),
    sortable: true,
    exportable: true,
    filterable: true,
  },
  {
    field: 'uomGroupName',
    header: t('inventoryStatus.fields.uom'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'stockType',
    header: t('inventoryStatus.fields.stockType'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'onHand',
    header: t('inventoryStatus.fields.onHand'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'inTransit',
    header: t('inventoryStatus.fields.inTransit'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'reserved',
    header: t('inventoryStatus.fields.reserved'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'available',
    header: t('inventoryStatus.fields.available'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'composition',
    header: t('inventoryStatus.fields.composition'),
    sortable: false,
    exportable: false,
    filterable: false,
  },
  {
    field: 'status',
    header: t('common.labels.status'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
  {
    field: 'averageCost',
    header: t('inventoryStatus.fields.averageCost'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'value',
    header: t('inventoryStatus.fields.value'),
    sortable: true,
    exportable: true,
    filterable: false,
  },
])

const tableUrl = computed(() => {
  const parts: string[] = []
  if (selectedWarehouseId.value) {
    parts.push(
      `filterBy=warehouseId&filterOperator=${FilterOperator.EQUAL}&filterValue=${selectedWarehouseId.value}`,
    )
  }
  if (activeChip.value === 'out') {
    parts.push(`filterBy=status&filterOperator=${FilterOperator.EQUAL}&filterValue=out`)
  }
  if (activeChip.value === 'inTransit') {
    parts.push(`filterBy=hasInTransit&filterOperator=${FilterOperator.EQUAL}&filterValue=yes`)
  }
  if (activeChip.value === 'reserved') {
    parts.push(`filterBy=hasReserved&filterOperator=${FilterOperator.EQUAL}&filterValue=yes`)
  }
  const qs = parts.join('&')
  return qs ? `${API_ENDPOINTS.GEN_INVENTORY_BALANCES}?${qs}` : API_ENDPOINTS.GEN_INVENTORY_BALANCES
})

async function loadSummary() {
  try {
    summary.value = await InventoryService.summary(selectedWarehouseId.value)
  } catch {
    summary.value = null
  }
}

async function loadWarehouses() {
  try {
    const res = await WarehousesService.list()
    warehouses.value = res.data
  } catch {
    warehouses.value = []
  }
}

function onWarehouseChange() {
  loadSummary()
}

function setChip(chip: 'all' | 'out' | 'inTransit' | 'reserved') {
  activeChip.value = chip
}

function compositionTotal(data: Record<string, string>): number {
  return (
    (parseFloat(data.onHand) || 0) +
    (parseFloat(data.inTransit) || 0) +
    (parseFloat(data.reserved) || 0)
  )
}

function onHandPct(data: Record<string, string>): number {
  const total = compositionTotal(data)
  return total > 0 ? ((parseFloat(data.onHand) || 0) / total) * 100 : 0
}

function inTransitPct(data: Record<string, string>): number {
  const total = compositionTotal(data)
  return total > 0 ? ((parseFloat(data.inTransit) || 0) / total) * 100 : 0
}

function reservedPct(data: Record<string, string>): number {
  const total = compositionTotal(data)
  return total > 0 ? ((parseFloat(data.reserved) || 0) / total) * 100 : 0
}

function formatQty(value: string | null | undefined): string {
  const n = parseFloat(value ?? '0')
  if (isNaN(n)) return '0'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(n)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

onBeforeMount(async () => {
  await Promise.all([loadSummary(), loadWarehouses()])
})
</script>
