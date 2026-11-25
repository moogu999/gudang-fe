export type WarehouseKind = 'regular' | 'canvass'

export interface Warehouse {
  id: number
  code: string
  name: string
  branchId: number
  branchCode: string
  branchName: string
  kind: WarehouseKind
  /** Set exactly when `kind` is canvass: the Canvass salesman whose van this is. */
  salesmanEmployeeId: number | null
  salesmanName: string | null
  salesmanNip: string | null
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
  kind: WarehouseKind
  salesmanEmployeeId: number | null
  createdBy: number
}

export interface UpdateWarehouseDto {
  code: string
  name: string
  branchId: number
  kind: WarehouseKind
  salesmanEmployeeId: number | null
  updatedBy: number
}
