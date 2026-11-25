<template>
  <Dialog
    :visible="true"
    :header="customer.customer.name"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '36rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-3 text-sm text-stone-500">
      {{ route.code }} · {{ t('routes.schedule.order', { n: customer.sequence }) }}
    </p>

    <SelectButton
      v-model="mode"
      :options="modeOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      :disabled="readonly"
      class="mb-4"
      data-testid="pattern-mode"
    />

    <!-- Pattern -->
    <div v-if="mode === 'cycle'" class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('routes.schedule.days') }}</label>
        <WeekdayChips v-model="mask" :allow-sunday="config.allowSunday" :disabled="readonly" />
        <small v-if="errors.mask" class="text-red-500">{{ errors.mask }}</small>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('routes.schedule.frequency') }}</label>
          <Select
            v-model="frequency"
            :options="frequencyOptions"
            option-label="label"
            option-value="value"
            :disabled="readonly"
            class="w-56"
            data-testid="frequency-select"
          />
        </div>
        <div v-if="frequency === 'F1'" class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('routes.schedule.week') }}</label>
          <Select
            v-model="f1Week"
            :options="weekOptions"
            option-label="label"
            option-value="value"
            :disabled="readonly"
            class="w-24"
          />
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-semibold">
          {{ t('routes.schedule.result', { month: monthName }) }}
        </p>
        <MonthCalendar
          v-model:month="month"
          :selected="previewDates"
          :decorations="decorate"
          readonly
        />
        <p class="mt-2 text-xs text-stone-500">
          {{ t('routes.schedule.previewNote', { n: previewDates.length, month: monthName }, previewDates.length) }}
        </p>
      </div>
    </div>

    <!-- Custom -->
    <div v-else class="flex flex-col gap-3">
      <MonthCalendar
        v-model:month="month"
        :selected="monthDates"
        :disabled="isDateDisabled"
        :decorations="decorate"
        :readonly="readonly"
        @toggle="toggleDate"
      />
      <p class="text-xs text-stone-500">
        {{ t('routes.schedule.datesSelected', { n: monthDates.length }, monthDates.length) }}
      </p>

      <Message
        v-if="nextMonthEmpty && !readonly"
        severity="warn"
        size="small"
        data-testid="next-month-empty"
      >
        <div class="flex flex-col gap-2">
          <span>{{ t('routes.schedule.nextMonthEmpty', { month: nextMonthName }) }}</span>
          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              size="small"
              :label="t('routes.schedule.copyTo', { month: nextMonthName })"
              :disabled="!canCopy"
              data-testid="copy-to-next"
              @click="copyToNext"
            />
            <Button
              type="button"
              size="small"
              severity="secondary"
              :label="t('routes.schedule.openMonth', { month: nextMonthName })"
              @click="month = addMonths(currentMonth, 1)"
            />
          </div>
        </div>
      </Message>

      <Message v-if="copyReport" severity="info" size="small" data-testid="copy-report">
        {{ t('routes.schedule.copyReport', { copied: copyReport.copied.length }) }}
        <ul v-if="copyReport.skipped.length" class="mt-1 list-disc pl-5">
          <li v-for="(s, i) in copyReport.skipped" :key="i">
            {{ s.from }}<template v-if="s.to"> → {{ s.to }}</template>
            ({{ t(`routes.skipReason.${s.reason}`) }})
          </li>
        </ul>
      </Message>
      <p class="text-xs text-stone-500">{{ t('routes.schedule.copyNote') }}</p>
    </div>

    <Message v-if="errorText" severity="error" size="small" class="mt-3" data-testid="schedule-error">
      {{ errorText }}
    </Message>

    <template #footer>
      <Button
        :label="readonly ? t('common.actions.close') : t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        v-if="!readonly"
        :label="t('common.actions.save')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="isSaving"
        data-testid="save-schedule"
        @click="onSave"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import MonthCalendar, { type DayDecoration } from '@/components/calendar/MonthCalendar.vue'
