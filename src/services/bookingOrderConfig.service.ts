import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { BookingOrderConfig, UpsertBookingOrderConfigDto } from '@/types/bookingOrderConfig.type'

export class BookingOrderConfigService {
  static async getMyBranch(): Promise<BookingOrderConfig | null> {
    try {
      return await ApiService.get<BookingOrderConfig>(API_ENDPOINTS.BOOKING_ORDER_CONFIG_MY_BRANCH)
    } catch {
      return null
    }
  }

  static async list(): Promise<BookingOrderConfig[]> {
    return ApiService.get<BookingOrderConfig[]>(API_ENDPOINTS.BOOKING_ORDER_CONFIGS)
  }

  static async upsert(branchId: number, dto: UpsertBookingOrderConfigDto): Promise<BookingOrderConfig> {
    return ApiService.put<BookingOrderConfig>(
      API_ENDPOINTS.BOOKING_ORDER_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.BOOKING_ORDER_CONFIG_BY_BRANCH(branchId))
  }
}
