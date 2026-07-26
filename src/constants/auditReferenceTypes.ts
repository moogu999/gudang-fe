import { API_ENDPOINTS } from './api'
import type { Base } from '@/types/api.type'

export type AuditReferenceTypeEntry = {
  label: string
  labelKey: string
  listEndpoint: string
  fetchFn: (query: string) => Promise<Base<Record<string, unknown>>>
  codeField: string
}

/**
 * Builds the `fetchFn` for a reference-type entry.
 *
 * Every entry hits its own list endpoint the same way — lazy-import ApiService
 * so the registry stays free of a static service dependency, then append the
 * query string when there is one. Only the endpoint differs, so it is the only
 * parameter.
 */
function makeListFetchFn(endpoint: string): AuditReferenceTypeEntry['fetchFn'] {
  return async (query: string) => {
    const { default: ApiService } = await import('@/services/api')
    const url = query ? `${endpoint}?${query}` : endpoint
    return ApiService.get<Base<Record<string, unknown>>>(url)
  }
}

export const AUDIT_REFERENCE_TYPES: Record<string, AuditReferenceTypeEntry> = {
  promotion: {
    label: 'Promotion',
    labelKey: 'auditTrails.references.promotion',
    listEndpoint: API_ENDPOINTS.GEN_PROMOTIONS,
    fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PROMOTIONS),
    codeField: 'code',
  },
  employee: {
    label: 'Employee',
    labelKey: 'auditTrails.references.employee',
    listEndpoint: API_ENDPOINTS.EMPLOYEES,
    fetchFn: makeListFetchFn(API_ENDPOINTS.EMPLOYEES),
    codeField: 'name',
  },
  customer: {
    label: 'Customer',
    labelKey: 'auditTrails.references.customer',
    listEndpoint: API_ENDPOINTS.GEN_CUSTOMERS,
    fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_CUSTOMERS),
    codeField: 'name',
  },
  price_list: {
    label: 'Price List',
    labelKey: 'auditTrails.references.price_list',
    listEndpoint: API_ENDPOINTS.GEN_PRICE_LISTS,
    fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PRICE_LISTS),
    codeField: 'code',
  },
  price_matrix: {
    label: 'Price Matrix',
    labelKey: 'auditTrails.references.price_matrix',
    listEndpoint: API_ENDPOINTS.GEN_PRICE_MATRICES,
    fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PRICE_MATRICES),
    codeField: 'code',
  },
  product: {
    label: 'Product',
    labelKey: 'auditTrails.references.product',
    listEndpoint: API_ENDPOINTS.GEN_PRODUCTS,
    fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PRODUCTS),
    codeField: 'code',
  },
}
