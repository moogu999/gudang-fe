import type { RouteLocationNormalized } from 'vue-router'
import { PERMISSIONS } from '@/constants/permissions'

/** Query parameter Persetujuan Saya adds to a document link: the approval request id. */
export const APPROVAL_QUERY = 'approval'

/**
 * Whether the navigation guard lets a user onto a route, judged on its
 * `meta.requiredPermission` (the first matched record declaring one, as before).
 *
 * A route marked `meta.approverReadable` also lets an approver through without that
 * permission, when they arrive from an approval request (`?approval=<id>`) and hold an
 * approval permission. The guard is not the security boundary here: the backend still
 * only returns a document to the approvers of its request, so this only stops the page
 * from turning an approver away before it asks.
 */
export function canEnterRoute(
  to: Pick<RouteLocationNormalized, 'matched' | 'query'>,
  hasPermission: (permissionId: number) => boolean,
): boolean {
  const required = to.matched.find((record) => record.meta.requiredPermission)?.meta
    .requiredPermission
  if (!required || hasPermission(required)) return true

  const approverReadable = to.matched.some((record) => record.meta.approverReadable)
  const request = to.query[APPROVAL_QUERY]
  const fromApproval = typeof request === 'string' && request !== ''
  const isApprover =
    hasPermission(PERMISSIONS.APPROVAL_REQUEST_READ) || hasPermission(PERMISSIONS.APPROVAL_ACT)

  return approverReadable && fromApproval && isApprover
}
