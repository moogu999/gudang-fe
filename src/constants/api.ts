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

  // Customer Label Definition endpoints
  GEN_CUSTOMER_LABEL_DEFINITIONS: '/gen/v1/customer-label-definitions',

  // Customer Label Option endpoints
  GEN_CUSTOMER_LABEL_OPTIONS: '/gen/v1/customer-label-options',

  // Customers V1 (custom endpoint for label-filtered search + set labels)
  CUSTOMERS_V1: '/v1/customers',

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
  RESOLVE_SALES_ORDER: '/v1/sales-orders/resolve', // POST resolve prices/discounts
  GEN_SALES_ORDER_HEADERS: '/gen/v1/sales-order-headers', // GET list/byId
  GEN_SALES_ORDER_DETAILS: '/gen/v1/sales-order-details', // GET list
  TAX_CONFIGURATION: '/v1/tax-configuration', // GET tax percentage

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

  // Promotion endpoints
  GEN_PROMOTIONS: '/gen/v1/promotions',
  PROMOTIONS: '/v1/promotions',

  // Audit Trail endpoints
  GEN_AUDIT_TRAILS: '/gen/v1/audit-trails',
  AUDIT_TRAILS: '/v1/audit-trails',

  // Employee endpoints
  EMPLOYEES: '/v1/employees',
  EMPLOYEE_TYPES: '/gen/v1/employee-types',

  // File endpoints
  FILES: '/v1/files',

  // Customer master endpoints (new)
  GEN_CUSTOMER_OUTLET_TYPES: '/gen/v1/customer-outlet-types',
  GEN_CUSTOMER_CHANNELS: '/gen/v1/customer-channels',
  GEN_CUSTOMER_CATEGORIES: '/gen/v1/customer-categories',
  GEN_VEHICLE_ACCESSES: '/gen/v1/vehicle-accesses',

  // Customer V1 endpoint (new full-feature CRUD with child entities)
  CUSTOMERS_V1_FULL: '/v1/customers',

  // Warehouse endpoints
  GEN_WAREHOUSES: '/gen/v1/warehouses',

  // Vehicle endpoints
  GEN_VEHICLES: '/gen/v1/vehicles',
  GEN_VEHICLE_TYPES: '/gen/v1/vehicle-types',

  // Goods Receipt endpoints
  GOODS_RECEIPTS: '/v1/goods-receipts',
  GEN_GOODS_RECEIPT_HEADERS: '/gen/v1/goods-receipt-headers',

  // Inventory endpoints
  GEN_INVENTORY_BALANCES: '/gen/v1/inventory-balances',
  INVENTORY_SUMMARY: '/v1/inventory/summary',

  // Booking Order endpoints
  BOOKING_ORDER_SALES_ORDERS: '/v1/booking-orders/sales-orders',
  BOOKING_ORDER_EVALUATE: '/v1/booking-orders/evaluate',
  BOOKING_ORDERS: '/v1/booking-orders',

  // Sales Order Config endpoints
  SALES_ORDER_CONFIGS: '/v1/sales-order-configs',
  SALES_ORDER_CONFIG_MY_BRANCH: '/v1/sales-order-configs/my-branch',
  SALES_ORDER_CONFIG_BY_BRANCH: (branchId: number) => `/v1/sales-order-configs/${branchId}`,

  // Booking Order Config endpoints
  BOOKING_ORDER_CONFIGS: '/v1/booking-order-configs',
  BOOKING_ORDER_CONFIG_MY_BRANCH: '/v1/booking-order-configs/my-branch',
  BOOKING_ORDER_CONFIG_BY_BRANCH: (branchId: number) => `/v1/booking-order-configs/${branchId}`,

  // Delivery Order endpoints
  DELIVERY_ORDERS: '/v1/delivery-orders',
  DELIVERY_ORDER_BY_ID: (id: number) => `/v1/delivery-orders/${id}`,
  DELIVERY_ORDER_CANCEL: (id: number) => `/v1/delivery-orders/${id}/cancel`,

  // Delivery Note endpoints
  DELIVERY_NOTES: '/v1/delivery-notes',
  DELIVERY_NOTE_BY_ID: (id: number) => `/v1/delivery-notes/${id}`,
  DELIVERY_NOTE_CANCEL: (id: number) => `/v1/delivery-notes/${id}/cancel`,
  DELIVERY_NOTE_AVAILABLE_DOS: '/v1/delivery-notes/available-delivery-orders',

  // Picking List endpoints
  PICKING_LISTS: '/v1/picking-lists',
  PICKING_LIST_BY_ID: (id: number) => `/v1/picking-lists/${id}`,

  // Invoice endpoints
  INVOICES: '/v1/invoices',
  INVOICE_BY_ID: (id: number) => `/v1/invoices/${id}`,

  // Goods Issue Note endpoints
  GOODS_ISSUE_NOTES: '/v1/goods-issue-notes',
  GOODS_ISSUE_NOTE_BY_ID: (id: number) => `/v1/goods-issue-notes/${id}`,
  GOODS_ISSUE_NOTE_AVAILABLE_PLS: '/v1/goods-issue-notes/available-picking-lists',

  // Delivery Confirmation endpoints
  DELIVERY_CONFIRMATIONS: '/v1/delivery-confirmations',
  DELIVERY_CONFIRMATION_BY_ID: (id: number) => `/v1/delivery-confirmations/${id}`,
  DELIVERY_CONFIRMATION_AVAILABLE_DNS: '/v1/delivery-confirmations/available-delivery-notes',
  DELIVERY_CONFIRMATION_CONFIRM_DO: (id: number, doId: number) =>
    `/v1/delivery-confirmations/${id}/delivery-orders/${doId}/confirm`,

  // Stock Movements endpoints
  STOCK_MOVEMENTS: '/v1/stock-movements',

  // Goods Return Note endpoints
  GOODS_RETURN_NOTES: '/v1/goods-return-notes',
  GOODS_RETURN_NOTE_BY_ID: (id: number) => `/v1/goods-return-notes/${id}`,
  GOODS_RETURN_NOTE_DRIVER_STOCK: '/v1/goods-return-notes/driver-stock',
  GOODS_RETURN_NOTE_AVAILABLE_DRIVERS: '/v1/goods-return-notes/available-drivers',

  // Sales Order Type endpoints
  GEN_SALES_ORDER_TYPES: '/gen/v1/sales-order-types',

  // Return Delivery Order endpoints
  RETURN_DELIVERY_ORDERS: '/v1/return-delivery-orders',
} as const

// Type for API endpoints (useful for validation)
export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]
