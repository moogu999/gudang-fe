import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  UnitOfMeasurement,
  CreateUnitOfMeasurementDto,
  UpdateUnitOfMeasurementDto,
} from '@/types/unitOfMeasurement.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * UnitOfMeasurementsService - Handles all Unit of Measurement-related API operations
 *
 * This service provides methods for CRUD operations on unit of measurements using
 * the generic API endpoints.
 *
 * @example
 * ```typescript
 * // List all units of measurements with query parameters
 * const uoms = await UnitOfMeasurementsService.list('limit=10&offset=0')
 *
 * // Create a new unit of measurement
 * const newUom = await UnitOfMeasurementsService.create({
 *   name: 'Centimeter',
 *   symbol: 'cm',
 *   createdBy: 1
 * })
 *
 * // Delete a unit of measurement
 * await UnitOfMeasurementsService.delete(1)
 * ```
 */
export class UnitOfMeasurementsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_UNIT_OF_MEASUREMENTS

  /**
   * Retrieves a list of unit of measurements with optional query parameters
   *
   * @param queryString - Optional URL query string for filtering, sorting, and pagination
   * @returns Promise resolving to paginated unit of measurements data
   * @throws Error if the API request fails
   *
   * @example
   * ```typescript
   * const result = await UnitOfMeasurementsService.list('limit=10&sort=name&order=asc')
   * console.log(result.data) // Array of unit of measurements
   * console.log(result.meta) // Pagination metadata
   * ```
   */
  static async list(queryString?: string): Promise<Base<UnitOfMeasurement>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<UnitOfMeasurement>>(url)
  }

  /**
   * Creates a new unit of measurement
   *
   * @param data - Unit of measurement creation data including name, symbol, and creator ID
   * @returns Promise resolving to the created unit of measurement object
   * @throws Error if validation fails or unit of measurement with same name already exists
   *
   * @example
   * ```typescript
   * const newUom = await UnitOfMeasurementsService.create({
   *   name: 'Kilogram',
   *   symbol: 'kg',
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async create(data: CreateUnitOfMeasurementDto): Promise<UnitOfMeasurement> {
    return ApiService.post<UnitOfMeasurement>(this.BASE_URL, data)
  }

  /**
   * Updates an existing unit of measurement
   *
   * @param id - The unit of measurement ID to update
   * @param data - Unit of measurement update data
   * @returns Promise resolving to the updated unit of measurement object
   * @throws Error if unit of measurement not found or validation fails
   *
   * @example
   * ```typescript
   * const updated = await UnitOfMeasurementsService.update(1, {
   *   name: 'Kilogram',
   *   symbol: 'kg'
   * })
   * ```
   */
  static async update(
    id: number,
    data: UpdateUnitOfMeasurementDto,
  ): Promise<UnitOfMeasurement> {
    return ApiService.patch<UnitOfMeasurement>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Deletes a unit of measurement by ID
   *
   * @param id - The unit of measurement ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if unit of measurement not found or cannot be deleted
   *
   * @example
   * ```typescript
   * await UnitOfMeasurementsService.delete(1)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
