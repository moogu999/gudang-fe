<template>
  <Message v-if="conflicts.length > 0" severity="warn" class="mb-3" data-testid="holiday-conflicts">
    <p class="mb-1 font-semibold">{{ t('routes.conflicts.title') }}</p>
    <ul class="list-disc pl-5 text-sm">
      <li v-for="c in conflicts" :key="`${c.routeCustomerId}-${c.date}`">
        <a class="cursor-pointer underline" @click.prevent="emit('open', c)">
          {{ t('routes.conflicts.item', { name: c.customerName, date: c.date }) }}
        </a>
      </li>
    </ul>
  </Message>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Message from 'primevue/message'
import type { HolidayConflict } from '@/types'

defineProps<{ conflicts: HolidayConflict[] }>()
const emit = defineEmits<{ open: [conflict: HolidayConflict] }>()

const { t } = useI18n()
</script>
