<template>
  <div class="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-white/50">
    <ProgressSpinner :style="{ width: size, height: size }" strokeWidth="3" />
    <span class="mt-2 text-sm text-gray-600">{{ displayMessage }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressSpinner from 'primevue/progressspinner'

const { t } = useI18n()

const props = defineProps({
  message: { type: String, default: '' },
  size: { type: String, default: '2rem' },
})

const displayMessage = computed(() => props.message || t('common.messages.loading'))
</script>
