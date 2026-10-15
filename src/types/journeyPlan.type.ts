export type JourneyPlanSource = 'pjp' | 'supervisor_addition'
export type JourneyPlanTrigger = 'nightly' | 'route_change' | 'manual' | 'lifecycle'

export interface JourneyPlanRow {
  id: number
  date: string
  sequence: number
  employee: { id: number; name: string; nip?: string | null }
  customer: {
    id: number
    code: string
    name: string
    address?: string | null
    outletType?: string | null
  }
  routeId?: number | null
  routeCode?: string | null
  /** `F4`, `F2_ODD`, `F2_EVEN`, `F1:<week>` or `CUSTOM`, as it was when planned. */
  patternLabel?: string | null
  source: JourneyPlanSource
  reason?: string | null
  createdByName?: string | null
}

export interface JourneyPlanSalesman {
  employeeId: number
  name: string
  nip?: string | null
  visits: number
}

export interface JourneyPlanRun {
  id: number
  trigger: JourneyPlanTrigger
  runDate: string
  windowFrom: string
  windowTo: string
  rowsDeleted: number
  rowsInserted: number
  startedAt: string
  finishedAt?: string | null
  error?: string | null
}

export interface JourneyPlanStatus {
  today: string
  cycleWeekToday: number
  horizonDays: number
  availableUntil?: string | null
  lastNightly?: JourneyPlanRun | null
  lastRun?: JourneyPlanRun | null
  hasEverRun: boolean
}

export interface AddJourneyVisitRequest {
  branchId: number
  date: string
  employeeId: number
  customerId: number
  reason: string
}

export interface JourneyPlanConfig {
  id?: number | null
  branchId: number
  branchName?: string
  /** `YYYY-MM-DD`, always a Monday. */
  cycleAnchorDate: string
  horizonDays: number
  maxVisitsPerDay: number
  allowSunday: boolean
  customReminderDay: number
  isDefault: boolean
  anchorLocked?: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export type UpsertJourneyPlanConfigDto = Pick<
  JourneyPlanConfig,
  'cycleAnchorDate' | 'horizonDays' | 'maxVisitsPerDay' | 'allowSunday' | 'customReminderDay'
>
