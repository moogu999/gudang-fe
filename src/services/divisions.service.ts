import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Division, CreateDivisionDto, UpdateDivisionDto } from '@/types/division.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing division-related operations
 * Handles all HTTP requests for division CRUD operations
 *
 * @example
 * ```typescript
 * // List divisions with pagination
 * const divisions = await DivisionsService.list('page=1&limit=10')
 *
 * // Create a new division
 * await DivisionsService.create({
 *   name: 'Software Development',
 *   createdBy: 1
 * })
 *
 * // Delete a division
 * await DivisionsService.delete(divisionId)
 * ```
 */
export class DivisionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_DIVISIONS

  /**
   * Fetch paginated list of divisions
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated division data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await DivisionsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Division>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Division>>(url)
  }

  /**
   * Create a new division
   *
   * @param data - Division creation data including name and creator ID
   * @returns Promise resolving to the created division object
   * @throws Error if name already exists or validation fails
   *
   * @example
   * ```typescript
   * const newDivision = await DivisionsService.create({
   *   name: 'Software Development',
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateDivisionDto): Promise<Division> {
    return ApiService.post<Division>(this.BASE_URL, data)
  }

  /**
   * Update an existing division
   *
   * @param id - The unique identifier of the division to update
   * @param data - Division update data (name)
   * @returns Promise resolving when update is complete
   * @throws Error if division not found or validation fails
   *
   * @example
   * ```typescript
   * await DivisionsService.update(123, {
   *   name: 'Updated Division Name',
   *   updatedBy: 1
   * })
   * ```
   */
  static async update(id: number, data: UpdateDivisionDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a division by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the division to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if division not found or deletion fails
   *
   * @example
   * ```typescript
   * await DivisionsService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
