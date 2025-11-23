import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/types/department.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing department-related operations
 * Handles all HTTP requests for department CRUD operations
 *
 * @example
 * ```typescript
 * // List departments with pagination
 * const departments = await DepartmentsService.list('page=1&limit=10')
 *
 * // Create a new department
 * await DepartmentsService.create({
 *   name: 'Engineering',
 *   createdBy: 1
 * })
 *
 * // Delete a department
 * await DepartmentsService.delete(departmentId)
 * ```
 */
export class DepartmentsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_DEPARTMENTS

  /**
   * Fetch paginated list of departments
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated department data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await DepartmentsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Department>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Department>>(url)
  }

  /**
   * Create a new department
   *
   * @param data - Department creation data including name and creator ID
   * @returns Promise resolving to the created department object
   * @throws Error if name already exists or validation fails
   *
   * @example
   * ```typescript
   * const newDepartment = await DepartmentsService.create({
   *   name: 'Engineering',
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateDepartmentDto): Promise<Department> {
    return ApiService.post<Department>(this.BASE_URL, data)
  }

  /**
   * Update an existing department
   *
   * @param id - The unique identifier of the department to update
   * @param data - Department update data (name)
   * @returns Promise resolving when update is complete
   * @throws Error if department not found or validation fails
   *
   * @example
   * ```typescript
   * await DepartmentsService.update(123, {
   *   name: 'Updated Department Name',
   *   updatedBy: 1
   * })
   * ```
   */
  static async update(id: number, data: UpdateDepartmentDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a department by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the department to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if department not found or deletion fails
   *
   * @example
   * ```typescript
   * await DepartmentsService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
