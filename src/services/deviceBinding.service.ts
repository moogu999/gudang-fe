import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ActivationCodeView,
  ChangeRequestReview,
  DeviceBinding,
  DeviceBindingFilters,
  DeviceBindingStatusFilter,
  DeviceBindingSummary,
  DeviceBlock,
  DeviceHistory,
  NotificationChannel,
  NotificationDelivery,
} from '@/types/deviceBinding.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

/** `/v1/device-binding` reads its named filters from the url; the table adds only `q`/`limit`/`offset`. */
const toListQuery = createListQueryAdapter([])

export interface DeviceBindingListFilters extends DeviceBindingFilters {
  status?: DeviceBindingStatusFilter | null
  /** Only phones below the configured minimum app or OS version. */
  outdated?: boolean
}

function filterParams(filters: DeviceBindingFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.branchId) params.set('branchId', String(filters.branchId))
  if (filters.teamId) params.set('teamId', String(filters.teamId))
  if (filters.platform) params.set('platform', filters.platform)
  return params
}

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * The admin side of N-Force device binding: enrolled salesmen and their phones,
 * activation codes, phone change requests, resets and blocks. Every list is
 * scoped to the caller's branches server-side.
 */
export class DeviceBindingService {
  private static readonly BASE_URL = API_ENDPOINTS.DEVICE_BINDING

  /**
   * Translates a generic CRUD query string into the parameters `/v1/device-binding`
   * reads. Pass it as `TableComponent`'s `query-adapter`.
   */
  static readonly toListQuery = toListQuery

  /**
   * The list url for `TableComponent`, carrying the page's filters. The stat card
   * "No sync > 24h" is the `stale` flag, not a status.
   */
  static listUrl(filters: DeviceBindingListFilters): string {
    const params = filterParams(filters)
    if (filters.status === 'stale24h') params.set('stale', 'true')
    else if (filters.status) params.set('status', filters.status)
    if (filters.outdated) params.set('outdated', 'true')
    return withQuery(this.BASE_URL, params)
  }

  static async list(queryString?: string): Promise<Base<DeviceBinding>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<DeviceBinding>>(url)
  }

  /** The stat cards. They ignore the status, outdated, stale and search filters. */
  static async summary(filters: DeviceBindingFilters = {}): Promise<DeviceBindingSummary> {
    return ApiService.get<DeviceBindingSummary>(
      withQuery(API_ENDPOINTS.DEVICE_BINDING_SUMMARY, filterParams(filters)),
    )
  }

  /**
   * The salesman's usable activation code, generated when the last one ran out.
   * Every view is audited, so poll with `includeCode = false`: that returns the
   * deliveries and channels only and writes no audit.
   *
   * @throws ApiError 404 `no_code` when the PIN is set and no reset is pending
   */
  static async getActivationCode(
    employeeId: number,
    includeCode = true,
  ): Promise<ActivationCodeView> {
    const url = API_ENDPOINTS.DEVICE_BINDING_ACTIVATION_CODE(employeeId)
    return ApiService.get<ActivationCodeView>(includeCode ? url : `${url}?includeCode=false`)
  }

  static async sendActivationCode(
    employeeId: number,
    channels: NotificationChannel[],
  ): Promise<NotificationDelivery[]> {
    const res = await ApiService.post<{ deliveries: NotificationDelivery[] }>(
      API_ENDPOINTS.DEVICE_BINDING_ACTIVATION_CODE_SEND(employeeId),
      { channels },
    )
    return res.deliveries
  }

  /** Issues a PIN reset code and clears any lockout; the old PIN works until the new one is set. */
  static async resetPin(employeeId: number, reason: string): Promise<ActivationCodeView> {
    return ApiService.post<ActivationCodeView>(API_ENDPOINTS.DEVICE_BINDING_RESET_PIN(employeeId), {
      reason,
    })
  }

  /** @throws ApiError 409 `pending_request_exists` while a submitted change request waits */
  static async resetBinding(employeeId: number, reason: string): Promise<void> {
    await ApiService.post<void>(API_ENDPOINTS.DEVICE_BINDING_RESET_BINDING(employeeId), { reason })
  }

  /** Blocks a phone for the whole company; `deviceId` defaults to the bound phone. */
  static async block(employeeId: number, reason: string, deviceId?: number): Promise<DeviceBlock> {
    return ApiService.post<DeviceBlock>(API_ENDPOINTS.DEVICE_BINDING_BLOCK(employeeId), {
      reason,
      ...(deviceId ? { deviceId } : {}),
    })
  }

  /** Lifts a block; nothing is bound again. */
  static async unblock(blockId: number, reason: string): Promise<void> {
    await ApiService.post<void>(API_ENDPOINTS.DEVICE_BINDING_UNBLOCK(blockId), { reason })
  }

  static async history(employeeId: number): Promise<DeviceHistory> {
    return ApiService.get<DeviceHistory>(API_ENDPOINTS.DEVICE_BINDING_HISTORY(employeeId))
  }

  /** A phone change request next to the phone it would replace. */
  static async getChangeRequest(deviceId: number): Promise<ChangeRequestReview> {
    return ApiService.get<ChangeRequestReview>(API_ENDPOINTS.DEVICE_BINDING_REQUEST(deviceId))
  }
}
