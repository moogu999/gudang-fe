import type { PinnedUom } from './pinnedUom.type'

export type GoodsIssueNoteStatus = 'issued' | 'cancelled'

export interface GoodsIssueNoteListItem {
  id: number
  no: string
  pickingListId: number
  pickingListNo: string
  deliveryNoteId: number
  deliveryNoteNo: string
  status: GoodsIssueNoteStatus
  createdAt: string
}

export interface GoodsIssueNoteItem {
  productId: number
  productCode: string
  productName: string
  warehouseId: number
  warehouseName: string
  quantity: string
  pinnedUom: PinnedUom | null
  labelName: string | null
  labelValue: string | null
}

export interface GoodsIssueNoteDetail {
  id: number
  no: string
  status: GoodsIssueNoteStatus
  issueDate: string
  notes: string | null
  pickingListId: number
  pickingListNo: string
  deliveryNoteId: number
  deliveryNoteNo: string
  createdAt: string
  createdBy: number
  items: GoodsIssueNoteItem[]
}

export interface CreateGoodsIssueNoteRequest {
  no?: string | null
  pickingListId: number
  issueDate?: string
  notes?: string | null
}

export interface CreateGoodsIssueNoteResponse {
  goodsIssueNoteId: number
  no: string
}

export interface AvailablePickingList {
  id: number
  no: string
  deliveryNoteNo: string
  itemCount: number
  totalQty: string
}
