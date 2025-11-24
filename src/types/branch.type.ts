export type Branch = {
  id: number
  code: string
  name: string
  address?: string
  openOnSaturday: boolean
  openOnSunday: boolean
  createdAt?: string
  createdBy?: number
  createdByUser?: {
    email: string
  }
  updatedAt?: string
  updatedBy?: number
}

export type CreateBranchDto = {
  code: string
  name: string
  address?: string
  openOnSaturday: boolean
  openOnSunday: boolean
  createdBy: number
}

export type UpdateBranchDto = {
  code?: string
  name?: string
  address?: string
  openOnSaturday?: boolean
  openOnSunday?: boolean
  updatedBy: number
}
