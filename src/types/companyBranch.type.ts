export type CompanyBranch = {
  id: number
  companyId: number
  branchId: number
  createdAt: string
  createdBy: number
}

export type CreateCompanyBranchDto = {
  companyId: number
  branchId: number
  createdBy: number
}

export type CompanyBranchWithDetails = CompanyBranch & {
  branchCode?: string
  branchName?: string
}
