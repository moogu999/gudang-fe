<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h4 class="text-sm font-semibold sm:text-base">{{ t('goodsReceipts.details.title') }}</h4>
      <Button
        :label="t('goodsReceipts.details.addDetail')"
        icon="pi pi-plus"
        size="small"
        @click="addRow"
      />
    </div>

    <DataTable
      v-model:editing-rows="editingRows"
      :value="localRows"
      edit-mode="row"
      data-key="_localId"
      striped-rows
      responsive-layout="scroll"
      class="text-sm"
      @row-edit-save="onRowEditSave"
    >
      <Column header="#" style="width: 3rem">
        <template #body="{ index, data }">
          <span class="text-stone-400">{{
            (data as GoodsReceiptDetailRow)._isPlaceholder ? '' : index + 1
          }}</span>
        </template>
      </Column>

      <!-- Product Code -->
      <Column field="productCode" :header="t('goodsReceipts.details.productCode')">
        <template #body="{ data }">
          {{ (data as GoodsReceiptDetailRow).product?.code ?? '' }}
        </template>
        <template #editor="{ data }">
          <InfiniteSelect
            v-model="(data as GoodsReceiptDetailRow).productId"
            option-label="code"
            option-value="id"
            :fetch-fn="(query: string) => ProductsService.list(query)"
            class="w-full"
            @select-option="(opt) => onProductSelect(data as GoodsReceiptDetailRow, opt)"
          >
            <template #option="{ option }">{{ option.code }} - {{ option.name }}</template>
          </InfiniteSelect>
        </template>
      </Column>

      <!-- Product Name -->
      <Column field="productId" :header="t('goodsReceipts.details.product')">
        <template #body="{ data }">
          {{ (data as GoodsReceiptDetailRow).product?.name ?? '' }}
        </template>
      </Column>

      <!-- Quantity -->
      <Column field="quantity" :header="t('goodsReceipts.details.quantity')">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span>{{ formatQty(data as GoodsReceiptDetailRow) }}</span>
            <span v-if="getUomLabel(data as GoodsReceiptDetailRow)" class="text-xs text-stone-400">
              {{ getUomLabel(data as GoodsReceiptDetailRow) }}
            </span>
            <span
              v-if="
                (getUomLevels(data as GoodsReceiptDetailRow)?.length ?? 0) > 1 &&
                (data as GoodsReceiptDetailRow).quantity != null
              "
              class="text-xs text-stone-400"
            >
              {{ (data as GoodsReceiptDetailRow).quantity!.toLocaleString(locale) }}
              {{ getUomLevels(data as GoodsReceiptDetailRow)!.at(-1)?.uom?.symbol }}
            </span>
          </div>
        </template>
        <template #editor="{ data }">
          <template v-if="(getUomLevels(data as GoodsReceiptDetailRow)?.length ?? 0) > 1">
            <InputText
              :model-value="getTierString(data as GoodsReceiptDetailRow)"
              :placeholder="
                getUomLevels(data as GoodsReceiptDetailRow)!
                  .map((l) => l.uom?.symbol ?? '?')
                  .join('/')
              "
              class="w-full font-mono"
              @input="
                (e: Event) =>
                  handleTierInput(
                    data as GoodsReceiptDetailRow,
                    (e.target as HTMLInputElement).value,
                  )
              "
            />
          </template>
          <InputNumber
            v-else
            v-model="(data as GoodsReceiptDetailRow).quantity"
            :locale="locale"
            :min-fraction-digits="0"
            :max-fraction-digits="4"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Price (editable) -->
      <Column field="price" :header="t('goodsReceipts.details.price')">
        <template #body="{ data }">
          {{ formatValue((data as GoodsReceiptDetailRow).price) }}
        </template>
        <template #editor="{ data }">
          <InputNumber
            v-model="(data as GoodsReceiptDetailRow).price"
            :locale="locale"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Sub Amount (computed) -->
      <Column :header="t('goodsReceipts.details.subAmount')">
        <template #body="{ data }">
          {{ formatValue(computeSubAmount(data as GoodsReceiptDetailRow)) }}
        </template>
      </Column>

      <!-- Row editor -->
      <Column :row-editor="true" style="width: 8rem" body-style="text-align:center" />

      <!-- Delete -->
      <Column style="width: 3rem">
        <template #body="{ index, data }">
          <Button
            v-if="!(data as GoodsReceiptDetailRow)._isPlaceholder"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <template #empty>{{ t('goodsReceipts.details.empty') }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { useToast } from 'primevue/usetoast'
import type { GoodsReceiptDetailRow, UomConversionLevel } from '@/types'
import { computeBaseQty, decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import { commonWarnToast } from '@/services/toast'
import { ProductsService } from '@/services'

const { t, locale } = useI18n()
const toast = useToast()

interface Props {
  modelValue: GoodsReceiptDetailRow[]
  /** Toast group of the parent form, so row validation surfaces in its Toast. */
  toastGroup: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: GoodsReceiptDetailRow[]]
}>()

