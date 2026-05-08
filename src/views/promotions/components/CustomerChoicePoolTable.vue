<template>
  <div>
    <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      <!-- Threshold -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">
          {{
            thresholdKind === 'min_qty'
              ? t('promotions.fields.minQty')
              : t('promotions.fields.minAmount')
          }}
        </label>
        <InputText
          v-if="!isView"
          v-model="pool.threshold"
          :class="{ 'p-invalid': errors.threshold }"
          autocomplete="off"
        />
        <span v-else>{{ pool.threshold }}</span>
        <small v-if="errors.threshold" class="text-red-500">{{ errors.threshold }}</small>
      </div>

      <!-- Pickable count -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('promotions.fields.pickableCount') }}</label>
        <InputNumber
          v-if="!isView"
          v-model="pool.pickableCount"
          :min="1"
          :class="{ 'p-invalid': errors.pickableCount }"
          class="w-full"
        />
        <span v-else>{{ pool.pickableCount }}</span>
        <small v-if="errors.pickableCount" class="text-red-500">{{ errors.pickableCount }}</small>
      </div>
    </div>

    <!-- Pool items -->
    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-600">{{
          t('promotions.labels.customerChoicePool')
        }}</span>
        <Button
          v-if="!isView"
          :label="t('promotions.labels.addPoolItem')"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          @click="addItem"
        />
      </div>

      <div
        v-if="pool.items.length === 0"
        class="rounded border p-3 text-center text-sm text-gray-500"
      >
        {{ t('table.noItems') }}
      </div>

      <DataTable v-else :value="pool.items" size="small">
        <Column :header="t('promotions.fields.productCode')" style="min-width: 20rem">
          <template #body="{ data: item }">
            <InfiniteSelect
              v-if="!isView"
              option-label="code"
              option-value="id"
              :fetch-fn="(query) => ProductsService.list(query)"
              :placeholder="t('promotions.labels.selectProduct')"
              :initial-option="item._product"
              :model-value="item.productId"
              sort-by="code"
              sort-operator="asc"
              @update:model-value="(v) => (item.productId = v as number)"
              @select-option="(opt) => onProductSelected(item, opt)"
            >
              <template #option="{ option }">
                {{ option.code }} - {{ option.name }}
              </template>
            </InfiniteSelect>
            <span v-else>{{ item._product?.code ?? String(item.productId ?? '') }}</span>
          </template>
        </Column>
        <Column :header="t('promotions.fields.product')" style="min-width: 10rem">
          <template #body="{ data: item }">
            <span>{{ item._product?.name ?? '—' }}</span>
          </template>
        </Column>
        <Column :header="t('promotions.fields.uom')" style="width: 6rem">
          <template #body="{ data: item }">
            <InputText
              v-if="!isView"
              :value="item._product?.smallestUomSymbol ?? ''"
              disabled
              size="small"
              class="w-full"
            />
            <span v-else>{{ item._product?.smallestUomSymbol ?? '—' }}</span>
          </template>
        </Column>
        <Column :header="t('promotions.fields.bonusAmount')" style="width: 10rem">
          <template #body="{ data: item, index }">
            <div class="flex flex-col gap-1">
              <InputText
                v-if="!isView"
                v-model="item.bonusAmount"
                size="small"
                class="w-full"
                :class="{ 'p-invalid': errors.items[index] }"
                autocomplete="off"
              />
              <span v-else>{{ item.bonusAmount }}</span>
              <small v-if="errors.items[index]" class="text-red-500">{{
                errors.items[index]
              }}</small>
            </div>
          </template>
        </Column>
        <Column v-if="!isView" style="width: 4rem">
          <template #body="{ index }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="removeItem(index)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { ProductsService } from '@/services/products.service'
import type { ThresholdKind } from '@/types/promotion.type'

export interface CustomerChoicePoolItemForm {
  productId: number | undefined
  bonusAmount: string
  _product?: { id: number; code: string; name: string; smallestUomSymbol?: string }
}

export interface CustomerChoicePoolForm {
  threshold: string
  pickableCount: number
  items: CustomerChoicePoolItemForm[]
}

export interface CustomerChoicePoolErrors {
  threshold: string
  pickableCount: string
  items: string[]
}

const pool = defineModel<CustomerChoicePoolForm>('pool', { required: true })

defineProps<{
  thresholdKind: ThresholdKind
  errors: CustomerChoicePoolErrors
  isView: boolean
}>()

const { t } = useI18n()

function addItem() {
  pool.value.items.push({ productId: undefined, bonusAmount: '' })
}

function removeItem(index: number) {
  pool.value.items.splice(index, 1)
}

function onProductSelected(
  item: CustomerChoicePoolItemForm,
  opt: {
    id: number
    code: string
    name: string
    uomGroup?: { levels: { uom?: { symbol?: string } }[] }
  },
) {
  item._product = {
    id: opt.id,
    code: opt.code,
    name: opt.name,
    smallestUomSymbol: getSmallestUomSymbol(opt),
  }
}

function getSmallestUomSymbol(opt: {
  uomGroup?: { levels: { uom?: { symbol?: string } }[] }
}): string | undefined {
  const levels = opt.uomGroup?.levels
  if (!levels || levels.length === 0) return undefined
  return levels[levels.length - 1].uom?.symbol
}
</script>
