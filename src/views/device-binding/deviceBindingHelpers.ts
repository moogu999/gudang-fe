import dayjs from 'dayjs'
import { ApiError } from '@/types/api.type'
import type {
  BindingStatus,
  ChangeRequestReview,
  DeliveryStatus,
  Device,
  DeviceDifference,
  DeviceStatus,
} from '@/types/deviceBinding.type'

export type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'

/** `9f3a…c21e`: enough of a device id to tell phones apart in a table. */
export function shortUid(uid: string | undefined): string {
  if (!uid) return '—'
  return uid.length <= 10 ? uid : `${uid.slice(0, 4)}…${uid.slice(-4)}`
}

/**
 * A phone number the way the backend compares them: digits only, and a
 * leading `0` becomes Indonesia's `62`. Must match the backend's `normalize_phone`.
 */
export function normalizePhone(phone: string | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

/** A wa.me link that opens a chat with `phone`, prefilled with `text`. */
export function waMeLink(phone: string | undefined, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`
}

/** `731905` → `731 905`, so the code is easy to read out. */
export function formatCode(code: string | undefined): string {
  if (!code) return ''
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
}

export function statusSeverity(status: BindingStatus): Severity {
  switch (status) {
    case 'pending_review':
      return 'warn'
    case 'active':
      return 'success'
    case 'blocked':
      return 'danger'
    default:
      return 'secondary'
  }
}

export function deviceStatusSeverity(status: DeviceStatus): Severity {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
    case 'sync_only':
      return 'warn'
    case 'blocked':
    case 'rejected':
      return 'danger'
    default:
      return 'secondary'
  }
}

export function deliverySeverity(status: DeliveryStatus): Severity {
  switch (status) {
    case 'sent':
      return 'success'
    case 'failed':
      return 'danger'
    case 'skipped':
      return 'secondary'
    default:
      return 'info'
  }
}

/** Deliveries still on their way, which the code dialog keeps polling for. */
export function isDeliveryInFlight(status: DeliveryStatus): boolean {
  return status === 'queued' || status === 'sending'
}

export type ReviewCheckKey =
  | 'pinLogin'
  | 'notBoundElsewhere'
  | 'notBlocked'
  | 'noRiskFlags'
  | 'oldLastSync'

export interface ReviewCheck {
  key: ReviewCheckKey
  ok: boolean
  severity: Severity
}

/**
 * The automatic checks of a change request, in the order the review dialog shows
 * them. A failed binding check is an error (the approval would be refused); a
 * risk flag or an old phone that still has data to upload is only a warning.
 */
export function reviewChecks(review: ChangeRequestReview): ReviewCheck[] {
  const { checks } = review
  const list: ReviewCheck[] = [
    { key: 'pinLogin', ok: checks.pinLogin, severity: checks.pinLogin ? 'success' : 'danger' },
    {
      key: 'notBoundElsewhere',
      ok: checks.notBoundElsewhere,
      severity: checks.notBoundElsewhere ? 'success' : 'danger',
    },
    {
      key: 'notBlocked',
      ok: checks.notBlocked,
      severity: checks.notBlocked ? 'success' : 'danger',
    },
    {
      key: 'noRiskFlags',
      ok: checks.noRiskFlags,
      severity: checks.noRiskFlags ? 'success' : 'warn',
    },
  ]
  // Only meaningful while there is an old phone to fall back to sync-only.
  if (review.current) list.push({ key: 'oldLastSync', ok: false, severity: 'warn' })
  return list
}

/** Why approving would be refused, or undefined when nothing stands in the way. */
export function blockingCheck(
  review: ChangeRequestReview,
): 'notBoundElsewhere' | 'notBlocked' | undefined {
  if (!review.checks.notBoundElsewhere) return 'notBoundElsewhere'
  if (!review.checks.notBlocked) return 'notBlocked'
  return undefined
}

/**
 * The fields where the requested phone differs from the bound one. The server
 * already says so; this falls back to comparing them when it doesn't.
 */
export function deviceDifferences(
  current: Device | undefined,
  requested: Device,
  fromServer?: DeviceDifference[],
): Set<DeviceDifference> {
  if (fromServer) return new Set(fromServer)
  const diff = new Set<DeviceDifference>()
  if (!current) return diff
  if (current.platform !== requested.platform) diff.add('platform')
  if ((current.model ?? '') !== (requested.model ?? '')) diff.add('model')
  if ((current.osVersion ?? '') !== (requested.osVersion ?? '')) diff.add('osVersion')
  return diff
}

/** `Android 14` / `iOS 17.2`, or just the platform when the version is unknown. */
export function platformLabel(device: Pick<Device, 'platform' | 'osVersion'>): string {
  const name = device.platform === 'ios' ? 'iOS' : 'Android'
  return device.osVersion ? `${name} ${device.osVersion}` : name
}

export type RelativeDay =
  | { kind: 'today'; time: string }
  | { kind: 'yesterday'; time: string }
  | { kind: 'daysAgo'; days: number; date: string }

/** When a phone last synced, in the words the list shows: today, yesterday or N days ago. */
export function relativeDay(iso: string, now: Date = new Date()): RelativeDay {
  const at = dayjs(iso)
  const days = dayjs(now).startOf('day').diff(at.startOf('day'), 'day')
  if (days <= 0) return { kind: 'today', time: at.format('HH:mm') }
  if (days === 1) return { kind: 'yesterday', time: at.format('HH:mm') }
  return { kind: 'daysAgo', days, date: at.format('DD MMM YYYY') }
}

/** Two-letter initials for the avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Backend error codes that have their own, friendlier wording. */
const ERROR_KEYS: Record<string, string> = {
  pending_request_exists: 'deviceBinding.errors.pendingRequestExists',
  nothing_to_reset: 'deviceBinding.errors.nothingToReset',
  device_bound_to_other: 'deviceBinding.errors.deviceBoundToOther',
  device_blocked: 'deviceBinding.errors.deviceBlocked',
  request_not_pending: 'deviceBinding.errors.requestNotPending',
  concurrent_change: 'deviceBinding.errors.concurrentChange',
  already_unblocked: 'deviceBinding.errors.alreadyUnblocked',
  not_blockable: 'deviceBinding.errors.notBlockable',
}

/** The i18n key for an API error's `code`, or undefined to show the server's message. */
export function errorMessageKey(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || !e.code) return undefined
  return ERROR_KEYS[e.code]
}
