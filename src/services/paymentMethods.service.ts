import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  PaymentMethod,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '@/types/paymentMethod.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for the Payment Method master (Bank Transfer / Cash, plus whatever an
 * operator adds). The server branches AP Payment validation on `code`, never the
 * id or the name.
 */
export class PaymentMethodsService {
  private static readonly BASE_URL = API_ENDPOINTS.PAYMENT_METHODS

  static async list(queryString?: string): Promise<Base<PaymentMethod>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PaymentMethod>>(url)
  }

  static async getById(id: number): Promise<PaymentMethod> {
    return ApiService.get<PaymentMethod>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
    return ApiService.post<PaymentMethod>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    return ApiService.patch<PaymentMethod>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
