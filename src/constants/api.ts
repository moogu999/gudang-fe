/**
 * API endpoint constants
 * Centralized location for all API URLs
 */

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH_SIGN_IN: '/v1/auth/sign-in',
  AUTH_SIGN_OUT: '/v1/auth/sign-out',
  AUTH_REFRESH: '/v1/auth/refresh',
  AUTH_ME: '/v1/auth/me',

  // User endpoints
  GEN_USERS: '/gen/v1/users',
  USERS_V1: '/v1/users',

  // Role endpoints
  GEN_ROLES: '/gen/v1/roles',

  // Permission endpoints
  GEN_PERMISSIONS: '/gen/v1/permissions',

  // Role-Permission endpoints
  GEN_ROLE_PERMISSIONS: '/gen/v1/role-permissions',

  // User-Role endpoints
  GEN_USER_ROLES: '/gen/v1/user-roles',

  // Branch endpoints
  GEN_BRANCHES: '/gen/v1/branches',

  // Company endpoints
  GEN_COMPANIES: '/gen/v1/companies',

  // Company-Branch endpoints
  GEN_COMPANY_BRANCHES: '/gen/v1/company-branches',

  // Department endpoints
  GEN_DEPARTMENTS: '/gen/v1/departments',

  // Division endpoints
  GEN_DIVISIONS: '/gen/v1/divisions',

  // Department-Division endpoints
  GEN_DEPARTMENT_DIVISIONS: '/gen/v1/department-divisions',

  // Branch Holiday endpoints
  GEN_BRANCH_HOLIDAYS: '/gen/v1/branch-holidays',

  // Sales Organization endpoints
  GEN_SALES_ORGANIZATIONS: '/gen/v1/sales-organizations',

  // Sales Organization-Branch endpoints
  GEN_SALES_ORGANIZATION_BRANCHES: '/gen/v1/sales-organization-branches',

  // User-Branch endpoints
  GEN_USER_BRANCHES: '/gen/v1/user-branches',

  // Currency endpoints
  GEN_CURRENCIES: '/gen/v1/currencies',

  // COGS Calculation Method endpoints
  GEN_COGS_CALCULATION_METHODS: '/gen/v1/cogs-calculation-methods',

  // Customer endpoints
  GEN_CUSTOMERS: '/gen/v1/customers',

  // Location endpoints
  GEN_COUNTRIES: '/gen/v1/countries',
  GEN_PROVINCES: '/gen/v1/provinces',
  GEN_CITIES: '/gen/v1/cities',
  GEN_DISTRICTS: '/gen/v1/districts',
  GEN_SUB_DISTRICTS: '/gen/v1/sub-districts',

  // Unit of Measurement endpoints
  GEN_UNIT_OF_MEASUREMENTS: '/gen/v1/unit-of-measurements',

  // UOM Conversion Level endpoints
  GEN_UOM_CONVERSION_LEVELS: '/gen/v1/uom-conversion-levels',

  // UOM Group endpoints
  GEN_UOM_GROUPS: '/gen/v1/uom-groups',

  // Tracking Type endpoints
  GEN_TRACKING_TYPES: '/gen/v1/tracking-types',

  // Product endpoints
  GEN_PRODUCTS: '/gen/v1/products',

  // Product Label Definition endpoints
  GEN_PRODUCT_LABEL_DEFINITIONS: '/gen/v1/product-label-definitions',

  // Product Label Option endpoints
  GEN_PRODUCT_LABEL_OPTIONS: '/gen/v1/product-label-options',

  // Products V1 (custom endpoint for label-filtered search + set labels)
  PRODUCTS_V1: '/v1/products',

  // Sales Order endpoints
  SALES_ORDERS: '/v1/sales-orders', // POST create
  GEN_SALES_ORDER_HEADERS: '/gen/v1/sales-order-headers', // GET list/byId
  GEN_SALES_ORDER_DETAILS: '/gen/v1/sales-order-details', // GET list

  // Number Series endpoints
  GEN_NUMBER_SERIES: '/gen/v1/number-series',
  NUMBER_SERIES: '/v1/number-series',

  // Price List endpoints
  GEN_PRICE_LISTS: '/gen/v1/price-lists',
  PRICE_LISTS: '/v1/price-lists',

  // Criteria Type endpoints
  GEN_CRITERIA_TYPES: '/gen/v1/criteria-types',

  // Price Matrix endpoints
  GEN_PRICE_MATRICES: '/gen/v1/price-matrices',
  PRICE_MATRICES: '/v1/price-matrices',

  // Price Matrix Priority endpoints
  PRICE_MATRIX_PRIORITIES: '/v1/price-matrix-priorities',
  PRICE_MATRIX_PRIORITY_LIST: '/v1/price-matrix-priority-list',
  PRICE_MATRIX_PRIORITY_LIST_ITEM: (id: number) => `/v1/price-matrix-priority-list/${id}`,
  PRICE_MATRIX_PRIORITY: (id: number) => `/v1/price-matrices/${id}/priority`,
} as const

// Type for API endpoints (useful for validation)
export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]
