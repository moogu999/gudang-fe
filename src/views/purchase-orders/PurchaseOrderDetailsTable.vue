<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h4 class="text-sm font-semibold sm:text-base">{{ t('purchaseOrders.details.title') }}</h4>
      <Button
        v-if="mode !== DialogMode.VIEW"
        :label="t('purchaseOrders.details.addDetail')"
        icon="pi pi-plus"
        size="small"
        @click="addRow"
      />
    </div>

    <DataTable
      v-model:expanded-rows="expandedRows"
      v-model:editing-rows="editingRows"
      :value="localRows"
      :edit-mode="mode !== DialogMode.VIEW ? 'row' : undefined"
      data-key="_localId"
      striped-rows
      responsive-layout="scroll"
      class="text-sm"
      @row-edit-save="onRowEditSave"
    >
      <Column header="#" style="width: 3rem">
        <template #body="{ index, data }">
          <span class="text-stone-400">{{
            (data as PurchaseOrderDetailRow)._isPlaceholder ? '' : index + 1
          }}</span>
        </template>
      </Column>

      <Column expander style="width: 3rem" />

      <!-- Product Code -->
      <Column field="productCode" :header="t('purchaseOrders.details.productCode')">
        <template #body="{ data }">
          {{ (data as PurchaseOrderDetailRow).product?.code ?? '' }}
        </template>
        <template v-if="mode !== DialogMode.VIEW" #editor="{ data }">
          <InfiniteSelect
            v-model="(data as PurchaseOrderDetailRow).productId"
            option-label="code"
            option-value="id"
            :fetch-fn="(query: string) => ProductsService.list(query)"
            class="w-full"
            @select-option="(opt) => onProductSelect(data as PurchaseOrderDetailRow, opt)"
          >
            <template #option="{ option }">{{ option.code }} - {{ option.name }}</template>
          </InfiniteSelect>
        </template>
      </Column>

      <!-- Product Name -->
      <Column field="productId" :header="t('purchaseOrders.details.product')">
        <template #body="{ data }">
          {{ (data as PurchaseOrderDetailRow).product?.name ?? '' }}
        </template>
      </Column>

      <!-- Quantity -->
      <Column field="quantity" :header="t('purchaseOrders.details.quantity')">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span>
              <template v-if="(getUomLevels(data as PurchaseOrderDetailRow)?.length ?? 0) > 1">
                {{
                  decomposeBaseQty(
                    (data as PurchaseOrderDetailRow).quantity as number,
                    getUomLevels(data as PurchaseOrderDetailRow)!,
                  ).join(' / ')
                }}
              </template>
              <template v-else>
                {{
                  (data as PurchaseOrderDetailRow).quantity != null
                    ? String((data as PurchaseOrderDetailRow).quantity)
                    : ''
                }}
              </template>
            </span>
            <span v-if="getUomLabel(data as PurchaseOrderDetailRow)" class="text-xs text-stone-400">
              {{ getUomLabel(data as PurchaseOrderDetailRow) }}
            </span>
            <span
              v-if="
                (getUomLevels(data as PurchaseOrderDetailRow)?.length ?? 0) > 1 &&
                (data as PurchaseOrderDetailRow).quantity != null
              "
              class="text-xs text-stone-400"
            >
              {{ (data as PurchaseOrderDetailRow).quantity!.toLocaleString(locale) }}
              {{ getUomLevels(data as PurchaseOrderDetailRow)!.at(-1)?.uom?.symbol }}
            </span>
          </div>
        </template>
        <template v-if="mode !== DialogMode.VIEW" #editor="{ data }">
          <template v-if="(getUomLevels(data as PurchaseOrderDetailRow)?.length ?? 0) > 1">
            <InputText
              :model-value="getTierString(data as PurchaseOrderDetailRow)"
              :placeholder="
                getUomLevels(data as PurchaseOrderDetailRow)!
                  .map((l) => l.uom?.symbol ?? '?')
                  .join('/')
              "
              class="w-full font-mono"
              @input="
                (e: Event) =>
                  handleTierInput(
                    data as PurchaseOrderDetailRow,
                    (e.target as HTMLInputElement).value,
                  )
              "
            />
          </template>
          <InputNumber
            v-else
            v-model="(data as PurchaseOrderDetailRow).quantity"
            :locale="locale"
            :min-fraction-digits="0"
            :max-fraction-digits="4"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Buy Price (editable — the single biggest divergence from Sales Order) -->
      <Column field="price" :header="t('purchaseOrders.details.price')">
        <template #body="{ data }">
          {{ formatValue((data as PurchaseOrderDetailRow).price) }}
        </template>
        <template v-if="mode !== DialogMode.VIEW" #editor="{ data }">
          <InputNumber
            v-model="(data as PurchaseOrderDetailRow).price"
            :locale="locale"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Gross (qty × price, before discount) -->
      <Column :header="t('purchaseOrders.details.gross')">
        <template #body="{ data }">
          {{ formatValue(computeGross(data as PurchaseOrderDetailRow)) }}
        </template>
      </Column>

      <!-- Manual Discount (rollup) -->
      <Column :header="t('purchaseOrders.details.discount')">
        <template #body="{ data }">
          {{ formatValue(computeManualDiscountTotal(data as PurchaseOrderDetailRow)) }}
        </template>
      </Column>

      <!-- Sub Amount (computed) -->
      <Column :header="t('purchaseOrders.details.subAmount')">
        <template #body="{ data }">
          {{ formatValue(computeSubAmount(data as PurchaseOrderDetailRow)) }}
        </template>
      </Column>

      <!-- Tax Base / Tax (row's own, computed on full undiscounted gross — decision #3:
           always tax-exclusive and taxable, so taxBase == gross for every row) -->
      <Column :header="t('purchaseOrders.details.taxBase')">
        <template #body="{ data }">
          {{ formatValue(computeGross(data as PurchaseOrderDetailRow)) }}
        </template>
      </Column>
      <Column :header="t('purchaseOrders.details.tax')">
        <template #body="{ data }">
          {{ formatValue(computeTax(data as PurchaseOrderDetailRow)) }}
        </template>
      </Column>

      <!-- Row editor -->
      <Column
        v-if="mode !== DialogMode.VIEW"
        :row-editor="true"
        style="width: 8rem"
        body-style="text-align:center"
      />

      <!-- Delete -->
      <Column v-if="mode !== DialogMode.VIEW" style="width: 3rem">
        <template #body="{ index, data }">
          <Button
            v-if="!(data as PurchaseOrderDetailRow)._isPlaceholder"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <!-- Row expansion: manual discounts -->
      <template #expansion="{ data }">
        <div class="bg-stone-50 px-4 py-3">
          <ManualDiscountEditor
            :model-value="(data as PurchaseOrderDetailRow)._manualDiscounts ?? []"
            :disabled="mode === DialogMode.VIEW"
            :gross="
              ((data as PurchaseOrderDetailRow).quantity ?? 0) *
              ((data as PurchaseOrderDetailRow).price ?? 0)
            "
            i18n-prefix="purchaseOrders"
            @update:model-value="
              (v) => onLineManualDiscountsUpdate(data as PurchaseOrderDetailRow, v)
            "
          />
          <p
            v-for="(disc, idx) in (data as PurchaseOrderDetailRow)._manualDiscounts ?? []"
            :key="idx"
            class="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700"
          >
            {{ t('purchaseOrders.details.manualDiscountNote', { reason: disc.reason }) }}
          </p>
        </div>
      </template>

      <template #empty>{{ t('purchaseOrders.details.empty') }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ManualDiscountEditor from '@/components/discount/ManualDiscountEditor.vue'
