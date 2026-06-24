import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { StockMovement, BalanceSnapshot } from '@/types/stockMovement.type'
import { API_ENDPOINTS } from '@/constants/api'

export class StockMovementsService {
  private static readonly BASE_URL = API_ENDPOINTS.STOCK_MOVEMENTS

  static async list(
    queryString?: string,
  ): Promise<Base<StockMovement> & { opening?: BalanceSnapshot }> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<StockMovement> & { opening?: BalanceSnapshot }>(url)
  }
}
