import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type {
  DepotAttendanceDetail,
  DepotAttendanceFilters,
  DepotAttendanceListResponse,
} from '@/types/depotAttendance.type'

/** `/v1/depot-attendances` reads its named filters from the url; the table adds only `q`/`limit`/`offset`. */
const toListQuery = createListQueryAdapter([])

function filterParams(filters: DepotAttendanceFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set('dateFrom', filters.dateFrom)
  params.set('dateTo', filters.dateTo)
  if (filters.branchId) params.set('branchId', String(filters.branchId))
  if (filters.teamId) params.set('teamId', String(filters.teamId))
  if (filters.employeeId) params.set('employeeId', String(filters.employeeId))
  if (filters.status) params.set('status', filters.status)
  return params
}

/**
 * The supervisor side of depot attendance: every salesman and day in scope with
 * their clock-in status, including the days nobody clocked in. Lists are scoped
 * to the caller's branches server-side.
 */
export class DepotAttendanceService {
  /** Pass as `TableComponent`'s `query-adapter`. */
  static readonly toListQuery = toListQuery

  /** The list url for `TableComponent`, carrying the page's filters. */
  static listUrl(filters: DepotAttendanceFilters): string {
    return `${API_ENDPOINTS.DEPOT_ATTENDANCES}?${filterParams(filters)}`
  }

  /**
   * Counts per status for the stat cards. The status filter is dropped so the
   * cards stay stable while one is active; one row is fetched because only the
   * summary is read.
   */
  static async summary(
    filters: DepotAttendanceFilters,
  ): Promise<DepotAttendanceListResponse['summary']> {
    const params = filterParams({ ...filters, status: null })
    params.set('limit', '1')
    const res = await ApiService.get<DepotAttendanceListResponse>(
      `${API_ENDPOINTS.DEPOT_ATTENDANCES}?${params}`,
    )
    return res.summary
  }

  static async get(id: number): Promise<DepotAttendanceDetail> {
    return ApiService.get<DepotAttendanceDetail>(API_ENDPOINTS.DEPOT_ATTENDANCE(id))
  }
}