import DialogMode from '@/constants/dialogMode'
import type { PurchaseOrderDetailRow } from '@/types/purchaseOrder.type'
import type { ManualDiscount } from '@/types/purchaseOrder.type'
import type { UomConversionLevel } from '@/types'
import { computeBaseQty, decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import { ProductsService } from '@/services'

const { t, locale } = useI18n()

interface Props {
  modelValue: PurchaseOrderDetailRow[]
  mode: DialogMode
  taxRate?: number
}

const props = withDefaults(defineProps<Props>(), {
  taxRate: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: PurchaseOrderDetailRow[]]
}>()

const localRows = ref<PurchaseOrderDetailRow[]>([...props.modelValue])
const editingRows = ref<PurchaseOrderDetailRow[]>([])
const expandedRows = ref<Record<string, boolean>>({})
let skipNextWatch = false

function createPlaceholderRow(): PurchaseOrderDetailRow {
  return {
    _localId: crypto.randomUUID(),
    _isPlaceholder: true,
    _manualDiscounts: [],
  }
}

function ensurePlaceholder() {
  if (props.mode === DialogMode.VIEW) return
  const hasPlaceholder = localRows.value.some((r) => r._isPlaceholder)
  if (!hasPlaceholder) {
    const placeholder = createPlaceholderRow()
    localRows.value.push(placeholder)
    editingRows.value = [...editingRows.value, placeholder]
  }
}

onMounted(() => {
  ensurePlaceholder()
})

watch(
  () => props.modelValue,
  (newRows) => {
    if (skipNextWatch) {
      skipNextWatch = false
      return
    }

    if (editingRows.value.length > 0) {
      // Merge field-wise without replacing the array — replacing would remount the row
      // editors and steal focus from any active input.
      newRows.forEach((newRow) => {
        const local = localRows.value.find((r) => r._localId === newRow._localId)
        if (!local) return
        local.price = newRow.price
        local._manualDiscounts = newRow._manualDiscounts
        local._taxBaseAmount = newRow._taxBaseAmount
        local._taxAmount = newRow._taxAmount
      })
    } else {
      localRows.value = [...newRows]
    }

    ensurePlaceholder()
  },
  { deep: true },
)

function emitRows() {
  skipNextWatch = true
  emit(
    'update:modelValue',
    localRows.value.filter((r) => !r._isPlaceholder),
  )
}

function addRow() {
  ensurePlaceholder()
}

function removeRow(index: number) {
  localRows.value.splice(index, 1)
  emitRows()
  ensurePlaceholder()
}

function onRowEditSave(event: { newData: PurchaseOrderDetailRow; index: number }) {
  const { newData, index } = event
  if (newData._isPlaceholder && newData.productId) {
    newData._isPlaceholder = false
  }
  localRows.value[index] = newData
  emitRows()
  ensurePlaceholder()
}

function onProductSelect(data: PurchaseOrderDetailRow, option: object) {
  data.product = option as PurchaseOrderDetailRow['product']
  data._quantityTiers = undefined
  data['_quantityTiersRaw'] = undefined
}

function getUomLevels(data: PurchaseOrderDetailRow): UomConversionLevel[] | undefined {
  return (
    pinnedToLevels(data.pinnedUom) ??
    (data.product as { uomGroup?: { levels?: UomConversionLevel[] } } | undefined)?.uomGroup?.levels
  )
}

function getUomLabel(data: PurchaseOrderDetailRow): string | undefined {
  const levels = getUomLevels(data)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function getTierString(data: PurchaseOrderDetailRow): string {
  const raw = data['_quantityTiersRaw'] as string | undefined
  if (raw !== undefined) return raw
  return data._quantityTiers ? (data._quantityTiers as number[]).join('/') : ''
}

function handleTierInput(data: PurchaseOrderDetailRow, rawValue: string) {
  const levels = getUomLevels(data)
  if (!levels) return
  data['_quantityTiersRaw'] = rawValue
  const parts = rawValue.split('/')
  const tiers = Array.from({ length: levels.length }, (_, i) => {
    const n = parseInt((parts[i] ?? '').trim(), 10)
    return isNaN(n) || n < 0 ? 0 : n
  })
  data._quantityTiers = tiers
  data.quantity = computeBaseQty(tiers, levels)
}

function computeManualDiscountTotal(data: PurchaseOrderDetailRow): number {
  return (data._manualDiscounts ?? []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
}

function computeGross(data: PurchaseOrderDetailRow): number {
  return ((data.quantity ?? 0) as number) * ((data.price ?? 0) as number)
}

function computeSubAmount(data: PurchaseOrderDetailRow): number {
  return computeGross(data) - computeManualDiscountTotal(data)
}

// Row's own Tax Base == gross (decision #3: always tax-exclusive and taxable, so the manual
// discount reduces the tax base only at the header level, via its own negated tax entry).
function computeTax(data: PurchaseOrderDetailRow): number {
  return Math.round(((computeGross(data) * props.taxRate) / 100) * 100) / 100
}

const numberFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
)

function formatValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(n) ? '' : numberFormatter.value.format(n)
}

function onLineManualDiscountsUpdate(row: PurchaseOrderDetailRow, discounts: ManualDiscount[]) {
  row._manualDiscounts = discounts
  skipNextWatch = true
  emitRows()
}
</script>
