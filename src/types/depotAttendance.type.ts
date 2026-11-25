/**
 * Depot attendance: a salesman's daily clock-in at the depot (their effective
 * branch), reviewed by supervisors. Mirrors `gudang-be/internal/attendance`.
 */
export type DepotAttendanceStatus =
  | 'in_radius'
  | 'outside_radius'
  | 'no_depot_point'
  | 'missing'
  | 'exempt_missing'
  | 'holiday'
  | 'not_scheduled'
  | 'not_required'

/** Display order of the statuses (stat cards, filter). */
export const DEPOT_ATTENDANCE_STATUSES: DepotAttendanceStatus[] = [
  'in_radius',
  'outside_radius',
  'no_depot_point',
  'missing',
  'exempt_missing',
  'holiday',
  'not_scheduled',
  'not_required',
]

export type DepotAttendanceLevel = 'required' | 'recommended' | 'exempt'

export interface DepotAttendanceRow {
  /** Client-side only: the API has no id for a day nobody clocked in. */
  rowKey?: string
  /** `YYYY-MM-DD`, in the business timezone. */
  date: string
  employee: { id: number; name: string; nip?: string | null }
  team?: { id: number; name: string } | null
  branch: { id: number; name: string }
  status: DepotAttendanceStatus
  attendanceId?: number | null
  capturedAt?: string | null
  distanceM?: number | null
  radiusM?: number | null
  reasonName?: string | null
}

export interface DepotAttendanceSummary {
  countsByStatus: Partial<Record<DepotAttendanceStatus, number>>
}

export interface DepotAttendanceListResponse {
  data: DepotAttendanceRow[]
  meta: { total: number; limit: number; offset: number }
  summary: DepotAttendanceSummary
}

export interface DepotAttendanceFilters {
  /** `YYYY-MM-DD`; the range is at most 31 days. */
  dateFrom: string
  dateTo: string
  branchId?: number
  teamId?: number
  employeeId?: number
  status?: DepotAttendanceStatus | null
}

export interface DepotAttendanceRecord {
  id: number
  clientId: string
  branchId: number
  employeeId: number
  date: string
  capturedAt: string
  receivedAt: string
  latitude?: number | null
  longitude?: number | null
  accuracyM?: number | null
  distanceM?: number | null
  radiusM?: number | null
  depotLatitude?: number | null
  depotLongitude?: number | null
  ruleLevel: DepotAttendanceLevel
  withinRadius?: boolean | null
  reasonId?: number | null
  note?: string | null
  status: DepotAttendanceStatus
}

export interface DepotAttendanceDetail {
  attendance: DepotAttendanceRecord
  employee: { id: number; name: string; nip?: string | null }
  team?: { id: number; name: string } | null
  branch: { id: number; name: string }
  reason?: { code: string; name: string } | null
  selfieUrl?: string | null
}
