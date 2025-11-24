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
} as const

// Type for API endpoints (useful for validation)
export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]
