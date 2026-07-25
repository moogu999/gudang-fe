import ApiService from './api'
import type {
  CreateReturnDeliveryOrderDto,
  ReturnDeliveryOrderResult,
} from '@/types/returnDeliveryOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

export class ReturnDeliveryOrdersService {
  private static readonly BASE_URL = API_ENDPOINTS.RETURN_DELIVERY_ORDERS

  static async create(data: CreateReturnDeliveryOrderDto): Promise<ReturnDeliveryOrderResult> {
    return ApiService.post<ReturnDeliveryOrderResult>(this.BASE_URL, data)
  }
}
