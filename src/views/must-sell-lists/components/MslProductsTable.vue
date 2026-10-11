<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold">
              {{ t('mustSellLists.products.title', { n: items.length }) }}
            </h2>
            <p class="text-sm text-stone-500">{{ t('mustSellLists.products.subtitle') }}</p>
          </div>
          <div v-if="!readonly" class="flex flex-wrap gap-2">
            <span v-tooltip.top="needPrincipal ? t('mustSellLists.products.needPrincipal') : ''">
              <Button
                type="button"
                :label="t('mustSellLists.products.addFromCategory')"
                icon="pi pi-th-large"
                severity="secondary"
                outlined
                size="small"
                :disabled="needPrincipal"
                data-testid="add-from-category"
                @click="emit('addFromCategory')"
              />
            </span>
            <span v-tooltip.top="needPrincipal ? t('mustSellLists.products.needPrincipal') : ''">
              <Button
                type="button"
                :label="t('mustSellLists.products.addProduct')"
                icon="pi pi-plus"
                size="small"
                :disabled="needPrincipal"
                data-testid="add-product"
                @click="emit('addProduct')"
              />
            </span>
          </div>
        </div>

        <DataTable :value="items" data-key="key" class="text-sm" @row-reorder="onRowReorder">
          <Column v-if="!readonly" row-reorder style="width: 3rem" :reorderable-column="false" />
          <Column
            field="code"
            :header="t('mustSellLists.products.columns.code')"
            class="font-mono"
          />
          <Column :header="t('mustSellLists.products.columns.product')">
            <template #body="{ data }">
              <div>{{ data.name }}</div>
              <div v-if="data.categoryName" class="text-xs text-stone-500">
                {{ data.categoryName }}
              </div>
            </template>
          </Column>
          <Column :header="t('mustSellLists.products.columns.suggestedUnit')" style="width: 11rem">
            <template #body="{ data }">
              <Select
                :model-value="selectedUnitId(data)"
                :options="data.units"
                option-label="name"
                option-value="uomId"
                :disabled="readonly || data.units.length < 2"
                class="w-full"
                data-testid="item-unit"
                @update:model-value="(v: number) => setUnit(data, v)"
              />
            </template>
          </Column>
          <Column :header="t('mustSellLists.products.columns.minQty')" style="width: 13rem">
            <template #body="{ data }">
              <div class="flex flex-col gap-1">
                <InputNumber
                  :model-value="toDisplay(data.minQty, unitOf(data))"
                  :min="0"
                  :min-fraction-digits="0"
                  :max-fraction-digits="4"
                  :suffix="suffix(data)"
                  :disabled="readonly"
                  :invalid="!isValidMinQty(data.minQty)"
                  :placeholder="t('mustSellLists.products.anyQty')"
                  show-clear
                  input-class="w-full"
                  data-testid="item-min-qty"
                  @update:model-value="(v: number | null) => setMinQty(data, v)"
                />
                <small v-if="!isValidMinQty(data.minQty)" class="text-red-500">
                  {{ t('mustSellLists.products.minQtyInvalid') }}
                </small>
              </div>
            </template>
          </Column>
          <Column v-if="!readonly" style="width: 3rem">
            <template #body="{ data }">
              <Button
                type="button"
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                size="small"
                :aria-label="t('common.actions.delete')"
                data-testid="item-remove"
                @click="remove(data)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">
              {{ t('mustSellLists.products.empty') }}
            </div>
          </template>
        </DataTable>

        <small v-if="error" class="text-red-500">{{ error }}</small>
        <small class="text-surface-500">{{ t('mustSellLists.products.help') }}</small>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import {
  isValidMinQty,
  toBase,
  toDisplay,
  unitName,
  unitOf,
  type FormItem,
} from '../mustSellListHelpers'

defineProps<{
  readonly?: boolean
  needPrincipal?: boolean
  error?: string
}>()

const items = defineModel<FormItem[]>('items', { required: true })

const emit = defineEmits<{ addProduct: []; addFromCategory: [] }>()

const { t } = useI18n()

function onRowReorder(event: DataTableRowReorderEvent) {
  items.value = event.value as FormItem[]
}

/** The unit the select shows: the suggested one, else the base unit. */
function selectedUnitId(item: FormItem): number | undefined {
  return item.uomId ?? item.units.find((u) => u.isBase)?.uomId
}

/** Switching unit re-displays the stored base quantity; it never changes it. */
function setUnit(item: FormItem, uomId: number) {
  const unit = item.units.find((u) => u.uomId === uomId)
  item.uomId = unit && !unit.isBase ? uomId : null
}

function setMinQty(item: FormItem, value: number | null) {
  item.minQty = toBase(value, unitOf(item))
}

function suffix(item: FormItem): string | undefined {
  const name = unitName(item)
  return name ? ` ${name}` : undefined
}

function remove(item: FormItem) {
  items.value = items.value.filter((i) => i.key !== item.key)
}
</script>
