import type { PinnedUom } from './pinnedUom.type'

export type GoodsReturnNoteStatus = 'applied'
export type DriverStockSourceType = 'partial_delivery' | 'failed_delivery'
export type GoodsReturnNoteItemStockType = 'good'

export interface AvailableDriver {
  driverEmployeeId: number
  driverName: string
  vehiclePlate: string | null
  openItemCount: number
}

export interface DriverStockItem {
  driverStockItemId: number
  deliveryOrderId: number
  deliveryOrderNo: string
  sourceType: DriverStockSourceType
  productId: number
  productName: string
  warehouseId: number
  outstandingQty: string
  pinnedUom: PinnedUom | null
}

export interface DriverStockGroup {
  deliveryOrderId: number
  deliveryOrderNo: string
  sourceType: DriverStockSourceType
  items: DriverStockItem[]
}

export interface GoodsReturnNoteListItem {
  id: number
  no: string
  returnDate: string
  driverEmployeeId: number
  driverName: string
  itemCount: number
  status: GoodsReturnNoteStatus
  createdAt: string
}

export interface GoodsReturnNoteItemLine {
  deliveryOrderId: number
  deliveryOrderNo: string
  warehouseId: number
  warehouseName: string
  productId: number
  productCode: string
  productName: string
  pinnedUom: PinnedUom | null
  receivedQty: string
  stockType: GoodsReturnNoteItemStockType
}

export interface GoodsReturnNoteDetail {
  id: number
  no: string
  returnDate: string
  driverEmployeeId: number
  driverName: string
  notes: string | null
  status: GoodsReturnNoteStatus
  createdAt: string
  createdBy: number
  items: GoodsReturnNoteItemLine[]
}

export interface CreateGoodsReturnNoteRequest {
  no?: string | null
  driverEmployeeId: number
  returnDate: string
  notes?: string | null
  items: { driverStockItemId: number; receivedQty: string }[]
}

export interface CreateGoodsReturnNoteResponse {
  goodsReturnNoteId: number
  no: string
}
