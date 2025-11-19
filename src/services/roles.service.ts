import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/types/role.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing role-related operations
 * Handles all HTTP requests for role CRUD operations
 *
 * @example
 * ```typescript
 * // Create a role
 * const role = await RolesService.create({
 *   name: 'Admin',
 *   description: 'Administrator role',
 *   createdBy: 1
 * })
 *
 * // Update a role
 * await RolesService.update(roleId, {
 *   name: 'Super Admin',
 *   description: 'Updated description',
 *   updatedBy: 1
 * })
 * ```
 */
export class RolesService {
  private static readonly BASE_URL = API_ENDPOINTS.ROLES

  /**
   * Fetch paginated list of roles
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated role data with metadata
   */
  static async list(queryString?: string): Promise<Base<Role>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Role>>(url)
  }

  /**
   * Create a new role with permissions
   *
   * @param data - Role creation data including name, description, and creator ID
   * @returns Promise resolving to the created role object
   * @throws Error if role name already exists or validation fails
   */
  static async create(data: CreateRoleDto): Promise<Role> {
    return ApiService.post<Role>(this.BASE_URL, data)
  }

  /**
   * Update an existing role's information
   *
   * @param id - The unique identifier of the role to update
   * @param data - Role update data including name, description, and updater ID
   * @returns Promise resolving to the updated role object
   * @throws Error if role not found or validation fails
   */
  static async update(id: number, data: UpdateRoleDto): Promise<Role> {
    return ApiService.patch<Role>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a role by its ID
   * Note: This may fail if the role is assigned to users
   *
   * @param id - The unique identifier of the role to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if role not found, in use, or deletion fails
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
