export type SalesOrganizationBranch = {
  id: number
  salesOrganizationId: number
  branchId: number
  branchCode: string
  branchName: string
  createdAt: string
  createdBy: number
  userEmail: string
}

export type CreateSalesOrganizationBranchDto = {
  salesOrganizationId: number
  branchId: number
  createdBy: number
}
