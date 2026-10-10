/**
 * Sales team types, mirroring `/v1/sales-teams…`.
 *
 * The API omits optional objects instead of sending `null`, and leaves both the
 * id and the name off the "no principal" / "no category" buckets. Read them with
 * `?.`, never `!== null`.
 */

export interface SalesTeamRef {
  id: number
  code: string
  name: string
}

export interface SalesTeamUserRef {
  id: number
  name: string
}

export interface SalesTeamEmployeeLite {
  id: number
  nip?: string
  name: string
  /** False also for a draft or deleted employee. */
  isActive: boolean
  employeeType?: { id: number; name: string }
}

/** SKU count per principal. `optionId` and `name` are absent for SKUs without a principal. */
export interface SalesTeamPrincipalSummary {
  optionId?: number
  name?: string
  skuCount: number
}

export interface SalesTeam {
  id: number
  code: string
  name: string
  isActive: boolean
  branch: SalesTeamRef
  channel?: SalesTeamRef
  supervisor: SalesTeamEmployeeLite
  skuCount: number
  /** Current members. */
  memberCount: number
  principals: SalesTeamPrincipalSummary[]
  createdAt: string
  createdBy?: SalesTeamUserRef
  updatedAt?: string
  updatedBy?: SalesTeamUserRef
}

export interface SalesTeamSummary {
  activeTeams: number
  salesmen: number
  salesmenInTeams: number
  salesmenWithoutTeam: number
}

export type SalesTeamStatusFilter = 'active' | 'inactive' | 'all'

export interface CreateSalesTeamRequest {
  /** Blank takes the next number from the series. */
  code?: string
  name: string
  branchId: number
  supervisorEmployeeId: number
  customerChannelId?: number | null
  copyFromTeamId?: number
  productIds?: number[]
}

export type UpdateSalesTeamRequest = Pick<
  CreateSalesTeamRequest,
  'name' | 'supervisorEmployeeId' | 'customerChannelId'
>

export interface LabelRef {
  optionId: number
  value: string
}

export interface UncoveredProduct {
  productId: number
  code: string
  name: string
  createdAt?: string
  principal?: LabelRef
}

export interface SalesTeamProduct {
  productId: number
  code: string
  name: string
  uomGroup?: { name: string }
  principal?: LabelRef
  category?: LabelRef
  addedAt: string
}

export interface SalesTeamProductList {
  data: SalesTeamProduct[]
  total: number
}

/** Narrows a product list to one principal/category, or to the products without one. */
export interface LabelBucketFilter {
  principalOptionId?: number
  noPrincipal?: boolean
  categoryOptionId?: number
  noCategory?: boolean
}

export interface SalesTeamProductFilters extends LabelBucketFilter {
  q?: string
}

export type PickerSegment = 'notInTeam' | 'all' | 'uncovered'

export interface PickerTreeCategory {
  categoryOptionId?: number
  name?: string
  count: number
}

export interface PickerTreeNode {
  principalOptionId?: number
  name?: string
  count: number
  categories: PickerTreeCategory[]
}

export interface PickerCandidate extends Omit<SalesTeamProduct, 'addedAt'> {
  inThisTeam: boolean
  /** Other active teams of the same branch carrying the product. */
  otherTeams: { id: number; code: string }[]
}

export interface PickerCandidateQuery extends LabelBucketFilter {
  segment: PickerSegment
  q?: string
  limit?: number
  offset?: number
}

export interface AddSalesTeamProductsResult {
  added: number
  skipped: number
}

export interface RemoveSalesTeamProductsResult {
  removed: number
}

export interface SalesTeamMember {
  membershipId: number
  employee: SalesTeamEmployeeLite
  startDate: string
  /** Inclusive. Absent while the membership is current. */
  endDate?: string
  isCurrent: boolean
}

export interface MemberCandidateCurrentTeam extends SalesTeamRef {
  skuCount: number
  startDate: string
}

export interface MemberCandidate {
  employee: SalesTeamEmployeeLite
  currentTeam?: MemberCandidateCurrentTeam
}

export interface AddSalesTeamMemberRequest {
  employeeId: number
  /** `YYYY-MM-DD`, today or earlier. */
  startDate: string
  /** Must be true when the employee is in another team now. */
  move: boolean
}
