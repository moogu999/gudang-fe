import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CogsCalculationMethod } from '@/types/cogsCalculationMethod.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing COGS calculation method-related operations
 * Handles all HTTP requests for COGS calculation method CRUD operations
 *
 * @example
 * ```typescript
 * // List COGS calculation methods with pagination
 * const methods = await CogsCalculationMethodsService.list('page=1&limit=10')
 * ```
 */
export class CogsCalculationMethodsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_COGS_CALCULATION_METHODS

  /**
   * Fetch paginated list of COGS calculation methods
   * Used primarily by InfiniteSelect for dropdown data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated COGS calculation method data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('code', 'asc')
   *   .build()
   * const result = await CogsCalculationMethodsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<CogsCalculationMethod>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CogsCalculationMethod>>(url)
  }
}
