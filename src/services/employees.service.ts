import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeSummary,
} from '@/types/employee.type'
import { API_ENDPOINTS } from '@/constants/api'
import FilterOperator from '@/constants/filterOperator'

/**
 * The filters `/v1/employees` reads by name. Anything outside this set is not a
 * filter the endpoint knows, and forwarding it would only look like one.
 */
const LIST_FILTER_PARAMS = new Set([
  'employeeTypeId',
  'branchId',
  'departmentId',
  'salesOrganizationId',
  'isActive',
  'isDraft',
])

/**
 * Adapts the query string `InfiniteSelect` builds into what `/v1/employees`
 * actually reads.
 *
 * `InfiniteSelect` speaks the generic CRUD dialect — `search`, `page`, and
 * `filterBy`/`filterOperator`/`filterValue` triples. This endpoint is
 * hand-written and reads `q`, `offset` and named filters instead. It ignores
 * parameters it does not recognise rather than rejecting them, so an unadapted
 * query returns 200 with every employee in it: the request looks like it
 * worked, and the filter silently did nothing.
 *
 * @param queryString - Query string as built by GenericQueryBuilder
 * @returns The same intent, spelled the way this endpoint reads it
 */
function toListQuery(queryString?: string): string {
  const from = new URLSearchParams(queryString ?? '')
  const to = new URLSearchParams()

  const limit = from.get('limit')
  if (limit) to.set('limit', limit)

  // The endpoint counts in rows, not pages.
  const page = Number(from.get('page'))
  if (page > 1 && limit) to.set('offset', String((page - 1) * Number(limit)))

  const search = from.get('search')
  if (search) to.set('q', search)

  // The three filter parts arrive as parallel lists, one entry per filter.
  const filterBys = from.getAll('filterBy')
  const filterOperators = from.getAll('filterOperator')
  const filterValues = from.getAll('filterValue')

  filterBys.forEach((by, i) => {
    // Named filters are equality only; the endpoint has no operator of its own.
    if (filterOperators[i] !== FilterOperator.EQUAL) return
    if (!LIST_FILTER_PARAMS.has(by)) return
    to.set(by, filterValues[i])
  })

  return to.toString()
}

export class EmployeesService {
  private static readonly BASE_URL = API_ENDPOINTS.EMPLOYEES

  static async list(queryString?: string): Promise<Base<Employee>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Employee>>(url)
  }

  /**
   * List employees for an `InfiniteSelect`, translating its generic query
   * string into the parameters this endpoint reads.
   *
   * Use this instead of {@link list} wherever the caller is an InfiniteSelect.
   * Call {@link list} directly when you are already writing the endpoint's own
   * parameters, as the employee list and detail views do.
   *
   * @param queryString - Query string as built by GenericQueryBuilder
   * @returns Paginated employees matching the translated filters
   *
   * @example
   * ```vue
   * <InfiniteSelect :fetch-fn="(q) => EmployeesService.listForSelect(q)" />
   * ```
   */
  static async listForSelect(queryString?: string): Promise<Base<Employee>> {
    return this.list(toListQuery(queryString))
  }

  static async summary(): Promise<EmployeeSummary> {
    return ApiService.get<EmployeeSummary>(`${this.BASE_URL}/summary`)
  }

  static async get(id: number): Promise<Employee> {
    return ApiService.get<Employee>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateEmployeeDto): Promise<Employee> {
    return ApiService.post<Employee>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateEmployeeDto): Promise<Employee> {
    return ApiService.put<Employee>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }

  static async uploadPhoto(id: number, file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData()
    formData.append('photo', file)
    return ApiService.postMultipart<{ photoUrl: string }>(`${this.BASE_URL}/${id}/photo`, formData)
  }

  static async deletePhoto(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}/photo`)
  }
}
