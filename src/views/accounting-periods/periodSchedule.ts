import dayjs from 'dayjs'
import type { PeriodDraft } from '@/types/accountingPeriod.type'

export interface ScheduleIssue {
  kind: 'gap' | 'overlap' | 'uncovered-start' | 'uncovered-end' | 'invalid-range'
  index: number // -1 for whole-schedule issues
  messageKey: string // i18n key, not a rendered string
  params?: Record<string, string>
}

const DATE_FMT = 'YYYY-MM-DD'

function fmt(d: Date): string {
  return dayjs(d).format(DATE_FMT)
}

/** Client mirror of the backend's GenerateMonthlyPeriods, so the dialog can
 *  preview the rows before anything is saved. Must stay in step with
 *  gudang-be internal/accounting_period/usecase/schedule.go. */
export function generateMonthlyDrafts(start: Date, end: Date): PeriodDraft[] {
  const drafts: PeriodDraft[] = []
  const last = dayjs(end).startOf('day')
  let cur = dayjs(start).startOf('day')

  while (!cur.isAfter(last)) {
    let periodEnd = cur.endOf('month').startOf('day')
    if (periodEnd.isAfter(last)) {
      periodEnd = last
    }

    drafts.push({
      name: cur.format('MMMM YYYY'),
      startDate: cur.toDate(),
      endDate: periodEnd.toDate(),
    })

    cur = periodEnd.add(1, 'day')
  }

  return drafts
}

/**
 * Every reason the drafts do not exactly tile [start, end]. Empty = valid.
 *
 * Rows are assumed to already be in chronological order — the order the
 * schedule editor keeps them in — so an issue's `index` refers directly to
 * the offending row's position in `drafts`.
 */
export function validateDrafts(drafts: PeriodDraft[], start: Date, end: Date): ScheduleIssue[] {
  const issues: ScheduleIssue[] = []
  const fyStart = fmt(start)
  const fyEnd = fmt(end)

  if (drafts.length === 0) {
    issues.push({
      kind: 'uncovered-start',
      index: -1,
      messageKey: 'accountingPeriods.validation.uncoveredStart',
      params: { date: fyStart },
    })
    issues.push({
      kind: 'uncovered-end',
      index: -1,
      messageKey: 'accountingPeriods.validation.uncoveredEnd',
      params: { date: fyEnd },
    })
    return issues
  }

  // A row with broken dates already carries its own invalid-range issue, so
  // it is excluded from every other check below rather than treated as a
  // gap on both sides of it — one mistake should report as one issue.
  const invalid = drafts.map((d) => !d.startDate || !d.endDate || fmt(d.endDate) < fmt(d.startDate))

  drafts.forEach((d, i) => {
    if (invalid[i]) {
      issues.push({
        kind: 'invalid-range',
        index: i,
        messageKey: 'accountingPeriods.validation.invalidRange',
      })
    }
  })

  if (!invalid[0] && fmt(drafts[0]!.startDate!) !== fyStart) {
    issues.push({
      kind: 'uncovered-start',
      index: 0,
      messageKey: 'accountingPeriods.validation.uncoveredStart',
      params: { date: fyStart },
    })
  }

  const lastIndex = drafts.length - 1
  if (!invalid[lastIndex] && fmt(drafts[lastIndex]!.endDate!) !== fyEnd) {
    issues.push({
      kind: 'uncovered-end',
      index: lastIndex,
      messageKey: 'accountingPeriods.validation.uncoveredEnd',
      params: { date: fyEnd },
    })
  }

  for (let i = 0; i < drafts.length - 1; i++) {
    if (invalid[i] || invalid[i + 1]) {
      continue
    }

    const curEnd = fmt(drafts[i]!.endDate!)
    const nextStart = fmt(drafts[i + 1]!.startDate!)
    const wantNext = dayjs(drafts[i]!.endDate!).add(1, 'day').format(DATE_FMT)

    if (nextStart < wantNext) {
      issues.push({
        kind: 'overlap',
        index: i + 1,
        messageKey: 'accountingPeriods.validation.overlap',
        params: { after: curEnd, before: nextStart },
      })
    } else if (nextStart > wantNext) {
      issues.push({
        kind: 'gap',
        index: i + 1,
        messageKey: 'accountingPeriods.validation.gap',
        params: { after: curEnd, before: nextStart },
      })
    }
  }

  return issues
}

/** The mockup's "01–30 Jun 2026" sub-line. */
export function formatRange(startDate: string, endDate: string): string {
  const s = dayjs(startDate)
  const e = dayjs(endDate)

  if (s.isSame(e, 'month') && s.isSame(e, 'year')) {
    return `${s.format('DD')}–${e.format('DD MMM YYYY')}`
  }

  return `${s.format('DD MMM YYYY')} – ${e.format('DD MMM YYYY')}`
}
