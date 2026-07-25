export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalTierStatus = 'pending' | 'approved' | 'rejected'

export type ApprovalFlowTierApprover = {
  id: number
  employeeId: number
  employeeName: string
  isPrimary: boolean
}

export type ApprovalFlowTier = {
  id: number
  tierOrder: number
  name: string
  approvers: ApprovalFlowTierApprover[]
}

export type ApprovalFlow = {
  id: number
  name: string
  moduleKey: string
  isActive: boolean
  description: string | null
  tiers: ApprovalFlowTier[]
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

export type ApprovalModule = {
  key: string
  label: string
}

export type CreateApprovalFlowTierApproverDto = {
  employeeId: number
  isPrimary: boolean
}

export type CreateApprovalFlowTierDto = {
  tierOrder: number
  name: string
  approvers: CreateApprovalFlowTierApproverDto[]
}

export type CreateApprovalFlowDto = {
  name: string
  moduleKey: string
  isActive?: boolean
  description?: string
  tiers: CreateApprovalFlowTierDto[]
}

export type UpdateApprovalFlowDto = CreateApprovalFlowDto

export type ApprovalRequestTierApprover = {
  id: number
  employeeId: number
  employeeName: string
  isPrimary: boolean
}

export type ApprovalRequestTier = {
  id: number
  tierOrder: number
  name: string
  status: ApprovalTierStatus
  actedByEmployeeId: number | null
  actedByUserId: number | null
  actedAt: string | null
  comment: string | null
  approvers: ApprovalRequestTierApprover[]
}

export type ApprovalRequest = {
  id: number
  approvalFlowId: number
  moduleKey: string
  referenceId: number
  status: ApprovalStatus
  currentTierOrder: number
  requestedByUserId: number
  requestedAt: string
  completedAt: string | null
  tiers: ApprovalRequestTier[]
}

export type ApprovalRequestDetail = ApprovalRequest & {
  canAct: boolean
}

export type PendingForMeResponse = {
  hasEmployeeLink: boolean
  data: ApprovalRequest[]
}

export type SubmitApprovalRequestDto = {
  moduleKey: string
  referenceId: number
  flowId: number
}

export type ActApprovalRequestDto = {
  comment?: string
}
