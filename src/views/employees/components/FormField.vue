<template>
  <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
    <label :for="name" class="w-full text-sm font-semibold sm:text-base md:w-40">
      {{ label }}
      <span v-if="required" class="ml-0.5 text-red-500">*</span>
      <span v-else-if="optional" class="ml-1 text-xs font-normal text-stone-400">
        {{ t('employees.labels.optional') }}
      </span>
    </label>
    <div class="flex w-full flex-col gap-1">
      <slot />
      <Message v-if="form[name]?.invalid" severity="error" size="small" variant="simple">
        {{ form[name]?.error?.message }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Message from 'primevue/message'

defineProps<{
  name: string
  label: string
  required?: boolean
  optional?: boolean
  form: Record<string, { invalid?: boolean; error?: { message?: string } }>
}>()

const { t } = useI18n()
</script>
