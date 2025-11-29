import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Currency } from '@/types/currency.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing currency-related operations
 * Handles all HTTP requests for currency operations
 *
 * @example
 * ```typescript
 * // List currencies with pagination
 * const currencies = await CurrenciesService.list('page=1&limit=10')
 * ```
 */
export class CurrenciesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CURRENCIES

  /**
   * Fetch paginated list of currencies
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated currency data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('code', 'asc')
   *   .build()
   * const result = await CurrenciesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Currency>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Currency>>(url)
  }
}
