<template>
  <div>
    <h4 class="mb-3 text-sm font-semibold sm:text-base">{{ t('goodsReceipts.details.title') }}</h4>

    <DataTable
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
        <template #body="{ index }">
          <span class="text-stone-400">{{ index + 1 }}</span>
        </template>
      </Column>

      <!-- Product (read-only — lines come from the PO) -->
      <Column :header="t('goodsReceipts.details.productCode')">
        <template #body="{ data }">
          <div class="flex flex-col">
            <span>{{ (data as GoodsReceiptDetailRow).product?.code ?? '' }}</span>
            <span class="text-xs text-stone-500">{{
              (data as GoodsReceiptDetailRow).product?.name ?? ''
            }}</span>
          </div>
        </template>
      </Column>

      <!-- Qty PO (read-only) -->
      <Column :header="t('goodsReceipts.details.poQuantity')">
        <template #body="{ data }">
          {{
            formatTieredQty(
              data as GoodsReceiptDetailRow,
              (data as GoodsReceiptDetailRow)._poQuantity,
            )
          }}
        </template>
      </Column>

      <!-- Qty diterima (editable) -->
      <Column field="quantity" :header="t('goodsReceipts.details.receivedQuantity')">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span>{{
              formatTieredQty(
                data as GoodsReceiptDetailRow,
                (data as GoodsReceiptDetailRow).quantity,
              )
            }}</span>
            <span v-if="getUomLabel(data as GoodsReceiptDetailRow)" class="text-xs text-stone-400">
              {{ getUomLabel(data as GoodsReceiptDetailRow) }}
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
            :min="0"
            :min-fraction-digits="0"
            :max-fraction-digits="4"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Stock type -->
      <Column field="stockType" :header="t('goodsReceipts.details.stockType')">
        <template #body="{ data }">
          {{ stockTypeLabel((data as GoodsReceiptDetailRow).stockType) }}
        </template>
        <template #editor="{ data }">
          <Select
            v-model="(data as GoodsReceiptDetailRow).stockType"
            :options="stockTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Price (read-only — server-derived from the PO) -->
      <Column :header="t('goodsReceipts.details.price')">
        <template #body="{ data }">
          {{ formatValue((data as GoodsReceiptDetailRow).price) }}
        </template>
      </Column>

      <!-- Gross (qty × price) -->
      <Column :header="t('goodsReceipts.details.gross')">
        <template #body="{ data }">
          {{ formatValue(computeGross(data as GoodsReceiptDetailRow)) }}
        </template>
      </Column>

      <!-- Subtotal (computed — no discount concept on Goods Receipt, so subtotal == gross) -->
      <Column :header="t('goodsReceipts.details.subAmount')">
        <template #body="{ data }">
          {{ formatValue(computeSubAmount(data as GoodsReceiptDetailRow)) }}
        </template>
      </Column>

      <!-- Tax Base / Tax -->
      <Column :header="t('goodsReceipts.details.taxBase')">
        <template #body="{ data }">
          {{ formatValue(computeTaxBase(data as GoodsReceiptDetailRow)) }}
        </template>
      </Column>
      <Column :header="t('goodsReceipts.details.tax')">
        <template #body="{ data }">
          {{ formatValue(computeTax(data as GoodsReceiptDetailRow)) }}
        </template>
      </Column>

      <!-- Row editor -->
      <Column
        v-if="mode !== DialogMode.VIEW"
        :row-editor="true"
        style="width: 8rem"
        body-style="text-align:center"
      />

      <!-- Split / Delete -->
      <Column v-if="mode !== DialogMode.VIEW" style="width: 6rem">
        <template #body="{ index, data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-clone"
              size="small"
              text
              :title="t('goodsReceipts.details.splitLine')"
              @click="splitRow(data as GoodsReceiptDetailRow)"
            />
            <Button
              v-if="(data as GoodsReceiptDetailRow)._isSplit"
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              @click="removeRow(index)"
            />
          </div>
        </template>
      </Column>

      <template #empty>{{ t('goodsReceipts.details.empty') }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import type { GoodsReceiptDetailRow, StockType, UomConversionLevel } from '@/types'
