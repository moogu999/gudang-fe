export type Branch = {
  id: number
  code: string
  name: string
  address?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

export type CreateBranchDto = {
  code: string
  name: string
  address?: string
  createdBy: string
}

export type UpdateBranchDto = {
  code?: string
  name?: string
  address?: string
  updatedBy: string
}
