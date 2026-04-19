import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  NumberSeries,
  CreateNumberSeriesDto,
  UpdateNumberSeriesDto,
  NumberSeriesPreview,
} from '@/types/numberSeries.type'
import { API_ENDPOINTS } from '@/constants/api'

export class NumberSeriesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_NUMBER_SERIES

  static async list(queryString?: string): Promise<Base<NumberSeries>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<NumberSeries>>(url)
  }

  static async getById(id: number): Promise<NumberSeries> {
    return ApiService.get<NumberSeries>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateNumberSeriesDto): Promise<NumberSeries> {
    return ApiService.post<NumberSeries>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateNumberSeriesDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }

  static async preview(entityType: string): Promise<NumberSeriesPreview> {
    return ApiService.get<NumberSeriesPreview>(
      `${API_ENDPOINTS.NUMBER_SERIES}/preview?entityType=${entityType}`,
    )
  }

  static async generateNext(id: number): Promise<{ code: string }> {
    return ApiService.post<{ code: string }>(`${API_ENDPOINTS.NUMBER_SERIES}/${id}/next`, {})
  }
}
