import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { UserRole, CreateUserRoleDto } from '@/types/userRole.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing user-role associations
 * Handles all HTTP requests for assigning and removing roles from users
 *
 * @example
 * ```typescript
 * // List roles for a user
 * const userRoles = await UserRolesService.list('filterBy=user_id&filterOperator=0&filterValue=123')
 *
 * // Add a role to a user
 * await UserRolesService.addRoleToUser({
 *   userId: 123,
 *   roleId: 5,
 *   createdBy: currentUserId
 * })
 *
 * // Remove a role from a user
 * await UserRolesService.removeRoleFromUser(userRoleId)
 * ```
 */
export class UserRolesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_USER_ROLES

  /**
   * Fetch paginated list of user-role associations
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated user-role data with metadata
   *
   * @example
   * ```typescript
   * // Get all roles for a specific user
   * const query = 'filterBy=user_id&filterOperator=0&filterValue=123'
   * const result = await UserRolesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<UserRole>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<UserRole>>(url)
  }

  /**
   * Assign a role to a user
   *
   * @param data - User-role association data including userId, roleId, and creator ID
   * @returns Promise resolving to the created user-role association
   * @throws Error if association already exists or validation fails
   *
   * @example
   * ```typescript
   * await UserRolesService.addRoleToUser({
   *   userId: 123,
   *   roleId: 5,
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async addRoleToUser(data: CreateUserRoleDto): Promise<UserRole> {
    return ApiService.post<UserRole>(this.BASE_URL, data)
  }

  /**
   * Remove a role from a user by deleting the user-role association
   *
   * @param id - The unique identifier of the user-role association to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if association not found or deletion fails
   *
   * @example
   * ```typescript
   * await UserRolesService.removeRoleFromUser(456)
   * ```
   */
  static async removeRoleFromUser(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
