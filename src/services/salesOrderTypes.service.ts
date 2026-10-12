import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { SalesOrderType } from '@/types/salesOrderType.type'
import { API_ENDPOINTS } from '@/constants/api'

// Read-only: sales_order_types has no write permission and nothing in web or mobile
// ever called create/update/delete on it. See item "Bucket 2 is not read-only" in
// gudang-be/.claude/generic-crud-authorization-be.md — those three methods (and the
// backend's write endpoints for this resource) were deleted rather than kept as a 403
// waiting to surprise someone later.
export class SalesOrderTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SALES_ORDER_TYPES

  static async list(queryString?: string): Promise<Base<SalesOrderType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesOrderType>>(url)
  }
}
