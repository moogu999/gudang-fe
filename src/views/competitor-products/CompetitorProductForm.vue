<template>
  <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
    <Message v-if="recommendation" severity="info" size="small" data-testid="recommendation-banner">
      {{
        t('competitorProducts.recommendations.banner', {
          submitter: recommendation.submitter.name,
          date: dayjs(recommendation.createdAt).format(DateFormat.DATE_TIME),
          name: recommendation.name,
        })
      }}
    </Message>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Product -->
      <ResponsiveCard>
        <template #title>{{ t('competitorProducts.sections.product') }}</template>
        <template #content>
          <div class="flex flex-col gap-4">
            <!-- Photos -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{
                t('competitorProducts.fields.photos')
              }}</label>
              <PhotoGallery
                ref="gallery"
                v-model="photos"
                v-model:carry-over-ids="carryOverIds"
                owner-type="competitor_product"
                :owner-id="mode === 'edit' ? product?.id : null"
                :readonly="readonly"
                :carry-over="recommendation?.photos"
                @error="(m: string) => emit('photo-error', m)"
              />
            </div>

            <!-- Code -->
            <div class="flex flex-col gap-1">
              <label for="code" class="text-sm font-semibold">{{
                t('competitorProducts.fields.code')
              }}</label>
              <template v-if="mode === 'add'">
                <div class="mb-1 flex gap-2">
                  <Button
                    type="button"
                    :label="t('competitorProducts.codeMode.auto')"
                    :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                    size="small"
                    :disabled="!hasDefaultSeries || numberSeriesLoading"
                    @click="codeMode = 'auto'"
                  />
                  <Button
                    type="button"
                    :label="t('competitorProducts.codeMode.manual')"
                    :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
                    size="small"
                    @click="codeMode = 'manual'"
                  />
                </div>
                <template v-if="codeMode === 'auto'">
                  <InputText
                    :value="numberSeriesLoading ? '' : previewCode"
                    :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
                    readonly
                    class="w-full font-mono"
                  />
                  <small class="text-surface-500">{{
                    t('competitorProducts.codeMode.assignedOnSave')
                  }}</small>
                </template>
                <template v-else>
                  <InputText
                    id="code"
                    v-model="code"
                    autocomplete="off"
                    maxlength="32"
                    class="w-full font-mono"
                    :invalid="!!errors.code"
                  />
                  <small class="text-surface-500">{{
                    t('competitorProducts.hints.codeManual')
                  }}</small>
                </template>
              </template>
              <InputText v-else :value="product?.code" readonly class="w-full font-mono" />
              <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
            </div>

            <!-- Name -->
            <div class="flex flex-col gap-1">
              <label for="name" class="text-sm font-semibold">
                {{ t('competitorProducts.fields.name') }}<span class="ml-0.5 text-red-500">*</span>
              </label>
              <InputText
                id="name"
                v-model="name"
                autocomplete="off"
                maxlength="150"
                :placeholder="t('competitorProducts.hints.namePlaceholder')"
                :disabled="readonly"
                :invalid="!!errors.name"
                class="w-full"
              />
              <small class="text-surface-500 self-end">{{ name.length }}/150</small>
              <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
            </div>

            <!-- Brand -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">
                {{ t('competitorProducts.fields.brand') }}<span class="ml-0.5 text-red-500">*</span>
              </label>
              <InfiniteSelect
                :key="`brand-${brandKey}`"
                v-model="brandId"
                :fetch-fn="(q: string) => CompetitorBrandsService.listForSelect(q)"
                :custom-filters="activeFilter"
                option-label="name"
                option-value="id"
                :initial-option="initialBrand"
                :disabled="readonly"
                :placeholder="t('competitorProducts.hints.selectBrand')"
                class="w-full"
                @select-option="(b: CompetitorBrand) => (manufacturer = b.manufacturer ?? '')"
              >
                <template v-if="canAddBrand && !readonly" #footer>
                  <div class="border-t p-2">
                    <Button
                      type="button"
                      :label="t('competitorProducts.hints.addBrand')"
                      icon="pi pi-plus"
                      text
                      size="small"
                      class="w-full"
                      data-testid="add-brand"
                      @click="isBrandDialogShown = true"
                    />
                  </div>
                </template>
              </InfiniteSelect>
              <small v-if="manufacturer" class="text-surface-500"
                >{{ t('competitorProducts.fields.manufacturer') }}: {{ manufacturer }}</small
              >
              <small v-if="errors.brandId" class="text-red-500">{{ errors.brandId }}</small>
            </div>

            <!-- Category / Principal -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold">
                  {{ t('competitorProducts.fields.category')
                  }}<span class="ml-0.5 text-red-500">*</span>
                </label>
                <Select
                  v-model="categoryOptionId"
                  :options="categoryOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('competitorProducts.hints.selectOption')"
                  :disabled="readonly"
                  filter
                  class="w-full"
                />
                <small v-if="errors.categoryOptionId" class="text-red-500">{{
                  errors.categoryOptionId
                }}</small>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold">{{
                  t('competitorProducts.fields.principal')
                }}</label>
                <Select
                  v-model="principalOptionId"
                  :options="principalOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('competitorProducts.hints.noPrincipal')"
                  :disabled="readonly"
                  show-clear
                  filter
                  class="w-full"
                />
              </div>
            </div>

            <!-- UOM group -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">
                {{ t('competitorProducts.fields.uomGroup')
                }}<span class="ml-0.5 text-red-500">*</span>
              </label>
              <InfiniteSelect
                v-model="uomGroupId"
                :fetch-fn="(q: string) => UomGroupsService.list(q)"
                option-label="name"
                option-value="id"
                :initial-option="initialUomGroup"
                :disabled="readonly"
                :placeholder="t('competitorProducts.hints.selectUomGroup')"
                class="w-full"
                @select-option="(g: UomGroup) => (baseUomName = baseUnitOf(g))"
              />
              <small v-if="errors.uomGroupId" class="text-red-500">{{ errors.uomGroupId }}</small>
            </div>

            <!-- Reference price -->
            <div class="flex flex-col gap-1">
              <label for="referencePrice" class="text-sm font-semibold">{{
                t('competitorProducts.fields.referencePrice')
              }}</label>
              <InputNumber
                v-model="referencePrice"
                input-id="referencePrice"
                mode="decimal"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :min="0"
                :suffix="baseUomName ? ` / ${baseUomName}` : undefined"
                :disabled="readonly"
                :invalid="!!errors.referencePrice"
                class="w-full"
              />
              <small v-if="observedHint" class="text-surface-500">{{ observedHint }}</small>
              <small class="text-surface-500">{{
                t('competitorProducts.hints.referencePrice')
              }}</small>
              <small v-if="errors.referencePrice" class="text-red-500">{{
                errors.referencePrice
              }}</small>
            </div>

            <!-- Active -->
            <div v-if="mode === 'edit'" class="flex flex-col gap-1">
              <div class="flex items-center gap-3">
                <ToggleSwitch v-model="isActive" input-id="isActive" :disabled="readonly" />
                <label for="isActive" class="text-sm font-semibold">{{
                  t('competitorProducts.fields.active')
                }}</label>
              </div>
              <small class="text-surface-500">{{ t('competitorProducts.hints.active') }}</small>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <!-- Comparison products -->
      <ResponsiveCard>
        <template #title>{{ t('competitorProducts.sections.comparisons') }}</template>
        <template #content>
          <div class="flex flex-col gap-3">
            <p class="text-surface-500 text-sm">
              {{ t('competitorProducts.comparisons.subtitle') }}
            </p>

            <DataTable
              v-if="comparisons.length"
              :value="comparisons"
              data-key="productId"
              :reorderable-rows="!readonly"
              @row-reorder="onReorder"
            >
              <Column v-if="!readonly" row-reorder style="width: 3rem" />
              <Column :header="t('competitorProducts.comparisons.primary')" style="width: 5rem">
                <template #body="{ data }">
                  <RadioButton
                    :model-value="primaryProductId"
                    :value="data.productId"
                    name="primary"
                    :disabled="readonly"
                    :aria-label="t('competitorProducts.comparisons.primary')"
                    @update:model-value="setPrimary(data.productId)"
                  />
                </template>
              </Column>
              <Column :header="t('competitorProducts.comparisons.columnName')">
                <template #body="{ data }">
                  <div class="font-medium">{{ data.name }}</div>
                  <div class="text-surface-500 text-xs">
                    <span class="font-mono">{{ data.code }}</span>
                    <template v-if="data.categoryName">
                      ·
                      {{
                        data.principalName
                          ? `${data.principalName} › ${data.categoryName}`
                          : data.categoryName
                      }}
                    </template>
                  </div>
                </template>
              </Column>
              <Column v-if="!readonly" style="width: 3rem">
                <template #body="{ data }">
                  <Button
                    type="button"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    :aria-label="t('competitorProducts.comparisons.remove')"
                    @click="removeComparison(data.productId)"
                  />
                </template>
              </Column>
            </DataTable>
            <p v-else class="text-surface-500 py-4 text-center text-sm">
              {{ t('competitorProducts.comparisons.empty') }}
            </p>

            <small v-if="errors.comparisons" class="text-red-500">{{ errors.comparisons }}</small>

            <Button
              v-if="!readonly"
              type="button"
              :label="t('competitorProducts.comparisons.add')"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              class="!border-dashed"
              data-testid="add-comparison"
              @click="isPickerShown = true"
            />
          </div>
        </template>
      </ResponsiveCard>
    </div>

    <!-- Similar pending recommendations (create from a recommendation) -->
    <ResponsiveCard v-if="recommendation?.similarPending?.length">
      <template #content>
        <p class="mb-2 text-sm font-semibold">
          {{ t('competitorProducts.recommendations.alsoResolveSimilar') }}
        </p>
        <div
          v-for="s in recommendation.similarPending"
          :key="s.id"
          class="mb-1 flex items-center gap-2"
        >
          <Checkbox v-model="similarIds" :input-id="`similar-${s.id}`" :value="s.id" />
          <label :for="`similar-${s.id}`" class="text-sm">{{ s.name }}</label>
        </div>
      </template>
    </ResponsiveCard>

    <div
      v-if="!readonly || (mode === 'edit' && lastChanged)"
      class="flex flex-wrap items-center justify-end gap-2"
    >
      <p v-if="mode === 'edit' && lastChanged" class="mr-auto text-xs text-stone-500">
        {{ lastChanged }}
      </p>
      <template v-if="!readonly">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emit('cancel')"
        />
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        />
      </template>
    </div>

    <ComparisonProductPickerDialog
      v-if="isPickerShown"
      :category-option-id="categoryOptionId"
      :toast-group="toastGroup"
      :exclude-ids="comparisons.map((c) => c.productId)"
      @select="onPicked"
      @close="isPickerShown = false"
    />

    <Dialog
      v-model:visible="isBrandDialogShown"
      :header="t('competitorBrands.addBrand')"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      :style="{ width: '40vw' }"
    >
      <CompetitorBrandDialog :mode="DialogMode.ADD" @close="onBrandSaved" />
    </Dialog>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import PhotoGallery from '@/components/upload/PhotoGallery.vue'
