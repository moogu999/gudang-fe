<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('surveys.questions.numberMin') }}</label>
      <InputNumber
        :model-value="toNumber(question.numberMin)"
        :disabled="disabled"
        :use-grouping="false"
        :max-fraction-digits="4"
        :placeholder="t('surveys.questions.noLimit')"
        input-class="w-full"
        class="w-full"
        data-testid="number-min"
        @update:model-value="(v: number | null) => set('numberMin', v)"
      />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('surveys.questions.numberMax') }}</label>
      <InputNumber
        :model-value="toNumber(question.numberMax)"
        :disabled="disabled"
        :use-grouping="false"
        :max-fraction-digits="4"
        :placeholder="t('surveys.questions.noLimit')"
        input-class="w-full"
        class="w-full"
        data-testid="number-max"
        @update:model-value="(v: number | null) => set('numberMax', v)"
      />
    </div>
    <div class="flex items-center gap-2 md:mt-6">
      <ToggleSwitch
        :model-value="question.numberAllowDecimal ?? false"
        :disabled="disabled"
        :input-id="`dec-${question.clientKey}`"
        @update:model-value="(v: boolean) => (question = { ...question, numberAllowDecimal: v })"
      />
      <label :for="`dec-${question.clientKey}`" class="text-sm">{{
        t('surveys.questions.allowDecimal')
      }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import type { SurveyQuestion } from '@/types/survey.type'

defineProps<{ disabled?: boolean }>()
const question = defineModel<SurveyQuestion>('question', { required: true })

const { t } = useI18n()

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Decimals travel as strings; an emptied field is left out. */
function set(field: 'numberMin' | 'numberMax', value: number | null) {
  const next = { ...question.value }
  if (value === null) delete next[field]
  else next[field] = String(value)
  question.value = next
}
</script>
