import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ProductBaseUom,
  CreateProductBaseUomDto,
  UpdateProductBaseUomDto,
} from '@/types'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * ProductBaseUomsService
 *
 * Service for managing product base UOM configurations.
 * Handles CRUD operations for base UOM settings that bundle together:
 * - Conversion header (defines all UOM conversions)
 * - Base UOM (smallest unit for calculations)
 * - Default display UOM (default unit for UI display)
 *
 * @example
 * ```typescript
 * // List all product base UOMs
 * const productBaseUoms = await ProductBaseUomsService.list()
 *
 * // Create a new product base UOM
 * const newProductBaseUom = await ProductBaseUomsService.create({
 *   name: 'Standard Beverage UOM',
 *   uomConversionHeaderId: 1,
 *   baseUomId: 5,
 *   defaultDisplayUomId: 3
 * })
 * ```
 */
export class ProductBaseUomsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PRODUCT_BASE_UOMS

  /**
   * Retrieve a paginated list of product base UOMs
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to a paginated list of product base UOMs
   *
   * @example
   * ```typescript
   * // Get all product base UOMs
   * const result = await ProductBaseUomsService.list()
   *
   * // Get with filters
   * const filtered = await ProductBaseUomsService.list('name=Standard&limit=10')
   * ```
   */
  static async list(queryString?: string): Promise<Base<ProductBaseUom>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ProductBaseUom>>(url)
  }

  /**
   * Retrieve a single product base UOM by ID
   *
   * @param id - Product base UOM ID
   * @returns Promise resolving to the product base UOM
   * @throws Error if product base UOM not found
   *
   * @example
   * ```typescript
   * const productBaseUom = await ProductBaseUomsService.getById(1)
   * console.log(productBaseUom.name) // "Standard Beverage UOM"
   * ```
   */
  static async getById(id: number): Promise<ProductBaseUom> {
    return ApiService.get<ProductBaseUom>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new product base UOM configuration
   *
   * @param data - Product base UOM creation data
   * @returns Promise resolving to the created product base UOM
   * @throws Error if validation fails or name already exists
   *
   * @example
   * ```typescript
   * const newProductBaseUom = await ProductBaseUomsService.create({
   *   name: 'Standard Beverage UOM',
   *   uomConversionHeaderId: 1,
   *   baseUomId: 5,
   *   defaultDisplayUomId: 3
   * })
   * ```
   */
  static async create(data: CreateProductBaseUomDto): Promise<ProductBaseUom> {
    return ApiService.post<ProductBaseUom>(this.BASE_URL, data)
  }

  /**
   * Update an existing product base UOM
   *
   * @param id - Product base UOM ID to update
   * @param data - Partial update data
   * @returns Promise resolving to the updated product base UOM
   * @throws Error if product base UOM not found or validation fails
   *
   * @example
   * ```typescript
   * const updated = await ProductBaseUomsService.update(1, {
   *   name: 'Updated Beverage UOM'
   * })
   * ```
   */
  static async update(id: number, data: UpdateProductBaseUomDto): Promise<ProductBaseUom> {
    return ApiService.patch<ProductBaseUom>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a product base UOM
   *
   * @param id - Product base UOM ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if product base UOM not found or is in use
   *
   * @example
   * ```typescript
   * await ProductBaseUomsService.delete(1)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
