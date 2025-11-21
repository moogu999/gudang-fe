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
  USERS: '/gen/v1/users',
  USERS_V1: '/v1/users',

  // Role endpoints
  ROLES: '/gen/v1/roles',

  // Permission endpoints
  PERMISSIONS: '/gen/v1/permissions',

  // Role-Permission endpoints
  ROLE_PERMISSIONS: '/gen/v1/role-permissions',

  // User-Role endpoints
  USER_ROLES: '/gen/v1/user-roles',
} as const

// Type for API endpoints (useful for validation)
export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]
