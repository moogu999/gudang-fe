<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <!-- Reset cycle -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('promotions.fields.resetCycle') }} *</label>
      <Select
        v-if="!isView"
        v-model="settings.resetCycle"
        :options="resetCycleOptions"
        option-label="label"
        option-value="value"
        class="w-full"
        :class="{ 'p-invalid': errors.resetCycle }"
      />
      <span v-else>
        {{ settings.resetCycle ? t(`promotions.labels.resetCycles.${settings.resetCycle}`) : '—' }}
      </span>
      <small v-if="errors.resetCycle" class="text-red-500">{{ errors.resetCycle }}</small>
    </div>

    <!-- Voucher apply on -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('promotions.fields.voucherApplyOn') }} *</label>
      <Select
        v-if="!isView"
        v-model="settings.voucherApplyOn"
        :options="voucherApplyOnOptions"
        option-label="label"
        option-value="value"
        class="w-full"
      />
      <span v-else>
        {{
          settings.voucherApplyOn
            ? t(`promotions.labels.voucherApplyOns.${settings.voucherApplyOn}`)
            : '—'
        }}
      </span>
    </div>

    <!-- Voucher validity days -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold"
        >{{ t('promotions.fields.voucherValidityDays') }} *</label
      >
      <InputNumber
        v-if="!isView"
        v-model="settings.voucherValidityDays"
        :min="1"
        :use-grouping="false"
        class="w-full"
        :class="{ 'p-invalid': errors.voucherValidityDays }"
      />
      <span v-else>{{ settings.voucherValidityDays ?? '—' }}</span>
      <small v-if="errors.voucherValidityDays" class="text-red-500">{{
        errors.voucherValidityDays
      }}</small>
    </div>

    <!-- Voucher min redeem amount -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{
        t('promotions.fields.voucherMinRedeemAmount')
      }}</label>
      <InputText
        v-if="!isView"
        v-model="settings.voucherMinRedeemAmount"
        class="w-full"
        :placeholder="t('promotions.labels.noMinimum')"
        :class="{ 'p-invalid': errors.voucherMinRedeemAmount }"
        autocomplete="off"
      />
      <span v-else>{{ settings.voucherMinRedeemAmount || '—' }}</span>
      <small v-if="errors.voucherMinRedeemAmount" class="text-red-500">{{
        errors.voucherMinRedeemAmount
      }}</small>
    </div>

    <!-- Voucher stackable -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('promotions.fields.voucherStackable') }}</label>
      <div class="flex items-center gap-2">
        <Checkbox
          v-if="!isView"
          v-model="settings.voucherStackable"
          :binary="true"
          input-id="voucherStackable"
        />
        <label v-if="!isView" for="voucherStackable" class="cursor-pointer text-sm">
          {{ t('promotions.labels.stackableHint') }}
        </label>
        <span v-else>{{
          settings.voucherStackable ? t('common.labels.yes') : t('common.labels.no')
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import type { ResetCycle, VoucherApplyOn } from '@/types/promotion.type'

export interface GroupPeriodSettingsForm {
  resetCycle: ResetCycle | ''
  voucherApplyOn: VoucherApplyOn | ''
  voucherValidityDays: number | null
  voucherMinRedeemAmount: string
  voucherStackable: boolean
}

export interface GroupPeriodSettingsErrors {
  resetCycle: string
  voucherValidityDays: string
  voucherMinRedeemAmount: string
}

const settings = defineModel<GroupPeriodSettingsForm>({ required: true })

defineProps<{
  errors: GroupPeriodSettingsErrors
  isView: boolean
}>()

const { t } = useI18n()

const resetCycleOptions = computed(() => [
  { label: t('promotions.labels.resetCycles.end_of_period'), value: 'end_of_period' },
  { label: t('promotions.labels.resetCycles.after_redemption'), value: 'after_redemption' },
  { label: t('promotions.labels.resetCycles.never'), value: 'never' },
])

const voucherApplyOnOptions = computed(() => [
  { label: t('promotions.labels.voucherApplyOns.next_transaction'), value: 'next_transaction' },
])
</script>
