import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ProductLabelDefinition,
  CreateProductLabelDefinitionDto,
  UpdateProductLabelDefinitionDto,
} from '@/types/productLabelDefinition.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing product label definitions
 *
 * Product label definitions are company-scoped label names with predefined
 * allowed values. Example: "Size" with options S/M/L.
 */
export class ProductLabelDefinitionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PRODUCT_LABEL_DEFINITIONS

  /**
   * List all product label definitions
   *
   * @param queryString - Optional query string for filtering, sorting, pagination
   * @returns Promise resolving to paginated list of product label definitions
   */
  static async list(queryString?: string): Promise<Base<ProductLabelDefinition>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ProductLabelDefinition>>(url)
  }

  /**
   * Get a product label definition by ID
   *
   * @param id - Product label definition ID
   * @returns Promise resolving to the product label definition
   */
  static async getById(id: number): Promise<ProductLabelDefinition> {
    return ApiService.get<ProductLabelDefinition>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new product label definition
   *
   * @param data - Product label definition creation data
   * @returns Promise resolving to the created product label definition
   */
  static async create(data: CreateProductLabelDefinitionDto): Promise<ProductLabelDefinition> {
    return ApiService.post<ProductLabelDefinition>(this.BASE_URL, data)
  }

  /**
   * Update an existing product label definition
   *
   * @param id - Product label definition ID
   * @param data - Update data
   * @returns Promise resolving to the updated product label definition
   */
  static async update(
    id: number,
    data: UpdateProductLabelDefinitionDto,
  ): Promise<ProductLabelDefinition> {
    return ApiService.patch<ProductLabelDefinition>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a product label definition
   *
   * Note: Cascades to delete all associated options.
   * Will fail if any options are currently assigned to products.
   *
   * @param id - Product label definition ID
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
