<template>
  <div>
    <!-- Header card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Code -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('promotions.fields.code') }} *</label>
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
            <label class="text-sm font-semibold">{{ t('promotions.fields.description') }}</label>
            <InputText v-model="form.description" :disabled="isView" autocomplete="off" />
          </div>

          <!-- Currency -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('promotions.fields.currency') }} *</label>
            <InfiniteSelect
              v-if="!isView"
              option-label="code"
              option-value="id"
              :fetch-fn="(query) => CurrenciesService.list(query)"
              :placeholder="t('common.labels.selectOption')"
              :initial-option="initialCurrency"
              :model-value="form.currencyId"
              :class="{ 'p-invalid': errors.currencyId }"
              sort-by="code"
              sort-operator="asc"
              @update:model-value="(v) => (form.currencyId = v as number)"
            />
            <InputText
              v-else
              :value="initialCurrency?.code ?? String(form.currencyId ?? '')"
              disabled
            />
            <small v-if="errors.currencyId" class="text-red-500">{{ errors.currencyId }}</small>
          </div>

          <!-- Promo type -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('promotions.fields.promoType') }} *</label>
            <Select
              v-if="!isView"
              v-model="form.promoType"
              :options="promoTypeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
            <span v-else>{{ t(`promotions.labels.promoTypes.${form.promoType}`) }}</span>
          </div>

          <!-- Start date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('promotions.fields.startDate') }} *</label>
            <DatePicker
              v-model="form.startDate"
              :disabled="isView"
              date-format="yy-mm-dd"
              :class="{ 'p-invalid': errors.startDate }"
              show-button-bar
            />
            <small v-if="errors.startDate" class="text-red-500">{{ errors.startDate }}</small>
          </div>

          <!-- End date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('promotions.fields.endDate') }}</label>
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
                  t('promotions.fields.noEndDate')
                }}</label>
              </div>
            </div>
          </div>

          <!-- Active -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('promotions.fields.active') }}</label>
            <ToggleSwitch v-if="!isView" v-model="form.active" />
            <span v-else>{{
              form.active ? t('common.labels.active') : t('common.labels.inactive')
            }}</span>
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <!-- Groups card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ t('promotions.labels.groups') }}</h2>
          <Button
            v-if="!isView"
            :label="t('promotions.labels.addGroup')"
            icon="pi pi-plus"
            size="small"
            @click="addGroup"
          />
        </div>

        <small v-if="errors.groups" class="mb-3 block text-red-500">{{ errors.groups }}</small>

        <div
          v-if="form.groups.length === 0"
          class="rounded border p-4 text-center text-sm text-gray-500"
        >
          {{ t('table.noItems') }}
        </div>

        <div v-for="(_, groupIdx) in form.groups" :key="groupIdx" class="mb-4">
          <PromotionGroupCard
            v-model:group="form.groups[groupIdx]"
            :group-idx="groupIdx"
            :is-view="isView"
            :promo-type="form.promoType"
            :errors="groupErrors[groupIdx] ?? emptyGroupErrors"
            @remove="removeGroup(groupIdx)"
          />
        </div>
      </template>
    </ResponsiveCard>

    <!-- Actions -->
    <div v-if="!isView" class="flex justify-end gap-3">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button :label="t('common.actions.save')" :loading="isLoading" @click="onSave" />
    </div>
    <div v-else class="flex justify-end gap-3">
      <Button :label="t('common.actions.back')" severity="secondary" @click="emit('cancel')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CurrenciesService } from '@/services/currencies.service'
import type {
  Promotion,
  CreatePromotionDto,
  RewardType,
  BonusKind,
  DiscountType,
} from '@/types/promotion.type'
import PromotionGroupCard, {
  type GroupForm,
  type GroupErrors,
} from './components/PromotionGroupCard.vue'
import type { DiscountTierForm } from './components/DiscountTiersTable.vue'
import type { FixedBonusTierForm } from './components/FixedBonusTiersTable.vue'

type FormMode = 'create' | 'edit' | 'view'

const props = defineProps<{
  mode: FormMode
  promotion?: Promotion
  isLoading?: boolean
}>()

const emit = defineEmits<{
  submit: [dto: CreatePromotionDto]
  cancel: []
}>()

const { t } = useI18n()

const isView = computed(() => props.mode === 'view')

