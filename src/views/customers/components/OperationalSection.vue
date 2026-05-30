<template>
  <div class="flex flex-col gap-3">
    <DayHoursRow
      v-for="(row, idx) in modelValue"
      :key="row.dayOfWeek"
      :model-value="row"
      :disabled="disabled"
      @update:model-value="onRowUpdate(idx, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import DayHoursRow from './DayHoursRow.vue'
import type { CustomerOperatingHour } from '@/types/customer.type'

interface Props {
  modelValue: CustomerOperatingHour[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })

const emit = defineEmits<{
  'update:modelValue': [value: CustomerOperatingHour[]]
}>()

function onRowUpdate(idx: number, val: CustomerOperatingHour) {
  const updated = [...props.modelValue]
  updated[idx] = val
  emit('update:modelValue', updated)
}
</script>
