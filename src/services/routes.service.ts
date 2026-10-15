import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Base } from '@/types/api.type'
import type {
  BulkCopyItem,
  CopyResult,
  CreateRouteRequest,
  CustomNextMonthItem,
  HandoverRequest,
  HolderHistoryRow,
  HolidayConflict,
  LoadResponse,
  NewRouteCustomer,
  Route,
  RouteCustomer,
  RouteCustomerOption,
  RouteListQuery,
  RoutesSummary,
  SalesmanLoadItem,
  SchedulePattern,
  UnroutedCustomer,
  UpdateRouteRequest,
} from '@/types/route.type'

const toGenericListQuery = createListQueryAdapter([
  'branchId',
  'salesTeamId',
  'holderId',
  'holderState',
  'isActive',
])

/** `/v1/routes` reads the search term as `search`, not the `q` the shared adapter writes. */
function toListQuery(queryString?: string): string {
  const params = new URLSearchParams(toGenericListQuery(queryString))
  const term = params.get('q')
  if (term) {
    params.delete('q')
    params.set('search', term)
  }
  return params.toString()
}

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function toParams(query: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  return params
}

/**
 * Routes: a set of customers with a visit schedule, owned by one sales team and held by
 * one salesman at a time. Every change to a schedule applies from tomorrow.
 */
export class RoutesService {
  /** Pass as `TableComponent`'s `query-adapter` when a table points at `/v1/routes`. */
  static readonly toListQuery = toListQuery

  static async list(query: RouteListQuery = {}): Promise<Base<Route>> {
    return ApiService.get<Base<Route>>(withQuery(API_ENDPOINTS.ROUTES, toParams({ ...query })))
  }

  static async get(id: number): Promise<Route> {
    return ApiService.get<Route>(API_ENDPOINTS.ROUTE_BY_ID(id))
  }

  static async create(body: CreateRouteRequest): Promise<Route> {
    return ApiService.post<Route>(API_ENDPOINTS.ROUTES, body)
  }

  static async update(id: number, body: UpdateRouteRequest): Promise<Route> {
    return ApiService.put<Route>(API_ENDPOINTS.ROUTE_BY_ID(id), body)
  }

  static async activate(id: number): Promise<Route> {
    return ApiService.post<Route>(API_ENDPOINTS.ROUTE_ACTIVATE(id), {})
  }

  static async deactivate(id: number): Promise<Route> {
    return ApiService.post<Route>(API_ENDPOINTS.ROUTE_DEACTIVATE(id), {})
  }

  // ---------------------------------------------------------------------------
  // List banners
  // ---------------------------------------------------------------------------

  static async summary(branchId: number): Promise<RoutesSummary> {
    return ApiService.get<RoutesSummary>(
      withQuery(API_ENDPOINTS.ROUTES_SUMMARY, toParams({ branchId })),
    )
  }

  static async unroutedCustomers(
    branchId: number,
    options: { search?: string; outletTypeId?: number; limit?: number; offset?: number } = {},
  ): Promise<Base<UnroutedCustomer>> {
    return ApiService.get<Base<UnroutedCustomer>>(
      withQuery(API_ENDPOINTS.ROUTES_UNROUTED_CUSTOMERS, toParams({ branchId, ...options })),
    )
  }

  static async customNextMonth(branchId: number): Promise<CustomNextMonthItem[]> {
    const res = await ApiService.get<{ data: CustomNextMonthItem[] }>(
      withQuery(API_ENDPOINTS.ROUTES_CUSTOM_NEXT_MONTH, toParams({ branchId })),
    )
    return res.data
  }

  /** Copies this month's custom dates onto next month; every missing customer when no ids. */
  static async bulkCopyNextMonth(
    branchId: number,
    routeCustomerIds?: number[],
  ): Promise<BulkCopyItem[]> {
    const res = await ApiService.post<{ data: BulkCopyItem[] }>(
      API_ENDPOINTS.ROUTES_COPY_NEXT_MONTH,
      { branchId, routeCustomerIds },
    )
    return res.data
  }

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  static async load(id: number): Promise<LoadResponse> {
    return ApiService.get<LoadResponse>(API_ENDPOINTS.ROUTE_LOAD(id))
  }

  /** `includeRouteId` previews the load after taking a route; `excludeRouteId` after losing one. */
  static async salesmanLoad(
    branchId: number,
    employeeId: number,
    options: { includeRouteId?: number; excludeRouteId?: number } = {},
  ): Promise<LoadResponse> {
    return ApiService.get<LoadResponse>(
      withQuery(API_ENDPOINTS.ROUTES_SALESMAN_LOAD, toParams({ branchId, employeeId, ...options })),
    )
  }

