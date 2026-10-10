<template>
  <button
    type="button"
    :aria-pressed="active"
    class="flex min-w-32 flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2"
    :class="[active ? tone.active : 'border-stone-200 bg-white hover:bg-stone-50', tone.focus]"
    data-testid="stat-filter-card"
    @click="emit('toggle')"
  >
    <span class="text-xl font-semibold sm:text-2xl" :class="tone.count">{{ count }}</span>
    <span class="text-xs text-stone-600 sm:text-sm">{{ label }}</span>
  </button>
</template>

<script lang="ts">
export type StatFilterSeverity = 'success' | 'warn' | 'danger' | 'secondary' | 'info'
</script>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * A count that doubles as a quick filter: click to filter the list by it, click
 * again to clear. The host page owns which card is active, so only one is.
 */
const props = withDefaults(
  defineProps<{
    count: number
    label: string
    severity?: StatFilterSeverity
    active?: boolean
  }>(),
  { severity: 'secondary', active: false },
)

const emit = defineEmits<{ toggle: [] }>()

const TONES: Record<StatFilterSeverity, { count: string; active: string; focus: string }> = {
  success: {
    count: 'text-green-700',
    active: 'border-green-500 bg-green-50 ring-1 ring-green-500',
    focus: 'focus-visible:ring-green-500',
  },
  warn: {
    count: 'text-amber-700',
    active: 'border-amber-500 bg-amber-50 ring-1 ring-amber-500',
    focus: 'focus-visible:ring-amber-500',
  },
  danger: {
    count: 'text-red-700',
    active: 'border-red-500 bg-red-50 ring-1 ring-red-500',
    focus: 'focus-visible:ring-red-500',
  },
  info: {
    count: 'text-sky-700',
    active: 'border-sky-500 bg-sky-50 ring-1 ring-sky-500',
    focus: 'focus-visible:ring-sky-500',
  },
  secondary: {
    count: 'text-stone-700',
    active: 'border-stone-500 bg-stone-100 ring-1 ring-stone-500',
    focus: 'focus-visible:ring-stone-500',
  },
}

const tone = computed(() => TONES[props.severity])
</script>