const initialCurrency = ref<{ id: number; code: string } | undefined>(undefined)
const noEndDate = ref(false)

const form = ref({
  code: '',
  description: '',
  currencyId: undefined as number | undefined,
  promoType: 'per_transaction' as 'per_transaction' | 'period_based',
  startDate: null as Date | null,
  endDate: null as Date | null,
  active: true,
  groups: [] as GroupForm[],
})

const errors = ref({
  code: '',
  currencyId: '',
  startDate: '',
  groups: '',
})

const groupErrors = ref<GroupErrors[]>([])

const emptyGroupErrors: GroupErrors = {
  products: '',
  labels: '',
  tierThresholdError: '',
  discountTierErrors: [],
  fixedBonusTierErrors: [],
  customerChoiceErrors: { threshold: '', pickableCount: '', items: [] },
  measureKind: '',
  periodSettingsErrors: { resetCycle: '', voucherValidityDays: '', voucherMinRedeemAmount: '' },
  voucherTierErrors: [],
  voucherTierThresholdError: '',
}

const promoTypeOptions = computed(() => [
  { label: t('promotions.labels.promoTypes.per_transaction'), value: 'per_transaction' },
  { label: t('promotions.labels.promoTypes.period_based'), value: 'period_based' },
])

function makeEmptyGroup(): GroupForm {
  return {
    qualifierKind: 'products',
    thresholdKind: 'min_qty',
    products: [],
    labels: [],
    reward: {
      rewardType: '' as RewardType | '',
      bonusKind: '',
      discountTiers: [],
      fixedBonusTiers: [],
      customerChoicePool: { threshold: '', pickableCount: 1, items: [] },
    },
    measureKind: '',
    periodSettings: {
      resetCycle: '',
      voucherApplyOn: 'next_transaction',
      voucherValidityDays: null,
      voucherMinRedeemAmount: '',
      voucherStackable: false,
    },
    voucherTiers: [],
  }
}

onMounted(() => {
  if (props.promotion) {
    const p = props.promotion

    if (p.currency) {
      initialCurrency.value = { id: p.currencyId, code: p.currency.code }
    }

    form.value.code = p.code
    form.value.description = p.description ?? ''
    form.value.currencyId = p.currencyId
    form.value.promoType = p.promoType
    form.value.startDate = new Date(p.startDate)
    form.value.active = p.active

    if (p.endDate) {
      form.value.endDate = new Date(p.endDate)
      noEndDate.value = false
    } else {
      noEndDate.value = true
    }

    form.value.groups = p.groups.map((g) => {
      const base = makeEmptyGroup()

      base.qualifierKind = g.qualifierKind
      base.thresholdKind = g.thresholdKind
      base.measureKind = g.measureKind ?? ''

      base.products = (g.products ?? []).map((gp) => ({
        productId: gp.productId,
        mandatory: gp.mandatory ?? false,
        productThreshold: g.thresholdKind === 'min_qty' ? (gp.minQty ?? '') : (gp.minAmount ?? ''),
        _product: gp.product
          ? {
              id: gp.productId,
              code: gp.product.code,
              name: gp.product.name,
              smallestUomSymbol: gp.product.smallestUomSymbol ?? undefined,
            }
          : undefined,
      }))

      base.labels = (g.labels ?? []).map((l) => ({
        labelOptionId: l.productLabelOptionId,
        mandatory: l.mandatory ?? false,
        labelThreshold: g.thresholdKind === 'min_qty' ? (l.minQty ?? '') : (l.minAmount ?? ''),
      }))

      if (p.promoType === 'period_based') {
        const ps = g.periodSettings
        base.periodSettings = {
          resetCycle: ps?.resetCycle ?? '',
          voucherApplyOn: ps?.voucherApplyOn ?? 'next_transaction',
          voucherValidityDays: ps?.voucherValidityDays ?? null,
          voucherMinRedeemAmount: ps?.voucherMinRedeemAmount ?? '',
          voucherStackable: ps?.voucherStackable ?? false,
        }
        base.voucherTiers = (g.voucherTiers ?? []).map((vt) => ({
          threshold: g.measureKind === 'total_qty' ? (vt.minQty ?? '') : (vt.minAmount ?? ''),
          voucherDiscountType: vt.voucherDiscountType as DiscountType,
          voucherValue: vt.voucherValue,
        }))
      } else {
        const reward = g.reward!

        const discountTiers: DiscountTierForm[] = (reward.discountTiers ?? []).map((dt) => ({
          threshold: g.thresholdKind === 'min_qty' ? (dt.minQty ?? '') : (dt.minAmount ?? ''),
          discountType: dt.discountType as DiscountType,
          value: dt.value,
        }))

        const fixedBonusTiers: FixedBonusTierForm[] = (reward.fixedBonusTiers ?? []).map((ft) => ({
          threshold: g.thresholdKind === 'min_qty' ? (ft.minQty ?? '') : (ft.minAmount ?? ''),
          items: ft.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            _product: item.product
              ? {
                  id: item.productId,
                  code: item.product.code,
                  name: item.product.name,
                  smallestUomSymbol: item.product.smallestUomSymbol ?? undefined,
                }
              : undefined,
          })),
        }))

        const cc = reward.customerChoice
        const customerChoicePool = {
          threshold: '',
          pickableCount: cc?.pickableCount ?? 1,
          items: (cc?.poolItems ?? []).map((pi) => ({
            productId: pi.productId,
            bonusAmount: pi.bonusAmount,
            _product: pi.product
              ? {
                  id: pi.productId,
                  code: pi.product.code,
                  name: pi.product.name,
                  smallestUomSymbol: pi.product.smallestUomSymbol ?? undefined,
                }
              : undefined,
          })),
        }

        base.reward = {
          rewardType: reward.rewardType as RewardType,
          bonusKind: (reward.bonusKind ?? '') as BonusKind | '',
          discountTiers,
          fixedBonusTiers,
          customerChoicePool,
        }
      }

      return base
    })

    groupErrors.value = form.value.groups.map(() => ({ ...emptyGroupErrors }))
  }
})