import { computeBaseQty, decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import { commonWarnToast } from '@/services/toast'
import { useGoodsReceiptLabels } from '@/composables'
import DialogMode from '@/constants/dialogMode'

const { t, locale } = useI18n()
const toast = useToast()
const { stockTypeLabel } = useGoodsReceiptLabels()

interface Props {
  modelValue: GoodsReceiptDetailRow[]
  mode: DialogMode
  toastGroup: string
  taxRate?: number
}

const props = withDefaults(defineProps<Props>(), {
  taxRate: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: GoodsReceiptDetailRow[]]
}>()

const localRows = ref<GoodsReceiptDetailRow[]>([...props.modelValue])
const editingRows = ref<GoodsReceiptDetailRow[]>([])
let skipNextWatch = false

const stockTypeOptions = computed(() => [
  { value: 'good', label: t('goodsReceipts.stockTypes.good') },
  { value: 'bad', label: t('goodsReceipts.stockTypes.bad') },
])

watch(
  () => props.modelValue,
  (newRows) => {
    if (skipNextWatch) {
      skipNextWatch = false
      return
    }
    localRows.value = [...newRows]
  },
  { deep: true },
)

function emitRows() {
  skipNextWatch = true
  emit('update:modelValue', localRows.value)
}

function getUomLevels(data: GoodsReceiptDetailRow): UomConversionLevel[] | undefined {
  return pinnedToLevels(data.pinnedUom)
}

function getUomLabel(data: GoodsReceiptDetailRow): string {
  const levels = getUomLevels(data)
  if (!levels?.length) return ''
  if (levels.length === 1) return levels[0].uom?.symbol ?? ''
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function formatTieredQty(data: GoodsReceiptDetailRow, value: number | undefined): string {
  if (value == null) return ''
  const levels = getUomLevels(data)
  if ((levels?.length ?? 0) > 1) {
    return decomposeBaseQty(value, levels!).join(' / ')
  }
  return String(value)
}

function getTierString(data: GoodsReceiptDetailRow): string {
  const raw = data['_quantityTiersRaw'] as string | undefined
  if (raw !== undefined) return raw
  const levels = getUomLevels(data)
  if (!levels || data.quantity == null) return ''
  return decomposeBaseQty(data.quantity, levels).join('/')
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
  data.quantity = computeBaseQty(tiers, levels)
}

function computeGross(data: GoodsReceiptDetailRow): number {
  return (data.quantity ?? 0) * (data.price ?? 0)
}

// No discount concept on Goods Receipt, so subtotal and tax base both equal gross.
function computeSubAmount(data: GoodsReceiptDetailRow): number {
  return computeGross(data)
}

function computeTaxBase(data: GoodsReceiptDetailRow): number {
  return computeGross(data)
}

function computeTax(data: GoodsReceiptDetailRow): number {
  return Math.round(((computeTaxBase(data) * props.taxRate) / 100) * 100) / 100
}

// Sum of quantity across every row (including split rows) sharing the same PO line,
// excluding `excludeLocalId` — used to check the running total against the PO's remainder.
function consumedForLine(
  purchaseOrderDetailId: number | undefined,
  excludeLocalId?: string,
): number {
  return localRows.value
    .filter(
      (r) => r.purchaseOrderDetailId === purchaseOrderDetailId && r._localId !== excludeLocalId,
    )
    .reduce((sum, r) => sum + (r.quantity ?? 0), 0)
}

function remainingForLine(data: GoodsReceiptDetailRow): number {
  const poQty = data._poQuantity ?? 0
  const poReceived = data._poReceivedQuantity ?? 0
  return poQty - poReceived
}

function onRowEditSave(event: { newData: GoodsReceiptDetailRow; index: number }) {
  const { newData, index } = event

  const qty = newData.quantity ?? 0
  const others = consumedForLine(newData.purchaseOrderDetailId, newData._localId)
  const remaining = remainingForLine(newData)

  if (qty < 0 || others + qty > remaining) {
    editingRows.value = [...editingRows.value, newData]
    toast.add(
      commonWarnToast(
        t('goodsReceipts.validation.overReceipt', {
          qty: formatTieredQty(newData, remaining),
          uom: getUomLabel(newData),
        }),
        props.toastGroup,
      ),
    )
    return
  }

  localRows.value[index] = newData
  emitRows()
}

function splitRow(data: GoodsReceiptDetailRow) {
  const clone: GoodsReceiptDetailRow = {
    ...data,
    _localId: crypto.randomUUID(),
    _isSplit: true,
    quantity: 0,
    stockType: data.stockType === 'bad' ? ('good' as StockType) : ('bad' as StockType),
  }
  delete clone['_quantityTiersRaw']
  localRows.value.push(clone)
  editingRows.value = [...editingRows.value, clone]
  emitRows()
}

function removeRow(index: number) {
  localRows.value.splice(index, 1)
  emitRows()
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
