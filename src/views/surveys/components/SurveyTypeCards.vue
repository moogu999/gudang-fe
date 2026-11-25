<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <button
        v-for="option in types"
        :key="option"
        type="button"
        class="rounded-lg border p-4 text-left transition-colors"
        :class="[
          type === option ? 'border-primary-500 bg-primary-50' : 'border-stone-200',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-stone-400',
          disabled && type !== option ? 'opacity-50' : '',
        ]"
        :disabled="disabled"
        :data-testid="`type-${option}`"
        @click="type = option"
      >
        <span class="block font-semibold">{{ t(`surveys.types.${option}`) }}</span>
        <span class="mt-1 block text-sm text-stone-600">{{
          t(`surveys.typeCards.${option}`)
        }}</span>
      </button>
    </div>
    <small v-if="disabled" class="text-surface-500">{{ t('surveys.typeCards.locked') }}</small>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SurveyType } from '@/types/survey.type'

defineProps<{ disabled?: boolean }>()
const type = defineModel<SurveyType>('type', { required: true })

const { t } = useI18n()
const types: SurveyType[] = ['regular', 'stock_check']
</script>
