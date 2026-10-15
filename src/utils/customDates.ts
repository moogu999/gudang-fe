import {
  SUNDAY_BIT,
  addMonths,
  datesOfMonth,
  monthOf,
  weekdayBit,
  weekdayOccurrence,
  type IsoDate,
} from './visitCycle'

export interface CopyRules {
  today: IsoDate
  allowSunday: boolean
  isHoliday: (date: IsoDate) => boolean
}

export type PreviewSkipReason = 'no_occurrence' | 'past' | 'sunday' | 'holiday'

export interface CopyPreview {
  copied: IsoDate[]
  skipped: { from: IsoDate; to?: IsoDate; reason: PreviewSkipReason }[]
}

/**
 * Maps each date of a month onto the same weekday and week-of-month of the next month
 * (2nd Tuesday to 2nd Tuesday). A preview only: the server decides what is saved.
 */
export function copyToNextMonth(dates: IsoDate[], rules: CopyRules): CopyPreview {
  const result: CopyPreview = { copied: [], skipped: [] }
  const targets = new Map<string, IsoDate>()

  for (const from of [...dates].sort()) {
    const nextMonth = addMonths(monthOf(from), 1)
    const bit = weekdayBit(from)
    const nth = weekdayOccurrence(from)
    const candidates = datesOfMonth(nextMonth).filter(
      (d) => weekdayBit(d) === bit && weekdayOccurrence(d) === nth,
    )
    const to = candidates[0]
    if (!to) {
      result.skipped.push({ from, reason: 'no_occurrence' })
    } else if (to <= rules.today) {
      result.skipped.push({ from, to, reason: 'past' })
    } else if (!rules.allowSunday && weekdayBit(to) === SUNDAY_BIT) {
      result.skipped.push({ from, to, reason: 'sunday' })
    } else if (rules.isHoliday(to)) {
      result.skipped.push({ from, to, reason: 'holiday' })
    } else if (!targets.has(to)) {
      targets.set(to, from)
      result.copied.push(to)
    }
  }
  return result
}
