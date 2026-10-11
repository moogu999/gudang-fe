<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-3">
        <div>
          <h2 class="text-base font-semibold">
            {{ t('displayPrograms.criteria.title', { n: criteria.length }) }}
          </h2>
          <p class="text-sm text-stone-500">{{ t('displayPrograms.criteria.subtitle') }}</p>
        </div>

        <DataTable
          :value="criteria"
          data-key="key"
          class="text-sm"
          data-testid="criteria-table"
          @row-reorder="onRowReorder"
        >
          <Column v-if="!readonly" row-reorder style="width: 3rem" :reorderable-column="false" />
          <Column header="#" style="width: 3rem">
            <template #body="{ index }">{{ index + 1 }}</template>
          </Column>
          <Column :header="t('displayPrograms.criteria.text')">
            <template #body="{ data, index }">
              <div class="flex flex-col gap-1">
                <InputText
                  v-model="data.text"
                  :maxlength="MAX_CRITERION_LENGTH"
                  :disabled="readonly"
                  :invalid="!!problems[index]"
                  class="w-full"
                  data-testid="criterion-text"
                />
                <small v-if="problems[index]" class="text-red-500">{{
                  t(`displayPrograms.criteria.errors.${problems[index]}`)
                }}</small>
              </div>
            </template>
          </Column>
          <Column v-if="!readonly" style="width: 3rem">
            <template #body="{ data }">
              <Button
                type="button"
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                size="small"
                :aria-label="t('common.actions.delete')"
                data-testid="criterion-remove"
                @click="remove(data)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">
              {{ t('displayPrograms.criteria.empty') }}
            </div>
          </template>
        </DataTable>

        <Button
          v-if="!readonly"
          type="button"
          :label="t('displayPrograms.criteria.add')"
          icon="pi pi-plus"
          severity="secondary"
          outlined
          size="small"
          class="self-start border-dashed"
          :disabled="criteria.length >= MAX_CRITERIA"
          data-testid="criterion-add"
          @click="add"
        />
        <small v-if="criteria.length >= MAX_CRITERIA && !readonly" class="text-surface-500">{{
          t('displayPrograms.criteria.max', { n: MAX_CRITERIA })
        }}</small>
        <small v-if="readonly && locked" class="text-surface-500">{{
          t('displayPrograms.locked')
        }}</small>
        <small v-if="error" class="text-red-500">{{ error }}</small>
        <small class="text-surface-500">{{ t('displayPrograms.criteria.help') }}</small>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import {
  MAX_CRITERIA,
  MAX_CRITERION_LENGTH,
  criteriaErrors,
  newCriterionKey,
  type FormCriterion,
} from '../displayProgramHelpers'

defineProps<{
  readonly?: boolean
  /** Read-only because the program is active, not because the user can't write. */
  locked?: boolean
  error?: string
}>()

const criteria = defineModel<FormCriterion[]>('criteria', { required: true })

const { t } = useI18n()

const problems = computed(() => criteriaErrors(criteria.value.map((c) => c.text)))

function onRowReorder(event: DataTableRowReorderEvent) {
  criteria.value = event.value as FormCriterion[]
}

function add() {
  criteria.value = [...criteria.value, { key: newCriterionKey(), text: '' }]
}

function remove(item: FormCriterion) {
  criteria.value = criteria.value.filter((c) => c.key !== item.key)
}
</script>
