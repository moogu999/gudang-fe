<template>
  <div class="flex flex-col gap-6">
    <ResponsiveCard>
      <template #content>
        <div class="flex flex-col gap-4">
          <div>
            <h2 class="text-base font-semibold">{{ t('surveys.stock.sourceTitle') }}</h2>
            <p class="text-sm text-stone-500">{{ t('surveys.stock.sourceSubtitle') }}</p>
          </div>

          <Message v-if="contentLocked && !readonly" severity="info" size="small" variant="simple">
            {{ t('surveys.stock.lockedBanner') }}
          </Message>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              v-for="source in sources"
              :key="source"
              type="button"
              class="rounded-lg border p-4 text-left transition-colors"
              :class="[
                stock.source === source
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-stone-200 hover:border-stone-400',
                disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
              ]"
              :disabled="disabled"
              :data-testid="`source-${source}`"
              @click="setSource(source)"
            >
              <span class="block font-semibold">{{ t(`surveys.stock.sources.${source}`) }}</span>
              <span class="mt-1 block text-sm text-stone-600">
                {{ t(`surveys.stock.sourceHints.${source}`) }}
              </span>
              <span
                v-if="source === 'msl'"
                class="mt-2 block text-xs text-stone-500"
                data-testid="msl-info"
              >
                {{
                  activeMslCount === undefined
                    ? '—'
                    : principalName
                      ? t(
                          'surveys.stock.mslInfoPrincipal',
                          { n: activeMslCount, principal: principalName },
                          activeMslCount,
                        )
                      : t('surveys.stock.mslInfo', { n: activeMslCount }, activeMslCount)
                }}
              </span>
            </button>
          </div>
          <small class="text-surface-500">{{ t('surveys.stock.sharedNote') }}</small>
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-if="stock.source === 'products'">
      <template #content>
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-semibold">
                {{ t('surveys.stock.productsTitle', { n: stock.products.length }) }}
              </h2>
              <p class="text-sm text-stone-500">{{ t('surveys.stock.productsSubtitle') }}</p>
            </div>
            <div v-if="!disabled" class="flex flex-wrap gap-2">
              <Button
                type="button"
                :label="t('mustSellLists.products.addFromCategory')"
                icon="pi pi-th-large"
                severity="secondary"
                outlined
                size="small"
                :disabled="atLimit"
                data-testid="add-from-category"
                @click="isCategoryPickerShown = true"
              />
              <Button
                type="button"
                :label="t('mustSellLists.products.addProduct')"
                icon="pi pi-plus"
                size="small"
                :disabled="atLimit"
                data-testid="add-product"
                @click="isPickerShown = true"
              />
            </div>
          </div>

          <DataTable
            :value="stock.products"
            data-key="id"
            class="text-sm"
            :row-class="rowClass"
            @row-reorder="onRowReorder"
          >
            <Column v-if="!disabled" row-reorder style="width: 3rem" :reorderable-column="false" />
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
            <Column v-if="!disabled" style="width: 3rem">
              <template #body="{ data }">
                <Button
                  type="button"
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  :aria-label="t('common.actions.delete')"
                  data-testid="product-remove"
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

          <small v-if="mismatchIds.length" class="text-red-500">
            {{ t('surveys.errors.SURVEY_PRODUCT_PRINCIPAL_MISMATCH') }}
          </small>
          <small v-if="atLimit" class="text-red-500">{{
            t('surveys.errors.SURVEY_TOO_MANY_PRODUCTS')
          }}</small>
          <small v-if="error" class="text-red-500">{{ error }}</small>
          <small class="text-surface-500">{{ t('surveys.stock.productsHelp') }}</small>
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard>
      <template #content>
        <div class="flex flex-col gap-3">
          <h2 class="text-base font-semibold">{{ t('surveys.stock.columnsTitle') }}</h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-stone-200 text-left">
                <th class="py-2 pr-3">{{ t('surveys.stock.columns.column') }}</th>
                <th class="py-2 pr-3">{{ t('surveys.stock.columns.on') }}</th>
                <th class="py-2 pr-3">{{ t('surveys.stock.columns.unit') }}</th>
                <th class="py-2">{{ t('surveys.stock.columns.required') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-stone-100 align-top">
                <td class="py-2 pr-3">
                  <div class="font-semibold">{{ t('surveys.stock.available') }}</div>
                  <div class="text-xs text-stone-500">{{ t('surveys.stock.availableHint') }}</div>
                </td>
                <td class="py-2 pr-3 text-stone-500">{{ t('surveys.stock.alwaysOn') }}</td>
                <td class="py-2 pr-3 text-stone-500">—</td>
                <td class="py-2">{{ t('common.labels.yes') }}</td>
              </tr>
              <tr class="border-b border-stone-100 align-top">
                <td class="py-2 pr-3">
                  <div class="font-semibold">{{ t('surveys.stock.store') }}</div>
                  <div class="text-xs text-stone-500">{{ t('surveys.stock.storeHint') }}</div>
                </td>
                <td class="py-2 pr-3">
                  <ToggleSwitch
                    :model-value="stock.askStore"
                    :disabled="disabled"
                    data-testid="ask-store"
                    @update:model-value="setAskStore"
                  />
                </td>
                <td class="py-2 pr-3 text-stone-500">{{ t('surveys.stock.storeUnit') }}</td>
                <td class="py-2">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch
                      :model-value="stock.askStore && stock.storeRequired"
                      :disabled="disabled || !stock.askStore"
                      data-testid="store-required"
                      @update:model-value="(v: boolean) => update({ storeRequired: v })"
                    />
                    <span class="text-xs text-stone-500">{{
                      t('surveys.stock.whenAvailable')
                    }}</span>
                  </div>
                </td>
              </tr>
              <tr class="align-top">
                <td class="py-2 pr-3">
                  <div class="font-semibold">{{ t('surveys.stock.display') }}</div>
                  <div class="text-xs text-stone-500">{{ t('surveys.stock.displayHint') }}</div>
                </td>
                <td class="py-2 pr-3">
                  <ToggleSwitch
                    :model-value="stock.askStore && stock.askDisplay"
                    :disabled="disabled || !stock.askStore"
                    data-testid="ask-display"
                    @update:model-value="(v: boolean) => update({ askDisplay: v })"
                  />
                </td>
                <td class="py-2 pr-3 text-stone-500">{{ t('surveys.stock.displayUnit') }}</td>
                <td class="py-2 text-stone-500">—</td>
              </tr>
            </tbody>
          </table>
          <small class="text-surface-500">{{ t('surveys.stock.columnsNote') }}</small>
        </div>
      </template>
    </ResponsiveCard>

    <MslProductPickerDialog
      v-if="isPickerShown"
      :principal-option-id="principalOptionId"
      :exclude-ids="stock.products.map((p) => p.id)"
      :fetcher="fetchProducts"
      :toast-group="toastGroup"
      @close="isPickerShown = false"
      @select="onAdd"
    />
    <MslCategoryPickerDialog
      v-if="isCategoryPickerShown"
      :principal-option-id="principalOptionId"
      :fetcher="fetchProducts"
      :toast-group="toastGroup"
      @close="isCategoryPickerShown = false"
      @select="onAdd"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import Message from 'primevue/message'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { SurveysService } from '@/services'
import type { MslProductOption } from '@/types/mustSellList.type'
import type {
  SurveyProductOptionQuery,
  SurveyProductRef,
  SurveyStockSource,
} from '@/types/survey.type'
import { MAX_STOCK_PRODUCTS, type StockFormState } from '../surveyHelpers'
import MslCategoryPickerDialog from '../../must-sell-lists/components/MslCategoryPickerDialog.vue'
import MslProductPickerDialog from '../../must-sell-lists/components/MslProductPickerDialog.vue'

const props = defineProps<{
  principalOptionId?: number
  principalName?: string
  /** Published MSLs of the branch running today, for the info line. */
  activeMslCount?: number
  /** Source, products and columns can't change after publish. */
  contentLocked?: boolean
  readonly?: boolean
  /** Product ids the API rejected for not carrying the survey's principal. */
  mismatchIds: number[]
  error?: string
  toastGroup: string
}>()

const stock = defineModel<StockFormState>('stock', { required: true })

const { t } = useI18n()
const toast = useToast()

const sources: SurveyStockSource[] = ['msl', 'products']
const isPickerShown = ref(false)
const isCategoryPickerShown = ref(false)

const disabled = computed(() => props.readonly || props.contentLocked)
const atLimit = computed(() => stock.value.products.length >= MAX_STOCK_PRODUCTS)

function update(patch: Partial<StockFormState>) {
  stock.value = { ...stock.value, ...patch }
}

function setSource(source: SurveyStockSource) {
  if (disabled.value || source === stock.value.source) return
  update({ source })
}

/** Display and required-when-available only make sense while Store stock is asked. */
function setAskStore(value: boolean) {
  update(value ? { askStore: true } : { askStore: false, storeRequired: false, askDisplay: false })
}

const fetchProducts = (query: SurveyProductOptionQuery) => SurveysService.productOptions(query)

function onAdd(options: MslProductOption[]) {
  const existing = new Set(stock.value.products.map((p) => p.id))
  const fresh = options.filter((o) => !existing.has(o.productId))
  const room = MAX_STOCK_PRODUCTS - stock.value.products.length
  const added: SurveyProductRef[] = fresh.slice(0, room).map((o) => ({
    id: o.productId,
    code: o.code,
    name: o.name,
    categoryName: o.categoryName,
  }))
  update({ products: [...stock.value.products, ...added] })
  isPickerShown.value = false
  isCategoryPickerShown.value = false
  const skipped = options.length - added.length
  if (skipped > 0) {
    toast.add({
      severity: 'info',
      summary: t('mustSellLists.products.addedSkipped', { added: added.length, skipped }),
      life: 3000,
      group: props.toastGroup,
    })
  }
}

function remove(product: SurveyProductRef) {
  update({ products: stock.value.products.filter((p) => p.id !== product.id) })
}

function onRowReorder(event: DataTableRowReorderEvent) {
  update({ products: event.value as SurveyProductRef[] })
}

function rowClass(product: SurveyProductRef) {
  return props.mismatchIds.includes(product.id) ? 'bg-red-50' : ''
}
</script>
