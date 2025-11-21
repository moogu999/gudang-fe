import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Permission, RolePermission, CreateRolePermissionDto } from '@/types/permission.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing permission and role-permission operations
 * Handles permissions listing and role-permission associations
 *
 * @example
 * ```typescript
 * // List all permissions
 * const permissions = await PermissionsService.list()
 *
 * // Add permission to role
 * await PermissionsService.addPermissionToRole({
 *   roleId: 1,
 *   permissionId: 5,
 *   createdBy: currentUserId
 * })
 *
 * // List permissions for a specific role
 * const rolePerms = await PermissionsService.listRolePermissions(
 *   'filterBy=role_id&filterOperator=0&filterValue=1'
 * )
 * ```
 */
export class PermissionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PERMISSIONS
  private static readonly ROLE_PERMISSIONS_URL = API_ENDPOINTS.GEN_ROLE_PERMISSIONS

  /**
   * Fetch paginated list of all available permissions
   * Used primarily by TableComponent and permission selection dropdowns
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated permission data with metadata
   */
  static async list(queryString?: string): Promise<Base<Permission>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Permission>>(url)
  }

  /**
   * Fetch role-permission associations
   * Typically filtered by role ID to get permissions assigned to a specific role
   *
   * @param queryString - Query parameters, commonly used to filter by role_id
   * @returns Promise resolving to paginated role-permission associations
   *
   * @example
   * ```typescript
   * // Get permissions for role ID 1
   * const query = 'filterBy=role_id&filterOperator=0&filterValue=1'
   * const rolePerms = await PermissionsService.listRolePermissions(query)
   * ```
   */
  static async listRolePermissions(queryString?: string): Promise<Base<RolePermission>> {
    const url = queryString
      ? `${this.ROLE_PERMISSIONS_URL}?${queryString}`
      : this.ROLE_PERMISSIONS_URL
    return ApiService.get<Base<RolePermission>>(url)
  }

  /**
   * Associate a permission with a role
   * Creates a many-to-many relationship between roles and permissions
   *
   * @param data - Association data including roleId, permissionId, and creator ID
   * @returns Promise resolving to the created role-permission association
   * @throws Error if association already exists or validation fails
   *
   * @example
   * ```typescript
   * await PermissionsService.addPermissionToRole({
   *   roleId: 2,
   *   permissionId: 10,
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async addPermissionToRole(data: CreateRolePermissionDto): Promise<RolePermission> {
    return ApiService.post<RolePermission>(this.ROLE_PERMISSIONS_URL, data)
  }

  /**
   * Remove a permission from a role
   * Deletes the role-permission association
   *
   * @param id - The unique identifier of the role-permission association
   * @returns Promise resolving when removal is complete
   * @throws Error if association not found or removal fails
   *
   * @example
   * ```typescript
   * await PermissionsService.removePermissionFromRole(associationId)
   * ```
   */
  static async removePermissionFromRole(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.ROLE_PERMISSIONS_URL}/${id}`)
  }
}
