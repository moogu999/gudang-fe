import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  DeliveryConfirmationListItem,
  DeliveryConfirmationDetail,
  AvailableDeliveryNote,
  CreateDeliveryConfirmationRequest,
  CreateDeliveryConfirmationResponse,
  ConfirmDeliveryOrderRequest,
} from '@/types/deliveryConfirmation.type'
import { API_ENDPOINTS } from '@/constants/api'

export class DeliveryConfirmationsService {
  static async list(queryString?: string): Promise<Base<DeliveryConfirmationListItem>> {
    const url = queryString
      ? `${API_ENDPOINTS.DELIVERY_CONFIRMATIONS}?${queryString}`
      : API_ENDPOINTS.DELIVERY_CONFIRMATIONS
    return ApiService.get<Base<DeliveryConfirmationListItem>>(url)
  }

  static async get(id: number): Promise<DeliveryConfirmationDetail> {
    return ApiService.get<DeliveryConfirmationDetail>(API_ENDPOINTS.DELIVERY_CONFIRMATION_BY_ID(id))
  }

  static async create(
    payload: CreateDeliveryConfirmationRequest,
  ): Promise<CreateDeliveryConfirmationResponse> {
    return ApiService.post<CreateDeliveryConfirmationResponse>(
      API_ENDPOINTS.DELIVERY_CONFIRMATIONS,
      payload,
    )
  }

  static async listAvailableDeliveryNotes(
    queryString?: string,
  ): Promise<Base<AvailableDeliveryNote>> {
    const url = queryString
      ? `${API_ENDPOINTS.DELIVERY_CONFIRMATION_AVAILABLE_DNS}?${queryString}`
      : API_ENDPOINTS.DELIVERY_CONFIRMATION_AVAILABLE_DNS
    return ApiService.get<Base<AvailableDeliveryNote>>(url)
  }

  static async confirmDeliveryOrder(
    id: number,
    doId: number,
    payload: ConfirmDeliveryOrderRequest,
  ): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.DELIVERY_CONFIRMATION_CONFIRM_DO(id, doId), payload)
  }
}
