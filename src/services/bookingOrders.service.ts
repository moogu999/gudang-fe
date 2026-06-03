import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  BookableSalesOrder,
  SalesOrderFulfillment,
  CreateBookingOrderResult,
} from '@/types/bookingOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

export class BookingOrdersService {
  static async list(queryString?: string): Promise<Base<BookableSalesOrder>> {
    const url = queryString
      ? `${API_ENDPOINTS.BOOKING_ORDER_SALES_ORDERS}?${queryString}`
      : API_ENDPOINTS.BOOKING_ORDER_SALES_ORDERS
    return ApiService.get<Base<BookableSalesOrder>>(url)
  }

  static async evaluate(salesOrderIds: number[]): Promise<SalesOrderFulfillment[]> {
    return ApiService.post<SalesOrderFulfillment[]>(API_ENDPOINTS.BOOKING_ORDER_EVALUATE, {
      salesOrderIds,
    })
  }

  static async submit(salesOrderIds: number[]): Promise<CreateBookingOrderResult[]> {
    return ApiService.post<CreateBookingOrderResult[]>(API_ENDPOINTS.BOOKING_ORDERS, {
      salesOrderIds,
    })
  }
}
