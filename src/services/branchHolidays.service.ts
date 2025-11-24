import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { BranchHoliday, CreateBranchHolidayDto, UpdateBranchHolidayDto } from '@/types/branch.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing branch holiday-related operations
 * Handles all HTTP requests for branch holiday CRUD operations
 *
 * @example
 * ```typescript
 * // List holidays for a branch
 * const holidays = await BranchHolidaysService.list('filters[branchId][$eq]=1')
 *
 * // Create a new branch holiday
 * await BranchHolidaysService.create({
 *   branchId: 1,
 *   startDate: '2024-12-25T00:00:00Z',
 *   endDate: '2024-12-25T23:59:59Z',
 *   createdBy: 1
 * })
 *
 * // Delete a branch holiday
 * await BranchHolidaysService.delete(holidayId)
 * ```
 */
export class BranchHolidaysService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_BRANCH_HOLIDAYS

  /**
   * Fetch paginated list of branch holidays
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated branch holiday data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .addFilter('branchId', FilterOperator.EQ, 1)
   *   .build()
   * const result = await BranchHolidaysService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<BranchHoliday>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<BranchHoliday>>(url)
  }

  /**
   * Create a new branch holiday
   *
   * @param data - Branch holiday creation data including branchId, startDate, endDate, and creator
   * @returns Promise resolving to the created branch holiday object
   * @throws Error if validation fails or dates are invalid
   *
   * @example
   * ```typescript
   * const newHoliday = await BranchHolidaysService.create({
   *   branchId: 1,
   *   startDate: '2024-12-25T00:00:00Z',
   *   endDate: '2024-12-25T23:59:59Z',
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateBranchHolidayDto): Promise<BranchHoliday> {
    return ApiService.post<BranchHoliday>(this.BASE_URL, data)
  }

  /**
   * Update an existing branch holiday
   *
   * @param id - The unique identifier of the branch holiday to update
   * @param data - Branch holiday update data (startDate and/or endDate)
   * @returns Promise resolving when update is complete
   * @throws Error if branch holiday not found or validation fails
   *
   * @example
   * ```typescript
   * await BranchHolidaysService.update(123, {
   *   startDate: '2024-12-26T00:00:00Z',
   *   endDate: '2024-12-26T23:59:59Z'
   * })
   * ```
   */
  static async update(id: number, data: UpdateBranchHolidayDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a branch holiday by its ID
   *
   * @param id - The unique identifier of the branch holiday to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if branch holiday not found or deletion fails
   *
   * @example
   * ```typescript
   * await BranchHolidaysService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
