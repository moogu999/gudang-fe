<template>
  <button
    type="button"
    class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors"
    :class="
      selected
        ? 'border-primary-500 bg-primary-50 text-primary-700'
        : 'border-stone-200 bg-white text-stone-600 hover:border-primary-300'
    "
    @click="$emit('select')"
  >
    <i :class="[icon, 'text-2xl']" />
    <span>{{ name }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  icon?: string
  selected: boolean
}>()

defineEmits<{
  select: []
}>()
</script>
