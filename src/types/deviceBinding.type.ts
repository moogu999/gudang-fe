/**
 * N-Force device binding: which phone each enrolled salesman may use, the
 * activation codes that start a binding, phone change requests and blocks.
 *
 * Optional fields are omitted by the API when empty (never `null`), so test them
 * with `== null` or optional chaining.
 */

export type BindingStatus = 'pending_review' | 'active' | 'blocked' | 'not_logged_in'
export type DeviceStatus = 'pending' | 'active' | 'sync_only' | 'released' | 'rejected' | 'blocked'
export type DevicePlatform = 'android' | 'ios'
export type ChangeReason = 'new_phone' | 'broken' | 'lost' | 'reset' | 'other'
export type ReleaseReason = 'reset' | 'replaced' | 'ineligible' | 'blocked' | 'rejected'
export type NotificationChannel = 'email' | 'whatsapp'
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'
export type ActivationCodePurpose = 'enroll' | 'reset_pin'
export type DeviceFlagKind = 'mock_location' | 'rooted'
export type DeviceDifference = 'platform' | 'model' | 'osVersion'

/** What the stat cards filter on: a binding status, or bound phones not synced for 24 hours. */
export type DeviceBindingStatusFilter = BindingStatus | 'stale24h'

export interface DeviceBindingRef {
  id: number
  name: string
}

export interface BindingEmployee {
  id: number
  name: string
  nip?: string
  phone?: string
  typeName: string
  branch?: DeviceBindingRef
  team?: DeviceBindingRef
  supervisorName?: string
  companyName?: string
}

export interface Device {
  id: number
  deviceUid: string
  platform: DevicePlatform
  model?: string
  osVersion?: string
  appVersion?: string
  /** As of now: a sync-only phone past its date reads as released. */
  status: DeviceStatus
  changeReason?: ChangeReason
  changeNote?: string
  requestedAt?: string
  boundAt?: string
  /** Bound on first sign-in rather than by an approver. */
  autoBound?: boolean
  syncOnlyUntil?: string
  releasedAt?: string
  releaseReason?: ReleaseReason
  lastSyncAt?: string
  createdAt: string
  /** On a pending change, the model of the bound phone it would replace. */
  previousModel?: string
}

export interface DeviceBinding {
  employee: BindingEmployee
  status: BindingStatus
  currentDevice?: Device
  pendingDevice?: Device
  appOutdated: boolean
  osOutdated: boolean
  /** Days in the last 30 with a mock-location flag, on any of the salesman's phones. */
  mockLocationDays30: number
  hasUsableCode: boolean
  /**
   * Opening the code dialog succeeds: an unused code exists (an expired one, or
   * one for an old phone number, is reissued with the same purpose) or no PIN
   * is set yet. Covers an expired PIN-reset code, which `hasUsableCode` doesn't.
   */
  canViewCode: boolean
  pinSet: boolean
  /** The approval request of the pending change, once submitted. */
  pendingRequestId?: number
  /** The salesman's most recent open block, for Unblock. */
  openBlockId?: number
}

export interface DeviceBindingSummary {
  enrolled: number
  android: number
  ios: number
  latestAppVersion?: string
  active: number
  pending: number
  blocked: number
  notLoggedIn: number
  stale24h: number
  /** False when a listed salesman's company has no Device Binding approval flow. */
  approvalFlowConfigured: boolean
}

export interface DeviceBindingFilters {
  branchId?: number
  teamId?: number
  platform?: DevicePlatform
}

export interface NotificationDelivery {
  id: number
  channel: NotificationChannel | 'push'
  status: DeliveryStatus
  attempts: number
  sentAt?: string
  lastError?: string
  createdAt: string
}

export interface ChannelOption {
  /** A provider is configured and the salesman has an address for it. */
  enabled: boolean
  address?: string
}

export interface ActivationCodeView {
  /** Absent when fetched with `includeCode=false`. */
  code?: string
  purpose?: ActivationCodePurpose
  expiresAt?: string
  createdAt?: string
  createdByName?: string
  /** The normalized phone number the code works with. */
  phone: string
  deliveries: NotificationDelivery[]
  channels: Record<NotificationChannel, ChannelOption>
}

export interface DeviceBlock {
  id: number
  deviceUid: string
  reason: string
  blockedAt: string
}

export interface DeviceFlag {
  kind: DeviceFlagKind
  /** `YYYY-MM-DD` in the business timezone. */
  date: string
}

export interface DeviceEvent {
  referenceType: string
  action: string
  reason?: string
  description?: string
  /** Absent for the system or the salesman's phone. */
  actorName?: string
  at: string
}

export interface DeviceHistoryEntry {
  device: Device
  flags: DeviceFlag[]
  events: DeviceEvent[]
}

export interface DeviceHistory {
  employee: BindingEmployee
  devices: DeviceHistoryEntry[]
  /** Events not tied to a phone: codes, PIN resets, lockouts, refused sign-ins. */
  accountEvents: DeviceEvent[]
}

export interface ChangeRequestChecks {
  pinLogin: boolean
  notBoundElsewhere: boolean
  notBlocked: boolean
  noRiskFlags: boolean
  oldLastSyncAt?: string
}

export interface ChangeRequestReview {
  employee: BindingEmployee
  current?: Device
  requested: Device
  checks: ChangeRequestChecks
  differences: DeviceDifference[]
  approval: {
    flowConfigured: boolean
    submitted: boolean
    requestId?: number
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
    comment?: string
  }
}

export interface DeviceBindingConfigInput {
  approvalFlowId?: number
  activationCodeTtlDays: number
  syncOnlyDays: number
  maxPinAttempts: number
  lockoutMinutes: number
  minAppVersionAndroid?: string
  minAppVersionIos?: string
  minOsAndroid: string
  minOsIos: string
}

export interface DeviceBindingConfig extends DeviceBindingConfigInput {
  companyId: number
  /** False while the company still uses the defaults. */
  saved: boolean
  updatedAt?: string
  /** Only on save: how many waiting phone changes were sent to approval. */
  submittedCount?: number
}

/** The admin actions that need a written reason. */
export type DeviceActionKind = 'reset_pin' | 'reset_binding' | 'block' | 'unblock'
