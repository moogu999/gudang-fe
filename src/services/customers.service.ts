import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing customer-related operations
 * Handles all HTTP requests for customer CRUD operations
 *
 * @example
 * ```typescript
 * // List customers with pagination
 * const customers = await CustomersService.list('page=1&limit=10')
 *
 * // Get a single customer
 * const customer = await CustomersService.getById(123)
 *
 * // Create a new customer
 * await CustomersService.create({
 *   name: 'ABC Company',
 *   taxable: true,
 *   address: '123 Business Street',
 *   currencyId: 1,
 *   createdBy: 1
 * })
 *
 * // Update a customer
 * await CustomersService.update(123, {
 *   name: 'Updated Company Name',
 *   updatedBy: 1
 * })
 *
 * // Delete a customer
 * await CustomersService.delete(customerId)
 * ```
 */
export class CustomersService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CUSTOMERS

  /**
   * Fetch paginated list of customers
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated customer data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await CustomersService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Customer>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Customer>>(url)
  }

  /**
   * Fetch a single customer by ID
   *
   * @param id - The unique identifier of the customer
   * @returns Promise resolving to the customer object
   * @throws Error if customer not found
   *
   * @example
   * ```typescript
   * const customer = await CustomersService.getById(123)
   * console.log(customer.name)
   * ```
   */
  static async getById(id: number): Promise<Customer> {
    return ApiService.get<Customer>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new customer
   *
   * @param data - Customer creation data including name, address, location details, and creator
   * @returns Promise resolving to the created customer object
   * @throws Error if validation fails
   *
   * @example
   * ```typescript
   * const newCustomer = await CustomersService.create({
   *   name: 'ABC Company',
   *   taxable: true,
   *   address: '123 Business Street',
   *   currencyId: 1,
   *   countryId: 1,
   *   provinceId: 2,
   *   cityId: 3,
   *   zipCode: '12345',
   *   createdBy: 1
   * })
   * ```
   */
  static async create(data: CreateCustomerDto): Promise<Customer> {
    return ApiService.post<Customer>(this.BASE_URL, data)
  }

  /**
   * Update an existing customer
   *
   * @param id - The unique identifier of the customer to update
   * @param data - Customer update data
   * @returns Promise resolving when update is complete
   * @throws Error if customer not found or validation fails
   *
   * @example
   * ```typescript
   * await CustomersService.update(123, {
   *   name: 'Updated Company Name',
   *   address: '456 New Business Street',
   *   updatedBy: 1
   * })
   * ```
   */
  static async update(id: number, data: UpdateCustomerDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a customer by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the customer to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if customer not found or deletion fails
   *
   * @example
   * ```typescript
   * await CustomersService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
