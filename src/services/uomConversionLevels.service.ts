import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  UomConversionLevel,
  CreateUomConversionLevelDto,
  UpdateUomConversionLevelDto,
} from '@/types/uomConversionLevel.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * UomConversionLevelsService - Manages UOM conversion levels within a UomGroup.
 *
 * Each level represents one unit in an ordered chain (e.g. Box → Pack → Piece).
 * Level 1 has no qtyPerParent; subsequent levels specify how many of that unit
 * fit into the parent level.
 *
 * @example
 * ```typescript
 * // List levels for a specific UOM group
 * const levels = await UomConversionLevelsService.list('uomGroupId=1&sort=level_order&order=asc')
 *
 * // Add a new level
 * const level = await UomConversionLevelsService.create({
 *   uomGroupId: 1,
 *   levelOrder: 2,
 *   uomId: 5,
 *   qtyPerParent: 10
 * })
 * ```
 */
export class UomConversionLevelsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_UOM_CONVERSION_LEVELS

  /**
   * Retrieve a paginated list of UOM conversion levels
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to a paginated list of conversion levels
   */
  static async list(queryString?: string): Promise<Base<UomConversionLevel>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<UomConversionLevel>>(url)
  }

  /**
   * Create a new UOM conversion level
   *
   * @param data - Level creation data including uomGroupId, levelOrder, uomId, and qtyPerParent
   * @returns Promise resolving to the created conversion level
   */
  static async create(data: CreateUomConversionLevelDto): Promise<UomConversionLevel> {
    return ApiService.post<UomConversionLevel>(this.BASE_URL, data)
  }

  /**
   * Update an existing UOM conversion level
   *
   * @param id - Conversion level ID to update
   * @param data - Partial update data
   * @returns Promise resolving to the updated conversion level
   */
  static async update(id: number, data: UpdateUomConversionLevelDto): Promise<UomConversionLevel> {
    return ApiService.patch<UomConversionLevel>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a UOM conversion level
   *
   * @param id - Conversion level ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
