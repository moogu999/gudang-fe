<template>
  <div class="flex flex-wrap gap-1" role="group" data-testid="weekday-chips">
    <template v-for="bit in bits" :key="bit">
      <button
        v-if="!readonly"
        type="button"
        class="min-h-8 min-w-11 rounded-md border px-2 text-xs font-semibold transition-colors"
        :class="
          maskHas(modelValue, bit)
            ? 'border-[var(--p-primary-500)] bg-[var(--p-primary-500)] text-white'
            : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-100'
        "
        :aria-pressed="maskHas(modelValue, bit)"
        :disabled="disabled"
        :data-testid="`weekday-${bit}`"
        @click="emit('update:modelValue', maskToggle(modelValue, bit))"
      >
        {{ t(`calendar.weekdaysShort.${bit}`) }}
      </button>
      <span
        v-else-if="maskHas(modelValue, bit)"
        class="bg-[var(--p-primary-50)] text-[var(--p-primary-700)] rounded px-1.5 py-0.5 text-xs font-semibold"
      >
        {{ t(`calendar.weekdaysShort.${bit}`) }}
      </span>
    </template>
    <span v-if="readonly && modelValue === 0" class="text-stone-400">—</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { maskHas, maskToggle } from '@/utils/visitCycle'

const props = withDefaults(
  defineProps<{
    /** Days mask: bit 0 = Monday ... bit 6 = Sunday. */
    modelValue: number
    /** Show Sunday as well; hidden unless the branch allows it. */
    allowSunday?: boolean
    readonly?: boolean
    disabled?: boolean
  }>(),
  { allowSunday: false, readonly: false, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [mask: number] }>()

const { t } = useI18n()

// A read-only view still shows Sunday when the mask has it, e.g. after the branch stopped allowing it.
const bits = computed(() => {
  const days = [0, 1, 2, 3, 4, 5]
  return props.allowSunday || maskHas(props.modelValue, 6) ? [...days, 6] : days
})
</script>
