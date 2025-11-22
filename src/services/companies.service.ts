import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Company, CreateCompanyDto, UpdateCompanyDto } from '@/types/company.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing company-related operations
 * Handles all HTTP requests for company CRUD operations
 *
 * @example
 * ```typescript
 * // List companies with pagination
 * const companies = await CompaniesService.list('page=1&limit=10')
 *
 * // Create a new company
 * await CompaniesService.create({
 *   code: 'COMP001',
 *   name: 'ABC Corporation',
 *   address: '123 Business Street',
 *   taxId: 'TAX-123456',
 *   createdBy: 1
 * })
 *
 * // Delete a company
 * await CompaniesService.delete(companyId)
 * ```
 */
export class CompaniesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_COMPANIES

  /**
   * Fetch paginated list of companies
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated company data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await CompaniesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Company>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Company>>(url)
  }

  /**
   * Create a new company
   *
   * @param data - Company creation data including code, name, address, tax ID, and creator
   * @returns Promise resolving to the created company object
   * @throws Error if code already exists or validation fails
   *
   * @example
   * ```typescript
   * const newCompany = await CompaniesService.create({
   *   code: 'COMP001',
   *   name: 'ABC Corporation',
   *   address: '123 Business Street, City',
   *   taxId: 'TAX-123456',
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateCompanyDto): Promise<Company> {
    return ApiService.post<Company>(this.BASE_URL, data)
  }

  /**
   * Update an existing company
   *
   * @param id - The unique identifier of the company to update
   * @param data - Company update data (code, name, address, and/or tax ID)
   * @returns Promise resolving when update is complete
   * @throws Error if company not found or validation fails
   *
   * @example
   * ```typescript
   * await CompaniesService.update(123, {
   *   name: 'Updated Company Name',
   *   address: '456 New Business Street',
   *   updatedBy: 'admin@example.com'
   * })
   * ```
   */
  static async update(id: number, data: UpdateCompanyDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a company by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the company to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if company not found or deletion fails
   *
   * @example
   * ```typescript
   * await CompaniesService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
