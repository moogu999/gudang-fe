export type UserBranch = {
  id: number
  userId: number
  branchId: number
  branchName: string
  branchCode: string
  isPrimary: boolean
  createdAt: string
  createdBy?: number
  userEmail: string
}

export type AssignBranchesDto = {
  branchId?: number
  salesOrganizationId?: number
}

export type SetPrimaryBranchDto = {
  branchId: number | null
}
