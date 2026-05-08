<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">{{
        t('promotions.fields.voucherTiers')
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

    <small v-if="thresholdError" class="mb-1 block text-red-500">{{ thresholdError }}</small>

    <div v-if="tiers.length === 0" class="rounded border p-3 text-center text-sm text-gray-500">
      {{ t('table.noItems') }}
    </div>

    <DataTable v-else :value="tiers" size="small">
      <Column
        :header="
          measureKind === 'total_qty'
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
      <Column :header="t('promotions.fields.voucherDiscountType')" style="width: 10rem">
        <template #body="{ data: tier }">
          <Select
            v-if="!isView"
            v-model="tier.voucherDiscountType"
            :options="discountTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            size="small"
          />
          <span v-else>
            {{
              tier.voucherDiscountType
                ? t(`promotions.labels.discountTypes.${tier.voucherDiscountType}`)
                : '—'
            }}
          </span>
        </template>
      </Column>
      <Column :header="t('promotions.fields.voucherValue')" style="width: 10rem">
        <template #body="{ data: tier, index }">
          <div class="flex flex-col gap-1">
            <InputText
              v-if="!isView"
              v-model="tier.voucherValue"
              size="small"
              class="w-full"
              :class="{ 'p-invalid': errors[index] }"
              autocomplete="off"
            />
            <span v-else>{{ tier.voucherValue }}</span>
            <small v-if="errors[index]" class="text-red-500">{{ errors[index] }}</small>
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
import type { MeasureKind, DiscountType } from '@/types/promotion.type'

export interface VoucherTierForm {
  threshold: string
  voucherDiscountType: DiscountType | ''
  voucherValue: string
}

const tiers = defineModel<VoucherTierForm[]>('tiers', { required: true })

defineProps<{
  measureKind: MeasureKind | ''
  errors: string[]
  thresholdError?: string
  isView: boolean
}>()

const { t } = useI18n()

const discountTypeOptions = computed(() => [
  { label: t('promotions.labels.discountTypes.flat'), value: 'flat' },
  { label: t('promotions.labels.discountTypes.percentage'), value: 'percentage' },
])

function addTier() {
  tiers.value.push({ threshold: '', voucherDiscountType: '', voucherValue: '' })
}

function removeTier(index: number) {
  tiers.value.splice(index, 1)
}
</script>
