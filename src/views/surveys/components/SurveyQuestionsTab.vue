<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-4">
        <div>
          <h2 class="text-base font-semibold">
            {{ t('surveys.questions.title', { n: questions.length }) }}
          </h2>
          <p class="text-sm text-stone-500">{{ t('surveys.questions.subtitle') }}</p>
        </div>

        <Message v-if="contentLocked && !readonly" severity="info" size="small" variant="simple">
          {{ t('surveys.questions.lockedBanner') }}
        </Message>
        <Message v-else-if="!readonly" severity="secondary" size="small" variant="simple">
          {{ t('surveys.questions.noLogic') }}
        </Message>

        <!-- Palette -->
        <div v-if="canEditContent" class="flex flex-wrap items-center gap-2" data-testid="palette">
          <span class="text-sm font-semibold">{{ t('surveys.questions.add') }}</span>
          <Button
            v-for="type in QUESTION_TYPES"
            :key="type"
            type="button"
            :label="t(`surveys.questionTypes.${type}`)"
            severity="secondary"
            outlined
            size="small"
            :disabled="isTypeDisabled(type)"
            :data-testid="`add-${type}`"
            @click="add(type)"
          />
        </div>
        <small v-if="canEditContent && questions.length >= MAX_QUESTIONS" class="text-red-500">
          {{ t('surveys.validation.tooManyQuestions') }}
        </small>

        <div v-if="questions.length === 0" class="py-6 text-center text-stone-500">
          {{ t('surveys.questions.empty') }}
        </div>

        <div class="flex flex-col gap-4">
          <SurveyQuestionCard
            v-for="(q, i) in questions"
            :key="q.clientKey"
            :question="q"
            :index="i"
            :total="questions.length"
            :content-locked="contentLocked"
            :readonly="readonly"
            :errors="errors[q.clientKey] ?? []"
            :highlighted="highlightKey === q.clientKey"
            :toast-group="toastGroup"
            @update:question="(next) => replace(i, next)"
            @move="(delta) => (questions = moveItem(questions, i, delta))"
            @remove="onRemove(i)"
            @grid-loaded="(products) => emit('gridLoaded', q.clientKey, products)"
          />
        </div>

        <small v-if="errors._?.length" class="text-red-500">
          <span v-for="key in errors._" :key="key" class="block">{{ t(key) }}</span>
        </small>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import type { SurveyGridProduct, SurveyQuestion, SurveyQuestionType } from '@/types/survey.type'
import {
  MAX_GRID_QUESTIONS,
  MAX_QUESTIONS,
  QUESTION_TYPES,
  moveItem,
  newQuestion,
} from '../surveyHelpers'
import SurveyQuestionCard from './SurveyQuestionCard.vue'

const props = defineProps<{
  /** Questions can't change; only help text. */
  contentLocked?: boolean
  readonly?: boolean
  /** i18n keys of what is wrong, per question client key (and `_` for the document). */
  errors: Record<string, string[]>
  highlightKey?: string
  toastGroup: string
  confirmGroup: string
}>()

const questions = defineModel<SurveyQuestion[]>('questions', { required: true })

const emit = defineEmits<{ gridLoaded: [clientKey: string, products: SurveyGridProduct[]] }>()

const { t } = useI18n()
const confirm = useConfirm()

const canEditContent = computed(() => !props.readonly && !props.contentLocked)
const gridCount = computed(() => questions.value.filter((q) => q.type === 'competitor_grid').length)

function isTypeDisabled(type: SurveyQuestionType): boolean {
  if (questions.value.length >= MAX_QUESTIONS) return true
  return type === 'competitor_grid' && gridCount.value >= MAX_GRID_QUESTIONS
}

function add(type: SurveyQuestionType) {
  const question = newQuestion(type)
  questions.value = [...questions.value, question]
  // After the card renders.
  setTimeout(
    () =>
      document
        .getElementById(`question-${question.clientKey}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    50,
  )
}

function replace(index: number, next: SurveyQuestion) {
  questions.value = questions.value.map((q, i) => (i === index ? next : q))
}

function remove(index: number) {
  questions.value = questions.value.filter((_, i) => i !== index)
}

function onRemove(index: number) {
  const q = questions.value[index]
  if (!q.text.trim()) {
    remove(index)
    return
  }
  confirm.require({
    group: props.confirmGroup,
    header: t('surveys.questions.removeHeader'),
    message: t('surveys.questions.removeConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('surveys.actions.delete'), severity: 'danger' },
    accept: () => remove(index),
  })
}
</script>
