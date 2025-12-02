import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CountryLite } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing country-related operations
 * Handles all HTTP requests for country operations
 *
 * @example
 * ```typescript
 * // List countries with pagination
 * const countries = await CountriesService.list('page=1&limit=10')
 * ```
 */
export class CountriesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_COUNTRIES

  /**
   * Fetch paginated list of countries
   * Used primarily for dropdown selects in customer forms
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated country data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await CountriesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<CountryLite>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CountryLite>>(url)
  }
}
