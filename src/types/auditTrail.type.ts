export type AuditReferenceType =
  | 'promotion'
  | 'employee'
  | 'customer'
  | 'price_list'
  | 'price_matrix'
  | 'product'
  | 'sales_team'
  | 'sales_team_products'
  | 'sales_team_member'
  | 'salesman_target'
  | 'salesman_target_config'
  | 'nforce_account'
  | 'employee_device'
  | 'activation_code'
  | 'device_block'
  | 'device_binding_config'
  | 'route'
  | 'route_customer'
  | 'route_salesman'
  | 'journey_plan_config'
  | 'journey_plan_addition'
  | 'journey_plan_regenerate'

/** What happened, on the entries that record it (device binding writes them; older ones don't). */
export const AUDIT_ACTIONS = [
  'auto_bind',
  'change_requested',
  'approved',
  'rejected',
  'reset_binding',
  'released_ineligible',
  'block',
  'unblock',
  'view_code',
  'code_generated',
  'code_sent',
  'reset_pin',
  'identity_declined',
  'lockout',
  'login_blocked_device',
  'login_rejected',
] as const

/**
 * Actions the salesman's phone performs itself. Their entries have no
 * `createdBy`, but they weren't done by the system either.
 */
export const PHONE_ACTOR_ACTIONS: ReadonlySet<string> = new Set([
  'auto_bind',
  'change_requested',
  'identity_declined',
  'lockout',
  'login_blocked_device',
  'login_rejected',
])

export type AuditTrailListItem = {
  id: number
  referenceType: AuditReferenceType
  referenceId: number
  description: string
  createdAt: string
  /** Absent for the system or an unauthenticated device. */
  createdBy?: number
  createdByUser?: { email?: string; name?: string }
  action?: string
  reason?: string
}

export type AuditTrail = AuditTrailListItem & {
  prev: Record<string, unknown> | null
  curr: Record<string, unknown> | null
}
