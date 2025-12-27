import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  UomConversionDetail,
  CreateUomConversionDetailDto,
  UpdateUomConversionDetailDto,
} from '@/types/uomConversionDetail.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * UomConversionDetailsService - Handles all UOM Conversion Detail-related API operations
 *
 * This service provides methods for CRUD operations on UOM conversion details using
 * the generic API endpoints. UOM conversion details represent individual conversion rules
 * within a conversion header (e.g., 1 Box = 10 Packs).
 *
 * @example
 * ```typescript
 * // List all UOM conversion details for a header with query parameters
 * const details = await UomConversionDetailsService.list('headerId=1&limit=10')
 *
 * // Create a new UOM conversion detail
 * const newDetail = await UomConversionDetailsService.create({
 *   headerId: 1,
 *   fromUomId: 2,
 *   toUomId: 3,
 *   conversionFactor: 10
 * })
 *
 * // Delete a UOM conversion detail
 * await UomConversionDetailsService.delete(1)
 * ```
 */
export class UomConversionDetailsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_UOM_CONVERSION_DETAILS

  /**
   * Retrieves a list of UOM conversion details with optional query parameters
   *
   * @param queryString - Optional URL query string for filtering, sorting, and pagination
   * @returns Promise resolving to paginated UOM conversion details data
   * @throws Error if the API request fails
   *
   * @example
   * ```typescript
   * const result = await UomConversionDetailsService.list('headerId=1&limit=10&sort=conversionFactor&order=asc')
   * console.log(result.data) // Array of UOM conversion details
   * console.log(result.meta) // Pagination metadata
   * ```
   */
  static async list(queryString?: string): Promise<Base<UomConversionDetail>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<UomConversionDetail>>(url)
  }

  /**
   * Creates a new UOM conversion detail
   *
   * @param data - UOM conversion detail creation data
   * @returns Promise resolving to the created UOM conversion detail object
   * @throws Error if validation fails or conversion detail already exists
   *
   * @example
   * ```typescript
   * const newDetail = await UomConversionDetailsService.create({
   *   headerId: 1,
   *   fromUomId: 5,
   *   toUomId: 6,
   *   conversionFactor: 12
   * })
   * ```
   */
  static async create(data: CreateUomConversionDetailDto): Promise<UomConversionDetail> {
    return ApiService.post<UomConversionDetail>(this.BASE_URL, data)
  }

  /**
   * Updates an existing UOM conversion detail
   *
   * @param id - The UOM conversion detail ID to update
   * @param data - UOM conversion detail update data
   * @returns Promise resolving to the updated UOM conversion detail object
   * @throws Error if UOM conversion detail not found or validation fails
   *
   * @example
   * ```typescript
   * const updated = await UomConversionDetailsService.update(1, {
   *   fromUomId: 5,
   *   toUomId: 6,
   *   conversionFactor: 15
   * })
   * ```
   */
  static async update(
    id: number,
    data: UpdateUomConversionDetailDto,
  ): Promise<UomConversionDetail> {
    return ApiService.patch<UomConversionDetail>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Deletes a UOM conversion detail by ID
   *
   * @param id - The UOM conversion detail ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if UOM conversion detail not found or cannot be deleted
   *
   * @example
   * ```typescript
   * await UomConversionDetailsService.delete(1)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
