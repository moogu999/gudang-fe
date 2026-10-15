import type { Frequency } from '@/types/route.type'

/** Number of weeks in the running visit cycle. */
export const CYCLE_LENGTH = 4

/** Day-of-week bit of a days mask: Monday is 0, Sunday is 6. */
export const SUNDAY_BIT = 6

const MS_PER_DAY = 86_400_000

/** A calendar date as `YYYY-MM-DD`. All helpers here work on those strings, never on local time. */
export type IsoDate = string

function parts(date: IsoDate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  return [y, m, d]
}

/** Days since the Unix epoch of a calendar date. */
export function dayNumber(date: IsoDate): number {
  const [y, m, d] = parts(date)
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

export function fromDayNumber(n: number): IsoDate {
  const d = new Date(n * MS_PER_DAY)
  return [
    String(d.getUTCFullYear()).padStart(4, '0'),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(dayNumber(date) + days)
}

/** Bit of the weekday in a days mask: Monday is 0 ... Sunday is 6. */
export function weekdayBit(date: IsoDate): number {
  // 1970-01-01 was a Thursday, which is bit 3.
  return (((dayNumber(date) + 3) % 7) + 7) % 7
}

export function monthOf(date: IsoDate): string {
  return date.slice(0, 7)
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Every date of a `YYYY-MM` month. */
export function datesOfMonth(month: string): IsoDate[] {
  return Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** The week (1..4) of the running cycle a date falls in; dates before the anchor count backwards. */
export function cycleWeek(date: IsoDate, anchor: IsoDate): number {
  const weeks = Math.floor((dayNumber(date) - dayNumber(anchor)) / 7)
  return (((weeks % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH) + 1
}

/** Whether a frequency visits in the given cycle week. */
export function frequencyMatches(frequency: Frequency, f1Week: number | null | undefined, week: number): boolean {
  switch (frequency) {
    case 'F4':
      return true
    case 'F2_ODD':
      return week === 1 || week === 3
    case 'F2_EVEN':
      return week === 2 || week === 4
    case 'F1':
      return week === f1Week
  }
}

export function maskHas(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0
}

export function maskToggle(mask: number, bit: number): number {
  return mask ^ (1 << bit)
}

/** The weekday bits (0..6) set in a mask, in order. */
export function maskBits(mask: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((bit) => maskHas(mask, bit))
}

export interface CyclePattern {
  daysMask: number
  frequency: Frequency
  f1Week?: number | null
}

/** Whether a cycle pattern visits on a date, before holidays and the Sunday rule. */
export function cycleVisits(pattern: CyclePattern, date: IsoDate, anchor: IsoDate): boolean {
  return (
    maskHas(pattern.daysMask, weekdayBit(date)) &&
    frequencyMatches(pattern.frequency, pattern.f1Week, cycleWeek(date, anchor))
  )
}

export interface MonthPreviewOptions extends CyclePattern {
  anchor: IsoDate
  /** `YYYY-MM`. */
  month: string
  allowSunday: boolean
  isHoliday: (date: IsoDate) => boolean
}

/** The dates of a month a cycle pattern visits, skipping holidays and a disallowed Sunday. */
export function monthPreview(options: MonthPreviewOptions): IsoDate[] {
  return datesOfMonth(options.month).filter(
    (date) =>
      cycleVisits(options, date, options.anchor) &&
      (options.allowSunday || weekdayBit(date) !== SUNDAY_BIT) &&
      !options.isHoliday(date),
  )
}

export type PatternKind = 'F4' | 'F2_ODD' | 'F2_EVEN' | 'F1' | 'CUSTOM'

export interface ParsedLabel {
  kind: PatternKind
  f1Week?: number
}

/** Parses a pattern label as the API sends it: `F4`, `F2_ODD`, `F2_EVEN`, `F1:<week>` or `CUSTOM`. */
export function parsePatternLabel(label: string | null | undefined): ParsedLabel | null {
  if (!label) return null
  if (label.startsWith('F1:')) return { kind: 'F1', f1Week: Number(label.slice(3)) }
  if (label === 'F4' || label === 'F2_ODD' || label === 'F2_EVEN' || label === 'CUSTOM') {
    return { kind: label }
  }
  return null
}

export type PatternSeverity = 'success' | 'info' | 'contrast' | 'warn'

/** Tag severity per pattern: weekly green, every other week blue, monthly purple, custom amber. */
export function patternSeverity(kind: PatternKind): PatternSeverity {
  switch (kind) {
    case 'F4':
      return 'success'
    case 'F2_ODD':
    case 'F2_EVEN':
      return 'info'
    case 'F1':
      return 'contrast'
    case 'CUSTOM':
      return 'warn'
  }
}

/** The nth occurrence (1-based) of a date's weekday within its month. */
export function weekdayOccurrence(date: IsoDate): number {
  return Math.floor((parts(date)[2] - 1) / 7) + 1
}