import WeekdayChips from '@/components/calendar/WeekdayChips.vue'
import { RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { copyToNextMonth, type CopyPreview } from '@/utils/customDates'
import {
  SUNDAY_BIT,
  addMonths,
  monthOf,
  monthPreview,
  weekdayBit,
  type IsoDate,
} from '@/utils/visitCycle'
import type { Frequency, JourneyPlanConfig, PatternType, Route, RouteCustomer } from '@/types'
import { invalidCustomDates, routeErrorCode, translateRouteError } from '../routeErrors'
import { isHolidayIn, todayIso, type HolidayRange } from '../routeHelpers'

const props = defineProps<{
  route: Route
  customer: RouteCustomer
  config: JourneyPlanConfig
  holidays: HolidayRange[]
  readonly: boolean
  /** Confirmation group of the host page, for the "custom dates will be removed" question. */
  confirmGroup: string
  toastGroup: string
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()

const today = todayIso()
const currentMonth = monthOf(today)

const mode = ref<PatternType>(props.customer.patternType)
const mask = ref(props.customer.daysMask ?? 1)
const frequency = ref<Frequency>(props.customer.frequency ?? 'F4')
const f1Week = ref(props.customer.f1Week ?? 1)
const isSaving = ref(false)
const errorText = ref('')
const errors = ref<{ mask?: string }>({})
const copyReport = ref<CopyPreview | null>(null)
const invalidDates = ref(new Set<IsoDate>())

// All custom dates held locally; the server replaces the future ones in one call.
const allDates = ref<IsoDate[]>([...props.customer.customDates].sort())
const firstFuture = allDates.value.find((d) => d > today)
const month = ref(
  mode.value === 'custom' && firstFuture ? monthOf(firstFuture) : currentMonth,
)

const monthName = computed(() => dayjs(`${month.value}-01`).format('MMMM'))
const nextMonthName = computed(() => dayjs(`${addMonths(currentMonth, 1)}-01`).format('MMMM'))

const modeOptions = computed(() => [
  { label: t('routes.schedule.modePattern'), value: 'cycle' as PatternType },
  { label: t('routes.schedule.modeCustom'), value: 'custom' as PatternType },
])
const frequencyOptions = computed(() => [
  { label: t('routes.pattern.F4'), value: 'F4' as Frequency },
  { label: t('routes.pattern.F2_ODD'), value: 'F2_ODD' as Frequency },
  { label: t('routes.pattern.F2_EVEN'), value: 'F2_EVEN' as Frequency },
  { label: t('routes.pattern.F1'), value: 'F1' as Frequency },
])
const weekOptions = [1, 2, 3, 4].map((w) => ({ label: `W${w}`, value: w }))

const isHoliday = (date: IsoDate) => isHolidayIn(props.holidays, date)

const previewDates = computed(() =>
  monthPreview({
    daysMask: mask.value,
    frequency: frequency.value,
    f1Week: frequency.value === 'F1' ? f1Week.value : null,
    anchor: props.config.cycleAnchorDate,
    month: month.value,
    allowSunday: props.config.allowSunday,
    isHoliday,
  }),
)

const monthDates = computed(() => allDates.value.filter((d) => monthOf(d) === month.value))

const nextMonthEmpty = computed(
  () => !allDates.value.some((d) => monthOf(d) === addMonths(currentMonth, 1)),
)
const canCopy = computed(() => allDates.value.some((d) => monthOf(d) === currentMonth))

function isDateDisabled(date: IsoDate): boolean {
  if (date <= today) return true
  if (!props.config.allowSunday && weekdayBit(date) === SUNDAY_BIT) return true
  return isHoliday(date)
}

function decorate(date: IsoDate): DayDecoration | undefined {
  if (invalidDates.value.has(date)) return { tone: 'holiday', title: t('routes.schedule.invalidDate') }
  if (isHoliday(date)) return { tone: 'holiday', title: t('routes.schedule.holiday') }
  if (date <= today || (!props.config.allowSunday && weekdayBit(date) === SUNDAY_BIT)) {
    return { tone: 'muted' }
  }
  return undefined
}

function toggleDate(date: IsoDate) {
  invalidDates.value.delete(date)
  allDates.value = allDates.value.includes(date)
    ? allDates.value.filter((d) => d !== date)
    : [...allDates.value, date].sort()
}

function copyToNext() {
  const source = allDates.value.filter((d) => monthOf(d) === currentMonth)
  const result = copyToNextMonth(source, {
    today,
    allowSunday: props.config.allowSunday,
    isHoliday,
  })
  allDates.value = [...new Set([...allDates.value, ...result.copied])].sort()
  copyReport.value = result
  month.value = addMonths(currentMonth, 1)
}

async function save() {
  isSaving.value = true
  errorText.value = ''
  invalidDates.value = new Set()
  try {
    if (mode.value === 'cycle') {
      await RoutesService.updateSchedule(props.route.id, props.customer.routeCustomerId, {
        patternType: 'cycle',
        daysMask: mask.value,
        frequency: frequency.value,
        f1Week: frequency.value === 'F1' ? f1Week.value : undefined,
      })
    } else {
      await RoutesService.updateSchedule(props.route.id, props.customer.routeCustomerId, {
        patternType: 'custom',
        customDates: allDates.value.filter((d) => d > today),
      })
    }
    toast.add(commonSuccessToast(t('routes.messages.scheduleSaved'), props.toastGroup))
    emit('saved')
    emit('close')
  } catch (e) {
    const bad = invalidCustomDates(e)
    if (bad.length > 0) {
      invalidDates.value = new Set(bad.map((b) => b.date))
      errorText.value = t('routes.errors.customDateInvalid')
      month.value = monthOf(bad[0].date)
    } else if (routeErrorCode(e) === 'ROUTE_SUNDAY_NOT_ALLOWED') {
      errors.value = { mask: t('routes.errors.sundayNotAllowed') }
    } else {
      toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
    }
  } finally {
    isSaving.value = false
  }
}

function onSave() {
  errors.value = {}
  if (mode.value === 'cycle' && mask.value === 0) {
    errors.value = { mask: t('routes.validation.daysRequired') }
    return
  }
  // Switching away from custom drops the dates the customer is still booked on.
  const dropsDates =
    mode.value === 'cycle' &&
    props.customer.patternType === 'custom' &&
    props.customer.customDates.some((d) => d > today)
  if (dropsDates) {
    confirm.require({
      group: props.confirmGroup,
      header: t('routes.schedule.switchHeader'),
      message: t('routes.schedule.switchMessage'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('common.actions.save') },
      accept: save,
    })
    return
  }
  save()
}
</script>
