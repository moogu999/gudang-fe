<template>
  <div class="w-full max-w-sm" data-testid="month-calendar">
    <div class="mb-2 flex items-center justify-between">
      <Button
        type="button"
        icon="pi pi-chevron-left"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('calendar.previousMonth')"
        @click="emit('update:month', addMonths(month, -1))"
      />
      <span class="text-sm font-semibold">{{ title }}</span>
      <Button
        type="button"
        icon="pi pi-chevron-right"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('calendar.nextMonth')"
        @click="emit('update:month', addMonths(month, 1))"
      />
    </div>

    <div class="grid grid-cols-7 gap-1 text-center">
      <span
        v-for="bit in 7"
        :key="`h${bit}`"
        class="text-xs font-semibold text-stone-500 uppercase"
      >
        {{ t(`calendar.weekdaysShort.${bit - 1}`) }}
      </span>

      <span v-for="n in leadingBlanks" :key="`b${n}`" />

      <button
        v-for="date in dates"
        :key="date"
        type="button"
        class="aspect-square min-h-9 rounded-md border text-sm transition-colors"
        :class="cellClass(date)"
        :disabled="readonly || isDisabled(date)"
        :aria-pressed="selectedSet.has(date)"
        :title="decorations?.(date)?.title"
        :data-date="date"
        :data-testid="`day-${date}`"
        @click="emit('toggle', date)"
      >
        {{ Number(date.slice(8)) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import { addMonths, datesOfMonth, weekdayBit, type IsoDate } from '@/utils/visitCycle'

export interface DayDecoration {
  /** Tooltip, e.g. the holiday's name. */
  title?: string
  /** Shaded and not selectable on its own, like a holiday. */
  tone?: 'holiday' | 'muted'
}

const props = withDefaults(
  defineProps<{
    /** `YYYY-MM`. */
    month: string
    selected?: IsoDate[]
    disabled?: (date: IsoDate) => boolean
    decorations?: (date: IsoDate) => DayDecoration | undefined
    readonly?: boolean
  }>(),
  { selected: () => [], disabled: undefined, decorations: undefined, readonly: false },
)

const emit = defineEmits<{
  toggle: [date: IsoDate]
  'update:month': [month: string]
}>()

const { t } = useI18n()

const dates = computed(() => datesOfMonth(props.month))
const selectedSet = computed(() => new Set(props.selected))
const leadingBlanks = computed(() => weekdayBit(`${props.month}-01`))
const title = computed(() => dayjs(`${props.month}-01`).format('MMMM YYYY'))

function isDisabled(date: IsoDate): boolean {
  return props.disabled?.(date) ?? false
}

function cellClass(date: IsoDate): string {
  if (selectedSet.value.has(date)) return 'border-[var(--p-primary-500)] bg-[var(--p-primary-500)] font-semibold text-white'
  const tone = props.decorations?.(date)?.tone
  if (tone === 'holiday') return 'border-red-200 bg-red-50 text-red-500'
  if (isDisabled(date) || tone === 'muted') return 'border-transparent bg-stone-50 text-stone-300'
  return 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
}
</script>
