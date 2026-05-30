<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
    <!-- Day label -->
    <div class="w-20 shrink-0 text-sm font-medium">{{ dayLabel }}</div>

    <!-- Open/Closed toggle -->
    <div class="flex items-center gap-2">
      <ToggleSwitch
        :model-value="!modelValue.isClosed"
        :disabled="disabled"
        @update:model-value="onToggleChange"
      />
      <span class="text-sm" :class="modelValue.isClosed ? 'text-stone-400' : 'text-green-600'">
        {{ modelValue.isClosed ? t('customers.operationalHours.closed') : t('customers.operationalHours.open') }}
      </span>
    </div>

    <template v-if="!modelValue.isClosed">
      <!-- Open hours -->
      <div class="flex items-center gap-1">
        <span class="text-xs text-stone-400">{{ t('customers.operationalHours.open') }}</span>
        <InputText
          :model-value="modelValue.openStart ?? ''"
          type="time"
          class="w-28 text-sm"
          :disabled="disabled"
          @update:model-value="onField('openStart', $event as string)"
        />
        <span class="text-stone-400">–</span>
        <InputText
          :model-value="modelValue.openEnd ?? ''"
          type="time"
          class="w-28 text-sm"
          :disabled="disabled"
          @update:model-value="onField('openEnd', $event as string)"
        />
      </div>

      <!-- Receiving hours -->
      <div class="flex items-center gap-1">
        <span class="text-xs text-stone-400">{{ t('customers.operationalHours.receiving') }}</span>
        <InputText
          :model-value="modelValue.receivingStart ?? ''"
          type="time"
          class="w-28 text-sm"
          :disabled="disabled"
          @update:model-value="onField('receivingStart', $event as string)"
        />
        <span class="text-stone-400">–</span>
        <InputText
          :model-value="modelValue.receivingEnd ?? ''"
          type="time"
          class="w-28 text-sm"
          :disabled="disabled"
          @update:model-value="onField('receivingEnd', $event as string)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import type { CustomerOperatingHour } from '@/types/customer.type'

const { t } = useI18n()

const DAY_LABELS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

interface Props {
  modelValue: CustomerOperatingHour
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })

const emit = defineEmits<{
  'update:modelValue': [value: CustomerOperatingHour]
}>()

const dayLabel = computed(() => DAY_LABELS[props.modelValue.dayOfWeek] ?? '')

function onToggleChange(isOpen: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    isClosed: !isOpen,
    openStart: isOpen ? props.modelValue.openStart : undefined,
    openEnd: isOpen ? props.modelValue.openEnd : undefined,
    receivingStart: isOpen ? props.modelValue.receivingStart : undefined,
    receivingEnd: isOpen ? props.modelValue.receivingEnd : undefined,
  })
}

function onField(field: keyof CustomerOperatingHour, val: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: val || undefined })
}
</script>