import { useNumberSeries, usePermissions } from '@/composables'
import { CompetitorBrandsService, UomGroupsService } from '@/services'
import DateFormat from '@/constants/dateFormat'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import type {
  CompetitorBrand,
  CompetitorProduct,
  CompetitorProductComparison,
  CompetitorProductPayload,
  CompetitorProductRecommendation,
  PhotoRef,
  UomGroup,
} from '@/types'
import { NO_LABEL, loadLabelFilterOptions } from '@/views/sales-teams/salesTeamHelpers'
import CompetitorBrandDialog from '@/views/competitor-brands/CompetitorBrandDialog.vue'
import ComparisonProductPickerDialog, {
  type PickedProduct,
} from './components/ComparisonProductPickerDialog.vue'
import { competitorProductErrorCode } from './competitorProductErrors'

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    product?: CompetitorProduct
    /** Add mode only: the pending recommendation the product is being created from. */
    recommendation?: CompetitorProductRecommendation
    isLoading?: boolean
    readonly?: boolean
    /** The host page's toast group, for errors raised inside the comparison picker. */
    toastGroup?: string
  }>(),
  {
    toastGroup: undefined,
    product: undefined,
    recommendation: undefined,
    isLoading: false,
    readonly: false,
  },
)

export interface CompetitorProductSubmit {
  payload: CompetitorProductPayload
  /** Photos of the recommendation to keep. */
  carryOverIds: number[]
  /** Other pending recommendations to resolve with this one. */
  similarIds: number[]
}

