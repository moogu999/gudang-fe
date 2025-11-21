import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing user-related operations
 * Handles all HTTP requests for user CRUD operations
 *
 * @example
 * ```typescript
 * // List users with pagination
 * const users = await UsersService.list('page=1&limit=10')
 *
 * // Create a new user
 * await UsersService.create({
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 *   createdBy: 1
 * })
 *
 * // Delete a user
 * await UsersService.delete(userId)
 * ```
 */
export class UsersService {
  private static readonly GEN_URL = API_ENDPOINTS.GEN_USERS
  private static readonly V1_URL = API_ENDPOINTS.USERS_V1

  /**
   * Fetch paginated list of users
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated user data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('email', 'asc')
   *   .build()
   * const result = await UsersService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<User>> {
    const url = queryString ? `${this.GEN_URL}?${queryString}` : this.GEN_URL
    return ApiService.get<Base<User>>(url)
  }

  /**
   * Create a new user account
   *
   * @param data - User creation data including email, password, and creator ID
   * @returns Promise resolving to the created user object
   * @throws Error if email already exists or validation fails
   *
   * @example
   * ```typescript
   * const newUser = await UsersService.create({
   *   email: 'john.doe@example.com',
   *   password: 'SecurePass123!',
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async create(data: CreateUserDto): Promise<User> {
    return ApiService.post<User>(this.V1_URL, data)
  }

  /**
   * Update an existing user's email and/or password
   *
   * @param id - The unique identifier of the user to update
   * @param data - User update data (email and/or password)
   * @returns Promise resolving when update is complete
   * @throws Error if user not found or validation fails
   *
   * @example
   * ```typescript
   * await UsersService.update(123, {
   *   email: 'newemail@example.com',
   *   password: 'NewSecurePass123!',
   *   updatedBy: 'admin@example.com'
   * })
   * ```
   */
  static async update(id: number, data: UpdateUserDto): Promise<void> {
    const { email, password } = data
    const payload: { email?: string; password?: string } = {}

    if (email) payload.email = email
    if (password) payload.password = password

    return ApiService.patch<void>(`${this.V1_URL}/${id}`, payload)
  }

  /**
   * Delete a user by their ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the user to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if user not found or deletion fails
   *
   * @example
   * ```typescript
   * await UsersService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.GEN_URL}/${id}`)
  }
}
