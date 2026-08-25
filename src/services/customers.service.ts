import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCustomerV1Dto,
  UpdateCustomerV1Dto,
} from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import { labelFilterParam } from './labelFilter'

/** The filters `/v1/customers` reads by name. */
const toListQuery = createListQueryAdapter([
  'outletTypeId',
  'channelId',
  'categoryId',
  'areaId',
  'isActive',
  'isDraft',
])

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
   * Translates a generic CRUD query string into the parameters `/v1/customers`
   * reads.
   *
   * Pass this as `TableComponent`'s `query-adapter` only while the table points
   * at `/v1/customers` — the label-filtered list. On `/gen/v1/customers` the
   * generic dialect is what the endpoint wants, and translating it would break
   * the search this is meant to fix.
   */
  static readonly toListQuery = toListQuery

  /**
   * Spells one label filter the way `/v1/customers` reads it.
   *
   * @see {@link labelFilterParam} for the format and why it is not nested.
   */
  static readonly labelFilterParam = labelFilterParam

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

  /**
   * Set (replace) all label assignments for a customer
   *
   * Atomically replaces all label assignments. Pass an empty array to clear all labels.
   *
   * @param customerId - Customer ID
   * @param labels - Array of label definition + option pairs
   */
  static async setLabels(
    customerId: number,
    labels: { labelDefinitionId: number; labelOptionId: number }[],
  ): Promise<void> {
    return ApiService.put<void>(`${API_ENDPOINTS.CUSTOMERS_V1}/${customerId}/labels`, { labels })
  }

  // ─── V1 full-feature methods (with child entities + draft support) ───────────

  static async v1List(queryString?: string): Promise<Base<Customer>> {
    const base = API_ENDPOINTS.CUSTOMERS_V1_FULL
    const url = queryString ? `${base}?${queryString}` : base
    return ApiService.get<Base<Customer>>(url)
  }

  static async v1Get(id: number): Promise<Customer> {
    return ApiService.get<Customer>(`${API_ENDPOINTS.CUSTOMERS_V1_FULL}/${id}`)
  }

  static async v1Create(data: CreateCustomerV1Dto): Promise<Customer> {
    return ApiService.post<Customer>(API_ENDPOINTS.CUSTOMERS_V1_FULL, data)
  }

  static async v1Update(id: number, data: UpdateCustomerV1Dto): Promise<Customer> {
    return ApiService.put<Customer>(`${API_ENDPOINTS.CUSTOMERS_V1_FULL}/${id}`, data)
  }

  static async v1Delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${API_ENDPOINTS.CUSTOMERS_V1_FULL}/${id}`)
  }
}
