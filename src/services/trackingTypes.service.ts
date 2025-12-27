import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { TrackingType } from '@/types/trackingType.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing tracking type operations
 * Handles all HTTP requests for tracking type read operations
 *
 * Note: Tracking types are system-defined and cannot be created, updated, or deleted
 *
 * @example
 * ```typescript
 * // List all tracking types
 * const trackingTypes = await TrackingTypesService.list()
 *
 * // Get a single tracking type
 * const trackingType = await TrackingTypesService.getById(1)
 * ```
 */
export class TrackingTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_TRACKING_TYPES

  /**
   * Fetch list of tracking types
   *
   * @param queryString - Optional query parameters for filtering and sorting
   * @returns Promise resolving to tracking type data
   *
   * @example
   * ```typescript
   * const result = await TrackingTypesService.list()
   * const trackingTypes = result.data
   * ```
   */
  static async list(queryString?: string): Promise<Base<TrackingType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<TrackingType>>(url)
  }

  /**
   * Fetch a single tracking type by ID
   *
   * @param id - The unique identifier of the tracking type
   * @returns Promise resolving to the tracking type object
   * @throws Error if tracking type not found
   *
   * @example
   * ```typescript
   * const trackingType = await TrackingTypesService.getById(1)
   * console.log(trackingType.name) // 'Non' or 'Lot'
   * ```
   */
  static async getById(id: number): Promise<TrackingType> {
    return ApiService.get<TrackingType>(`${this.BASE_URL}/${id}`)
  }
}
