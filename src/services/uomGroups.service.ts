import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { UomGroup, CreateUomGroupDto, UpdateUomGroupDto } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * UomGroupsService
 *
 * Service for managing UOM group configurations.
 * Each configuration has an ordered chain of UOM conversion levels
 * (e.g. Box → Pack → Piece) and a default display UOM.
 *
 * @example
 * ```typescript
 * // List all UOM groups
 * const uomGroups = await UomGroupsService.list()
 *
 * // Create a new UOM group
 * const newUomGroup = await UomGroupsService.create({
 *   name: 'Standard Beverage',
 *   description: 'Used for beverage products',
 *   isActive: true,
 *   defaultDisplayUomId: 3,
 *   createdBy: 1
 * })
 * ```
 */
export class UomGroupsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_UOM_GROUPS

  /**
   * Retrieve a paginated list of UOM groups
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to a paginated list of UOM groups
   */
  static async list(queryString?: string): Promise<Base<UomGroup>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<UomGroup>>(url)
  }

  /**
   * Retrieve a single UOM group by ID
   *
   * @param id - UOM group ID
   * @returns Promise resolving to the UOM group
   * @throws Error if UOM group not found
   */
  static async getById(id: number): Promise<UomGroup> {
    return ApiService.get<UomGroup>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new UOM group configuration
   *
   * @param data - UOM group creation data
   * @returns Promise resolving to the created UOM group
   * @throws Error if validation fails or name already exists
   */
  static async create(data: CreateUomGroupDto): Promise<UomGroup> {
    return ApiService.post<UomGroup>(this.BASE_URL, data)
  }

  /**
   * Update an existing UOM group
   *
   * @param id - UOM group ID to update
   * @param data - Partial update data
   * @returns Promise resolving to the updated UOM group
   * @throws Error if UOM group not found or validation fails
   */
  static async update(id: number, data: UpdateUomGroupDto): Promise<UomGroup> {
    return ApiService.patch<UomGroup>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a UOM group
   *
   * @param id - UOM group ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if UOM group not found or is in use
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
