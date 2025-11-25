import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  SalesOrganizationBranch,
  CreateSalesOrganizationBranchDto,
} from '@/types/salesOrganizationBranch.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing sales organization-branch associations
 * Handles the many-to-many relationship between sales organizations and branches
 *
 * @example
 * ```typescript
 * // List branches for a specific sales organization
 * const salesOrgBranches = await SalesOrganizationBranchesService.list(
 *   'filterBy=sales_organization_id&filterOperator=0&filterValue=1'
 * )
 *
 * // Add branch to sales organization
 * await SalesOrganizationBranchesService.addBranchToSalesOrganization({
 *   salesOrganizationId: 1,
 *   branchId: 5,
 *   createdBy: currentUserId
 * })
 *
 * // Remove branch from sales organization
 * await SalesOrganizationBranchesService.removeBranchFromSalesOrganization(associationId)
 * ```
 */
export class SalesOrganizationBranchesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SALES_ORGANIZATION_BRANCHES

  /**
   * Fetch sales organization-branch associations
   * Typically filtered by sales organization ID to get branches assigned to a specific sales organization
   *
   * @param queryString - Query parameters, commonly used to filter by sales_organization_id
   * @returns Promise resolving to paginated sales organization-branch associations
   *
   * @example
   * ```typescript
   * // Get branches for sales organization ID 1
   * const query = 'filterBy=sales_organization_id&filterOperator=0&filterValue=1'
   * const salesOrgBranches = await SalesOrganizationBranchesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<SalesOrganizationBranch>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesOrganizationBranch>>(url)
  }

  /**
   * Associate a branch with a sales organization
   * Creates a many-to-many relationship between sales organizations and branches
   *
   * @param data - Association data including salesOrganizationId, branchId, and creator ID
   * @returns Promise resolving to the created sales organization-branch association
   * @throws Error if association already exists or validation fails
   *
   * @example
   * ```typescript
   * await SalesOrganizationBranchesService.addBranchToSalesOrganization({
   *   salesOrganizationId: 2,
   *   branchId: 10,
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async addBranchToSalesOrganization(
    data: CreateSalesOrganizationBranchDto
  ): Promise<SalesOrganizationBranch> {
    return ApiService.post<SalesOrganizationBranch>(this.BASE_URL, data)
  }

  /**
   * Remove a branch from a sales organization
   * Deletes the sales organization-branch association
   *
   * @param id - The unique identifier of the sales organization-branch association
   * @returns Promise resolving when removal is complete
   * @throws Error if association not found or removal fails
   *
   * @example
   * ```typescript
   * await SalesOrganizationBranchesService.removeBranchFromSalesOrganization(associationId)
   * ```
   */
  static async removeBranchFromSalesOrganization(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
