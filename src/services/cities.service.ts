import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CityLite } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing city-related operations
 * Handles all HTTP requests for city operations
 *
 * @example
 * ```typescript
 * // List cities with pagination
 * const cities = await CitiesService.list('page=1&limit=10')
 * ```
 */
export class CitiesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CITIES

  /**
   * Fetch paginated list of cities
   * Used primarily for dropdown selects in customer forms
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated city data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await CitiesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<CityLite>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CityLite>>(url)
  }
}
