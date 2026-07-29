import type { PinnedUom } from './pinnedUom.type'

export type ArrivalType = 'regular' | 'consignment' | 'bonus' | 'transfer' | 'return_in' | 'other'
export type StockType = 'good' | 'bad'
export type GoodsReceiptStatus = 'draft' | 'need_approval' | 'approved'

export interface GRProductLite {
  id: number
  code: string
  name: string
  uomGroup?: {
    levels: { levelOrder: number; qtyPerParent: number | null; uom?: { symbol: string } }[]
  }
}

export interface GoodsReceiptHeader {
  id: number
  no: string
  status: GoodsReceiptStatus
  branchId: number
  purchaseOrderHeaderId: number | null
  supplierId: number | null
  supplierDoNo: string | null
  receiptDate: string
  warehouseId: number
  warehouse?: { id: number; name: string }
  arrivalType: ArrivalType
  remark: string | null
  subtotalAmount: string
  taxAmount: string
  totalAmount: string
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
}

export interface GoodsReceiptDetailRow {
  _localId: string
  _isPlaceholder?: boolean
  productId?: number
  product?: GRProductLite
  quantity?: number
  price?: number
  stockType?: StockType
  purchaseOrderDetailId?: number
  pinnedUom?: PinnedUom | null
  /** Marks a row added via the "split line" action, so it (and only it) can be removed. */
  _isSplit?: boolean
  /** PO line's ordered quantity (base UOM) — set only when hydrated from a PO line. */
  _poQuantity?: number
  /** PO line's already-received quantity (base UOM), excluding this in-progress receipt. */
  _poReceivedQuantity?: number
  /** _poQuantity - _poReceivedQuantity, kept in sync as sibling rows against the same PO line change. */
  _remainingQuantity?: number
  [key: string]: unknown
}

export interface GoodsReceiptDetailResponse {
  id: number
  goodsReceiptHeaderId: number
  productId: number
  productCode: string
  productName: string
  quantity: string
  price: string
  subAmount: string
  stockType: StockType
  purchaseOrderDetailId: number | null
  pinnedUom?: PinnedUom | null
  createdAt: string
  updatedAt: string | null
}

export interface GoodsReceiptResponse {
  id: number
  no: string
  status: GoodsReceiptStatus
  branchId: number
  purchaseOrderHeaderId: number | null
  supplierId: number | null
  supplierDoNo: string | null
  receiptDate: string
  warehouseId: number
  warehouseName: string | null
  arrivalType: string
  receivedByEmployeeId: number | null
  remark: string | null
  subtotalAmount: string
  taxAmount: string
  totalAmount: string
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
  details: GoodsReceiptDetailResponse[]
}

export interface CreateGoodsReceiptRequest {
  no?: string | null
  branchId?: number | null
  status: 'draft' | 'approved'
  purchaseOrderHeaderId?: number | null
  supplierId?: number | null
  supplierDoNo?: string | null
  receiptDate: string
  warehouseId: number
  arrivalType: ArrivalType
  remark?: string | null
  details: CreateGoodsReceiptDetailDto[]
}

export type UpdateGoodsReceiptRequest = CreateGoodsReceiptRequest

export interface CreateGoodsReceiptDetailDto {
  productId: number
  quantity: string
  price: string
  stockType?: StockType
  purchaseOrderDetailId?: number | null
}

/** A row in the receivable-PO picker (`/v1/purchase-orders/available-for-receipt`). */
export interface AvailablePurchaseOrder {
  id: number
  no: string
  supplierId: number
  supplierName: string
  branchId: number
  orderDate: string
  status: string
  totalAmount: string
  createdAt: string
}
