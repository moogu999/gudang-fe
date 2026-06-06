import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { PickingListListItem, PickingListDetail } from '@/types/pickingList.type'
import { API_ENDPOINTS } from '@/constants/api'

export class PickingListsService {
  static async list(queryString?: string): Promise<Base<PickingListListItem>> {
    const url = queryString
      ? `${API_ENDPOINTS.PICKING_LISTS}?${queryString}`
      : API_ENDPOINTS.PICKING_LISTS
    return ApiService.get<Base<PickingListListItem>>(url)
  }

  static async get(id: number): Promise<PickingListDetail> {
    return ApiService.get<PickingListDetail>(API_ENDPOINTS.PICKING_LIST_BY_ID(id))
  }
}
