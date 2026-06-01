export interface Warehouse {
  id: number
  code: string
  name: string
  branchId: number
  branchCode: string
  branchName: string
  createdAt: string
  createdBy: number
  createdByEmail: string
  updatedAt: string | null
  updatedBy: number | null
  updatedByEmail: string | null
}

export interface CreateWarehouseDto {
  code: string
  name: string
  branchId: number
  createdBy: number
}

export interface UpdateWarehouseDto {
  code: string
  name: string
  branchId: number
  updatedBy: number
}
