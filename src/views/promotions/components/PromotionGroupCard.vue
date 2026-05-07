<template>
  <div class="rounded border p-4">
    <!-- Group header -->
    <div class="mb-4 flex items-center justify-between gap-3">
      <span class="text-sm font-semibold"
        >{{ t('promotions.labels.groups') }} {{ groupIdx + 1 }}</span
      >
      <Button
        v-if="!isView"
        icon="pi pi-trash"
        severity="danger"
        text
        size="small"
        :aria-label="t('promotions.labels.removeGroup')"
        @click="emit('remove')"
      />
    </div>

    <!-- Qualifier kind + Threshold/Measure kind -->
    <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('promotions.fields.qualifierKind') }}</label>
        <SelectButton
          v-if="!isView"
          v-model="group.qualifierKind"
          :options="qualifierOptions"
          option-label="label"
          option-value="value"
        />
        <span v-else>{{ t(`promotions.labels.qualifierKinds.${group.qualifierKind}`) }}</span>
      </div>

      <!-- Period-based: measure kind -->
      <div v-if="promoType === 'period_based'" class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('promotions.fields.measureKind') }} *</label>
        <SelectButton
          v-if="!isView"
          v-model="group.measureKind"
          :options="measureKindOptions"
          option-label="label"
          option-value="value"
        />
        <span v-else>{{
          group.measureKind ? t(`promotions.labels.measureKinds.${group.measureKind}`) : '—'
        }}</span>
        <small v-if="errors.measureKind" class="text-red-500">{{ errors.measureKind }}</small>
      </div>

      <!-- Per-transaction: threshold kind -->
      <div v-else class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('promotions.fields.thresholdKind') }}</label>
        <SelectButton
          v-if="!isView"
          v-model="group.thresholdKind"
          :options="thresholdOptions"
          option-label="label"
          option-value="value"
        />
        <span v-else>{{ t(`promotions.labels.thresholdKinds.${group.thresholdKind}`) }}</span>
      </div>
    </div>

    <!-- Products qualifier -->
    <div v-if="group.qualifierKind === 'products'" class="mb-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold">{{ t('promotions.labels.products') }}</span>
        <InfiniteSelect
          v-if="!isView"
          option-label="code"
          option-value="id"
          :fetch-fn="(query) => ProductsService.list(query)"
          :placeholder="t('promotions.labels.selectProduct')"
          sort-by="code"
          sort-operator="asc"
          @select-option="onAddProduct"
        />
      </div>
      <small v-if="errors.products" class="mb-1 block text-red-500">{{ errors.products }}</small>

      <div
        v-if="group.products.length === 0"
        class="rounded border p-3 text-center text-sm text-gray-500"
      >
        {{ t('table.noItems') }}
      </div>

      <DataTable v-else :value="group.products" size="small">
        <Column :header="t('promotions.fields.productCode')" style="min-width: 8rem">
          <template #body="{ data: p }">
            {{ p._product?.code ?? String(p.productId ?? '') }}
          </template>
        </Column>
        <Column :header="t('promotions.fields.product')" style="min-width: 10rem">
          <template #body="{ data: p }">
            {{ p._product?.name ?? '—' }}
          </template>
        </Column>
        <Column :header="t('promotions.fields.uom')" style="width: 6rem">
          <template #body="{ data: p }">
            {{ p._product?.smallestUomSymbol ?? '—' }}
          </template>
        </Column>
        <Column :header="t('promotions.fields.mandatory')" style="width: 7rem">
          <template #body="{ data: p }">
            <Checkbox v-if="!isView" v-model="p.mandatory" :binary="true" />
            <span v-else>{{ p.mandatory ? t('common.labels.yes') : t('common.labels.no') }}</span>
          </template>
        </Column>
        <Column :header="perRowThresholdHeader" style="width: 10rem">
          <template #body="{ data: p }">
            <InputText
              v-if="!isView && p.mandatory"
              v-model="p.productThreshold"
              size="small"
              class="w-full"
              autocomplete="off"
            />
            <span v-else-if="p.mandatory">{{ p.productThreshold }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>
        </Column>
        <Column v-if="!isView" style="width: 4rem">
          <template #body="{ index }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="removeProduct(index)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Labels qualifier -->
    <div v-else class="mb-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold">{{ t('promotions.labels.labels') }}</span>
        <div v-if="isLoadingLabelOptions" class="text-sm text-gray-500">
          <i class="pi pi-spinner pi-spin" />
        </div>
        <Select
          v-else-if="!isView"
          :model-value="null"
          :options="availableLabelOptions"
          option-label="value"
          option-value="id"
          :placeholder="t('promotions.labels.selectLabels')"
          filter
          @update:model-value="onAddLabel"
        />
      </div>
      <small v-if="errors.labels" class="mb-1 block text-red-500">{{ errors.labels }}</small>

      <div
        v-if="group.labels.length === 0"
        class="rounded border p-3 text-center text-sm text-gray-500"
      >
        {{ t('table.noItems') }}
      </div>

      <DataTable v-else :value="group.labels" size="small">
        <Column :header="t('promotions.fields.label')" style="min-width: 10rem">
          <template #body="{ data: l }">
            {{
              allLabelOptions.find((o) => o.id === l.labelOptionId)?.value ??
              String(l.labelOptionId)
            }}
          </template>
        </Column>
        <Column :header="t('promotions.fields.mandatory')" style="width: 7rem">
          <template #body="{ data: l }">
            <Checkbox v-if="!isView" v-model="l.mandatory" :binary="true" />
            <span v-else>{{ l.mandatory ? t('common.labels.yes') : t('common.labels.no') }}</span>
          </template>
        </Column>
        <Column :header="perRowThresholdHeader" style="width: 10rem">
          <template #body="{ data: l }">
            <InputText
              v-if="!isView && l.mandatory"
              v-model="l.labelThreshold"
              size="small"
              class="w-full"
              autocomplete="off"
            />
            <span v-else-if="l.mandatory">{{ l.labelThreshold }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>
        </Column>
        <Column v-if="!isView" style="width: 4rem">
          <template #body="{ index }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="removeLabel(index)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Period-based: period settings + voucher tiers -->
    <template v-if="promoType === 'period_based'">
      <div class="mb-4 border-t pt-4">
        <h3 class="mb-3 text-sm font-semibold">{{ t('promotions.labels.periodSettings') }}</h3>
        <GroupPeriodSettingsBlock
          v-model="group.periodSettings"
          :errors="errors.periodSettingsErrors"
          :is-view="isView"
        />
      </div>

      <div class="border-t pt-4">
        <VoucherTiersTable
          v-model:tiers="group.voucherTiers"
          :measure-kind="group.measureKind"
          :errors="errors.voucherTierErrors"
          :threshold-error="errors.voucherTierThresholdError"
          :is-view="isView"
        />
      </div>
    </template>

    <!-- Per-transaction: reward section -->
    <div v-else class="border-t pt-4">
      <div class="mb-3 flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('promotions.labels.reward') }}</label>
        <Select
          v-if="!isView"
          v-model="group.reward.rewardType"
          :options="rewardTypeOptions"
          option-label="label"
          option-value="value"
          class="w-full md:w-48"
        />
        <span v-else>
          {{
            group.reward.rewardType
              ? t(`promotions.labels.rewardTypes.${group.reward.rewardType}`)
              : '—'
          }}
        </span>
      </div>

      <!-- Discount reward -->
      <template v-if="group.reward.rewardType === 'discount'">
        <small v-if="errors.tierThresholdError" class="mb-1 block text-red-500">
          {{ errors.tierThresholdError }}
        </small>
        <DiscountTiersTable
          v-model:tiers="group.reward.discountTiers"
          :threshold-kind="group.thresholdKind"
          :errors="errors.discountTierErrors"
          :is-view="isView"
        />
      </template>

      <!-- Bonus reward -->
      <template v-if="group.reward.rewardType === 'bonus'">
        <div class="mb-3 flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('promotions.fields.bonusKind') }}</label>
          <Select
            v-if="!isView"
            v-model="group.reward.bonusKind"
            :options="bonusKindOptions"
            option-label="label"
            option-value="value"
            class="w-full md:w-48"
          />
          <span v-else>
            {{
              group.reward.bonusKind
                ? t(`promotions.labels.bonusKinds.${group.reward.bonusKind}`)
                : '—'
            }}
          </span>
        </div>

        <template v-if="group.reward.bonusKind === 'fixed'">
          <small v-if="errors.tierThresholdError" class="mb-1 block text-red-500">
            {{ errors.tierThresholdError }}
          </small>
          <FixedBonusTiersTable
            v-model:tiers="group.reward.fixedBonusTiers"
            :threshold-kind="group.thresholdKind"
            :tier-errors="errors.fixedBonusTierErrors"
            :is-view="isView"
          />
        </template>

        <CustomerChoicePoolTable
          v-if="group.reward.bonusKind === 'customer_choice'"
          v-model:pool="group.reward.customerChoicePool"
          :threshold-kind="group.thresholdKind"
          :errors="errors.customerChoiceErrors"
          :is-view="isView"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { ProductsService } from '@/services/products.service'
import { ProductLabelOptionsService } from '@/services/productLabelOptions.service'
import type { RewardType, BonusKind, MeasureKind, PromoType } from '@/types/promotion.type'
import DiscountTiersTable, { type DiscountTierForm } from './DiscountTiersTable.vue'
import FixedBonusTiersTable, { type FixedBonusTierForm } from './FixedBonusTiersTable.vue'
import CustomerChoicePoolTable, {
  type CustomerChoicePoolForm,
  type CustomerChoicePoolErrors,
} from './CustomerChoicePoolTable.vue'
import VoucherTiersTable, { type VoucherTierForm } from './VoucherTiersTable.vue'
import GroupPeriodSettingsBlock, {
  type GroupPeriodSettingsForm,
  type GroupPeriodSettingsErrors,
} from './GroupPeriodSettingsBlock.vue'

export interface GroupProductForm {
  productId: number | undefined
  mandatory: boolean
  productThreshold: string
  _product?: { id: number; code: string; name: string; smallestUomSymbol?: string }
}

export interface GroupRewardForm {
  rewardType: RewardType | ''
  bonusKind: BonusKind | ''
  discountTiers: DiscountTierForm[]
  fixedBonusTiers: FixedBonusTierForm[]
  customerChoicePool: CustomerChoicePoolForm
}

export interface GroupLabelForm {
  labelOptionId: number
  mandatory: boolean
  labelThreshold: string
}

export interface GroupForm {
  qualifierKind: 'products' | 'labels'
  thresholdKind: 'min_qty' | 'min_amount'
  products: GroupProductForm[]
  labels: GroupLabelForm[]
  reward: GroupRewardForm
  // period_based extras
  measureKind: MeasureKind | ''
  periodSettings: GroupPeriodSettingsForm
  voucherTiers: VoucherTierForm[]
}

export interface GroupErrors {
  products: string
  labels: string
  tierThresholdError: string
  discountTierErrors: string[]
  fixedBonusTierErrors: string[][]
  customerChoiceErrors: CustomerChoicePoolErrors
  // period_based
  measureKind: string
  periodSettingsErrors: GroupPeriodSettingsErrors
  voucherTierErrors: string[]
  voucherTierThresholdError: string
}

const group = defineModel<GroupForm>('group', { required: true })

const props = defineProps<{
  groupIdx: number
  isView: boolean
  promoType: PromoType
  errors: GroupErrors
}>()

const emit = defineEmits<{ remove: [] }>()

const { t } = useI18n()

const allLabelOptions = ref<{ id: number; value: string }[]>([])
const isLoadingLabelOptions = ref(false)

const qualifierOptions = computed(() => [
  { label: t('promotions.labels.qualifierKinds.products'), value: 'products' },
  { label: t('promotions.labels.qualifierKinds.labels'), value: 'labels' },
])

const thresholdOptions = computed(() => [
  { label: t('promotions.labels.thresholdKinds.min_qty'), value: 'min_qty' },
  { label: t('promotions.labels.thresholdKinds.min_amount'), value: 'min_amount' },
])

const measureKindOptions = computed(() => [
  { label: t('promotions.labels.measureKinds.total_qty'), value: 'total_qty' },
  { label: t('promotions.labels.measureKinds.total_amount'), value: 'total_amount' },
])

const rewardTypeOptions = computed(() => [
  { label: t('promotions.labels.rewardTypes.discount'), value: 'discount' },
  { label: t('promotions.labels.rewardTypes.bonus'), value: 'bonus' },
])

const bonusKindOptions = computed(() => [
  { label: t('promotions.labels.bonusKinds.fixed'), value: 'fixed' },
  { label: t('promotions.labels.bonusKinds.customer_choice'), value: 'customer_choice' },
])

const perRowThresholdHeader = computed(() => {
  if (props.promoType === 'period_based') {
    return group.value.measureKind === 'total_qty'
      ? t('promotions.fields.minQty')
      : t('promotions.fields.minAmount')
  }
  return group.value.thresholdKind === 'min_qty'
    ? t('promotions.fields.minQty')
    : t('promotions.fields.minAmount')
})

const availableLabelOptions = computed(() =>
  allLabelOptions.value.filter((o) => !group.value.labels.some((l) => l.labelOptionId === o.id)),
)

onMounted(async () => {
  await loadLabelOptions()
})

async function loadLabelOptions() {
  isLoadingLabelOptions.value = true
  try {
    const res = await ProductLabelOptionsService.list('limit=500&sort_by=value&sort_operator=asc')
    allLabelOptions.value = res.data.map((o) => ({ id: o.id, value: o.value }))
  } catch {
    // silently ignore — labels will still show IDs if options fail to load
  } finally {
    isLoadingLabelOptions.value = false
  }
}

function onAddProduct(opt: {
  id: number
  code: string
  name: string
  uomGroup?: { levels: { uom?: { symbol?: string } }[] }
}) {
  const alreadyAdded = group.value.products.some((p) => p.productId === opt.id)
  if (alreadyAdded) return

  const levels = opt.uomGroup?.levels
  const smallestUomSymbol =
    levels && levels.length > 0 ? levels[levels.length - 1].uom?.symbol : undefined

  group.value.products.push({
    productId: opt.id,
    mandatory: false,
    productThreshold: '',
    _product: { id: opt.id, code: opt.code, name: opt.name, smallestUomSymbol },
  })
}

function removeProduct(index: number) {
  group.value.products.splice(index, 1)
}

function onAddLabel(id: number) {
  if (id != null && !group.value.labels.some((l) => l.labelOptionId === id)) {
    group.value.labels.push({ labelOptionId: id, mandatory: false, labelThreshold: '' })
  }
}

function removeLabel(index: number) {
  group.value.labels.splice(index, 1)
}
</script>
