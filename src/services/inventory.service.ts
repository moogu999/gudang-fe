import ApiService from './api'
import type { InventorySummary } from '@/types/inventoryBalance.type'
import { API_ENDPOINTS } from '@/constants/api'

export class InventoryService {
  static async summary(warehouseId?: number): Promise<InventorySummary> {
    const url = warehouseId
      ? `${API_ENDPOINTS.INVENTORY_SUMMARY}?warehouseId=${warehouseId}`
      : API_ENDPOINTS.INVENTORY_SUMMARY
    return ApiService.get<InventorySummary>(url)
  }
}
