import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CustomerLabelOption,
  CreateCustomerLabelOptionDto,
  UpdateCustomerLabelOptionDto,
} from '@/types/customerLabelDefinition.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing customer label options
 *
 * Customer label options are the allowed values for a customer label definition.
 * Example: options "S", "M", "L" for definition "Size".
 */
export class CustomerLabelOptionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CUSTOMER_LABEL_OPTIONS

  /**
   * List all customer label options
   *
   * @param queryString - Optional query string for filtering by customerLabelDefinitionId, etc.
   * @returns Promise resolving to paginated list of customer label options
   */
  static async list(queryString?: string): Promise<Base<CustomerLabelOption>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CustomerLabelOption>>(url)
  }

  /**
   * Get a customer label option by ID
   *
   * @param id - Customer label option ID
   * @returns Promise resolving to the customer label option
   */
  static async getById(id: number): Promise<CustomerLabelOption> {
    return ApiService.get<CustomerLabelOption>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new customer label option
   *
   * @param data - Customer label option creation data
   * @returns Promise resolving to the created customer label option
   */
  static async create(data: CreateCustomerLabelOptionDto): Promise<CustomerLabelOption> {
    return ApiService.post<CustomerLabelOption>(this.BASE_URL, data)
  }

  /**
   * Update an existing customer label option
   *
   * @param id - Customer label option ID
   * @param data - Update data
   * @returns Promise resolving to the updated customer label option
   */
  static async update(
    id: number,
    data: UpdateCustomerLabelOptionDto,
  ): Promise<CustomerLabelOption> {
    return ApiService.patch<CustomerLabelOption>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a customer label option
   *
   * Note: Will return 409 Conflict if the option is currently assigned to any customers.
   *
   * @param id - Customer label option ID
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
