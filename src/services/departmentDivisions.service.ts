import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  DepartmentDivision,
  CreateDepartmentDivisionDto,
} from '@/types/departmentDivision.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing department-division associations
 * Handles the many-to-many relationship between departments and divisions
 *
 * @example
 * ```typescript
 * // List divisions for a specific department
 * const departmentDivisions = await DepartmentDivisionsService.list(
 *   'filterBy=department_id&filterOperator=0&filterValue=1'
 * )
 *
 * // Add division to department
 * await DepartmentDivisionsService.addDivisionToDepartment({
 *   departmentId: 1,
 *   divisionId: 5,
 *   createdBy: 1
 * })
 *
 * // Remove division from department
 * await DepartmentDivisionsService.removeDivisionFromDepartment(associationId)
 * ```
 */
export class DepartmentDivisionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_DEPARTMENT_DIVISIONS

  /**
   * Fetch department-division associations
   * Typically filtered by department ID to get divisions assigned to a specific department
   *
   * @param queryString - Query parameters, commonly used to filter by department_id
   * @returns Promise resolving to paginated department-division associations
   *
   * @example
   * ```typescript
   * // Get divisions for department ID 1
   * const query = 'filterBy=department_id&filterOperator=0&filterValue=1'
   * const departmentDivisions = await DepartmentDivisionsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<DepartmentDivision>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<DepartmentDivision>>(url)
  }

  /**
   * Associate a division with a department
   * Creates a many-to-many relationship between departments and divisions
   *
   * @param data - Association data including departmentId, divisionId, and creator ID
   * @returns Promise resolving to the created department-division association
   * @throws Error if association already exists or validation fails
   *
   * @example
   * ```typescript
   * await DepartmentDivisionsService.addDivisionToDepartment({
   *   departmentId: 2,
   *   divisionId: 10,
   *   createdBy: 1
   * })
   * ```
   */
  static async addDivisionToDepartment(
    data: CreateDepartmentDivisionDto,
  ): Promise<DepartmentDivision> {
    return ApiService.post<DepartmentDivision>(this.BASE_URL, data)
  }

  /**
   * Remove a division from a department
   * Deletes the department-division association
   *
   * @param id - The unique identifier of the department-division association
   * @returns Promise resolving when removal is complete
   * @throws Error if association not found or removal fails
   *
   * @example
   * ```typescript
   * await DepartmentDivisionsService.removeDivisionFromDepartment(associationId)
   * ```
   */
  static async removeDivisionFromDepartment(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
