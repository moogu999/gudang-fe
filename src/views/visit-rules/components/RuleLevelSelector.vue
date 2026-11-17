<template>
  <SelectButton
    :model-value="local"
    :options="options"
    option-label="label"
    option-value="value"
    option-disabled="disabled"
    :allow-empty="false"
    :disabled="disabled"
    size="small"
    @update:model-value="onChange"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectButton from 'primevue/selectbutton'
import type { VisitRuleLevel, VisitRuleStyle } from '@/types/visitRule.type'
import { LEVELS, levelLabelKey } from '../visitRuleHelpers'

const props = defineProps<{
  modelValue: VisitRuleLevel
  levelStyle: VisitRuleStyle
  allowedLevels: VisitRuleLevel[]
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [level: VisitRuleLevel] }>()

const { t } = useI18n()

// Local ref: a SelectButton does not repaint when its value is written from outside.
const local = ref<VisitRuleLevel>(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (local.value = v),
)

const options = computed(() =>
  LEVELS.map((level) => ({
    value: level,
    label: t(levelLabelKey(props.levelStyle, level)),
    disabled: !props.allowedLevels.includes(level),
  })),
)

function onChange(level: VisitRuleLevel | null) {
  if (!level) return
  local.value = level
  emit('update:modelValue', level)
}
</script>
