<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-1 md:max-w-48">
      <label class="text-sm font-semibold">{{ t('surveys.questions.photoMax') }}</label>
      <InputNumber
        :model-value="question.photoMax ?? null"
        :min="1"
        :max="MAX_PHOTOS"
        :disabled="disabled"
        show-buttons
        input-class="w-full"
        class="w-full"
        data-testid="photo-max"
        @update:model-value="
          (v: number | null) => (question = { ...question, photoMax: v ?? undefined })
        "
      />
    </div>
    <small class="text-surface-500">{{ t('surveys.questions.photoNote') }}</small>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import type { SurveyQuestion } from '@/types/survey.type'
import { MAX_PHOTOS } from '../../surveyHelpers'

defineProps<{ disabled?: boolean }>()
const question = defineModel<SurveyQuestion>('question', { required: true })

const { t } = useI18n()
</script>
