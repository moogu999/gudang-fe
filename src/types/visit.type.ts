/**
 * Visits: what a salesman actually did at each outlet of their journey plan,
 * reviewed by supervisors. Mirrors `gudang-be/internal/visit`.
 */
export type VisitDisplayStatus =
  | 'pending'
  | 'not_visited'
  | 'active'
  | 'not_checked_out'
  | 'completed'
  | 'skipped'
  | 'closed'

/** Display order of the statuses (stat cards, filter). */
export const VISIT_DISPLAY_STATUSES: VisitDisplayStatus[] = [
  'pending',
  'active',
  'completed',
  'skipped',
  'not_visited',
  'not_checked_out',
  'closed',
]

export type VisitLevel = 'required' | 'recommended' | 'off'

export interface VisitRow {
  /** Client-side only: a plan row with no visit has no id. */
  rowKey?: string
  visitId?: number | null
  /** `YYYY-MM-DD`, in the business timezone. */
  planDate: string
  employee: { id: number; name: string; nip?: string | null }
  team?: { id: number; name: string } | null
  branch: { id: number; name: string }
  customer: { id: number; code: string; name: string }
  planSequence?: number | null
  actualSequence?: number | null
  status: VisitDisplayStatus
  checkedInAt?: string | null
  checkedOutAt?: string | null
  durationMin?: number | null
  withinRadius?: boolean | null
  distanceM?: number | null
  skipReason?: string | null
  stockCheckCount: number
  stockCheckMissing: boolean
}

export interface VisitSummary {
  countsByStatus: Partial<Record<VisitDisplayStatus, number>>
  outsideRadius: number
}

export interface VisitListResponse {
  data: VisitRow[]
  meta: { total: number; limit: number; offset: number }
  summary: VisitSummary
}

export interface VisitFilters {
  /** `YYYY-MM-DD`; the range is at most 31 days and never in the future. */
  dateFrom: string
  dateTo: string
  branchId?: number
  teamId?: number
  employeeId?: number
  customerId?: number
  status?: VisitDisplayStatus | null
  outsideRadius?: boolean
}

export interface Visit {
  id: number
  clientId: string
  branchId: number
  employeeId: number
  customerId: number
  date: string
  mode: 'taking_order' | 'canvass'
  planSequence: number
  routeCode?: string | null
  /** `closed`: a supervisor closed a visit left open on an earlier day; no check-out time. */
  status: 'active' | 'completed' | 'skipped' | 'closed'
  checkedInAt?: string | null
  checkInLatitude?: number | null
  checkInLongitude?: number | null
  checkInAccuracyM?: number | null
  outletLatitude?: number | null
  outletLongitude?: number | null
  distanceM?: number | null
  radiusM?: number | null
  radiusRuleLevel?: VisitLevel | null
  withinRadius?: boolean | null
  outsideReasonId?: number | null
  outsideNote?: string | null
  selfieRequired: boolean
  stockCheckLevel?: VisitLevel | null
  checkedOutAt?: string | null
  checkOutLatitude?: number | null
  checkOutLongitude?: number | null
  checkOutAccuracyM?: number | null
  skippedAt?: string | null
  skipReasonId?: number | null
  skipNote?: string | null
  closedAt?: string | null
  /** User id of the supervisor who closed the visit. */
  closedBy?: number | null
  closeNote?: string | null
  receivedAt: string
}

export interface VisitStockCheckProduct {
  productId: number
  productCode: string
  productName: string
  available: boolean
  /** Decimal strings, PCS. */
  storeQty?: string | null
  displayQty?: string | null
}

export interface VisitStockCheckGroup {
  surveyId: number
  surveyCode: string
  surveyName: string
  surveyVersion: number
  items: VisitStockCheckProduct[]
}

export interface VisitDetail {
  visit: Visit
  displayStatus: VisitDisplayStatus
  durationMin?: number | null
  employee: { id: number; name: string; nip?: string | null }
  team?: { id: number; name: string } | null
  branch: { id: number; name: string }
  customer: { id: number; code: string; name: string }
  outsideReason?: { code: string; name: string } | null
  skipReason?: { code: string; name: string } | null
  /** Name (or email) of the supervisor who closed the visit. */
  closedByName?: string | null
  selfieUrl?: string | null
  stockCheck: VisitStockCheckGroup[]
}
