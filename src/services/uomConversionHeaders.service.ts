import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  UomConversionHeader,
  CreateUomConversionHeaderDto,
  UpdateUomConversionHeaderDto,
} from '@/types/uomConversionHeader.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * UomConversionHeadersService - Handles all UOM Conversion Header-related API operations
 *
 * This service provides methods for CRUD operations on UOM conversion headers using
 * the generic API endpoints. UOM conversion headers represent reusable conversion sets
 * that can be shared across multiple products.
 *
 * @example
 * ```typescript
 * // List all UOM conversion headers with query parameters
 * const headers = await UomConversionHeadersService.list('limit=10&offset=0')
 *
 * // Create a new UOM conversion header
 * const newHeader = await UomConversionHeadersService.create({
 *   name: 'Standard Beverage Case Conversion',
 *   description: 'Conversion for beverage products',
 *   isActive: true,
 *   createdBy: 1
 * })
 *
 * // Delete a UOM conversion header
 * await UomConversionHeadersService.delete(1)
 * ```
 */
export class UomConversionHeadersService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_UOM_CONVERSION_HEADERS

  /**
   * Retrieves a list of UOM conversion headers with optional query parameters
   *
   * @param queryString - Optional URL query string for filtering, sorting, and pagination
   * @returns Promise resolving to paginated UOM conversion headers data
   * @throws Error if the API request fails
   *
   * @example
   * ```typescript
   * const result = await UomConversionHeadersService.list('limit=10&sort=name&order=asc')
   * console.log(result.data) // Array of UOM conversion headers
   * console.log(result.meta) // Pagination metadata
   * ```
   */
  static async list(queryString?: string): Promise<Base<UomConversionHeader>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<UomConversionHeader>>(url)
  }

  /**
   * Creates a new UOM conversion header
   *
   * @param data - UOM conversion header creation data including name, description, and creator ID
   * @returns Promise resolving to the created UOM conversion header object
   * @throws Error if validation fails or UOM conversion header with same name already exists
   *
   * @example
   * ```typescript
   * const newHeader = await UomConversionHeadersService.create({
   *   name: 'Standard Box Conversion',
   *   description: 'Standard conversion for box-based products',
   *   isActive: true,
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async create(data: CreateUomConversionHeaderDto): Promise<UomConversionHeader> {
    return ApiService.post<UomConversionHeader>(this.BASE_URL, data)
  }

  /**
   * Updates an existing UOM conversion header
   *
   * @param id - The UOM conversion header ID to update
   * @param data - UOM conversion header update data
   * @returns Promise resolving to the updated UOM conversion header object
   * @throws Error if UOM conversion header not found or validation fails
   *
   * @example
   * ```typescript
   * const updated = await UomConversionHeadersService.update(1, {
   *   name: 'Updated Conversion Name',
   *   description: 'Updated description',
   *   isActive: false
   * })
   * ```
   */
  static async update(
    id: number,
    data: UpdateUomConversionHeaderDto,
  ): Promise<UomConversionHeader> {
    return ApiService.patch<UomConversionHeader>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Deletes a UOM conversion header by ID
   *
   * @param id - The UOM conversion header ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if UOM conversion header not found or cannot be deleted
   *
   * @example
   * ```typescript
   * await UomConversionHeadersService.delete(1)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
