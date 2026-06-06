export interface PickingListListItem {
  id: number
  no: string
  deliveryNoteId: number
  deliveryNoteNo: string
  status: string
  createdAt: string
}

export interface PickingListDetailItem {
  productId: number
  productCode: string
  productName: string
  warehouseName: string
  quantity: string
  pinnedUom: import('./pinnedUom.type').PinnedUom | null
  labelName: string | null
  labelValue: string | null
}

export interface PickingListDetail {
  id: number
  no: string
  deliveryNoteId: number
  deliveryNoteNo: string
  status: string
  createdAt: string
  items: PickingListDetailItem[]
}
