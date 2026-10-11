import dayjs from 'dayjs'
import DateFormat from '@/constants/dateFormat'
import { ApiError } from '@/types/api.type'
import type { TargetStatus } from '@/types/salesmanTarget.type'

/** A month as the API reads it: its first day, never shifted by the browser's timezone. */
export function toApiPeriod(date: Date): string {
  return dayjs(date).startOf('month').format(DateFormat.DATE)
}

/** Parses an API `YYYY-MM-DD` period as a local calendar day. */
export function fromApiPeriod(period: string): Date {
  return dayjs(period).startOf('month').toDate()
}

/** The last day of a period; a document can be closed the day after it. */
export function periodEnd(period: string): Date {
  return dayjs(period).endOf('month').startOf('day').toDate()
}

/** Whether the period's last day is already behind us. */
export function hasPeriodEnded(period: string, now: Date = new Date()): boolean {
  return dayjs(now).startOf('day').isAfter(periodEnd(period))
}

export function statusSeverity(status: TargetStatus): 'secondary' | 'success' | 'contrast' {
  if (status === 'active') return 'success'
  if (status === 'closed') return 'contrast'
  return 'secondary'
}

/** The machine-readable code on an API error, if it has one. */
export function targetErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/**
 * Replaces an API error's message with its translation when the code is a known
 * one, so toasts show the localized text rather than the server's English.
 */
export function translateTargetError(
  e: unknown,
  t: (key: string) => string,
  exists: (key: string) => boolean,
): unknown {
  const code = targetErrorCode(e)
  if (!code) return e
  const key = `salesmanTargets.errors.${code}`
  return exists(key) ? new Error(t(key)) : e
}

/** A number grouped for the active locale. */
export function formatNumber(value: number, locale: string, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits }).format(value)
}
