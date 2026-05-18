import { API_ENDPOINTS } from './api'
import type { Base } from '@/types/api.type'

export type AuditReferenceTypeEntry = {
  label: string
  labelKey: string
  listEndpoint: string
  fetchFn: (query: string) => Promise<Base<Record<string, unknown>>>
  codeField: string
}

export const AUDIT_REFERENCE_TYPES: Record<string, AuditReferenceTypeEntry> = {
  promotion: {
    label: 'Promotion',
    labelKey: 'auditTrails.references.promotion',
    listEndpoint: API_ENDPOINTS.GEN_PROMOTIONS,
    fetchFn: async (query: string) => {
      const { default: ApiService } = await import('@/services/api')
      const url = query ? `${API_ENDPOINTS.GEN_PROMOTIONS}?${query}` : API_ENDPOINTS.GEN_PROMOTIONS
      return ApiService.get<Base<Record<string, unknown>>>(url)
    },
    codeField: 'code',
  },
  employee: {
    label: 'Employee',
    labelKey: 'auditTrails.references.employee',
    listEndpoint: API_ENDPOINTS.EMPLOYEES,
    fetchFn: async (query: string) => {
      const { default: ApiService } = await import('@/services/api')
      const url = query ? `${API_ENDPOINTS.EMPLOYEES}?${query}` : API_ENDPOINTS.EMPLOYEES
      return ApiService.get<Base<Record<string, unknown>>>(url)
    },
    codeField: 'name',
  },
}
