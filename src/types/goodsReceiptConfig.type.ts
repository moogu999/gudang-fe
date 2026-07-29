export interface GoodsReceiptConfig {
  id: number
  branchId: number
  branchName: string
  approvalFlowId: number | null
  createdAt: string
  createdBy: number
  updatedAt?: string | null
  updatedBy?: number | null
}

export interface UpsertGoodsReceiptConfigDto {
  approvalFlowId?: number | null
}
