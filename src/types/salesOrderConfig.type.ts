export interface SalesOrderConfig {
  id: number
  branchId: number
  branchName: string
  deliveryDateOffset: number
  expiredDateOffset: number
  approvalFlowId: number | null
  createdAt: string
  updatedAt?: string
}

export interface UpsertSalesOrderConfigDto {
  deliveryDateOffset: number
  expiredDateOffset: number
  approvalFlowId?: number | null
}
