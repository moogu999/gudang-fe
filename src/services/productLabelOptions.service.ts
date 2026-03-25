import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ProductLabelOption,
  CreateProductLabelOptionDto,
  UpdateProductLabelOptionDto,
} from '@/types/productLabelDefinition.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing product label options
 *
 * Product label options are the allowed values for a product label definition.
 * Example: options "S", "M", "L" for definition "Size".
 */
export class ProductLabelOptionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PRODUCT_LABEL_OPTIONS

  /**
   * List all product label options
   *
   * @param queryString - Optional query string for filtering by productLabelDefinitionId, etc.
   * @returns Promise resolving to paginated list of product label options
   */
  static async list(queryString?: string): Promise<Base<ProductLabelOption>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ProductLabelOption>>(url)
  }

  /**
   * Get a product label option by ID
   *
   * @param id - Product label option ID
   * @returns Promise resolving to the product label option
   */
  static async getById(id: number): Promise<ProductLabelOption> {
    return ApiService.get<ProductLabelOption>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new product label option
   *
   * @param data - Product label option creation data
   * @returns Promise resolving to the created product label option
   */
  static async create(data: CreateProductLabelOptionDto): Promise<ProductLabelOption> {
    return ApiService.post<ProductLabelOption>(this.BASE_URL, data)
  }

  /**
   * Update an existing product label option
   *
   * @param id - Product label option ID
   * @param data - Update data
   * @returns Promise resolving to the updated product label option
   */
  static async update(id: number, data: UpdateProductLabelOptionDto): Promise<ProductLabelOption> {
    return ApiService.patch<ProductLabelOption>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a product label option
   *
   * Note: Will return 409 Conflict if the option is currently assigned to any products.
   *
   * @param id - Product label option ID
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
