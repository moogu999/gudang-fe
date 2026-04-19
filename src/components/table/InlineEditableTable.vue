<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h4 class="text-sm font-semibold sm:text-base">{{ title }}</h4>
      <Button
        v-if="!disabled && mode !== DialogMode.VIEW"
        :label="addButtonLabel"
        icon="pi pi-plus"
        size="small"
        @click="addRow"
      />
    </div>

    <DataTable
      v-model:editing-rows="editingRows"
      :value="localRows"
      :edit-mode="mode === DialogMode.VIEW ? undefined : 'row'"
      striped-rows
      responsive-layout="scroll"
      class="text-sm"
      @row-edit-save="onRowEditSave"
    >
      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header">
        <template #body="{ data }">
          <template v-if="col.type === 'computed'">
            {{ col.computeFn ? formatValue(col.computeFn(data)) : formatValue(data[col.field]) }}
          </template>
          <template v-else-if="col.type === 'select' && col.optionLabel">
            {{
              data[col.field.replace('Id', '')]
                ? data[col.field.replace('Id', '')][col.optionLabel]
                : ''
            }}
          </template>
          <template v-else-if="col.type === 'uom-quantity'">
            <template v-if="(col.getUomLevels(data)?.length ?? 0) > 1">
              {{ decomposeBaseQty(data[col.field] as number, col.getUomLevels(data)!).join(' / ') }}
            </template>
            <template v-else>
              {{ formatValue(data[col.field]) }}
            </template>
          </template>
          <template v-else>
            {{ formatValue(data[col.field]) }}
          </template>
        </template>

        <template v-if="col.editable !== false" #editor="{ data, field }">
          <!-- Text input -->
          <InputText
            v-if="col.type === 'text'"
            v-model="data[field]"
            class="w-full"
            autocomplete="off"
          />

          <!-- Numeric input -->
          <InputNumber
            v-else-if="col.type === 'number'"
            v-model="data[field]"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            class="w-full"
          />

          <!-- Select (InfiniteSelect) -->
          <InfiniteSelect
            v-else-if="col.type === 'select'"
            v-model="data[field]"
            :option-label="col.optionLabel"
            :option-value="col.optionValue"
            :fetch-fn="col.fetchFn"
            class="w-full"
            @update:model-value="(value) => onSelectChange(data, field, value)"
            @select-option="(option) => onSelectOption(data, field, option)"
          />

          <!-- UOM tiered quantity input -->
          <template v-else-if="col.type === 'uom-quantity'">
            <template v-if="(col.getUomLevels(data)?.length ?? 0) > 1">
              <InputText
                :model-value="getTierString(data, field)"
                :placeholder="
                  col
                    .getUomLevels(data)!
                    .map((l) => l.uom?.symbol ?? '?')
                    .join('/')
                "
                class="w-full font-mono"
                @input="
                  (e) =>
                    handleTierInput(
                      data,
                      field,
                      (e.target as HTMLInputElement).value,
                      col.getUomLevels(data)!,
                    )
                "
              />
            </template>
            <!-- Fallback: no UOM group or single level -->
            <InputNumber
              v-else
              v-model="data[field]"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              class="w-full"
            />
          </template>
        </template>
      </Column>

      <Column
        v-if="mode !== DialogMode.VIEW"
        :row-editor="true"
        style="width: 10%; min-width: 8rem"
        body-style="text-align:center"
      />

      <Column
        v-if="mode !== DialogMode.VIEW"
        :header="t('common.labels.actions')"
        style="width: 8rem"
      >
        <template #body="{ index }">
          <Button
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <template #empty>{{ emptyMessage }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { useI18n } from 'vue-i18n'
import DialogMode from '@/constants/dialogMode'
import type { Base, UomConversionLevel } from '@/types'
import { computeBaseQty, decomposeBaseQty } from '@/utils/uomHelper'

const { t } = useI18n()

export type EditableColumn =
  | {
      field: string
      header: string
      type: 'text' | 'number'
      required?: boolean
      editable?: boolean
    }
  | {
      field: string
      header: string
      type: 'select'
      required?: boolean
      editable?: boolean
      fetchFn: (query: string) => Promise<Base<object>>
      optionLabel: string
      optionValue: string
    }
  | {
      field: string
      header: string
      type: 'computed'
      required?: boolean
      editable?: boolean
      computeFn: (row: Record<string, unknown>) => unknown
    }
  | {
      field: string
      header: string
      type: 'uom-quantity'
      required?: boolean
      editable?: boolean
      getUomLevels: (row: Record<string, unknown>) => UomConversionLevel[] | undefined
    }

interface Props {
  modelValue: Record<string, unknown>[]
  columns: EditableColumn[]
  mode?: DialogMode
  disabled?: boolean
  title?: string
  addButtonLabel?: string
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: DialogMode.ADD,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

// Computed properties with i18n defaults
const title = computed(() => props.title ?? t('table.details'))
const addButtonLabel = computed(() => props.addButtonLabel ?? t('table.addRow'))
const emptyMessage = computed(() => props.emptyMessage ?? t('table.noItems'))

const localRows = ref<Record<string, unknown>[]>([...props.modelValue])
const editingRows = ref<Record<string, unknown>[]>([])

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    localRows.value = [...newValue]
  },
  { deep: true },
)

function addRow() {
  const newRow: Record<string, unknown> = { _localId: crypto.randomUUID() }

  // Initialize fields based on column types
  props.columns.forEach((col) => {
    if (col.type === 'number' || col.type === 'uom-quantity') {
      newRow[col.field] = 0
    } else if (col.type === 'computed') {
      newRow[col.field] = undefined
    } else {
      newRow[col.field] = undefined
    }
  })

  localRows.value.push(newRow)

  // Automatically enter edit mode for new row
  editingRows.value = [newRow]

  // Emit changes to parent
  emit('update:modelValue', localRows.value)
}

function removeRow(index: number) {
  localRows.value.splice(index, 1)

  // Emit changes to parent
  emit('update:modelValue', localRows.value)
}

function onRowEditSave(event: { newData: Record<string, unknown>; index: number }) {
  const { newData, index } = event
  localRows.value[index] = newData

  // Emit changes to parent
  emit('update:modelValue', localRows.value)
}

function onSelectChange(
  row: Record<string, unknown>,
  field: string,
  value: string | number | boolean | Date | object | null | undefined,
) {
  row[field] = value
}

// Populate the related object for display (e.g., productId -> product)
function onSelectOption(row: Record<string, unknown>, field: string, option: object) {
  const relatedField = field.replace('Id', '')
  row[relatedField] = option
}

function getTierString(data: Record<string, unknown>, field: string): string {
  // Prefer the raw typed string so Vue doesn't overwrite the input mid-edit
  const raw = data['_' + field + 'TiersRaw'] as string | undefined
  if (raw !== undefined) return raw
  const tiers = data['_' + field + 'Tiers'] as number[] | undefined
  return tiers ? tiers.join('/') : ''
}

function handleTierInput(
  data: Record<string, unknown>,
  field: string,
  rawValue: string,
  levels: UomConversionLevel[],
) {
  // Store raw string as-is so :model-value stays identical to what the user typed
  data['_' + field + 'TiersRaw'] = rawValue
  const parts = rawValue.split('/')
  const tiers = Array.from({ length: levels.length }, (_, i) => {
    const n = parseInt((parts[i] ?? '').trim(), 10)
    return isNaN(n) || n < 0 ? 0 : n
  })
  data['_' + field + 'Tiers'] = tiers
  data[field] = computeBaseQty(tiers, levels)
}

// Format values for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toFixed(2)
  return String(value)
}
</script>
