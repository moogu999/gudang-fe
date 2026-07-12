import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  PriceList,
  PriceListSummary,
  CreatePriceListDto,
  UpdatePriceListDto,
} from '@/types/price-list'
import { API_ENDPOINTS } from '@/constants/api'

export class PriceListsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PRICE_LISTS
  private static readonly CUSTOM_URL = API_ENDPOINTS.PRICE_LISTS

  static async list(queryString?: string): Promise<Base<PriceListSummary>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PriceListSummary>>(url)
  }

  static async getById(id: number): Promise<PriceList> {
    return ApiService.get<PriceList>(`${this.CUSTOM_URL}/${id}`)
  }

  static async create(data: CreatePriceListDto): Promise<PriceList> {
    return ApiService.post<PriceList>(this.CUSTOM_URL, data)
  }

  static async update(id: number, data: UpdatePriceListDto): Promise<PriceList> {
    return ApiService.put<PriceList>(`${this.CUSTOM_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.CUSTOM_URL}/${id}`)
  }
}
