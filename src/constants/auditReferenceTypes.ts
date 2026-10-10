import { API_ENDPOINTS } from './api'
import type { Base } from '@/types/api.type'

export type AuditReferenceTypeEntry = {
  label: string
  labelKey: string
  /**
   * How to pick a reference of this type. Absent for entities with no list
   * endpoint (a salesman's phone, an activation code): the filter then takes
   * the reference id as typed.
   */
  picker?: {
    listEndpoint: string
    fetchFn: (query: string) => Promise<Base<Record<string, unknown>>>
    codeField: string
  }
}

/**
 * Builds the `fetchFn` for a reference-type entry.
 *
 * Every entry hits its own list endpoint the same way — lazy-import ApiService
 * so the registry stays free of a static service dependency, then append the
 * query string when there is one. Only the endpoint differs, so it is the only
 * parameter.
 */
type ReferenceFetchFn = NonNullable<AuditReferenceTypeEntry['picker']>['fetchFn']

function makeListFetchFn(endpoint: string): ReferenceFetchFn {
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
    picker: {
      listEndpoint: API_ENDPOINTS.GEN_PROMOTIONS,
      fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PROMOTIONS),
      codeField: 'code',
    },
  },
  employee: {
    label: 'Employee',
    labelKey: 'auditTrails.references.employee',
    picker: {
      listEndpoint: API_ENDPOINTS.EMPLOYEES,
      fetchFn: makeListFetchFn(API_ENDPOINTS.EMPLOYEES),
      codeField: 'name',
    },
  },
  customer: {
    label: 'Customer',
    labelKey: 'auditTrails.references.customer',
    picker: {
      listEndpoint: API_ENDPOINTS.GEN_CUSTOMERS,
      fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_CUSTOMERS),
      codeField: 'name',
    },
  },
  price_list: {
    label: 'Price List',
    labelKey: 'auditTrails.references.price_list',
    picker: {
      listEndpoint: API_ENDPOINTS.GEN_PRICE_LISTS,
      fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PRICE_LISTS),
      codeField: 'code',
    },
  },
  price_matrix: {
    label: 'Price Matrix',
    labelKey: 'auditTrails.references.price_matrix',
    picker: {
      listEndpoint: API_ENDPOINTS.GEN_PRICE_MATRICES,
      fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PRICE_MATRICES),
      codeField: 'code',
    },
  },
  product: {
    label: 'Product',
    labelKey: 'auditTrails.references.product',
    picker: {
      listEndpoint: API_ENDPOINTS.GEN_PRODUCTS,
      fetchFn: makeListFetchFn(API_ENDPOINTS.GEN_PRODUCTS),
      codeField: 'code',
    },
  },
  // N-Force device binding. Only the account events are keyed by an employee;
  // the others reference rows that have no list of their own.
  nforce_account: {
    label: 'N-Force Account',
    labelKey: 'auditTrails.references.nforce_account',
    picker: {
      listEndpoint: API_ENDPOINTS.EMPLOYEES,
      fetchFn: async (query: string) => {
        const { EmployeesService } = await import('@/services/employees.service')
        const res = await EmployeesService.list(EmployeesService.toListQuery(query))
        return res as unknown as Base<Record<string, unknown>>
      },
      codeField: 'name',
    },
  },
  employee_device: {
    label: 'Salesman Device',
    labelKey: 'auditTrails.references.employee_device',
  },
  activation_code: {
    label: 'Activation Code',
    labelKey: 'auditTrails.references.activation_code',
  },
  device_block: {
    label: 'Device Block',
    labelKey: 'auditTrails.references.device_block',
  },
  device_binding_config: {
    label: 'Device Binding Config',
    labelKey: 'auditTrails.references.device_binding_config',
  },
}