const emit = defineEmits<{
  submit: [value: CompetitorProductSubmit]
  cancel: []
  'photo-error': [message: string]
}>()

const { t } = useI18n()
const { canWrite: canAddBrand } = usePermissions('/competitor-brands')

const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('competitor_products')

const base = props.product
const rec = props.mode === 'add' ? props.recommendation : undefined

// A price observed per a non-base unit can't be read as a base-unit price, so only
// an observation without a unit prefills the field.
const prefillPrice = rec?.observedPrice && !rec.observedUom ? Number(rec.observedPrice) : null

const code = ref('')
const name = ref(base?.name ?? rec?.name.trim() ?? '')
const brandId = ref<number | undefined>(base?.brand.id)
const brandKey = ref(0)
// The picker only reads id and name from its initial option.
const initialBrand = ref<CompetitorBrand | undefined>(base?.brand as CompetitorBrand | undefined)
const manufacturer = ref(base?.brand.manufacturer ?? '')
const categoryOptionId = ref<number | undefined>(base?.category.id)
const principalOptionId = ref<number | undefined>(base?.principal?.id)
const uomGroupId = ref<number | undefined>(base?.uomGroup.id)
const initialUomGroup = base
  ? ({ id: base.uomGroup.id, name: base.uomGroup.name } as UomGroup)
  : undefined
