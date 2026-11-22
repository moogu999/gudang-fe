import dayjs from 'dayjs'
import type { VisitDayRow, VisitDayStatus, VisitDisplayStatus, VisitRow } from '@/types/visit.type'

export type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'

/** Green for done, blue for under way, amber for work that was missed, grey for skipped or not yet due. */
export function statusSeverity(status: VisitDisplayStatus): Severity {
  switch (status) {
    case 'completed':
      return 'success'
    case 'active':
      return 'info'
    case 'not_visited':
    case 'not_checked_out':
      return 'warn'
    case 'closed':
      return 'contrast'
    default:
      return 'secondary'
  }
}

/** Open days need attention (amber), closed are done, a supervisor close is neutral. */
export function dayStatusSeverity(status: VisitDayStatus): Severity {
  switch (status) {
    case 'open':
      return 'warn'
    case 'closed':
      return 'success'
    default:
      return 'secondary'
  }
}

export function dayRowKey(row: Pick<VisitDayRow, 'employee' | 'date'>): string {
  return `${row.date}:${row.employee.id}`
}

/** A supervisor can close a day that is still open and already past. */
export function canCloseDay(
  row: Pick<VisitDayRow, 'status' | 'date'>,
  hasPermission: boolean,
  today: string = dayjs().format('YYYY-MM-DD'),
): boolean {
  return hasPermission && row.status === 'open' && row.date < today
}

/** The longest range the API accepts. */
export const MAX_RANGE_DAYS = 31

/** True when `from`..`to` is ordered and spans at most 31 days. */
export function isValidRange(from: dayjs.Dayjs, to: dayjs.Dayjs): boolean {
  return !to.isBefore(from, 'day') && to.diff(from, 'day') < MAX_RANGE_DAYS
}

/** `120 / 150` → `120 m / 150 m`; the distance alone or a dash when it is unknown. */
export function distanceText(distanceM?: number | null, radiusM?: number | null): string {
  if (distanceM == null) return '—'
  return radiusM == null ? `${distanceM} m` : `${distanceM} m / ${radiusM} m`
}

/** `3, 2` → `3 / 2`; a dash for a number that does not exist. */
export function sequenceText(plan?: number | null, actual?: number | null): string {
  return `${plan ?? '—'} / ${actual ?? '—'}`
}

/** Stable key for a row: a plan row with no visit has no id. */
export function rowKey(row: Pick<VisitRow, 'employee' | 'customer' | 'planDate'>): string {
  return `${row.planDate}:${row.employee.id}:${row.customer.id}`
}

/** `4.0000` → `4`, `1.5000` → `1.5`; a dash when the survey did not ask for it. */
export function qtyText(qty?: string | null): string {
  if (qty == null || qty === '') return '—'
  return qty.includes('.') ? qty.replace(/\.?0+$/, '') : qty
}

/** Business timezone: visit days and times are read in WIB whatever the viewer's clock says. */
const BUSINESS_TIMEZONE = 'Asia/Jakarta'

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** `2026-11-19T01:05:00Z` → `08:05`. */
export function formatClockTime(iso?: string | null): string {
  return iso ? timeFormat.format(new Date(iso)) : '—'
}

/** `2026-11-19T01:05:00Z` → `19 Nov 2026, 08:05:07`. */
export function formatDateTime(iso?: string | null): string {
  return iso ? dateTimeFormat.format(new Date(iso)) : '—'
}

/** `08:05 – 08:40`, `08:05 –` while still inside, a dash when never checked in. */
export function checkInOutText(inAt?: string | null, outAt?: string | null): string {
  if (!inAt) return '—'
  return outAt
    ? `${formatClockTime(inAt)} – ${formatClockTime(outAt)}`
    : `${formatClockTime(inAt)} –`
}
