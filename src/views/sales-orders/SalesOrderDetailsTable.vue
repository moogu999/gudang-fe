<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h4 class="text-sm font-semibold sm:text-base">{{ t('salesOrders.details.title') }}</h4>
      <div class="flex items-center gap-2">
        <template v-if="isResolving">
          <ProgressSpinner style="width: 16px; height: 16px" stroke-width="8" />
          <span class="text-xs text-stone-500">{{ t('salesOrders.details.resolving') }}</span>
        </template>
        <Button
          v-if="mode !== DialogMode.VIEW"
          :label="t('salesOrders.details.addDetail')"
          icon="pi pi-plus"
          size="small"
          @click="addRow"
        />
      </div>
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
            (data as SalesOrderDetailRow)._isPlaceholder ? '' : index + 1
          }}</span>
        </template>
      </Column>

      <Column expander style="width: 3rem" />

      <!-- Product Code -->
      <Column field="productCode" :header="t('salesOrders.details.productCode')">
        <template #body="{ data }">
          {{ (data as SalesOrderDetailRow).product?.code ?? '' }}
        </template>
        <template v-if="mode !== DialogMode.VIEW" #editor="{ data }">
          <InfiniteSelect
            v-model="(data as SalesOrderDetailRow).productId"
            option-label="code"
            option-value="id"
            :fetch-fn="(query: string) => ProductsService.list(query)"
            class="w-full"
            @select-option="(opt) => onProductSelect(data as SalesOrderDetailRow, opt)"
          >
            <template #option="{ option }">{{ option.code }} - {{ option.name }}</template>
          </InfiniteSelect>
        </template>
      </Column>

      <!-- Product Name -->
      <Column field="productId" :header="t('salesOrders.details.product')">
        <template #body="{ data }">
          {{ (data as SalesOrderDetailRow).product?.name ?? '' }}
        </template>
      </Column>

      <!-- Quantity -->
      <Column field="quantity" :header="t('salesOrders.details.quantity')">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span>
              <template v-if="(getUomLevels(data as SalesOrderDetailRow)?.length ?? 0) > 1">
                {{
                  decomposeBaseQty(
                    (data as SalesOrderDetailRow).quantity as number,
                    getUomLevels(data as SalesOrderDetailRow)!,
                  ).join(' / ')
                }}
              </template>
              <template v-else>
                {{
                  (data as SalesOrderDetailRow).quantity != null
                    ? String((data as SalesOrderDetailRow).quantity)
                    : ''
                }}
              </template>
            </span>
            <span v-if="getUomLabel(data as SalesOrderDetailRow)" class="text-xs text-stone-400">
              {{ getUomLabel(data as SalesOrderDetailRow) }}
            </span>
            <span
              v-if="
                (getUomLevels(data as SalesOrderDetailRow)?.length ?? 0) > 1 &&
                (data as SalesOrderDetailRow).quantity != null
              "
              class="text-xs text-stone-400"
            >
              {{ (data as SalesOrderDetailRow).quantity!.toLocaleString(locale) }}
              {{ getUomLevels(data as SalesOrderDetailRow)!.at(-1)?.uom?.symbol }}
            </span>
          </div>
        </template>
        <template v-if="mode !== DialogMode.VIEW" #editor="{ data }">
          <template v-if="(getUomLevels(data as SalesOrderDetailRow)?.length ?? 0) > 1">
            <InputText
              :model-value="getTierString(data as SalesOrderDetailRow)"
              :placeholder="
                getUomLevels(data as SalesOrderDetailRow)!
                  .map((l) => l.uom?.symbol ?? '?')
                  .join('/')
              "
              class="w-full font-mono"
              @input="
                (e: Event) =>
                  handleTierInput(data as SalesOrderDetailRow, (e.target as HTMLInputElement).value)
              "
            />
          </template>
          <InputNumber
            v-else
            v-model="(data as SalesOrderDetailRow).quantity"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            class="w-full"
          />
        </template>
      </Column>

      <!-- Price (always read-only — resolved by backend) -->
      <Column field="price" :header="t('salesOrders.details.price')">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span>{{ formatValue((data as SalesOrderDetailRow).price) }}</span>
            <span
              v-if="(data as SalesOrderDetailRow)._priceListCode"
              class="text-xs text-stone-400"
            >
              {{ (data as SalesOrderDetailRow)._priceListCode }}
            </span>
            <span
              v-if="(data as SalesOrderDetailRow)._taxIncluded"
              class="w-fit rounded bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-700"
            >
              {{ t('priceLists.fields.taxIncluded') }}
            </span>
          </div>
        </template>
      </Column>

      <!-- Gross (qty × price, before discount) -->
      <Column :header="t('salesOrders.details.gross')">
        <template #body="{ data }">
          {{
            formatValue(
              ((data as SalesOrderDetailRow).quantity ?? 0) *
                ((data as SalesOrderDetailRow).price ?? 0),
            )
          }}
        </template>
      </Column>

      <!-- Discount (always read-only — resolved by backend) -->
      <Column field="discount" :header="t('salesOrders.details.discount')">
        <template #body="{ data }">
          {{ formatValue((data as SalesOrderDetailRow).discount) }}
        </template>
      </Column>

      <!-- Sub Amount (computed) -->
      <Column :header="t('salesOrders.details.subAmount')">
        <template #body="{ data }">
          {{ formatValue(computeSubAmount(data as SalesOrderDetailRow)) }}
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
            v-if="!(data as SalesOrderDetailRow)._isPlaceholder"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            @click="removeRow(index)"
          />
        </template>
      </Column>

      <!-- Row expansion: discounts, bonuses, choice pickers -->
      <template #expansion="{ data }">
        <div class="bg-stone-50 px-4 py-3">
          <!-- Promotion discounts breakdown -->
          <template v-if="(data as SalesOrderDetailRow)._discounts?.length">
            <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('salesOrders.details.promotionDiscounts') }}
            </p>
            <table class="mb-3 w-full text-xs">
              <colgroup>
                <col style="width: 45%" />
                <col style="width: 18%" />
                <col style="width: 18%" />
                <col style="width: 19%" />
              </colgroup>
              <thead>
                <tr class="border-b border-stone-200 text-stone-400">
                  <th class="pb-1 text-left">{{ t('salesOrders.details.promotionCode') }}</th>
                  <th class="pb-1 text-left">{{ t('salesOrders.details.discountType') }}</th>
                  <th class="pb-1 text-right">{{ t('salesOrders.details.discountValue') }}</th>
                  <th class="pb-1 text-right">{{ t('salesOrders.details.discountAmount') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="disc in (data as SalesOrderDetailRow)._discounts"
                  :key="disc.promotionId"
                  class="border-b border-stone-100"
                >
                  <td class="py-0.5">
                    <span>{{ disc.promotionCode }}</span>
                    <p v-if="disc.promotionDescription" class="text-stone-400">
                      {{ disc.promotionDescription }}
                    </p>
                  </td>
                  <td class="py-0.5 capitalize">{{ disc.discountType }}</td>
                  <td class="py-0.5 text-right">
                    {{
                      disc.discountType === 'percentage'
                        ? `${disc.value}%`
                        : formatValue(disc.value)
                    }}
                  </td>
                  <td class="py-0.5 text-right text-red-600">-{{ formatValue(disc.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Bonus items -->
          <template v-if="(data as SalesOrderDetailRow)._bonuses?.length">
            <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('salesOrders.details.bonusItems') }}
            </p>
            <table class="mb-3 w-full text-xs">
              <tbody>
                <tr
                  v-for="bonus in (data as SalesOrderDetailRow)._bonuses"
                  :key="`${bonus.promotionId}-${bonus.bonusProductId}`"
                  class="border-b border-stone-100"
                >
                  <td class="py-0.5">
                    <span>{{ bonus.promotionCode }}</span>
                    <p v-if="bonus.promotionDescription" class="text-stone-400">
                      {{ bonus.promotionDescription }}
                    </p>
                  </td>
                  <td class="py-0.5 text-right text-green-700">
                    +{{ bonus.qty }} × {{ bonus.bonusProductCode }} - {{ bonus.bonusProductName }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Customer choice pickers -->
          <template v-if="(data as SalesOrderDetailRow)._choiceOffers?.length">
            <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('salesOrders.details.chooseBonus') }}
            </p>
            <div
              v-for="offer in (data as SalesOrderDetailRow)._choiceOffers"
              :key="offer.promotionId"
              class="mb-3"
            >
              <p class="mb-1 text-xs text-stone-600">
                {{ offer.promotionCode }}
                <span v-if="offer.promotionDescription" class="text-stone-400">
                  — {{ offer.promotionDescription }}</span
                >
                {{ t('salesOrders.details.pickCount', { count: offer.pickableCount }) }}
              </p>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="item in offer.pool"
                  :key="item.productId"
                  class="flex items-center gap-1.5"
                >
                  <Checkbox
                    :input-id="`choice-${(data as SalesOrderDetailRow)._localId}-${offer.promotionId}-${item.productId}`"
                    :model-value="
                      isChoicePicked(data as SalesOrderDetailRow, offer.promotionId, item.productId)
                    "
                    :binary="true"
                    :disabled="
                      mode === DialogMode.VIEW ||
                      (!isChoicePicked(
                        data as SalesOrderDetailRow,
                        offer.promotionId,
                        item.productId,
                      ) &&
                        getPickCount(data as SalesOrderDetailRow, offer.promotionId) >=
                          offer.pickableCount)
                    "
                    @update:model-value="
                      (v: boolean) =>
                        toggleChoice(data as SalesOrderDetailRow, offer, item.productId, v)
                    "
                  />
                  <label
                    :for="`choice-${(data as SalesOrderDetailRow)._localId}-${offer.promotionId}-${item.productId}`"
                    class="cursor-pointer text-xs"
                  >
                    {{ item.productCode }} - {{ item.productName }}
                    <span class="text-stone-400">(+{{ item.bonusAmount }})</span>
                  </label>
                </div>
              </div>
              <Message
                v-if="
                  mode !== DialogMode.VIEW &&
                  getPickCount(data as SalesOrderDetailRow, offer.promotionId) < offer.pickableCount
                "
                severity="warn"
                size="small"
                variant="simple"
                class="mt-1"
              >
                {{
                  t('salesOrders.details.pickRemaining', {
                    count:
                      offer.pickableCount -
                      getPickCount(data as SalesOrderDetailRow, offer.promotionId),
                  })
                }}
              </Message>
            </div>
          </template>

          <!-- Manual discounts -->
          <div class="mt-3">
            <ManualDiscountEditor
              :model-value="(data as SalesOrderDetailRow)._manualDiscounts ?? []"
              :disabled="mode === DialogMode.VIEW"
              :gross="
                ((data as SalesOrderDetailRow).quantity ?? 0) *
                ((data as SalesOrderDetailRow).price ?? 0)
              "
              @update:model-value="
                (v) => onLineManualDiscountsUpdate(data as SalesOrderDetailRow, v)
              "
            />
          </div>

          <!-- Empty state -->
          <p
            v-if="
              !(data as SalesOrderDetailRow)._discounts?.length &&
              !(data as SalesOrderDetailRow)._bonuses?.length &&
              !(data as SalesOrderDetailRow)._choiceOffers?.length &&
              !(data as SalesOrderDetailRow)._manualDiscounts?.length &&
              mode === DialogMode.VIEW
            "
            class="text-xs text-stone-400"
          >
            {{ t('salesOrders.details.noPromotions') }}
          </p>
        </div>
      </template>

      <template #empty>{{ t('salesOrders.details.empty') }}</template>

      <!-- Invoice-level promotion rewards (whole-invoice target) -->
      <template
        v-if="headerDiscounts.length || headerBonuses.length || headerChoiceOffers.length"
        #footer
      >
        <div class="space-y-4 bg-amber-50 px-4 py-3">
          <!-- Invoice discounts -->
          <template v-if="headerDiscounts.length">
            <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('salesOrders.details.invoiceDiscounts') }}
            </p>
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-amber-200 text-stone-400">
                  <th class="pb-1 text-left">{{ t('salesOrders.details.promotionCode') }}</th>
                  <th class="pb-1 text-left">{{ t('salesOrders.details.discountType') }}</th>
                  <th class="pb-1 text-right">{{ t('salesOrders.details.discountValue') }}</th>
                  <th class="pb-1 text-right">{{ t('salesOrders.details.discountAmount') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="disc in headerDiscounts"
                  :key="disc.promotionId"
                  class="border-b border-amber-100"
                >
                  <td class="py-0.5">
                    <span>{{ disc.promotionCode }}</span>
                    <p v-if="disc.promotionDescription" class="text-stone-400">
                      {{ disc.promotionDescription }}
                    </p>
                  </td>
                  <td class="py-0.5 capitalize">{{ disc.discountType }}</td>
                  <td class="py-0.5 text-right">
                    {{
                      disc.discountType === 'percentage'
                        ? `${disc.value}%`
                        : formatValue(disc.value)
                    }}
                  </td>
                  <td class="py-0.5 text-right text-red-600">-{{ formatValue(disc.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Invoice bonuses -->
          <template v-if="headerBonuses.length">
            <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('salesOrders.details.invoiceBonuses') }}
            </p>
            <table class="w-full text-xs">
              <tbody>
                <tr
                  v-for="bonus in headerBonuses"
                  :key="`${bonus.promotionId}-${bonus.bonusProductId}`"
                  class="border-b border-amber-100"
                >
                  <td class="py-0.5">
                    <span>{{ bonus.promotionCode }}</span>
                    <p v-if="bonus.promotionDescription" class="text-stone-400">
                      {{ bonus.promotionDescription }}
                    </p>
                  </td>
                  <td class="py-0.5 text-right text-green-700">
                    +{{ bonus.qty }} × {{ bonus.bonusProductCode }} - {{ bonus.bonusProductName }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Invoice customer choice pickers -->
          <template v-if="headerChoiceOffers.length">
            <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {{ t('salesOrders.details.chooseInvoiceBonus') }}
            </p>
            <div v-for="offer in headerChoiceOffers" :key="offer.promotionId" class="mb-3">
              <p class="mb-1 text-xs text-stone-600">
                {{ offer.promotionCode }}
                <span v-if="offer.promotionDescription" class="text-stone-400">
                  — {{ offer.promotionDescription }}</span
                >
                {{ t('salesOrders.details.pickCount', { count: offer.pickableCount }) }}
              </p>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="item in offer.pool"
                  :key="item.productId"
                  class="flex items-center gap-1.5"
                >
                  <Checkbox
                    :input-id="`header-choice-${offer.promotionId}-${item.productId}`"
                    :model-value="isHeaderChoicePicked(offer.promotionId, item.productId)"
                    :binary="true"
                    :disabled="
                      mode === DialogMode.VIEW ||
                      (!isHeaderChoicePicked(offer.promotionId, item.productId) &&
                        getHeaderPickCount(offer.promotionId) >= offer.pickableCount)
                    "
                    @update:model-value="
                      (v: boolean) => toggleHeaderChoice(offer, item.productId, v)
                    "
                  />
                  <label
                    :for="`header-choice-${offer.promotionId}-${item.productId}`"
                    class="cursor-pointer text-xs"
                  >
                    {{ item.productCode }} - {{ item.productName }}
                    <span class="text-stone-400">(+{{ item.bonusAmount }})</span>
                  </label>
                </div>
              </div>
              <Message
                v-if="
                  mode !== DialogMode.VIEW &&
                  getHeaderPickCount(offer.promotionId) < offer.pickableCount
                "
                severity="warn"
                size="small"
                variant="simple"
                class="mt-1"
              >
                {{
                  t('salesOrders.details.pickRemaining', {
                    count: offer.pickableCount - getHeaderPickCount(offer.promotionId),
                  })
                }}
              </Message>
            </div>
          </template>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ManualDiscountEditor from './ManualDiscountEditor.vue'
import DialogMode from '@/constants/dialogMode'
import type {
  SalesOrderDetailRow,
  ChoiceOffer,
  UomConversionLevel,
  LineDiscount,
  LineBonus,
  ManualDiscount,
} from '@/types'
import { computeBaseQty, decomposeBaseQty } from '@/utils/uomHelper'
import { ProductsService } from '@/services'

const { t, locale } = useI18n()

interface Props {
  modelValue: SalesOrderDetailRow[]
  mode: DialogMode
  isResolving?: boolean
  headerDiscounts?: LineDiscount[]
  headerBonuses?: LineBonus[]
  headerChoiceOffers?: ChoiceOffer[]
  headerChoicePicks?: Record<string, number[]>
}

const props = withDefaults(defineProps<Props>(), {
  isResolving: false,
  headerDiscounts: () => [],
  headerBonuses: () => [],
  headerChoiceOffers: () => [],
  headerChoicePicks: () => ({}),
})

const emit = defineEmits<{
  'update:modelValue': [value: SalesOrderDetailRow[]]
  'update:headerChoicePicks': [value: Record<string, number[]>]
}>()

const localRows = ref<SalesOrderDetailRow[]>([...props.modelValue])
const editingRows = ref<SalesOrderDetailRow[]>([])
const expandedRows = ref<Record<string, boolean>>({})
let skipNextWatch = false

function createPlaceholderRow(): SalesOrderDetailRow {
  return {
    _localId: crypto.randomUUID(),
    _isPlaceholder: true,
    _discounts: [],
    _bonuses: [],
    _choiceOffers: [],
    _choicePicks: {},
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
      // Merge only resolved fields without replacing the array — replacing would
      // remount the row editors and steal focus from any active input.
      newRows.forEach((newRow) => {
        const local = localRows.value.find((r) => r._localId === newRow._localId)
        if (!local) return
        local.price = newRow.price
        local.discount = newRow.discount
        local._priceListId = newRow._priceListId
        local._priceListCode = newRow._priceListCode
        local._taxIncluded = newRow._taxIncluded
        local._discounts = newRow._discounts
        local._bonuses = newRow._bonuses
        local._choiceOffers = newRow._choiceOffers
        local._choicePicks = newRow._choicePicks
      })
    } else {
      localRows.value = [...newRows]
    }

    // Auto-expand rows that gain discounts, bonuses, or choice offers
    newRows.forEach((row) => {
      if (
        (row._discounts?.length ?? 0) > 0 ||
        (row._bonuses?.length ?? 0) > 0 ||
        (row._choiceOffers?.length ?? 0) > 0
      ) {
        expandedRows.value[row._localId] = true
      }
    })

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

function onRowEditSave(event: { newData: SalesOrderDetailRow; index: number }) {
  const { newData, index } = event
  if (newData._isPlaceholder && newData.productId) {
    newData._isPlaceholder = false
  }
  localRows.value[index] = newData
  emitRows()
  ensurePlaceholder()
}

function onProductSelect(data: SalesOrderDetailRow, option: object) {
  data.product = option as SalesOrderDetailRow['product']
  // Clear tier data when product changes
  data._quantityTiers = undefined
  data['_quantityTiersRaw'] = undefined
}

function getUomLevels(data: SalesOrderDetailRow): UomConversionLevel[] | undefined {
  return (data.product as { uomGroup?: { levels?: UomConversionLevel[] } } | undefined)?.uomGroup
    ?.levels
}

function getUomLabel(data: SalesOrderDetailRow): string | undefined {
  const levels = getUomLevels(data)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function getTierString(data: SalesOrderDetailRow): string {
  const raw = data['_quantityTiersRaw'] as string | undefined
  if (raw !== undefined) return raw
  return data._quantityTiers ? (data._quantityTiers as number[]).join('/') : ''
}

function handleTierInput(data: SalesOrderDetailRow, rawValue: string) {
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

function computeSubAmount(data: SalesOrderDetailRow): number {
  return (
    ((data.quantity ?? 0) as number) * ((data.price ?? 0) as number) -
    ((data.discount ?? 0) as number)
  )
}

const numberFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
)

function formatValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(n) ? '' : numberFormatter.value.format(n)
}

function isChoicePicked(row: SalesOrderDetailRow, promotionId: number, productId: number): boolean {
  return row._choicePicks?.[String(promotionId)]?.includes(productId) ?? false
}

function getPickCount(row: SalesOrderDetailRow, promotionId: number): number {
  return row._choicePicks?.[String(promotionId)]?.length ?? 0
}

function toggleChoice(
  row: SalesOrderDetailRow,
  offer: ChoiceOffer,
  productId: number,
  checked: boolean,
) {
  const key = String(offer.promotionId)
  if (!row._choicePicks) row._choicePicks = {}
  const picks = row._choicePicks[key] ?? []

  if (checked && picks.length < offer.pickableCount && !picks.includes(productId)) {
    row._choicePicks[key] = [...picks, productId]
  } else if (!checked) {
    row._choicePicks[key] = picks.filter((id) => id !== productId)
  }

  skipNextWatch = true
  emitRows()
}

function isHeaderChoicePicked(promotionId: number, productId: number): boolean {
  return props.headerChoicePicks?.[String(promotionId)]?.includes(productId) ?? false
}

function getHeaderPickCount(promotionId: number): number {
  return props.headerChoicePicks?.[String(promotionId)]?.length ?? 0
}

function onLineManualDiscountsUpdate(row: SalesOrderDetailRow, discounts: ManualDiscount[]) {
  row._manualDiscounts = discounts
  skipNextWatch = true
  emitRows()
}

function toggleHeaderChoice(offer: ChoiceOffer, productId: number, checked: boolean) {
  const key = String(offer.promotionId)
  const current = { ...(props.headerChoicePicks ?? {}) }
  const picks = current[key] ?? []

  if (checked && picks.length < offer.pickableCount && !picks.includes(productId)) {
    current[key] = [...picks, productId]
  } else if (!checked) {
    current[key] = picks.filter((id) => id !== productId)
  }

  emit('update:headerChoicePicks', current)
}
</script>
