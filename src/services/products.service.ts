import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Product, CreateProductDto, UpdateProductDto } from '@/types/product.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing product-related operations
 * Handles all HTTP requests for product CRUD operations
 *
 * @example
 * ```typescript
 * // List products with pagination
 * const products = await ProductsService.list('page=1&limit=10')
 *
 * // Get a single product
 * const product = await ProductsService.getById(123)
 *
 * // Create a new product
 * await ProductsService.create({
 *   code: 'PROD001',
 *   name: 'Sample Product',
 *   description: 'Product description',
 *   taxable: true,
 *   trackingTypeId: 1,
 *   productBaseUomId: 1,
 *   createdBy: 1
 * })
 *
 * // Update a product
 * await ProductsService.update(123, {
 *   name: 'Updated Product Name',
 *   updatedBy: 1
 * })
 *
 * // Delete a product
 * await ProductsService.delete(productId)
 * ```
 */
export class ProductsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PRODUCTS

  /**
   * Fetch paginated list of products
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated product data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('code', 'asc')
   *   .build()
   * const result = await ProductsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Product>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Product>>(url)
  }

  /**
   * Fetch a single product by ID
   *
   * @param id - The unique identifier of the product
   * @returns Promise resolving to the product object
   * @throws Error if product not found
   *
   * @example
   * ```typescript
   * const product = await ProductsService.getById(123)
   * console.log(product.name)
   * ```
   */
  static async getById(id: number): Promise<Product> {
    return ApiService.get<Product>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new product
   *
   * @param data - Product creation data including code, name, tracking type, and UOM configuration
   * @returns Promise resolving to the created product object
   * @throws Error if validation fails or code already exists
   *
   * @example
   * ```typescript
   * const newProduct = await ProductsService.create({
   *   code: 'PROD001',
   *   name: 'Sample Product',
   *   description: 'A sample product for demonstration',
   *   taxable: true,
   *   trackingTypeId: 1, // Non-tracking
   *   productBaseUomId: 1, // Optional UOM configuration
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateProductDto): Promise<Product> {
    return ApiService.post<Product>(this.BASE_URL, data)
  }

  /**
   * Update an existing product
   *
   * @param id - The unique identifier of the product to update
   * @param data - Product update data
   * @returns Promise resolving when update is complete
   * @throws Error if product not found or validation fails
   *
   * @example
   * ```typescript
   * await ProductsService.update(123, {
   *   name: 'Updated Product Name',
   *   description: 'Updated description',
   *   updatedBy: 1
   * })
   * ```
   */
  static async update(id: number, data: UpdateProductDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a product by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the product to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if product not found or deletion fails
   *
   * @example
   * ```typescript
   * await ProductsService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
