<template>
  <div class="flex flex-wrap items-end gap-3">
    <!-- Product -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('stockMovements.filters.product') }}</label>
      <InfiniteSelect
        v-model="selectedProductId"
        option-label="name"
        option-value="id"
        :fetch-fn="(query: string) => ProductsService.list(query)"
        sort-by="name"
        sort-operator="asc"
        class="w-52"
        @update:model-value="emitChange"
      />
    </div>

    <!-- Warehouse -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('stockMovements.filters.warehouse') }}</label>
      <InfiniteSelect
        v-model="selectedWarehouseId"
        option-label="name"
        option-value="id"
        :fetch-fn="(query: string) => WarehousesService.list(query)"
        sort-by="name"
        sort-operator="asc"
        class="w-52"
        @update:model-value="emitChange"
      />
    </div>

    <!-- Stock Type -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('stockMovements.filters.stockType') }}</label>
      <Select
        v-model="selectedStockType"
        :options="stockTypeOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('common.labels.selectOption')"
        show-clear
        class="w-40"
        @change="emitChange"
      />
    </div>

    <!-- Date Range -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('stockMovements.filters.dateRange') }}</label>
      <DatePicker
        v-model="selectedDateRange"
        selection-mode="range"
        :placeholder="t('stockMovements.filters.dateRange')"
        show-clear
        show-icon
        date-format="yy-mm-dd"
        class="w-60"
        @update:model-value="onDateRangeChange"
      />
    </div>

    <!-- Clear -->
    <Button severity="secondary" :label="t('table.clearFilters')" @click="clearAll" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { ProductsService, WarehousesService } from '@/services'
import type { StockMovementFilters } from '@/types/stockMovement.type'

const { t } = useI18n()

const emit = defineEmits<{
  change: [filters: StockMovementFilters]
}>()

const selectedProductId = ref<number | undefined>(undefined)
const selectedWarehouseId = ref<number | undefined>(undefined)
const selectedStockType = ref<string | undefined>(undefined)
const today = new Date()
const selectedDateRange = ref<Date[] | null>([
  new Date(today.getFullYear(), today.getMonth(), 1),
  today,
])

const stockTypeOptions = computed(() => [
  { value: 'good', label: t('stockMovements.stockTypes.good') },
  { value: 'bad', label: t('stockMovements.stockTypes.bad') },
])

onMounted(() => emitChange())

function clearAll() {
  selectedProductId.value = undefined
  selectedWarehouseId.value = undefined
  selectedStockType.value = undefined
  const t = new Date()
  selectedDateRange.value = [new Date(t.getFullYear(), t.getMonth(), 1), t]
  emitChange()
}

function onDateRangeChange() {
  const range = selectedDateRange.value
  const isComplete =
    range === null ||
    (Array.isArray(range) && range.length === 2 && range[0] != null && range[1] != null)
  if (isComplete) emitChange()
}

function emitChange() {
  const filters: StockMovementFilters = {}

  if (selectedProductId.value != null) {
    filters.productId = selectedProductId.value
  }
  if (selectedWarehouseId.value != null) {
    filters.warehouseId = selectedWarehouseId.value
  }
  if (selectedStockType.value) {
    filters.stockType = selectedStockType.value
  }
  if (
    selectedDateRange.value &&
    Array.isArray(selectedDateRange.value) &&
    selectedDateRange.value.length === 2 &&
    selectedDateRange.value[0] &&
    selectedDateRange.value[1]
  ) {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    filters.dateRange = [fmt(selectedDateRange.value[0]), fmt(selectedDateRange.value[1])]
  }

  emit('change', filters)
}
</script>
