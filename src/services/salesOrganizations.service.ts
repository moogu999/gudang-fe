import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  SalesOrganization,
  CreateSalesOrganizationDto,
  UpdateSalesOrganizationDto,
} from '@/types/salesOrganization.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing sales organization-related operations
 * Handles all HTTP requests for sales organization CRUD operations
 *
 * @example
 * ```typescript
 * // List sales organizations with pagination
 * const salesOrganizations = await SalesOrganizationsService.list('page=1&limit=10')
 *
 * // Create a new sales organization
 * await SalesOrganizationsService.create({
 *   name: 'North Region Sales',
 *   createdBy: 1
 * })
 *
 * // Delete a sales organization
 * await SalesOrganizationsService.delete(salesOrgId)
 * ```
 */
export class SalesOrganizationsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SALES_ORGANIZATIONS

  /**
   * Fetch paginated list of sales organizations
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated sales organization data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await SalesOrganizationsService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<SalesOrganization>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesOrganization>>(url)
  }

  /**
   * Create a new sales organization
   *
   * @param data - Sales organization creation data including name and creator ID
   * @returns Promise resolving to the created sales organization object
   * @throws Error if validation fails
   *
   * @example
   * ```typescript
   * const newSalesOrg = await SalesOrganizationsService.create({
   *   name: 'North Region Sales',
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateSalesOrganizationDto): Promise<SalesOrganization> {
    return ApiService.post<SalesOrganization>(this.BASE_URL, data)
  }

  /**
   * Update an existing sales organization
   *
   * @param id - The unique identifier of the sales organization to update
   * @param data - Sales organization update data (name)
   * @returns Promise resolving when update is complete
   * @throws Error if sales organization not found or validation fails
   *
   * @example
   * ```typescript
   * await SalesOrganizationsService.update(123, {
   *   name: 'Updated Sales Organization Name',
   *   updatedBy: 1
   * })
   * ```
   */
  static async update(id: number, data: UpdateSalesOrganizationDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a sales organization by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the sales organization to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if sales organization not found or deletion fails
   *
   * @example
   * ```typescript
   * await SalesOrganizationsService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
