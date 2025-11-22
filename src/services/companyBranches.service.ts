import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CompanyBranch, CreateCompanyBranchDto } from '@/types/companyBranch.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing company-branch associations
 * Handles the many-to-many relationship between companies and branches
 *
 * @example
 * ```typescript
 * // List branches for a specific company
 * const companyBranches = await CompanyBranchesService.list(
 *   'filterBy=company_id&filterOperator=0&filterValue=1'
 * )
 *
 * // Add branch to company
 * await CompanyBranchesService.addBranchToCompany({
 *   companyId: 1,
 *   branchId: 5,
 *   createdBy: currentUserId
 * })
 *
 * // Remove branch from company
 * await CompanyBranchesService.removeBranchFromCompany(associationId)
 * ```
 */
export class CompanyBranchesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_COMPANY_BRANCHES

  /**
   * Fetch company-branch associations
   * Typically filtered by company ID to get branches assigned to a specific company
   *
   * @param queryString - Query parameters, commonly used to filter by company_id
   * @returns Promise resolving to paginated company-branch associations
   *
   * @example
   * ```typescript
   * // Get branches for company ID 1
   * const query = 'filterBy=company_id&filterOperator=0&filterValue=1'
   * const companyBranches = await CompanyBranchesService.list(query)
   * ```
   */
  static async list(queryString?: string): Promise<Base<CompanyBranch>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CompanyBranch>>(url)
  }

  /**
   * Associate a branch with a company
   * Creates a many-to-many relationship between companies and branches
   *
   * @param data - Association data including companyId, branchId, and creator ID
   * @returns Promise resolving to the created company-branch association
   * @throws Error if association already exists or validation fails
   *
   * @example
   * ```typescript
   * await CompanyBranchesService.addBranchToCompany({
   *   companyId: 2,
   *   branchId: 10,
   *   createdBy: currentUserId
   * })
   * ```
   */
  static async addBranchToCompany(data: CreateCompanyBranchDto): Promise<CompanyBranch> {
    return ApiService.post<CompanyBranch>(this.BASE_URL, data)
  }

  /**
   * Remove a branch from a company
   * Deletes the company-branch association
   *
   * @param id - The unique identifier of the company-branch association
   * @returns Promise resolving when removal is complete
   * @throws Error if association not found or removal fails
   *
   * @example
   * ```typescript
   * await CompanyBranchesService.removeBranchFromCompany(associationId)
   * ```
   */
  static async removeBranchFromCompany(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
