<template>
  <ResponsiveCard>
    <template #content>
      <!-- Header section -->
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Code -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('priceLists.fields.code') }} *</label>
          <InputText
            v-model="form.code"
            :disabled="isView"
            :class="{ 'p-invalid': errors.code }"
            autocomplete="off"
          />
          <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('priceLists.fields.description') }}</label>
          <InputText v-model="form.description" :disabled="isView" autocomplete="off" />
        </div>

        <!-- Start Date -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('priceLists.fields.startDate') }} *</label>
          <DatePicker
            v-model="form.startDate"
            :disabled="isView"
            date-format="yy-mm-dd"
            :class="{ 'p-invalid': errors.startDate }"
            show-button-bar
          />
          <small v-if="errors.startDate" class="text-red-500">{{ errors.startDate }}</small>
        </div>

        <!-- End Date -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('priceLists.fields.endDate') }}</label>
          <div class="flex flex-col gap-2">
            <DatePicker
              v-model="form.endDate"
              :disabled="isView || noEndDate"
              date-format="yy-mm-dd"
              show-button-bar
            />
            <div v-if="!isView" class="flex items-center gap-2">
              <Checkbox v-model="noEndDate" :binary="true" input-id="noEndDate" />
              <label for="noEndDate" class="cursor-pointer text-sm">{{
                t('priceLists.fields.noEndDate')
              }}</label>
            </div>
          </div>
        </div>

        <!-- Active -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('priceLists.fields.active') }}</label>
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="form.active" :disabled="isView" input-id="active" />
          </div>
        </div>
      </div>

      <!-- Items section -->
      <div class="mb-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ t('priceLists.labels.items') }}</h2>
          <Button
            v-if="!isView"
            :label="t('priceLists.labels.addItem')"
            icon="pi pi-plus"
            size="small"
            @click="addItem"
          />
        </div>

        <div v-if="form.items.length > 0" class="mb-3">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              :placeholder="t('priceLists.labels.searchProducts')"
              class="w-full"
              autocomplete="off"
            />
          </IconField>
        </div>

        <div
          v-if="form.items.length === 0"
          class="rounded border p-4 text-center text-sm text-gray-500"
        >
          {{ t('table.noItems') }}
        </div>

        <div
          v-if="form.items.length > 0 && filteredItems.length === 0"
          class="rounded border p-4 text-center text-sm text-gray-500"
        >
          {{ t('table.noItems') }}
        </div>

        <div
          v-for="{ item, idx: itemIdx } in filteredItems"
          :key="itemIdx"
          class="mb-4 rounded border p-4"
        >
          <!-- Item header row -->
          <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <!-- Product -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{ t('priceLists.fields.product') }}</label>
              <InfiniteSelect
                v-if="!isView"
                option-label="name"
                option-value="id"
                :fetch-fn="(query) => ProductsService.list(query)"
                :placeholder="t('priceLists.labels.selectProduct')"
                :initial-option="item._initialProduct"
                :model-value="item.productId"
                sort-by="name"
                sort-operator="asc"
                @update:model-value="(v) => (item.productId = v as number)"
                @select-option="(opt) => onProductSelected(itemIdx, opt)"
              />
              <InputText
                v-else
                :value="item._initialProduct?.name ?? String(item.productId ?? '')"
                disabled
              />
            </div>

            <!-- UOM -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{ t('priceLists.fields.uom') }}</label>
              <InputText :value="item._smallestUomSymbol ?? ''" disabled />
            </div>

            <!-- Currency -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{ t('priceLists.fields.currency') }}</label>
              <InfiniteSelect
                v-if="!isView"
                option-label="code"
                option-value="id"
                :fetch-fn="(query) => CurrenciesService.list(query)"
                :placeholder="t('priceLists.labels.selectCurrency')"
                :initial-option="item._initialCurrency"
                :model-value="item.currencyId"
                sort-by="code"
                sort-operator="asc"
                @update:model-value="(v) => (item.currencyId = v as number)"
              />
              <InputText
                v-else
                :value="item._initialCurrency?.code ?? String(item.currencyId ?? '')"
                disabled
              />
            </div>

            <!-- Tax Included + Remove -->
            <div class="flex items-end justify-between gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold">{{
                  t('priceLists.fields.taxIncluded')
                }}</label>
                <Checkbox v-model="item.taxIncluded" :binary="true" :disabled="isView" />
              </div>
              <Button
                v-if="!isView"
                icon="pi pi-trash"
                severity="danger"
                text
                :aria-label="t('priceLists.labels.removeItem')"
                @click="removeItem(itemIdx)"
              />
            </div>
          </div>

          <!-- Tiers sub-table -->
          <div class="ml-0 md:ml-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">{{
                t('priceLists.labels.tiers')
              }}</span>
              <Button
                v-if="!isView"
                :label="t('priceLists.labels.addTier')"
                icon="pi pi-plus"
                size="small"
                severity="secondary"
                @click="addTier(itemIdx)"
              />
            </div>

            <DataTable :value="item.tiers" size="small">
              <Column :header="t('priceLists.fields.minQuantity')" style="width: 10rem">
                <template #body="{ data: tier, index }">
                  <InputText
                    v-if="!isView && index > 0"
                    v-model="tier.minQuantity"
                    size="small"
                    class="w-full"
                    autocomplete="off"
                  />
                  <span v-else-if="index === 0">
                    <span class="text-sm text-gray-500">0</span>
                  </span>
                  <span v-else>{{ tier.minQuantity }}</span>
                </template>
              </Column>
              <Column :header="t('priceLists.fields.price')" style="width: 12rem">
                <template #body="{ data: tier, index }">
                  <div class="flex flex-col gap-1">
                    <InputText
                      v-if="!isView"
                      v-model="tier.price"
                      size="small"
                      class="w-full"
                      :class="{ 'p-invalid': errors.items[itemIdx]?.tiers[index] }"
                      autocomplete="off"
                    />
                    <span v-else>{{ tier.price }}</span>
                    <small v-if="errors.items[itemIdx]?.tiers[index]" class="text-red-500">
                      {{ errors.items[itemIdx].tiers[index] }}
                    </small>
                  </div>
                </template>
              </Column>
              <Column v-if="!isView" style="width: 4rem">
                <template #body="{ index }">
                  <Button
                    v-if="index > 0"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    size="small"
                    :aria-label="t('priceLists.labels.removeTier')"
                    @click="removeTier(itemIdx, index)"
                  />
                  <span v-else class="text-xs text-gray-400">{{
                    t('priceLists.labels.baseTierNote')
                  }}</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!isView" class="flex justify-end gap-3">
        <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
        <Button :label="t('common.actions.save')" :loading="isLoading" @click="onSave" />
      </div>
      <div v-else class="flex justify-end gap-3">
        <Button :label="t('common.actions.back')" severity="secondary" @click="emit('cancel')" />
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ToggleSwitch from 'primevue/toggleswitch'
import DatePicker from 'primevue/datepicker'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CurrenciesService } from '@/services/currencies.service'
import { ProductsService } from '@/services/products.service'
import type { PriceList, CreatePriceListDto, UpdatePriceListDto } from '@/types/price-list'

