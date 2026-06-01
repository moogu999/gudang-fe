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

      <!-- UOM (read-only) -->
      <Column :header="t('goodsReceipts.details.uom')" style="width: 6rem">
        <template #body="{ data }">
          <span class="text-stone-500">{{ getUomSymbol(data as GoodsReceiptDetailRow) }}</span>
        </template>
      </Column>

      <!-- Quantity -->
      <Column field="quantity" :header="t('goodsReceipts.details.quantity')">
        <template #body="{ data }">
          {{
            (data as GoodsReceiptDetailRow).quantity != null
              ? String((data as GoodsReceiptDetailRow).quantity)
              : ''
          }}
        </template>
        <template #editor="{ data }">
          <InputNumber
            v-model="(data as GoodsReceiptDetailRow).quantity"
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
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import type { GoodsReceiptDetailRow } from '@/types'
import { ProductsService } from '@/services'

const { t, locale } = useI18n()

interface Props {
  modelValue: GoodsReceiptDetailRow[]
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

function ensurePlaceholder() {
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
    localRows.value = [...newRows]
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

function onRowEditSave(event: { newData: GoodsReceiptDetailRow; index: number }) {
  const { newData, index } = event
  if (newData._isPlaceholder && newData.productId) {
    newData._isPlaceholder = false
  }
  localRows.value[index] = newData
  emitRows()
  ensurePlaceholder()
}

function onProductSelect(data: GoodsReceiptDetailRow, option: object) {
  data.product = option as GoodsReceiptDetailRow['product']
}

function getUomSymbol(data: GoodsReceiptDetailRow): string {
  const levels = data.product?.uomGroup?.levels
  if (!levels?.length) return ''
  return levels[levels.length - 1].uom?.symbol ?? ''
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
