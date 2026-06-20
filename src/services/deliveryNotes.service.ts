import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  DeliveryNoteListItem,
  DeliveryNoteDetail,
  AvailableDeliveryOrder,
  CreateDeliveryNoteRequest,
  CreateDeliveryNoteResponse,
  UpdateDeliveryNoteRequest,
} from '@/types/deliveryNote.type'
import { API_ENDPOINTS } from '@/constants/api'

export class DeliveryNotesService {
  static async list(queryString?: string): Promise<Base<DeliveryNoteListItem>> {
    const url = queryString
      ? `${API_ENDPOINTS.DELIVERY_NOTES}?${queryString}`
      : API_ENDPOINTS.DELIVERY_NOTES
    return ApiService.get<Base<DeliveryNoteListItem>>(url)
  }

  static async get(id: number): Promise<DeliveryNoteDetail> {
    return ApiService.get<DeliveryNoteDetail>(API_ENDPOINTS.DELIVERY_NOTE_BY_ID(id))
  }

  static async create(payload: CreateDeliveryNoteRequest): Promise<CreateDeliveryNoteResponse> {
    return ApiService.post<CreateDeliveryNoteResponse>(API_ENDPOINTS.DELIVERY_NOTES, payload)
  }

  static async update(id: number, payload: UpdateDeliveryNoteRequest): Promise<void> {
    return ApiService.put<void>(API_ENDPOINTS.DELIVERY_NOTE_BY_ID(id), payload)
  }

  static async cancel(id: number): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.DELIVERY_NOTE_CANCEL(id), {})
  }

  static async listAvailableDeliveryOrders(
    queryString?: string,
  ): Promise<Base<AvailableDeliveryOrder>> {
    const url = queryString
      ? `${API_ENDPOINTS.DELIVERY_NOTE_AVAILABLE_DOS}?${queryString}`
      : API_ENDPOINTS.DELIVERY_NOTE_AVAILABLE_DOS
    return ApiService.get<Base<AvailableDeliveryOrder>>(url)
  }
}