  static async salesmanLoadBulk(
    branchId: number,
    employeeIds: number[],
  ): Promise<SalesmanLoadItem[]> {
    if (employeeIds.length === 0) return []
    const res = await ApiService.get<{ data: SalesmanLoadItem[] }>(
      withQuery(
        API_ENDPOINTS.ROUTES_SALESMAN_LOAD_BULK,
        toParams({ branchId, employeeIds: employeeIds.join(',') }),
      ),
    )
    return res.data
  }

  static async holidayConflicts(id: number): Promise<HolidayConflict[]> {
    const res = await ApiService.get<{ data: HolidayConflict[] }>(
      API_ENDPOINTS.ROUTE_HOLIDAY_CONFLICTS(id),
    )
    return res.data
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  static async customerOptions(
    id: number,
    options: { search?: string; outletTypeId?: number; limit?: number; offset?: number } = {},
  ): Promise<Base<RouteCustomerOption>> {
    return ApiService.get<Base<RouteCustomerOption>>(
      withQuery(API_ENDPOINTS.ROUTE_CUSTOMER_OPTIONS(id), toParams({ ...options })),
    )
  }

  static async listCustomers(id: number): Promise<RouteCustomer[]> {
    const res = await ApiService.get<{ data: RouteCustomer[] }>(API_ENDPOINTS.ROUTE_CUSTOMERS(id))
    return res.data
  }

  /** The whole batch fails when a customer is already in another route of the team. */
  static async addCustomers(id: number, customers: NewRouteCustomer[]): Promise<void> {
    await ApiService.post<void>(API_ENDPOINTS.ROUTE_CUSTOMERS(id), { customers })
  }

  static async moveCustomer(id: number, routeCustomerId: number): Promise<void> {
    await ApiService.post<void>(API_ENDPOINTS.ROUTE_CUSTOMERS_MOVE(id), { routeCustomerId })
  }

  /** Must list every customer of the route. */
  static async reorderCustomers(id: number, routeCustomerIds: number[]): Promise<void> {
    await ApiService.put<void>(API_ENDPOINTS.ROUTE_CUSTOMERS_ORDER(id), { routeCustomerIds })
  }

  static async updateSchedule(
    id: number,
    routeCustomerId: number,
    pattern: SchedulePattern,
  ): Promise<void> {
    await ApiService.put<void>(API_ENDPOINTS.ROUTE_CUSTOMER(id, routeCustomerId), pattern)
  }

  static async removeCustomer(id: number, routeCustomerId: number): Promise<void> {
    await ApiService.delete<void>(API_ENDPOINTS.ROUTE_CUSTOMER(id, routeCustomerId))
  }

  /** Replaces the future custom dates of one `YYYY-MM` month. */
  static async setCustomDates(
    id: number,
    routeCustomerId: number,
    month: string,
    dates: string[],
  ): Promise<void> {
    await ApiService.put<void>(
      withQuery(API_ENDPOINTS.ROUTE_CUSTOMER_DATES(id, routeCustomerId), toParams({ month })),
      { dates },
    )
  }

  static async copyNextMonth(
    id: number,
    routeCustomerId: number,
    month?: string,
  ): Promise<CopyResult> {
    return ApiService.post<CopyResult>(
      withQuery(
        API_ENDPOINTS.ROUTE_CUSTOMER_COPY_NEXT_MONTH(id, routeCustomerId),
        toParams({ month }),
      ),
      {},
    )
  }

  // ---------------------------------------------------------------------------
  // Salesman
  // ---------------------------------------------------------------------------

  static async listSalesmen(id: number): Promise<HolderHistoryRow[]> {
    const res = await ApiService.get<{ data: HolderHistoryRow[] }>(API_ENDPOINTS.ROUTE_SALESMEN(id))
    return res.data
  }

  /** The effective date must be tomorrow or later. A pending handover is replaced. */
  static async handover(id: number, body: HandoverRequest): Promise<Route> {
    return ApiService.post<Route>(API_ENDPOINTS.ROUTE_SALESMAN(id), body)
  }

  static async cancelPendingHandover(id: number): Promise<Route> {
    return ApiService.post<Route>(API_ENDPOINTS.ROUTE_SALESMAN_CANCEL_PENDING(id), {})
  }
}
