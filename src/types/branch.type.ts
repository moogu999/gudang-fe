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

export type BranchHoliday = {
  id: number
  branchId: number
  startDate: string
  endDate: string
  createdAt: string
  createdBy: number
  createdByUser?: {
    email: string
  }
}

export type CreateBranchHolidayDto = {
  branchId: number
  startDate: string
  endDate: string
  createdBy: number
}

export type UpdateBranchHolidayDto = {
  startDate?: string
  endDate?: string
}
