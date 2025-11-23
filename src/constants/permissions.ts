/**
 * Permission IDs that map to backend permission system
 *
 * These IDs must match the permission IDs in the database.
 * Used for role-based access control (RBAC) throughout the application.
 */
export const PERMISSIONS = {
  USER_READ: 1,
  USER_WRITE: 2,
  PERMISSION_READ: 3,
  ROLE_READ: 4,
  ROLE_WRITE: 5,
  BRANCH_READ: 6,
  BRANCH_WRITE: 7,
  COMPANY_READ: 8,
  COMPANY_WRITE: 9,
  DEPARTMENT_READ: 10,
  DEPARTMENT_WRITE: 11,
  DIVISION_READ: 12,
  DIVISION_WRITE: 13,
} as const

/**
 * Type representing a permission ID
 */
export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Map routes to their required READ permissions
 */
export const ROUTE_PERMISSIONS: Record<string, PermissionId> = {
  '/users': PERMISSIONS.USER_READ,
  '/roles': PERMISSIONS.ROLE_READ,
  '/permissions': PERMISSIONS.PERMISSION_READ,
  '/branches': PERMISSIONS.BRANCH_READ,
  '/companies': PERMISSIONS.COMPANY_READ,
  '/departments': PERMISSIONS.DEPARTMENT_READ,
  '/divisions': PERMISSIONS.DIVISION_READ,
}

/**
 * Map routes to their required WRITE permissions
 */
export const ROUTE_WRITE_PERMISSIONS: Record<string, PermissionId> = {
  '/users': PERMISSIONS.USER_WRITE,
  '/roles': PERMISSIONS.ROLE_WRITE,
  '/branches': PERMISSIONS.BRANCH_WRITE,
  '/companies': PERMISSIONS.COMPANY_WRITE,
  '/departments': PERMISSIONS.DEPARTMENT_WRITE,
  '/divisions': PERMISSIONS.DIVISION_WRITE,
}