function addGroup() {
  form.value.groups.push(makeEmptyGroup())
  groupErrors.value.push({ ...emptyGroupErrors })
}

function removeGroup(index: number) {
  form.value.groups.splice(index, 1)
  groupErrors.value.splice(index, 1)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function validate(): boolean {
  let valid = true
  errors.value = { code: '', currencyId: '', startDate: '', groups: '' }
  groupErrors.value = form.value.groups.map(() => ({
    products: '',
    labels: '',
    tierThresholdError: '',
    discountTierErrors: [],
    fixedBonusTierErrors: [],
    customerChoiceErrors: { threshold: '', pickableCount: '', items: [] },
    measureKind: '',
    periodSettingsErrors: { resetCycle: '', voucherValidityDays: '', voucherMinRedeemAmount: '' },
    voucherTierErrors: [],
    voucherTierThresholdError: '',
  }))

  if (!form.value.code.trim()) {
    errors.value.code = t('promotions.validation.codeRequired')
    valid = false
  }
  if (!form.value.currencyId) {
    errors.value.currencyId = t('promotions.validation.currencyRequired')
    valid = false
  }
  if (!form.value.startDate) {
    errors.value.startDate = t('promotions.validation.startDateRequired')
    valid = false
  }
  if (form.value.groups.length === 0) {
    errors.value.groups = t('promotions.validation.groupsRequired')
    valid = false
  }

  const isPeriodBased = form.value.promoType === 'period_based'

  form.value.groups.forEach((group, gi) => {
    const ge = groupErrors.value[gi]

    // qualifier validation (both types)
    if (group.qualifierKind === 'products' && group.products.length === 0) {
      ge.products = t('promotions.validation.productsRequired')
      valid = false
    }
    if (group.qualifierKind === 'labels' && group.labels.length === 0) {
      ge.labels = t('promotions.validation.labelsRequired')
      valid = false
    }

    if (isPeriodBased) {
      // measure kind required
      if (!group.measureKind) {
        ge.measureKind = t('promotions.validation.measureKindRequired')
        valid = false
      }

      // period settings validation
      const ps = group.periodSettings
      if (!ps.resetCycle) {
        ge.periodSettingsErrors.resetCycle = t('promotions.validation.resetCycleRequired')
        valid = false
      }
      if (!ps.voucherValidityDays || ps.voucherValidityDays < 1) {
        ge.periodSettingsErrors.voucherValidityDays = t(
          'promotions.validation.voucherValidityDaysRequired',
        )
        valid = false
      }
      if (ps.voucherMinRedeemAmount.trim()) {
        const v = parseFloat(ps.voucherMinRedeemAmount)
        if (isNaN(v) || v <= 0) {
          ge.periodSettingsErrors.voucherMinRedeemAmount = t(
            'promotions.validation.voucherMinRedeemAmountInvalid',
          )
          valid = false
        }
      }

      // voucher tiers validation
      if (group.voucherTiers.length === 0) {
        ge.voucherTierThresholdError = t('promotions.validation.voucherTiersRequired')
        valid = false
      }
      ge.voucherTierErrors = group.voucherTiers.map((tier) => {
        if (!tier.voucherValue.trim()) return t('promotions.validation.tierValueRequired')
        if (tier.voucherDiscountType === 'percentage') {
          const v = parseFloat(tier.voucherValue)
          if (isNaN(v) || v < 0 || v > 100) return t('promotions.validation.voucherValueRange')
        }
        return ''
      })
      if (ge.voucherTierErrors.some((e) => e)) valid = false
      for (let i = 1; i < group.voucherTiers.length; i++) {
        const prev = parseFloat(group.voucherTiers[i - 1].threshold || '0')
        const curr = parseFloat(group.voucherTiers[i].threshold || '0')
        if (isNaN(curr) || curr <= prev) {
          ge.voucherTierThresholdError = t('promotions.validation.tiersNotAscending')
          valid = false
          break
        }
      }
    } else {
      // per_transaction reward validation
      const reward = group.reward
      if (reward.rewardType === 'discount') {
        if (reward.discountTiers.length === 0) {
          valid = false
        }
        ge.discountTierErrors = reward.discountTiers.map((tier) => {
          if (!tier.value.trim()) return t('promotions.validation.tierValueRequired')
          if (tier.discountType === 'percentage') {
            const v = parseFloat(tier.value)
            if (isNaN(v) || v < 0 || v > 100) return t('promotions.validation.tierValueRange')
          }
          return ''
        })
        if (ge.discountTierErrors.some((e) => e)) valid = false
        for (let i = 1; i < reward.discountTiers.length; i++) {
          const prev = parseFloat(reward.discountTiers[i - 1].threshold || '0')
          const curr = parseFloat(reward.discountTiers[i].threshold || '0')
          if (isNaN(curr) || curr <= prev) {
            ge.tierThresholdError = t('promotions.validation.tiersNotAscending')
            valid = false
            break
          }
        }
      }

      if (reward.rewardType === 'bonus' && reward.bonusKind === 'fixed') {
        if (reward.fixedBonusTiers.length === 0) {
          valid = false
        }
        ge.fixedBonusTierErrors = reward.fixedBonusTiers.map((tier) => {
          if (tier.items.length === 0) return [t('promotions.validation.tierItemsRequired')]
          return tier.items.map((item) => {
            if (!item.qty.trim()) return t('promotions.validation.tierItemQtyRequired')
            return ''
          })
        })
        if (ge.fixedBonusTierErrors.some((te) => te.some((e) => e))) valid = false
        for (let i = 1; i < reward.fixedBonusTiers.length; i++) {
          const prev = parseFloat(reward.fixedBonusTiers[i - 1].threshold || '0')
          const curr = parseFloat(reward.fixedBonusTiers[i].threshold || '0')
          if (isNaN(curr) || curr <= prev) {
            ge.tierThresholdError = t('promotions.validation.tiersNotAscending')
            valid = false
            break
          }
        }
      }

      if (reward.rewardType === 'bonus' && reward.bonusKind === 'customer_choice') {
        const pool = reward.customerChoicePool
        if (!pool.pickableCount || pool.pickableCount < 1) {
          ge.customerChoiceErrors.pickableCount = t('promotions.validation.pickableCountRequired')
          valid = false
        }
        if (pool.items.length < (pool.pickableCount ?? 1)) {
          ge.customerChoiceErrors.items = pool.items.map(() => '')
          if (pool.items.length === 0)
            ge.customerChoiceErrors.threshold = t('promotions.validation.poolRequired')
          valid = false
        }
        ge.customerChoiceErrors.items = pool.items.map((item) => {
          if (!item.bonusAmount.trim()) return t('promotions.validation.poolBonusAmountRequired')
          return ''
        })
        if (ge.customerChoiceErrors.items.some((e) => e)) valid = false
      }
    }
  })

  return valid
}

function buildGroupDto(group: GroupForm) {
  const isMinQty = group.thresholdKind === 'min_qty'
  const isTotalQty = group.measureKind === 'total_qty'
  const isPeriodBased = form.value.promoType === 'period_based'

  const qualifierFields = {
    qualifierKind: group.qualifierKind,
    products:
      group.qualifierKind === 'products'
        ? group.products.map((p) => ({
            productId: p.productId!,
            mandatory: p.mandatory,
            minQty: isMinQty
              ? p.mandatory && p.productThreshold
                ? p.productThreshold
                : null
              : null,
            minAmount: !isMinQty
              ? p.mandatory && p.productThreshold
                ? p.productThreshold
                : null
              : null,
          }))
        : undefined,
    labels:
      group.qualifierKind === 'labels'
        ? group.labels.map((l) => ({
            productLabelOptionId: l.labelOptionId,
            mandatory: l.mandatory,
            minQty: isMinQty ? (l.mandatory && l.labelThreshold ? l.labelThreshold : null) : null,
            minAmount: !isMinQty
              ? l.mandatory && l.labelThreshold
                ? l.labelThreshold
                : null
              : null,
          }))
        : undefined,
  }

  if (isPeriodBased) {
    const ps = group.periodSettings
    return {
      ...qualifierFields,
      thresholdKind: group.thresholdKind,
      measureKind: group.measureKind || null,
      periodSettings: {
        resetCycle: ps.resetCycle as import('@/types/promotion.type').ResetCycle,
        voucherApplyOn: ps.voucherApplyOn as import('@/types/promotion.type').VoucherApplyOn,
        voucherValidityDays: ps.voucherValidityDays!,
        voucherMinRedeemAmount: ps.voucherMinRedeemAmount.trim() || null,
        voucherStackable: ps.voucherStackable,
      },
      voucherTiers: group.voucherTiers.map((vt) => ({
        minQty: isTotalQty ? vt.threshold || null : null,
        minAmount: !isTotalQty ? vt.threshold || null : null,
        voucherDiscountType:
          vt.voucherDiscountType as import('@/types/promotion.type').DiscountType,
        voucherValue: vt.voucherValue,
      })),
    }
  }

  const reward = group.reward
  const rewardDto = {
    rewardType: reward.rewardType as import('@/types/promotion.type').RewardType,
    bonusKind: reward.bonusKind || undefined,
    discountTiers:
      reward.rewardType === 'discount'
        ? reward.discountTiers.map((t) => ({
            minQty: isMinQty ? t.threshold || null : null,
            minAmount: !isMinQty ? t.threshold || null : null,
            discountType: t.discountType as DiscountType,
            value: t.value,
          }))
        : undefined,
    fixedBonusTiers:
      reward.rewardType === 'bonus' && reward.bonusKind === 'fixed'
        ? reward.fixedBonusTiers.map((ft) => ({
            minQty: isMinQty ? ft.threshold || null : null,
            minAmount: !isMinQty ? ft.threshold || null : null,
            items: ft.items.map((item) => ({
              productId: item.productId!,
              qty: item.qty,
            })),
          }))
        : undefined,
    customerChoice:
      reward.rewardType === 'bonus' && reward.bonusKind === 'customer_choice'
        ? {
            pickableCount: reward.customerChoicePool.pickableCount,
            poolItems: reward.customerChoicePool.items.map((item) => ({
              productId: item.productId!,
              bonusAmount: item.bonusAmount,
            })),
          }
        : undefined,
  }

  return {
    ...qualifierFields,
    thresholdKind: group.thresholdKind,
    reward: rewardDto,
  }
}

function onSave() {
  if (!validate()) return

  const dto: CreatePromotionDto = {
    code: form.value.code.trim(),
    description: form.value.description || undefined,
    currencyId: form.value.currencyId!,
    promoType: form.value.promoType,
    startDate: formatDate(form.value.startDate!),
    endDate: noEndDate.value ? null : form.value.endDate ? formatDate(form.value.endDate) : null,
    active: form.value.active,
    groups: form.value.groups.map(buildGroupDto),
  }

  emit('submit', dto)
}
</script>
