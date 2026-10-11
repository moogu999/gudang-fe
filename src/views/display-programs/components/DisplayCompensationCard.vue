<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-3">
        <div>
          <h2 class="text-base font-semibold">{{ t('displayPrograms.compensation.title') }}</h2>
          <p class="text-sm text-stone-500">{{ t('displayPrograms.compensation.subtitle') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label for="rentPerMonth" class="text-sm font-semibold">{{
              t('displayPrograms.compensation.rent')
            }}</label>
            <InputNumber
              v-model="rent"
              input-id="rentPerMonth"
              mode="decimal"
              locale="id-ID"
              prefix="Rp "
              :min="0"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              show-clear
              :disabled="readonly"
              :invalid="!!errors.rent"
              input-class="w-full"
              class="w-full"
              data-testid="rent-input"
            />
            <small v-if="errors.rent" class="text-red-500">{{ errors.rent }}</small>
          </div>

          <div class="flex flex-col gap-1">
            <label for="minComplyPct" class="text-sm font-semibold">{{
              t('displayPrograms.compensation.minComply')
            }}</label>
            <InputNumber
              v-model="minComply"
              input-id="minComplyPct"
              suffix=" %"
              :min="0"
              :max="100"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              :disabled="readonly || rent === null || rent === undefined"
              :invalid="!!errors.minComply"
              input-class="w-full"
              class="w-full"
              data-testid="min-comply-input"
            />
            <small v-if="errors.minComply" class="text-red-500">{{ errors.minComply }}</small>
          </div>
        </div>

        <small v-if="readonly && locked" class="text-surface-500">{{
          t('displayPrograms.locked')
        }}</small>
        <small class="text-surface-500">{{ t('displayPrograms.compensation.help') }}</small>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'

defineProps<{
  readonly?: boolean
  /** Read-only because the program is active, not because the user can't write. */
  locked?: boolean
  errors: { rent?: string; minComply?: string }
}>()

const rent = defineModel<number | null>('rent', { required: true })
const minComply = defineModel<number | null>('minComply', { required: true })

const { t } = useI18n()
</script>