const localRows = ref<GoodsReceiptDetailRow[]>([...props.modelValue])
const editingRows = ref<GoodsReceiptDetailRow[]>([])
let skipNextWatch = false

function createPlaceholderRow(): GoodsReceiptDetailRow {
  return {
    _localId: crypto.randomUUID(),
    _isPlaceholder: true,
  }
}

// Seeds a blank row so an empty table is ready to type into. Once the table holds
// rows, adding more is the "add item" button's job — seeding here as well would
// leave a second blank row hanging under every saved one.
function ensurePlaceholder() {
  if (localRows.value.length > 0) return
  addRow()
}

// Appends a blank row in edit mode. It stays a placeholder — and so stays out of
// what the parent form submits — until the row editor saves it with a product and
// a quantity.
function addRow() {
  const placeholder = createPlaceholderRow()
  localRows.value.push(placeholder)
  editingRows.value = [...editingRows.value, placeholder]
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
    // Blank rows are filtered out of what the parent holds, so keep the ones still
    // open in the editor — a plain reassignment would drop them while being typed in.
    const pending = localRows.value.filter((r) => r._isPlaceholder)
    localRows.value = [...newRows, ...pending]
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

function removeRow(index: number) {
  localRows.value.splice(index, 1)
  emitRows()
  ensurePlaceholder()
}

// Product, quantity and price are all required for a row to count as an item.
// Returns the message explaining the first problem found, or null when the row is
// complete. `row` is the 1-based row number shown in the table.
function rowError(data: GoodsReceiptDetailRow, row: number): string | null {
  if (!data.productId) {
    return t('goodsReceipts.validation.detailProductRequired', { row })
  }
  if (!data.quantity || (data.quantity as number) <= 0) {
    return t('goodsReceipts.validation.detailQtyRequired', { row })
  }
  if (data.price === undefined || data.price === null || (data.price as number) < 0) {
    return t('goodsReceipts.validation.detailPriceRequired', { row })
  }
  return null
}

function onRowEditSave(event: { newData: GoodsReceiptDetailRow; index: number }) {
  const { newData, index } = event

  // Keep whatever was typed, so nothing is lost whether the row is accepted or not.
  localRows.value[index] = newData

  const error = rowError(newData, index + 1)
  if (error) {
    // DataTable has already closed the editor by now, so reopen it: an incomplete row
    // has to stay editable instead of sitting in the table looking like a saved item.
    editingRows.value = [...editingRows.value, newData]
    toast.add(commonWarnToast(error, props.toastGroup))
    return
  }

  newData._isPlaceholder = false
  emitRows()
  ensurePlaceholder()
}

function onProductSelect(data: GoodsReceiptDetailRow, option: object) {
  data.product = option as GoodsReceiptDetailRow['product']
  data._quantityTiers = undefined
  data['_quantityTiersRaw'] = undefined
}

function getUomLevels(data: GoodsReceiptDetailRow): UomConversionLevel[] | undefined {
  return (
    pinnedToLevels(data.pinnedUom) ??
    (data.product as { uomGroup?: { levels?: UomConversionLevel[] } } | undefined)?.uomGroup?.levels
  )
}

// Renders the quantity as UOM tiers ("1 / 0 / 6") when the product has a multi-level
// UOM group, or as a plain number otherwise. Returns an empty string for a row with
// no quantity yet — decomposing an absent quantity would print "NaN / NaN / NaN".
function formatQty(data: GoodsReceiptDetailRow): string {
  if (data.quantity == null) return ''

  const levels = getUomLevels(data)
  if ((levels?.length ?? 0) > 1) {
    return decomposeBaseQty(data.quantity as number, levels!).join(' / ')
  }

  return String(data.quantity)
}

function getUomLabel(data: GoodsReceiptDetailRow): string {
  const levels = getUomLevels(data)
  if (!levels?.length) return ''
  if (levels.length === 1) return levels[0].uom?.symbol ?? ''
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function getTierString(data: GoodsReceiptDetailRow): string {
  const raw = data['_quantityTiersRaw'] as string | undefined
  if (raw !== undefined) return raw
  return data._quantityTiers ? (data._quantityTiers as number[]).join('/') : ''
}

function handleTierInput(data: GoodsReceiptDetailRow, rawValue: string) {
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

function computeSubAmount(data: GoodsReceiptDetailRow): number {
  return ((data.quantity ?? 0) as number) * ((data.price ?? 0) as number)
}

const numberFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
)

function formatValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(n) ? '' : numberFormatter.value.format(n)
}
</script>
