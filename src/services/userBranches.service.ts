import ApiService from './api'
import type { AssignBranchesDto } from '@/types/userBranch.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing user-branch assignment operations
 * Handles HTTP requests for assigning and removing branches from users
 *
 * @example
 * ```typescript
 * // Assign a branch directly to a user
 * await UserBranchesService.assignBranches(userId, {
 *   branchId: 123
 * })
 *
 * // Assign branches via sales organization
 * await UserBranchesService.assignBranches(userId, {
 *   salesOrganizationId: 456
 * })
 *
 * // Remove a branch assignment
 * await UserBranchesService.removeBranchFromUser(userBranchId)
 * ```
 */
export class UserBranchesService {
  private static readonly GEN_BASE_URL = API_ENDPOINTS.GEN_USER_BRANCHES

  /**
   * Assign branches to a user either directly or via sales organization
   * Uses the /v1/users/{id}/branches endpoint
   *
   * @param userId - The user ID to assign branches to
   * @param data - Assignment data containing either branchId or salesOrganizationId
   * @returns Promise resolving when assignment is complete
   * @throws Error if user not found, duplicate assignment, or validation fails
   *
   * @example
   * ```typescript
   * // Direct branch assignment
   * await UserBranchesService.assignBranches(1, { branchId: 123 })
   *
   * // Sales organization assignment (assigns all branches under the org)
   * await UserBranchesService.assignBranches(1, { salesOrganizationId: 456 })
   * ```
   */
  static async assignBranches(userId: number, data: AssignBranchesDto): Promise<void> {
    return ApiService.post<void>(`${API_ENDPOINTS.USERS_V1}/${userId}/branches`, data)
  }

  /**
   * Remove a branch assignment from a user
   * Uses the generic CRUD delete endpoint
   *
   * @param userBranchId - The user-branch relationship ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if assignment not found or deletion fails
   *
   * @example
   * ```typescript
   * await UserBranchesService.removeBranchFromUser(789)
   * ```
   */
  static async removeBranchFromUser(userBranchId: number): Promise<void> {
    return ApiService.delete<void>(`${this.GEN_BASE_URL}/${userBranchId}`)
  }
}
