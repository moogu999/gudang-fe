<template>
  <div class="flex flex-col gap-2">
    <DataTable :value="options" data-key="clientKey" class="text-sm" @row-reorder="onRowReorder">
      <Column v-if="!disabled" row-reorder style="width: 3rem" :reorderable-column="false" />
      <Column :header="t('surveys.questions.optionLabel')">
        <template #body="{ data }">
          <InputText
            :model-value="data.label"
            maxlength="100"
            :disabled="disabled"
            :invalid="!data.label.trim()"
            class="w-full"
            data-testid="option-label"
            @update:model-value="(v: string | undefined) => setLabel(data, v ?? '')"
          />
        </template>
      </Column>
      <Column v-if="!disabled" style="width: 3rem">
        <template #body="{ data }">
          <Button
            type="button"
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            :aria-label="t('common.actions.delete')"
            data-testid="option-remove"
            @click="remove(data)"
          />
        </template>
      </Column>
    </DataTable>

    <div v-if="!disabled" class="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        :label="t('surveys.questions.addOption')"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        size="small"
        :disabled="options.length >= MAX_OPTIONS"
        data-testid="option-add"
        @click="add"
      />
    </div>
    <div class="flex items-center gap-2">
      <ToggleSwitch
        :model-value="question.choiceAllowOther ?? false"
        :disabled="disabled"
        :input-id="`other-${question.clientKey}`"
        @update:model-value="(v: boolean) => (question = { ...question, choiceAllowOther: v })"
      />
      <label :for="`other-${question.clientKey}`" class="text-sm">{{
        t('surveys.questions.allowOther')
      }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import type { SurveyQuestion, SurveyQuestionOption } from '@/types/survey.type'
import { MAX_OPTIONS, newOption } from '../../surveyHelpers'

defineProps<{ disabled?: boolean }>()
const question = defineModel<SurveyQuestion>('question', { required: true })

const { t } = useI18n()

const options = computed(() => question.value.options ?? [])

function setOptions(next: SurveyQuestionOption[]) {
  question.value = { ...question.value, options: next }
}

function setLabel(option: SurveyQuestionOption, label: string) {
  setOptions(options.value.map((o) => (o.clientKey === option.clientKey ? { ...o, label } : o)))
}

function add() {
  setOptions([...options.value, newOption()])
}

function remove(option: SurveyQuestionOption) {
  setOptions(options.value.filter((o) => o.clientKey !== option.clientKey))
}

function onRowReorder(event: DataTableRowReorderEvent) {
  setOptions(event.value as SurveyQuestionOption[])
}
</script>
