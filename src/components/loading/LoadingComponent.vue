<template>
  <div class="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-white/50">
    <ProgressSpinner :style="{ width: size, height: size }" strokeWidth="3" />
    <span class="mt-2 text-sm text-gray-600">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import ProgressSpinner from 'primevue/progressspinner'

defineProps({
  message: { type: String, default: 'Loading...' },
  size: { type: String, default: '2rem' },
})
</script>
