import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { SubDistrictLite } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing sub-district-related operations
 * Handles all HTTP requests for sub-district operations
 *
 * @example
 * ```typescript
 * // List sub-districts with pagination
 * const subDistricts = await SubDistrictsService.list('page=1&limit=10')
 * ```
 */
export class SubDistrictsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SUB_DISTRICTS

  /**
   * Fetch paginated list of sub-districts
   * Used primarily for dropdown selects in customer forms
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated sub-district data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await SubDistrictsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<SubDistrictLite>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SubDistrictLite>>(url)
  }
}
