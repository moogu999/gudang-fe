import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Branch, CreateBranchDto, UpdateBranchDto } from '@/types/branch.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing branch-related operations
 * Handles all HTTP requests for branch CRUD operations
 *
 * @example
 * ```typescript
 * // List branches with pagination
 * const branches = await BranchesService.list('page=1&limit=10')
 *
 * // Create a new branch
 * await BranchesService.create({
 *   code: 'BR001',
 *   name: 'Main Branch',
 *   address: '123 Main Street',
 *   createdBy: 'admin@example.com'
 * })
 *
 * // Delete a branch
 * await BranchesService.delete(branchId)
 * ```
 */
export class BranchesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_BRANCHES

  /**
   * Fetch paginated list of branches
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   *                      Built using GenericQueryBuilder
   * @returns Promise resolving to paginated branch data with metadata
   *
   * @example
   * ```typescript
   * const query = new GenericQueryBuilder()
   *   .withPagination(1, 10)
   *   .withSort('name', 'asc')
   *   .build()
   * const result = await BranchesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<Branch>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Branch>>(url)
  }

  /**
   * Create a new branch
   *
   * @param data - Branch creation data including code, name, address, and creator
   * @returns Promise resolving to the created branch object
   * @throws Error if code already exists or validation fails
   *
   * @example
   * ```typescript
   * const newBranch = await BranchesService.create({
   *   code: 'BR001',
   *   name: 'Main Branch',
   *   address: '123 Main Street, City',
   *   createdBy: 'admin@example.com'
   * })
   * ```
   */
  static async create(data: CreateBranchDto): Promise<Branch> {
    return ApiService.post<Branch>(this.BASE_URL, data)
  }

  /**
   * Update an existing branch
   *
   * @param id - The unique identifier of the branch to update
   * @param data - Branch update data (code, name, and/or address)
   * @returns Promise resolving when update is complete
   * @throws Error if branch not found or validation fails
   *
   * @example
   * ```typescript
   * await BranchesService.update(123, {
   *   name: 'Updated Branch Name',
   *   address: '456 New Street',
   *   updatedBy: 'admin@example.com'
   * })
   * ```
   */
  static async update(id: number, data: UpdateBranchDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a branch by its ID
   * This is a hard delete operation
   *
   * @param id - The unique identifier of the branch to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if branch not found or deletion fails
   *
   * @example
   * ```typescript
   * await BranchesService.delete(123)
   * ```
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
