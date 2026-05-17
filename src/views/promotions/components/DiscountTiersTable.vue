<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">{{
        t('promotions.labels.discountTiers')
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

    <DataTable v-else :value="tiers" size="small">
      <Column :header="t('promotions.fields.target')" style="width: 12rem">
        <template #body="{ data: tier }">
          <Select
            v-if="!isView"
            :model-value="tierTargetKey(tier)"
            :options="targetOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            size="small"
            @update:model-value="(v) => onTargetChange(tier, v as string)"
          />
          <span v-else>{{ tierTargetLabel(tier) }}</span>
        </template>
      </Column>
      <Column
        :header="
          thresholdKind === 'min_qty'
            ? t('promotions.fields.minQty')
            : t('promotions.fields.minAmount')
        "
        style="width: 10rem"
      >
        <template #body="{ data: tier }">
          <InputText
            v-if="!isView"
            v-model="tier.threshold"
            size="small"
            class="w-full"
            autocomplete="off"
          />
          <span v-else>{{ tier.threshold }}</span>
        </template>
      </Column>
      <Column :header="t('promotions.fields.discountType')" style="width: 10rem">
        <template #body="{ data: tier }">
          <Select
            v-if="!isView"
            v-model="tier.discountType"
            :options="discountTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            size="small"
            @update:model-value="
              (v) => {
                if (v === 'percentage') tier.isMultiplicative = false
              }
            "
          />
          <span v-else>
            {{
              tier.discountType ? t(`promotions.labels.discountTypes.${tier.discountType}`) : '—'
            }}
          </span>
        </template>
      </Column>
      <Column :header="t('promotions.fields.value')" style="width: 10rem">
        <template #body="{ data: tier, index }">
          <div class="flex flex-col gap-1">
            <InputText
              v-if="!isView"
              v-model="tier.value"
              size="small"
              class="w-full"
              :class="{ 'p-invalid': errors[index] }"
              autocomplete="off"
            />
            <span v-else>{{ tier.value }}</span>
            <small v-if="errors[index]" class="text-red-500">{{ errors[index] }}</small>
          </div>
        </template>
      </Column>
      <Column :header="t('promotions.labels.tier.multiplicative.label')" style="width: 8rem">
        <template #body="{ data: tier }">
          <ToggleSwitch
            v-if="!isView"
            v-model="tier.isMultiplicative"
            :disabled="tier.discountType === 'percentage'"
          />
          <span v-else>{{
            tier.isMultiplicative ? t('common.labels.yes') : t('common.labels.no')
          }}</span>
        </template>
      </Column>
      <Column v-if="!isView" style="width: 4rem">
        <template #body="{ index }">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            :aria-label="t('promotions.labels.removeTier')"
            @click="removeTier(index)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import type { ThresholdKind, DiscountType, TargetKind } from '@/types/promotion.type'

export interface TierQualifierItem {
  kind: 'product' | 'label'
  id: number
  label: string
}

export interface DiscountTierForm {
  threshold: string
  discountType: DiscountType | ''
  value: string
  isMultiplicative: boolean
  targetKind: TargetKind
  targetProductId: number | null
  targetLabelOptionId: number | null
}

const tiers = defineModel<DiscountTierForm[]>('tiers', { required: true })

const props = defineProps<{
  thresholdKind: ThresholdKind
  qualifierItems: TierQualifierItem[]
  errors: string[]
  isView: boolean
}>()

const { t } = useI18n()

const discountTypeOptions = computed(() => [
  { label: t('promotions.labels.discountTypes.flat'), value: 'flat' },
  { label: t('promotions.labels.discountTypes.percentage'), value: 'percentage' },
])

const targetOptions = computed(() => [
  { label: t('promotions.labels.wholeInvoice'), value: 'invoice' },
  ...props.qualifierItems.map((qi) => ({
    label: qi.label,
    value: `${qi.kind}:${qi.id}`,
  })),
])

function tierTargetKey(tier: DiscountTierForm): string {
  if (tier.targetKind === 'product') return `product:${tier.targetProductId}`
  if (tier.targetKind === 'label') return `label:${tier.targetLabelOptionId}`
  return 'invoice'
}

function tierTargetLabel(tier: DiscountTierForm): string {
  if (tier.targetKind === 'invoice') return t('promotions.labels.wholeInvoice')
  const opt = targetOptions.value.find((o) => o.value === tierTargetKey(tier))
  return opt?.label ?? tierTargetKey(tier)
}

function onTargetChange(tier: DiscountTierForm, value: string) {
  if (value === 'invoice') {
    tier.targetKind = 'invoice'
    tier.targetProductId = null
    tier.targetLabelOptionId = null
  } else if (value.startsWith('product:')) {
    tier.targetKind = 'product'
    tier.targetProductId = Number(value.slice('product:'.length))
    tier.targetLabelOptionId = null
  } else if (value.startsWith('label:')) {
    tier.targetKind = 'label'
    tier.targetProductId = null
    tier.targetLabelOptionId = Number(value.slice('label:'.length))
  }
}

function addTier() {
  tiers.value.push({
    threshold: '',
    discountType: '',
    value: '',
    isMultiplicative: false,
    targetKind: 'invoice',
    targetProductId: null,
    targetLabelOptionId: null,
  })
}

function removeTier(index: number) {
  tiers.value.splice(index, 1)
}
</script>
