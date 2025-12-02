import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { DistrictLite } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing district-related operations
 * Handles all HTTP requests for district operations
 *
 * @example
 * ```typescript
 * // List districts with pagination
 * const districts = await DistrictsService.list('page=1&limit=10')
 * ```
 */
export class DistrictsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_DISTRICTS

  /**
   * Fetch paginated list of districts
   * Used primarily for dropdown selects in customer forms
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated district data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await DistrictsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<DistrictLite>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<DistrictLite>>(url)
  }
}
