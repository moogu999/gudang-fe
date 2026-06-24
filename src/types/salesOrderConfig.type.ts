export interface SalesOrderConfig {
  id: number
  branchId: number
  branchName: string
  deliveryDateOffset: number
  expiredDateOffset: number
  createdAt: string
  updatedAt?: string
}

export interface UpsertSalesOrderConfigDto {
  deliveryDateOffset: number
  expiredDateOffset: number
}
