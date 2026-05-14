export type AuditReferenceType = 'promotion'

export type AuditTrailListItem = {
  id: number
  referenceType: AuditReferenceType
  referenceId: number
  description: string
  createdAt: string
  createdBy: number
  createdByUser: { email: string; name?: string }
}

export type AuditTrail = AuditTrailListItem & {
  prev: Record<string, unknown> | null
  curr: Record<string, unknown> | null
}
