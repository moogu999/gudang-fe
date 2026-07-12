import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  PriceMatrix,
  PriceMatrixPriorityItem,
  PriceMatrixSummary,
  CreatePriceMatrixDto,
  UpdatePriceMatrixDto,
} from '@/types/price-matrix.type'
import { API_ENDPOINTS } from '@/constants/api'

export class PriceMatricesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PRICE_MATRICES
  private static readonly CUSTOM_URL = API_ENDPOINTS.PRICE_MATRICES

  static async list(queryString?: string): Promise<Base<PriceMatrixSummary>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PriceMatrixSummary>>(url)
  }

  static async getById(id: number): Promise<PriceMatrix> {
    return ApiService.get<PriceMatrix>(`${this.CUSTOM_URL}/${id}`)
  }

  static async create(data: CreatePriceMatrixDto): Promise<PriceMatrix> {
    return ApiService.post<PriceMatrix>(this.CUSTOM_URL, data)
  }

  static async update(id: number, data: UpdatePriceMatrixDto): Promise<PriceMatrix> {
    return ApiService.put<PriceMatrix>(`${this.CUSTOM_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.CUSTOM_URL}/${id}`)
  }

  static async getPriorities(branchId: number): Promise<{ data: PriceMatrixPriorityItem[] }> {
    return ApiService.get<{ data: PriceMatrixPriorityItem[] }>(
      `${API_ENDPOINTS.PRICE_MATRIX_PRIORITIES}?branchId=${branchId}`,
    )
  }

  static async addToPriorityList(priceMatrixId: number, branchId: number): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.PRICE_MATRIX_PRIORITY_LIST, {
      priceMatrixId,
      branchId,
    })
  }

  static async removeFromPriorityList(priceMatrixId: number, branchId: number): Promise<void> {
    return ApiService.delete<void>(
      `${API_ENDPOINTS.PRICE_MATRIX_PRIORITY_LIST_ITEM(priceMatrixId)}?branchId=${branchId}`,
    )
  }

  static async movePriority(id: number, direction: 'up' | 'down', branchId: number): Promise<void> {
    return ApiService.patch<void>(API_ENDPOINTS.PRICE_MATRIX_PRIORITY(id), {
      direction,
      branchId,
    })
  }
}
