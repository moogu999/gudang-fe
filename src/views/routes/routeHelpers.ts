import dayjs from 'dayjs'
import DateFormat from '@/constants/dateFormat'
import { BranchHolidaysService } from '@/services/branchHolidays.service'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import FilterOperator from '@/constants/filterOperator'
import { addDays, parsePatternLabel, type IsoDate } from '@/utils/visitCycle'

export { toApiDate, fromApiDate } from '@/views/sales-teams/salesTeamHelpers'

/** Today as `YYYY-MM-DD`, in the browser's calendar. */
export function todayIso(): IsoDate {
  return dayjs().format(DateFormat.DATE)
}

/** Schedule edits and handovers take effect from tomorrow. */
export function tomorrowIso(): IsoDate {
  return addDays(todayIso(), 1)
}

/** A holiday as the calendar needs it: inclusive date range. */
export interface HolidayRange {
  start: IsoDate
  end: IsoDate
}

/** The branch's holidays, newest first; none when the branch has none or the read fails. */
export async function loadBranchHolidays(branchId: number): Promise<HolidayRange[]> {
  const query = new GenericQueryBuilder()
    .withFilter('branchId', FilterOperator.EQUAL, String(branchId))
    .withSort('startDate', 'desc')
    .withPagination(1, 200)
    .build()
  const res = await BranchHolidaysService.list(query)
  return res.data.map((h) => ({
    start: dayjs(h.startDate).format(DateFormat.DATE),
    end: dayjs(h.endDate).format(DateFormat.DATE),
  }))
}

export function isHolidayIn(holidays: HolidayRange[], date: IsoDate): boolean {
  return holidays.some((h) => date >= h.start && date <= h.end)
}

/** Compact text of a pattern tag: `F4`, `F2 odd`, `F2 even`, `F1 · W3` or `Custom`. */
export function patternTagText(
  label: string | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  const parsed = parsePatternLabel(label)
  if (!parsed) return '—'
  return t(`routes.tag.${parsed.kind}`, { week: parsed.f1Week ?? '' })
}
