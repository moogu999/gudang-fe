<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h4 class="text-sm font-semibold sm:text-base">{{ t('canvassLoadings.sections.lines') }}</h4>
      <Button
        v-if="!readonly"
        :label="t('canvassLoadings.actions.addLine')"
        icon="pi pi-plus"
        size="small"
        type="button"
        @click="addRow"
      />
    </div>

    <DataTable :value="rows" data-key="_key" striped-rows class="text-sm">
      <Column header="#" style="width: 3rem">
        <template #body="{ index }">
          <span class="text-stone-400">{{ index + 1 }}</span>
        </template>
      </Column>

      <Column :header="t('canvass.fields.product')" style="min-width: 16rem">
        <template #body="{ data }">
          <InfiniteSelect
            v-if="!readonly && !data.productId"
            v-model="data.productId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q: string) => ProductsService.list(q)"
            :disabled-values="pickedProductIds"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @select-option="(opt: object) => onProductSelect(data as LoadingRow, opt)"
          >
            <template #option="{ option }">{{ option.code }} - {{ option.name }}</template>
          </InfiniteSelect>
          <div v-else class="flex flex-col">
            <span class="font-medium">{{ data.productName }}</span>
            <span class="text-xs text-stone-500">{{ data.productCode }}</span>
          </div>
        </template>
      </Column>

      <Column :header="t('canvass.fields.quantity')" style="min-width: 12rem">
        <template #body="{ data }">
          <div v-if="readonly" class="flex flex-col">
            <span>{{ formatBaseQty(data.quantity, data.pinnedUom) }}</span>
            <span class="text-xs text-stone-400">{{ uomLabel(data.pinnedUom) }}</span>
          </div>
          <div v-else class="flex flex-col gap-0.5">
            <CanvassQuantityInput v-model="data.quantity" :levels="levelsOf(data as LoadingRow)" />
            <span class="text-xs text-stone-400">{{ rowUomLabel(data as LoadingRow) }}</span>
          </div>
        </template>
      </Column>

      <Column v-if="showAvailable" :header="t('canvassLoadings.fields.available')">
        <template #body="{ data }">
          <div v-if="data.available !== undefined" class="flex flex-col">
            <span
              :class="toQty(data.available) < data.quantity ? 'font-semibold text-red-600' : ''"
              data-testid="available"
              >{{ formatAvailable(data as LoadingRow) }}</span
            >
            <span class="text-xs text-stone-400">{{ rowUomLabel(data as LoadingRow) }}</span>
          </div>
        </template>
      </Column>

      <Column v-if="showChange" :header="t('canvassLoadings.fields.change')">
        <template #body="{ data }">
          <Tag
            v-if="lineChange(data) === 'new'"
            severity="info"
            :value="t('canvassLoadings.change.new')"
          />
          <Tag
            v-else-if="lineChange(data) === 'changed'"
            severity="warn"
            :value="
              t('canvassLoadings.change.changed', {
                from: formatBaseQty(data.previousQuantity, data.pinnedUom),
              })
            "
          />
        </template>
      </Column>

      <Column v-if="!readonly" style="width: 3rem">
        <template #body="{ index }">
          <Button
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            type="button"
            @click="rows.splice(index, 1)"
          />
        </template>
      </Column>

      <template #empty>{{ t('canvassLoadings.messages.noLines') }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import CanvassQuantityInput from '@/components/canvass/CanvassQuantityInput.vue'
import { ProductsService } from '@/services'
import type { PinnedUom, UomConversionLevel } from '@/types'
import type { Product } from '@/types/product.type'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import { formatBaseQty, lineChange, toQty, uomLabel } from '@/utils/canvassHelpers'

export interface LoadingRow {
  _key: string
  productId?: number
  productCode?: string
  productName?: string
  product?: Product
  pinnedUom?: PinnedUom
  /** Base-UOM quantity. */
  quantity: number
  /** Available good stock at the source (decimal string); unset until fetched. */
  available?: string
  changed?: boolean
  previousQuantity?: string
}

defineProps<{
  readonly?: boolean
  showAvailable?: boolean
  showChange?: boolean
}>()

const rows = defineModel<LoadingRow[]>({ required: true })

const { t } = useI18n()

const pickedProductIds = computed(() =>
  rows.value.map((r) => r.productId).filter((id): id is number => id !== undefined),
)

function levelsOf(row: LoadingRow): UomConversionLevel[] | undefined {
  return pinnedToLevels(row.pinnedUom) ?? row.product?.uomGroup?.levels
}

// A new row has no pinned UOM yet, so fall back to the product's own group to show the same
// box / pack / pcs split the saved document does.
function formatAvailable(row: LoadingRow): string {
  const levels = levelsOf(row)
  if ((levels?.length ?? 0) > 1) return decomposeBaseQty(toQty(row.available), levels!).join(' / ')
  return formatBaseQty(row.available, row.pinnedUom)
}

// Same fallback as formatAvailable (used by Quantity and Available): a new row has no pinned UOM, so read the symbols off the group.
function rowUomLabel(row: LoadingRow): string {
  return (
    uomLabel(row.pinnedUom) ||
    (levelsOf(row) ?? [])
      .map((l) => l.uom?.symbol)
      .filter(Boolean)
      .join(' / ')
  )
}

function onProductSelect(row: LoadingRow, option: object) {
  const product = option as Product
  row.product = product
  row.productCode = product.code
  row.productName = product.name
  row.pinnedUom = undefined
  row.quantity = 0
}

function addRow() {
  rows.value.push({ _key: crypto.randomUUID(), quantity: 0 })
}

defineExpose({ addRow })
</script>
