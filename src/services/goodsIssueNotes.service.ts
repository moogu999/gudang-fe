import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  GoodsIssueNoteListItem,
  GoodsIssueNoteDetail,
  CreateGoodsIssueNoteRequest,
  CreateGoodsIssueNoteResponse,
  AvailablePickingList,
} from '@/types/goodsIssueNote.type'
import { API_ENDPOINTS } from '@/constants/api'

export class GoodsIssueNotesService {
  static async list(queryString?: string): Promise<Base<GoodsIssueNoteListItem>> {
    const url = queryString
      ? `${API_ENDPOINTS.GOODS_ISSUE_NOTES}?${queryString}`
      : API_ENDPOINTS.GOODS_ISSUE_NOTES
    return ApiService.get<Base<GoodsIssueNoteListItem>>(url)
  }

  static async get(id: number): Promise<GoodsIssueNoteDetail> {
    return ApiService.get<GoodsIssueNoteDetail>(API_ENDPOINTS.GOODS_ISSUE_NOTE_BY_ID(id))
  }

  static async create(payload: CreateGoodsIssueNoteRequest): Promise<CreateGoodsIssueNoteResponse> {
    return ApiService.post<CreateGoodsIssueNoteResponse>(API_ENDPOINTS.GOODS_ISSUE_NOTES, payload)
  }

  static async listAvailablePickingLists(
    queryString?: string,
  ): Promise<Base<AvailablePickingList>> {
    const url = queryString
      ? `${API_ENDPOINTS.GOODS_ISSUE_NOTE_AVAILABLE_PLS}?${queryString}`
      : API_ENDPOINTS.GOODS_ISSUE_NOTE_AVAILABLE_PLS
    return ApiService.get<Base<AvailablePickingList>>(url)
  }
}
