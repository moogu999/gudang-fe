import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Base } from '@/types/api.type'
import type { DisplayType, DisplayTypeOption, DisplayTypePayload } from '@/types/displayType.type'

/** The filters `/v1/display-types` reads by name. */
const toListQuery = createListQueryAdapter(['isActive'])

/** Display types. A type used by a program can't be deleted: 409 `DISPLAY_TYPE_IN_USE`. */
export class DisplayTypesService {
  /** Translates a generic CRUD query string into the parameters `/v1/display-types` reads. */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<Base<DisplayType>> {
    const url = API_ENDPOINTS.DISPLAY_TYPES
    return ApiService.get<Base<DisplayType>>(queryString ? `${url}?${queryString}` : url)
  }

  static async get(id: number): Promise<DisplayType> {
    return ApiService.get<DisplayType>(API_ENDPOINTS.DISPLAY_TYPE_BY_ID(id))
  }

  static async create(payload: DisplayTypePayload): Promise<DisplayType> {
    return ApiService.post<DisplayType>(API_ENDPOINTS.DISPLAY_TYPES, payload)
  }

  static async update(id: number, payload: DisplayTypePayload): Promise<DisplayType> {
    return ApiService.put<DisplayType>(API_ENDPOINTS.DISPLAY_TYPE_BY_ID(id), payload)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.DISPLAY_TYPE_BY_ID(id))
  }

  /**
   * Active types for a picker. `includeId` adds a type that has since been deactivated, so an
   * edit form can still show the one it holds.
   */
  static async options(includeId?: number): Promise<DisplayTypeOption[]> {
    const url = API_ENDPOINTS.DISPLAY_TYPE_OPTIONS
    const res = await ApiService.get<{ data?: DisplayTypeOption[] }>(
      includeId ? `${url}?includeId=${includeId}` : url,
    )
    return res.data ?? []
  }
}
