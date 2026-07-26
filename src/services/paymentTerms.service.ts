import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  PaymentTerm,
  CreatePaymentTermDto,
  UpdatePaymentTermDto,
} from '@/types/paymentTerm.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * PaymentTermsService
 *
 * Service for managing "Term of Payment" master data entries (e.g. NET 30, NET 45, COD).
 *
 * @example
 * ```typescript
 * // List all payment terms
 * const paymentTerms = await PaymentTermsService.list()
 *
 * // Create a new payment term
 * const newTerm = await PaymentTermsService.create({
 *   name: 'NET 90',
 *   days: 90,
 *   isActive: true,
 * })
 * ```
 */
export class PaymentTermsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PAYMENT_TERMS

  /**
   * Retrieve a paginated list of payment terms
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to a paginated list of payment terms
   */
  static async list(queryString?: string): Promise<Base<PaymentTerm>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PaymentTerm>>(url)
  }

  /**
   * Retrieve a single payment term by ID
   *
   * @param id - PaymentTerm ID
   * @returns Promise resolving to the payment term
   * @throws Error if payment term not found
   */
  static async getById(id: number): Promise<PaymentTerm> {
    return ApiService.get<PaymentTerm>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new payment term
   *
   * @param data - PaymentTerm creation data
   * @returns Promise resolving to the created payment term
   * @throws Error if validation fails
   */
  static async create(data: CreatePaymentTermDto): Promise<PaymentTerm> {
    return ApiService.post<PaymentTerm>(this.BASE_URL, data)
  }

  /**
   * Update an existing payment term
   *
   * @param id - PaymentTerm ID to update
   * @param data - Partial update data
   * @returns Promise resolving to the updated payment term
   * @throws Error if payment term not found or validation fails
   */
  static async update(id: number, data: UpdatePaymentTermDto): Promise<PaymentTerm> {
    return ApiService.patch<PaymentTerm>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a payment term
   *
   * @param id - PaymentTerm ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if payment term not found or is in use
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
