<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">{{
        t('promotions.labels.fixedBonusTiers')
      }}</span>
      <Button
        v-if="!isView"
        :label="t('promotions.labels.addTier')"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        @click="addTier"
      />
    </div>

    <div v-if="tiers.length === 0" class="rounded border p-3 text-center text-sm text-gray-500">
      {{ t('table.noItems') }}
    </div>

    <div v-for="(tier, tierIdx) in tiers" :key="tierIdx" class="mb-3 rounded border p-3">
      <!-- Tier header: threshold + multiplicative + remove -->
      <div class="mb-2 flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-600">
              {{
                thresholdKind === 'min_qty'
                  ? t('promotions.fields.minQty')
                  : t('promotions.fields.minAmount')
              }}
            </label>
            <InputText
              v-if="!isView"
              v-model="tier.threshold"
              size="small"
              style="width: 8rem"
              autocomplete="off"
            />
            <span v-else>{{ tier.threshold }}</span>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-600">
              {{ t('promotions.labels.tier.multiplicative.label') }}
            </label>
            <ToggleSwitch v-if="!isView" v-model="tier.isMultiplicative" />
            <span v-else>{{
              tier.isMultiplicative ? t('common.labels.yes') : t('common.labels.no')
            }}</span>
          </div>
        </div>
        <Button
          v-if="!isView"
          icon="pi pi-trash"
          severity="danger"
          text
          size="small"
          :aria-label="t('promotions.labels.removeTier')"
          @click="removeTier(tierIdx)"
        />
      </div>

      <!-- Tier items -->
      <div class="ml-0 md:ml-3">
        <div class="mb-1 flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500">{{
            t('promotions.labels.tierItems')
          }}</span>
          <Button
            v-if="!isView"
            :label="t('promotions.labels.addTierItem')"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            @click="addItem(tierIdx)"
          />
        </div>

        <div
          v-if="tier.items.length === 0"
          class="rounded border p-2 text-center text-xs text-gray-400"
        >
          {{ t('table.noItems') }}
        </div>

        <DataTable v-else :value="tier.items" size="small">
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
                <template #option="{ option }"> {{ option.code }} - {{ option.name }} </template>
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
          <Column :header="t('promotions.fields.qty')" style="width: 8rem">
            <template #body="{ data: item, index }">
              <div class="flex flex-col gap-1">
                <InputText
                  v-if="!isView"
                  v-model="item.qty"
                  size="small"
                  class="w-full"
                  :class="{ 'p-invalid': tierErrors[tierIdx]?.[index] }"
                  autocomplete="off"
                />
                <span v-else>{{ item.qty }}</span>
                <small v-if="tierErrors[tierIdx]?.[index]" class="text-red-500">
                  {{ tierErrors[tierIdx][index] }}
                </small>
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
                @click="removeItem(tierIdx, index)"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { ProductsService } from '@/services/products.service'
import type { ThresholdKind } from '@/types/promotion.type'

export interface FixedBonusTierItemForm {
  productId: number | undefined
  qty: string
  _product?: { id: number; code: string; name: string; smallestUomSymbol?: string }
}

export interface FixedBonusTierForm {
  threshold: string
  items: FixedBonusTierItemForm[]
  isMultiplicative: boolean
}

const tiers = defineModel<FixedBonusTierForm[]>('tiers', { required: true })

defineProps<{
  thresholdKind: ThresholdKind
  tierErrors: string[][]
  isView: boolean
}>()

const { t } = useI18n()

function addTier() {
  tiers.value.push({ threshold: '', items: [], isMultiplicative: false })
}

function removeTier(tierIdx: number) {
  tiers.value.splice(tierIdx, 1)
}

function addItem(tierIdx: number) {
  tiers.value[tierIdx].items.push({ productId: undefined, qty: '' })
}

function removeItem(tierIdx: number, itemIdx: number) {
  tiers.value[tierIdx].items.splice(itemIdx, 1)
}

function onProductSelected(
  item: FixedBonusTierItemForm,
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
