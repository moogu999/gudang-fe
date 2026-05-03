import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CustomerLabelDefinition,
  CreateCustomerLabelDefinitionDto,
  UpdateCustomerLabelDefinitionDto,
} from '@/types/customerLabelDefinition.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing customer label definitions
 *
 * Customer label definitions are company-scoped label names with predefined
 * allowed values. Example: "Size" with options S/M/L.
 */
export class CustomerLabelDefinitionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CUSTOMER_LABEL_DEFINITIONS

  /**
   * List all customer label definitions
   *
   * @param queryString - Optional query string for filtering, sorting, pagination
   * @returns Promise resolving to paginated list of customer label definitions
   */
  static async list(queryString?: string): Promise<Base<CustomerLabelDefinition>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CustomerLabelDefinition>>(url)
  }

  /**
   * Get a customer label definition by ID
   *
   * @param id - Customer label definition ID
   * @returns Promise resolving to the customer label definition
   */
  static async getById(id: number): Promise<CustomerLabelDefinition> {
    return ApiService.get<CustomerLabelDefinition>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new customer label definition
   *
   * @param data - Customer label definition creation data
   * @returns Promise resolving to the created customer label definition
   */
  static async create(data: CreateCustomerLabelDefinitionDto): Promise<CustomerLabelDefinition> {
    return ApiService.post<CustomerLabelDefinition>(this.BASE_URL, data)
  }

  /**
   * Update an existing customer label definition
   *
   * @param id - Customer label definition ID
   * @param data - Update data
   * @returns Promise resolving to the updated customer label definition
   */
  static async update(
    id: number,
    data: UpdateCustomerLabelDefinitionDto,
  ): Promise<CustomerLabelDefinition> {
    return ApiService.patch<CustomerLabelDefinition>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a customer label definition
   *
   * Note: Cascades to delete all associated options.
   * Will fail if any options are currently assigned to customers.
   *
   * @param id - Customer label definition ID
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
