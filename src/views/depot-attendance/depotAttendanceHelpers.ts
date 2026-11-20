import dayjs from 'dayjs'
import type { DepotAttendanceStatus } from '@/types/depotAttendance.type'

export type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'

/** Red for outside the radius, amber for a missing clock-in, grey for days that need none. */
export function statusSeverity(status: DepotAttendanceStatus): Severity {
  switch (status) {
    case 'in_radius':
      return 'success'
    case 'outside_radius':
      return 'danger'
    case 'missing':
    case 'exempt_missing':
      return 'warn'
    case 'no_depot_point':
      return 'info'
    default:
      return 'secondary'
  }
}

/** The longest range the API accepts. */
export const MAX_RANGE_DAYS = 31

/** True when `from`..`to` is ordered and spans at most 31 days. */
export function isValidRange(from: dayjs.Dayjs, to: dayjs.Dayjs): boolean {
  return !to.isBefore(from, 'day') && to.diff(from, 'day') < MAX_RANGE_DAYS
}

/** `120 / 150` → `120 m / 150 m`; the radius alone or a dash when the distance is unknown. */
export function distanceText(distanceM?: number | null, radiusM?: number | null): string {
  if (distanceM == null) return '—'
  return radiusM == null ? `${distanceM} m` : `${distanceM} m / ${radiusM} m`
}

/** Stable key for a row: the API has no id for a day nobody clocked in. */
export function rowKey(row: { employee: { id: number }; date: string }): string {
  return `${row.employee.id}:${row.date}`
}

/** Business timezone: attendance days and times are read in WIB whatever the viewer's clock says. */
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
