<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div v-if="isLoadingDefinitions" class="flex justify-center p-4">
      <i class="pi pi-spinner pi-spin text-2xl" />
    </div>

    <div v-else-if="definitions.length === 0" class="py-4 text-center text-sm text-gray-500">
      {{ t('customers.labels.noDefinitions') }}
    </div>

    <div v-else>
      <div
        v-for="def in definitions"
        :key="def.id"
        class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
      >
        <label class="w-full text-sm font-semibold sm:text-base md:w-32">{{ def.name }}</label>
        <div class="w-full flex-auto">
          <Select
            v-model="assignments[def.id]"
            :options="optionsByDefinition[def.id] ?? []"
            option-label="value"
            option-value="id"
            :placeholder="t('customers.labels.selectOption')"
            show-clear
            class="w-full"
          />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isSubmitting"
          @click="emits('close')"
        />
        <Button
          :label="!isSubmitting ? t('common.actions.save') : ''"
          :icon="!isSubmitting ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isSubmitting"
          @click="onSave"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onBeforeMount, type PropType } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import {
  CustomerLabelDefinitionsService,
  CustomerLabelOptionsService,
  CustomersService,
  GenericQueryBuilder,
} from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { FilterOperator } from '@/constants'
import type { CustomerLabelDefinition, CustomerLabelOption, CustomerLabelValue } from '@/types'

const { t } = useI18n()
const toast = useToast()
const toastGroup = 'customerSetLabelsDialog'

const props = defineProps({
  customerId: {
    type: Number,
    required: true,
  },
  currentLabels: {
    type: Array as PropType<CustomerLabelValue[]>,
    default: () => [],
  },
})

const emits = defineEmits(['close'])

const definitions = ref<CustomerLabelDefinition[]>([])
const optionsByDefinition = reactive<Record<number, CustomerLabelOption[]>>({})
const assignments = reactive<Record<number, number | undefined>>({})
const isLoadingDefinitions = ref(false)
const isSubmitting = ref(false)

onBeforeMount(async () => {
  await loadDefinitions()

  for (const label of props.currentLabels) {
    assignments[label.labelDefinitionId] = label.labelOptionId
  }
})

async function loadDefinitions() {
  isLoadingDefinitions.value = true
  try {
    const query = new GenericQueryBuilder().withSort('id', 'asc').build()
    const response = await CustomerLabelDefinitionsService.list(query)
    definitions.value = response.data

    await Promise.all(
      definitions.value.map(async (def) => {
        const q = new GenericQueryBuilder()
          .withFilter('customer_label_definition_id', FilterOperator.EQUAL, def.id)
          .build()
        const optResponse = await CustomerLabelOptionsService.list(q)
        optionsByDefinition[def.id] = optResponse.data
      }),
    )
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingDefinitions.value = false
  }
}

async function onSave() {
  isSubmitting.value = true
  try {
    const labels = definitions.value
      .filter((def) => assignments[def.id] !== undefined && assignments[def.id] !== null)
      .map((def) => ({
        labelDefinitionId: def.id,
        labelOptionId: assignments[def.id] as number,
      }))

    await CustomersService.setLabels(props.customerId, labels)
    toast.add(commonSuccessToast(t('customers.labels.labelsUpdated'), toastGroup))
    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSubmitting.value = false
  }
}
</script>
