import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Visit, VisitDetail, VisitFilters, VisitListResponse } from '@/types/visit.type'

/** `/v1/visits` reads its named filters from the url; the table adds only `q`/`limit`/`offset`. */
const toListQuery = createListQueryAdapter([])

function filterParams(filters: VisitFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set('dateFrom', filters.dateFrom)
  params.set('dateTo', filters.dateTo)
  if (filters.branchId) params.set('branchId', String(filters.branchId))
  if (filters.teamId) params.set('teamId', String(filters.teamId))
  if (filters.employeeId) params.set('employeeId', String(filters.employeeId))
  if (filters.customerId) params.set('customerId', String(filters.customerId))
  if (filters.status) params.set('status', filters.status)
  if (filters.outsideRadius) params.set('outsideRadius', 'true')
  return params
}

/**
 * The supervisor side of visits: every journey plan row in scope with the visit
 * made against it. Lists are scoped to the caller's branches server-side.
 */
export class VisitService {
  /** Pass as `TableComponent`'s `query-adapter`. */
  static readonly toListQuery = toListQuery

  /** The list url for `TableComponent`, carrying the page's filters. */
  static listUrl(filters: VisitFilters): string {
    return `${API_ENDPOINTS.VISITS}?${filterParams(filters)}`
  }

  /**
   * Counts per status for the stat cards. The status and outside-radius filters
   * are dropped so the cards stay stable while one is active; one row is fetched
   * because only the summary is read.
   */
  static async summary(filters: VisitFilters): Promise<VisitListResponse['summary']> {
    const params = filterParams({ ...filters, status: null, outsideRadius: false })
    params.set('limit', '1')
    const res = await ApiService.get<VisitListResponse>(`${API_ENDPOINTS.VISITS}?${params}`)
    return res.summary
  }

  static async get(id: number): Promise<VisitDetail> {
    return ApiService.get<VisitDetail>(API_ENDPOINTS.VISIT(id))
  }

  /**
   * Close a visit the salesman left checked in on an earlier day, which otherwise
   * blocks their later check-ins. Needs VISIT_CLOSE and a note.
   */
  static async close(id: number, note: string): Promise<Visit> {
    return ApiService.post<Visit>(API_ENDPOINTS.VISIT_CLOSE(id), { note })
  }
}
