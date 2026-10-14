import type { SalesmanTarget, SalesmanTargetAchievement } from '@/types/salesmanTarget.type'

export type AchievementBand = 'good' | 'warn' | 'bad'

export interface WorkingDays {
  total: number
  elapsed: number
}

/** One salesman of the document with the target and what was achieved, as numbers. */
export interface AchievementRow {
  employeeId: number
  employeeCode?: string
  employeeName: string
  employeeActive: boolean
  targetValue: number | null
  achievedValue: number
  /** Base-unit target per item id; a missing key is not targeted. */
  targetCells: Record<string, number>
  /** Base-unit achieved qty per item id; a missing key is 0. */
  achievedCells: Record<string, number>
}

/** Achieved as a percentage of target; null when there is no target to compare with. */
export function pct(achieved: number, target: number | null | undefined): number | null {
  if (target === null || target === undefined || target <= 0) return null
  return (achieved / target) * 100
}

/** How much of the period's working days have passed, as a percentage. */
export function idealPct(wd: WorkingDays): number | null {
  return wd.total > 0 ? (wd.elapsed / wd.total) * 100 : null
}

/** The month-end projection as a percentage of target. */
export function runRate(
  achieved: number,
  target: number | null | undefined,
  wd: WorkingDays,
): number | null {
  if (target === null || target === undefined || target <= 0) return null
  if (wd.elapsed <= 0 || wd.total <= 0) return null
  return ((achieved / wd.elapsed) * wd.total * 100) / target
}

/** Green at or above the ideal, orange from 70 % of it, red below. */
export function band(achievedPct: number | null, ideal: number | null): AchievementBand | null {
  if (achievedPct === null || ideal === null) return null
  if (achievedPct >= ideal) return 'good'
  if (achievedPct >= ideal * 0.7) return 'warn'
  return 'bad'
}

export const BAND_CLASS: Record<AchievementBand, string> = {
  good: 'text-green-700',
  warn: 'text-orange-600',
  bad: 'text-red-600',
}

function toNumbers(cells: Record<string, string> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(cells ?? {})) {
    const n = Number(value)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

/**
 * One row per salesman of the document, in the document's order. A salesman the
 * response leaves out achieved nothing.
 */
export function mergeAchievement(
  target: SalesmanTarget,
  achievement: SalesmanTargetAchievement,
): AchievementRow[] {
  const byEmployee = new Map(achievement.lines.map((l) => [l.employeeId, l]))
  return target.lines.map((line) => {
    const got = byEmployee.get(line.employeeId)
    const targetValue = line.targetValue === undefined ? null : Number(line.targetValue)
    return {
      employeeId: line.employeeId,
      employeeCode: line.employeeCode,
      employeeName: line.employeeName,
      employeeActive: line.employeeActive,
      targetValue: targetValue !== null && Number.isFinite(targetValue) ? targetValue : null,
      achievedValue: Number(got?.achievedValue ?? 0) || 0,
      targetCells: toNumbers(line.cells),
      achievedCells: toNumbers(got?.cells),
    }
  })
}
