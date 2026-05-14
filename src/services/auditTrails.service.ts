import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { AuditTrailListItem, AuditTrail } from '@/types/auditTrail.type'
import { API_ENDPOINTS } from '@/constants/api'

export class AuditTrailsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_AUDIT_TRAILS
  private static readonly CUSTOM_URL = API_ENDPOINTS.AUDIT_TRAILS

  static async list(queryString?: string): Promise<Base<AuditTrailListItem>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<AuditTrailListItem>>(url)
  }

  static async getById(id: number): Promise<AuditTrail> {
    return ApiService.get<AuditTrail>(`${this.BASE_URL}/${id}`)
  }
}
