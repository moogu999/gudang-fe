export interface ApInvoiceConfig {
  id: number
  branchId: number
  branchName: string
  approvalFlowId: number | null
  createdAt: string
  createdBy: number
  updatedAt?: string | null
  updatedBy?: number | null
}

export interface UpsertApInvoiceConfigDto {
  approvalFlowId?: number | null
}
