import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CashDepositCategory,
  CreateCashDepositCategoryDto,
  UpdateCashDepositCategoryDto,
} from '@/types/cashDeposit.type'
import { API_ENDPOINTS } from '@/constants/api'

/** Service for the Cash Deposit Category master — the ad-hoc line "Kategori" dropdown. */
export class CashDepositCategoriesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CASH_DEPOSIT_CATEGORIES

  static async list(queryString?: string): Promise<Base<CashDepositCategory>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CashDepositCategory>>(url)
  }

  static async create(data: CreateCashDepositCategoryDto): Promise<CashDepositCategory> {
    return ApiService.post<CashDepositCategory>(this.BASE_URL, data)
  }

  static async update(
    id: number,
    data: UpdateCashDepositCategoryDto,
  ): Promise<CashDepositCategory> {
    return ApiService.patch<CashDepositCategory>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