type FormMode = 'create' | 'edit' | 'view'

interface ItemForm {
  productId: number | undefined
  currencyId: number | undefined
  taxIncluded: boolean
  tiers: { minQuantity: string; price: string }[]
  _initialProduct?: { id: number; code: string; name: string }
  _initialCurrency?: { id: number; code: string }
  _smallestUomSymbol?: string
}

const props = defineProps<{
  mode: FormMode
  priceList?: PriceList
  isLoading?: boolean
}>()

const emit = defineEmits<{
  submit: [dto: CreatePriceListDto | UpdatePriceListDto]
  cancel: []
}>()

const { t } = useI18n()

const isView = computed(() => props.mode === 'view')

const form = ref({
  code: '',
  description: '',
  startDate: null as Date | null,
  endDate: null as Date | null,
  active: true,
  items: [] as ItemForm[],
})

const noEndDate = ref(false)
const errors = ref<{
  code: string
  startDate: string
  items: { tiers: string[] }[]
}>({ code: '', startDate: '', items: [] })
const searchQuery = ref('')

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return form.value.items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (!q) return true
      const name = item._initialProduct?.name?.toLowerCase() ?? ''
      const code = item._initialProduct?.code?.toLowerCase() ?? ''
      return name.includes(q) || code.includes(q)
    })
})

