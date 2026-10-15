<template>
  <div data-testid="load-grid">
    <table class="w-full table-fixed border-separate border-spacing-1 text-center text-xs">
      <thead>
        <tr>
          <th class="w-9" />
          <th v-for="bit in bits" :key="bit" class="font-semibold text-stone-500">
            {{ t(`calendar.weekdaysShort.${bit}`) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, week) in grid" :key="week">
          <th
            class="text-left"
            :class="week + 1 === currentWeek ? 'font-bold text-stone-900' : 'font-semibold text-stone-500'"
          >
            W{{ week + 1 }}
          </th>
          <td v-for="bit in bits" :key="bit">
            <button
              type="button"
              class="h-8 w-full rounded border text-xs font-semibold"
              :class="cellClass(row[bit] ?? 0, week + 1, bit)"
              :title="cellTitle(row[bit] ?? 0)"
              :data-testid="`load-${week + 1}-${bit}`"
              @click="emit('select', { week: week + 1, bit })"
            >
              {{ row[bit] ?? 0 }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="customLine" class="mt-2 text-xs text-stone-600">{{ customLine }}</p>
    <p class="mt-1 text-xs text-stone-500">{{ t('routes.load.note') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { LoadResponse } from '@/types'

const props = defineProps<{
  load: LoadResponse | null
  /** The cycle week of today, shown in bold. */
  currentWeek: number
  selected: { week: number; bit: number }
}>()
const emit = defineEmits<{ select: [cell: { week: number; bit: number }] }>()

const { t } = useI18n()

const grid = computed(() => props.load?.grid ?? [[], [], [], []])
const bits = computed(() => (props.load?.allowSunday ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5]))
const max = computed(() => props.load?.maxVisitsPerDay ?? Infinity)

const customLine = computed(() => {
  const month = dayjs().format('YYYY-MM')
  const count = props.load?.customByMonth?.[month] ?? 0
  return count > 0
    ? t('routes.load.customVisits', { n: count, month: dayjs().format('MMMM') }, count)
    : ''
})

function cellClass(value: number, week: number, bit: number): string {
  const selected = props.selected.week === week && props.selected.bit === bit
  const ring = selected ? ' ring-[var(--p-primary-500)] ring-2' : ''
  if (value === 0) return `border-stone-100 bg-stone-50 text-stone-300${ring}`
  if (value > max.value) return `border-red-300 bg-red-100 text-red-700${ring}`
  if (value >= max.value * 0.85) return `border-amber-300 bg-amber-100 text-amber-800${ring}`
  return `border-stone-200 bg-white text-stone-700${ring}`
}

function cellTitle(value: number): string {
  return value > max.value ? t('routes.load.overLimit', { max: max.value }) : ''
}
</script>
