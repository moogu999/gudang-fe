<template>
  <DatePicker
    :model-value="modelValue"
    view="month"
    date-format="MM yy"
    :show-icon="true"
    :disabled="disabled"
    :invalid="invalid"
    :placeholder="placeholder"
    :show-clear="showClear"
    :input-id="inputId"
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
import DatePicker from 'primevue/datepicker'

withDefaults(
  defineProps<{
    modelValue?: Date | null
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
    showClear?: boolean
    inputId?: string
  }>(),
  {
    modelValue: null,
    disabled: false,
    invalid: false,
    placeholder: undefined,
    showClear: false,
    inputId: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: Date | null] }>()

function onUpdate(value: Date | Date[] | (Date | null)[] | null | undefined) {
  emit('update:modelValue', value instanceof Date ? value : null)
}
</script>
