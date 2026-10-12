<template>
  <div
    :id="`question-${question.clientKey}`"
    class="rounded-lg border p-4"
    :class="highlighted ? 'border-red-400 bg-red-50' : 'border-stone-200'"
    data-testid="question-card"
  >
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span
        class="bg-primary-100 flex size-7 items-center justify-center rounded-full text-sm font-semibold"
      >
        {{ index + 1 }}
      </span>
      <Tag :value="t(`surveys.questionTypes.${question.type}`)" severity="secondary" />
      <div class="ml-auto flex items-center gap-1">
        <template v-if="!contentLocked && !readonly">
          <Button
            type="button"
            icon="pi pi-arrow-up"
            severity="secondary"
            text
            rounded
            size="small"
            :disabled="index === 0"
            :aria-label="t('surveys.questions.moveUp')"
            data-testid="question-up"
            @click="emit('move', -1)"
          />
          <Button
            type="button"
            icon="pi pi-arrow-down"
            severity="secondary"
            text
            rounded
            size="small"
            :disabled="index === total - 1"
            :aria-label="t('surveys.questions.moveDown')"
            data-testid="question-down"
            @click="emit('move', 1)"
          />
          <Button
            type="button"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            :aria-label="t('common.actions.delete')"
            data-testid="question-remove"
            @click="emit('remove')"
          />
        </template>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">
          {{ t('surveys.questions.text') }}<span class="ml-0.5 text-red-500">*</span>
        </label>
        <Textarea
          :model-value="question.text"
          rows="2"
          maxlength="300"
          auto-resize
          :disabled="contentDisabled"
          :invalid="errors.includes('surveys.validation.questionTextRequired')"
          class="w-full"
          data-testid="question-text"
          @update:model-value="
            (v: string | undefined) => (question = { ...question, text: v ?? '' })
          "
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('surveys.questions.helpText') }}</label>
        <InputText
          :model-value="question.helpText ?? ''"
          maxlength="300"
          :disabled="readonly"
          class="w-full"
          data-testid="question-help"
          @update:model-value="(v: string | undefined) => (question = { ...question, helpText: v })"
        />
      </div>

      <div class="flex items-center gap-2">
        <ToggleSwitch
          :model-value="question.isRequired"
          :disabled="contentDisabled"
          :input-id="`req-${question.clientKey}`"
          data-testid="question-required"
          @update:model-value="(v: boolean) => (question = { ...question, isRequired: v })"
        />
        <label :for="`req-${question.clientKey}`" class="text-sm">{{
          t('surveys.questions.required')
        }}</label>
      </div>

      <NumberQuestionEditor
        v-if="question.type === 'number'"
        v-model:question="question"
        :disabled="contentDisabled"
      />
      <ChoiceQuestionEditor
        v-else-if="question.type === 'single_choice' || question.type === 'multi_choice'"
        v-model:question="question"
        :disabled="contentDisabled"
      />
      <PhotoQuestionEditor
        v-else-if="question.type === 'photo'"
        v-model:question="question"
        :disabled="contentDisabled"
      />
      <CompetitorGridEditor
        v-else-if="question.type === 'competitor_grid'"
        v-model:question="question"
        :disabled="contentDisabled"
        :readonly="readonly"
        :toast-group="toastGroup"
        @loaded="(products) => emit('gridLoaded', products)"
      />

      <ul
        v-if="errors.length"
        class="list-disc pl-5 text-sm text-red-500"
        data-testid="question-errors"
      >
        <li v-for="key in errors" :key="key">{{ t(key) }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import type { SurveyGridProduct, SurveyQuestion } from '@/types/survey.type'
import ChoiceQuestionEditor from './question-editors/ChoiceQuestionEditor.vue'
import CompetitorGridEditor from './question-editors/CompetitorGridEditor.vue'
import NumberQuestionEditor from './question-editors/NumberQuestionEditor.vue'
import PhotoQuestionEditor from './question-editors/PhotoQuestionEditor.vue'

const props = defineProps<{
  index: number
  total: number
  /** Questions are locked after publish; only help text can change. */
  contentLocked?: boolean
  /** Nothing can change. */
  readonly?: boolean
  errors: string[]
  highlighted?: boolean
  toastGroup: string
}>()

const question = defineModel<SurveyQuestion>('question', { required: true })

const emit = defineEmits<{
  move: [delta: -1 | 1]
  remove: []
  gridLoaded: [products: SurveyGridProduct[]]
}>()

const { t } = useI18n()

const contentDisabled = computed(() => props.readonly || props.contentLocked)
</script>
