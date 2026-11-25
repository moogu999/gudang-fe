export type PatternType = 'cycle' | 'custom'
export type Frequency = 'F4' | 'F2_ODD' | 'F2_EVEN' | 'F1'

export interface RouteBranchRef {
  id: number
  code: string
  name: string
}

export interface RouteTeamRef {
  id: number
  code: string
  name: string
  isActive: boolean
}

export interface RouteHolderRef {
  employeeId: number
  name: string
  nip?: string | null
  /** `YYYY-MM-DD`. */
  startDate: string
}

export interface Route {
  id: number
  code: string
  name: string
  description?: string | null
  branch: RouteBranchRef
  salesTeam: RouteTeamRef
  isActive: boolean
  version: number
  holder?: RouteHolderRef | null
  pendingHolder?: RouteHolderRef | null
  /** Union of the cycle customers' day masks (bit 0 = Monday ... bit 6 = Sunday). */
  visitDays: number
  hasCustom: boolean
  customerCount: number
  createdAt: string
  createdByName: string
  updatedAt?: string | null
  updatedByName?: string | null
}

export interface RouteListQuery {
  branchId?: number
  salesTeamId?: number
  holderId?: number
  holderState?: 'assigned' | 'none' | 'pending'
  isActive?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface CreateRouteRequest {
  branchId: number
  salesTeamId: number
  name: string
  /** Blank to take the next number of the route series. */
  code?: string
  description?: string | null
  /** The holder, from tomorrow. */
  employeeId?: number | null
}

export interface UpdateRouteRequest {
  version: number
  name: string
  salesTeamId?: number
  description?: string | null
}

export interface RoutesSummary {
  routes: number
  activeCustomersInRoutes: number
  unroutedCustomers: number
  unroutedTopCustomerType?: { name: string; count: number } | null
  /** Only set from the branch's reminder day of the month. */
  customNextMonthMissing?: number | null
  cycleWeekToday: number
}

export interface UnroutedCustomer {
  id: number
  code: string
  name: string
  address?: string | null
  outletType?: string | null
}

export interface CustomNextMonthItem {
  routeCustomerId: number
  routeId: number
  routeCode: string
  customerId: number
  customerName: string
  thisMonthDates: string[]
}

export type CopySkipReason = 'no_occurrence' | 'past' | 'sunday' | 'holiday' | 'too_far'

export interface CopySkip {
  from: string
  to?: string
  reason: CopySkipReason
}

export interface CopyResult {
  copied: string[]
  skipped: CopySkip[]
}

export interface BulkCopyItem extends CopyResult {
  routeCustomerId: number
  routeId: number
  customerName: string
}

export interface LoadResponse {
  /** Four cycle weeks of seven weekdays (Monday first). */
  grid: number[][]
  customByMonth: Record<string, number>
  maxVisitsPerDay: number
  allowSunday: boolean
}

export interface SalesmanLoadItem {
  employeeId: number
  routes: number
  customers: number
  peakDay: number
}

export interface HolidayConflict {
  routeCustomerId: number
  customerId: number
  customerName: string
  date: string
}

export interface SchedulePattern {
  patternType: PatternType
  daysMask?: number
  frequency?: Frequency
  f1Week?: number
  customDates?: string[]
}

export interface NewRouteCustomer {
  customerId: number
  pattern?: SchedulePattern
}

export interface RouteCustomerRef {
  id: number
  code: string
  name: string
  address?: string | null
  outletType?: string | null
  latitude?: string | null
  longitude?: string | null
  isActive: boolean
}

export interface RouteCustomer {
  routeCustomerId: number
  sequence: number
  customer: RouteCustomerRef
  patternType: PatternType
  daysMask?: number | null
  frequency?: Frequency | null
  f1Week?: number | null
  /** Dates from 31 days ago onward. */
  customDates: string[]
  /** `F4`, `F2_ODD`, `F2_EVEN`, `F1:<week>` or `CUSTOM`. */
  label: string
}

export interface TeamRouteRef {
  routeId: number
  routeCode: string
  routeName: string
  holderName?: string | null
}

export interface OtherTeamRoute {
  routeCode: string
  teamCode: string
  holderName?: string | null
  daysMask: number
  frequency?: string
}

export interface RouteCustomerOption extends RouteCustomerRef {
  inThisRoute: boolean
  teamRoute?: TeamRouteRef | null
  otherTeamRoutes: OtherTeamRoute[]
}

export type HolderStatus = 'current' | 'pending' | 'ended'

export interface HolderHistoryRow {
  id: number
  employeeId: number
  employeeName: string
  nip?: string | null
  startDate: string
  endDate?: string | null
  status: HolderStatus
  createdAt: string
}

export interface HandoverRequest {
  /** The new holder; null removes the salesman. */
  employeeId: number | null
  effectiveDate: string
}

/** The conflict rows carried by `ROUTE_CUSTOMER_IN_TEAM_ROUTE`. */
export interface TeamRouteConflict {
  customerId: number
  routeId: number
  routeCode: string
  routeName: string
  holderName?: string | null
}

export interface InvalidCustomDate {
  date: string
  reason: 'past' | 'sunday' | 'holiday' | 'too_far'
}
