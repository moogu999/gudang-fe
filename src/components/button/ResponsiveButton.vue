<template>
  <Button
    :label="isMobile ? undefined : label"
    :icon="icon"
    @click="onClick"
    :aria-label="ariaLabel || label"
    :severity="severity"
    :text="text"
    :outlined="outlined"
    :rounded="rounded"
    :disabled="disabled"
    :size="buttonSize"
    class="min-h-[44px] sm:min-h-0"
  />
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useResponsiveSize } from '@/composables'

interface Props {
  label: string
  icon?: string
  ariaLabel?: string
  severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | undefined
  text?: boolean
  outlined?: boolean
  rounded?: boolean
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  icon: 'pi pi-plus',
  text: false,
  outlined: false,
  rounded: false,
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const { isMobile, buttonSize } = useResponsiveSize()

function onClick(event: MouseEvent) {
  emit('click', event)
}
</script>