const baseUomName = ref(base?.uomGroup.baseUomName ?? '')
const referencePrice = ref<number | null>(
  base?.referencePrice !== undefined ? Number(base.referencePrice) : prefillPrice,
)
const isActive = ref(base?.isActive ?? true)
const photos = ref<PhotoRef[]>([...(base?.photos ?? [])])
const gallery = ref<InstanceType<typeof PhotoGallery> | null>(null)

const carryOverIds = ref<number[]>((rec?.photos ?? []).slice(0, 3).map((p) => p.id))
const similarIds = ref<number[]>([])

const observedHint = computed(() =>
  rec?.observedPrice && rec.observedUom
    ? t('competitorProducts.recommendations.observedHint', {
        price: rec.observedPrice,
        uom: rec.observedUom.name,
      })
    : '',
)

const activeFilter = [
  { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

/** The smallest unit of a group: the last level of its conversion chain. */
function baseUnitOf(group: UomGroup): string {
  const levels = [...(group.levels ?? [])].sort((a, b) => a.levelOrder - b.levelOrder)
  return levels[levels.length - 1]?.uom?.name ?? ''
}

// Category / principal
type LabelOption = { label: string; value: number }
const categoryOptions = ref<LabelOption[]>([])
const principalOptions = ref<LabelOption[]>([])

async function loadOptions(key: 'category' | 'principal'): Promise<LabelOption[]> {
  try {
    const all = await loadLabelFilterOptions(key, '')
    return all.filter((o): o is LabelOption => o.value !== NO_LABEL)
  } catch {
    return []
  }
}

onMounted(async () => {
  ;[categoryOptions.value, principalOptions.value] = await Promise.all([
    loadOptions('category'),
    loadOptions('principal'),
  ])
})

// Comparisons
const comparisons = ref<CompetitorProductComparison[]>([...(base?.comparisons ?? [])])
const isPickerShown = ref(false)

const primaryProductId = computed(() => comparisons.value.find((c) => c.isPrimary)?.productId)

function setPrimary(productId: number) {
  comparisons.value = comparisons.value.map((c) => ({ ...c, isPrimary: c.productId === productId }))
}

function onPicked(picked: PickedProduct[]) {
  const next = [...comparisons.value]
  for (const p of picked) {
    if (next.some((c) => c.productId === p.id)) continue
    next.push({
      productId: p.id,
      code: p.code,
      name: p.name,
      categoryName: p.categoryName,
      principalName: p.principalName,
      // The first row added becomes primary.
      isPrimary: next.length === 0,
    })
  }
  comparisons.value = next
  isPickerShown.value = false
}

function removeComparison(productId: number) {
  const next = comparisons.value.filter((c) => c.productId !== productId)
  // Removing the primary hands it to the first row left.
  if (next.length && !next.some((c) => c.isPrimary)) next[0] = { ...next[0], isPrimary: true }
  comparisons.value = next
}

function onReorder(event: DataTableRowReorderEvent) {
  comparisons.value = event.value as CompetitorProductComparison[]
}

// Inline brand create
const isBrandDialogShown = ref(false)

function onBrandSaved(saved: boolean, brand?: CompetitorBrand) {
  isBrandDialogShown.value = false
  if (!saved || !brand) return
  initialBrand.value = brand
  brandId.value = brand.id
  manufacturer.value = brand.manufacturer ?? ''
  // Remount so the picker lists the new brand.
  brandKey.value++
}

const lastChanged = computed(() => {
  const p = props.product
  if (!p?.updatedByName || !p.updatedAt) return ''
  return t('competitorProducts.fields.lastChanged', {
    name: p.updatedByName,
    date: dayjs(p.updatedAt).format(DateFormat.DATE_TIME),
  })
})

const errors = reactive<Record<string, string>>({})

function clearErrors() {
  for (const key of Object.keys(errors)) delete errors[key]
}

function validate(): boolean {
  clearErrors()
  if (props.mode === 'add' && codeMode.value === 'manual') {
    if (!code.value.trim()) errors.code = t('competitorProducts.validation.codeRequired')
    else if (code.value.trim().length > 32)
      errors.code = t('competitorProducts.validation.codeTooLong')
  }
  if (!name.value.trim()) errors.name = t('competitorProducts.validation.nameRequired')
  else if (name.value.trim().length > 150)
    errors.name = t('competitorProducts.validation.nameTooLong')
  if (!brandId.value) errors.brandId = t('competitorProducts.validation.brandRequired')
  if (!categoryOptionId.value)
    errors.categoryOptionId = t('competitorProducts.validation.categoryRequired')
  if (!uomGroupId.value) errors.uomGroupId = t('competitorProducts.validation.uomGroupRequired')
  if (referencePrice.value !== null && referencePrice.value < 0)
    errors.referencePrice = t('competitorProducts.validation.priceInvalid')
  if (comparisons.value.length && comparisons.value.filter((c) => c.isPrimary).length !== 1)
    errors.comparisons = t('competitorProducts.errors.primaryRequired')
  return Object.keys(errors).length === 0
}

function onSubmit() {
  if (props.readonly || !validate()) return
  const payload: CompetitorProductPayload = {
    ...(props.mode === 'add' && codeMode.value === 'manual' ? { code: code.value.trim() } : {}),
    name: name.value.trim(),
    brandId: brandId.value!,
    categoryOptionId: categoryOptionId.value!,
    ...(principalOptionId.value ? { principalOptionId: principalOptionId.value } : {}),
    uomGroupId: uomGroupId.value!,
    ...(referencePrice.value !== null ? { referencePrice: referencePrice.value.toFixed(2) } : {}),
    ...(props.mode === 'edit' ? { isActive: isActive.value } : {}),
    comparisons: comparisons.value.map((c) => ({ productId: c.productId, isPrimary: c.isPrimary })),
  }
  emit('submit', {
    payload,
    carryOverIds: carryOverIds.value,
    similarIds: similarIds.value,
  })
}

/**
 * Puts a server error on the field it belongs to.
 *
 * @returns true when a field took it, false when the caller should toast it
 */
function applyServerError(message: string, e: unknown): boolean {
  switch (competitorProductErrorCode(e)) {
    case 'code_duplicate':
      errors.code = message
      return true
    case 'name_duplicate':
      errors.name = message
      return true
    case 'brand_inactive':
      errors.brandId = message
      return true
    case 'primary_required':
      errors.comparisons = message
      return true
    default:
      return false
  }
}

/** Uploads the photos picked before the product existed. @returns how many failed */
async function flushPhotos(productId: number): Promise<number> {
  return (await gallery.value?.flushPending(productId)) ?? 0
}

/** How many photos picked in add mode are still waiting for an owner. */
function pendingPhotoCount(): number {
  return gallery.value?.pendingCount ?? 0
}

defineExpose({ applyServerError, flushPhotos, pendingPhotoCount })
</script>