onMounted(() => {
  if (props.priceList) {
    form.value.code = props.priceList.code
    form.value.description = props.priceList.description
    form.value.startDate = new Date(props.priceList.startDate)
    form.value.active = props.priceList.active

    if (props.priceList.endDate) {
      form.value.endDate = new Date(props.priceList.endDate)
      noEndDate.value = false
    } else {
      noEndDate.value = true
    }

    form.value.items = props.priceList.items.map((item) => ({
      productId: item.productId,
      currencyId: item.currencyId,
      taxIncluded: item.taxIncluded,
      tiers: item.tiers.map((t) => ({ minQuantity: t.minQuantity, price: t.price })),
      _initialProduct: item.product
        ? { id: item.product.id, code: item.product.code, name: item.product.name }
        : undefined,
      _initialCurrency: item.currency
        ? { id: item.currency.id, code: item.currency.code }
        : undefined,
      _smallestUomSymbol: item.product?.smallestUom?.symbol,
    }))
  }
})

function addItem() {
  form.value.items.push({
    productId: undefined,
    currencyId: undefined,
    taxIncluded: false,
    tiers: [{ minQuantity: '0', price: '' }],
  })
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
}

function addTier(itemIdx: number) {
  form.value.items[itemIdx].tiers.push({ minQuantity: '', price: '' })
}

function removeTier(itemIdx: number, tierIdx: number) {
  form.value.items[itemIdx].tiers.splice(tierIdx, 1)
}

function onProductSelected(
  itemIdx: number,
  opt: {
    id: number
    code: string
    name: string
    uomGroup?: { levels: { uom?: { symbol?: string } }[] }
  },
) {
  form.value.items[itemIdx]._initialProduct = opt
  const levels = opt.uomGroup?.levels
  if (levels && levels.length > 0) {
    const smallest = levels[levels.length - 1]
    form.value.items[itemIdx]._smallestUomSymbol = smallest.uom?.symbol
  } else {
    form.value.items[itemIdx]._smallestUomSymbol = undefined
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function validate(): boolean {
  errors.value = { code: '', startDate: '', items: [] }
  let valid = true

  if (!form.value.code.trim()) {
    errors.value.code = t('priceLists.validation.codeRequired')
    valid = false
  }
  if (!form.value.startDate) {
    errors.value.startDate = t('priceLists.validation.startDateRequired')
    valid = false
  }

  errors.value.items = form.value.items.map((item) => {
    const tierErrors = item.tiers.map((tier) => {
      if (!tier.price.trim()) return t('priceLists.validation.priceRequired')
      return ''
    })
    return { tiers: tierErrors }
  })

  if (errors.value.items.some((item) => item.tiers.some((e) => e))) {
    valid = false
  }

  return valid
}

function onSave() {
  if (!validate()) return

  const dto: CreatePriceListDto = {
    code: form.value.code.trim(),
    description: form.value.description,
    startDate: formatDate(form.value.startDate!),
    endDate: noEndDate.value ? null : form.value.endDate ? formatDate(form.value.endDate) : null,
    active: form.value.active,
    items: form.value.items.map((item) => ({
      productId: item.productId!,
      currencyId: item.currencyId!,
      taxIncluded: item.taxIncluded,
      tiers: item.tiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        price: tier.price,
      })),
    })),
  }

  emit('submit', dto)
}
</script>
