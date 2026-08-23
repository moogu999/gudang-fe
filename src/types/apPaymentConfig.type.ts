/**
 * The branch-scoped threshold + approval-flow config for AP Payment.
 * Unlike every other module's config, this one is amount-aware: `approvalThreshold`
 * being `null` means every payment requires approval — it is not the same as zero.
 */
export interface ApPaymentConfig {
  id: number
  branchId: number
  branchName: string
  approvalFlowId: number | null
  approvalThreshold: string | null
  createdAt: string
  createdBy: number
  updatedAt?: string | null
  updatedBy?: number | null
}

export interface UpsertApPaymentConfigDto {
  approvalFlowId?: number | null
  approvalThreshold?: string | null
}
