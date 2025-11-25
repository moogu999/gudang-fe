export type UserBranch = {
  id: number
  userId: number
  branchId: number
  branchName: string
  branchCode: string
  createdAt: string
  createdBy?: number
  userEmail: string
}

export type AssignBranchesDto = {
  branchId?: number
  salesOrganizationId?: number
}
