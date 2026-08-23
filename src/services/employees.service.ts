import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeSummary,
} from '@/types/employee.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

/** The filters `/v1/employees` reads by name. */
const toListQuery = createListQueryAdapter([
  'employeeTypeId',
  'branchId',
  'departmentId',
  'salesOrganizationId',
  'isActive',
  'isDraft',
])

export class EmployeesService {
  private static readonly BASE_URL = API_ENDPOINTS.EMPLOYEES

  /**
   * Translates a generic CRUD query string into the parameters `/v1/employees`
   * reads.
   *
   * Pass this as `TableComponent`'s `query-adapter` when a table points at this
   * endpoint. {@link listForSelect} already applies it; a table fetches by URL
   * itself, so it needs the translation handed to it.
   *
   * @example
   * ```vue
   * <TableComponent :url="url" :query-adapter="EmployeesService.toListQuery" />
   * ```
   */
  static readonly toListQuery = toListQuery

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
