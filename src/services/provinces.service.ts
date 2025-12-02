import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { ProvinceLite } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing province-related operations
 * Handles all HTTP requests for province operations
 *
 * @example
 * ```typescript
 * // List provinces with pagination
 * const provinces = await ProvincesService.list('page=1&limit=10')
 * ```
 */
export class ProvincesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PROVINCES

  /**
   * Fetch paginated list of provinces
   * Used primarily for dropdown selects in customer forms
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated province data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await ProvincesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<ProvinceLite>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ProvinceLite>>(url)
  }
}
