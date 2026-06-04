import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { DeliveryOrderListItem, DeliveryOrderDetail } from '@/types/deliveryOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

export class DeliveryOrdersService {
  static async list(queryString?: string): Promise<Base<DeliveryOrderListItem>> {
    const url = queryString
      ? `${API_ENDPOINTS.DELIVERY_ORDERS}?${queryString}`
      : API_ENDPOINTS.DELIVERY_ORDERS
    return ApiService.get<Base<DeliveryOrderListItem>>(url)
  }

  static async get(id: number): Promise<DeliveryOrderDetail> {
    return ApiService.get<DeliveryOrderDetail>(API_ENDPOINTS.DELIVERY_ORDER_BY_ID(id))
  }

  static async cancel(id: number): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.DELIVERY_ORDER_CANCEL(id), {})
  }
}
