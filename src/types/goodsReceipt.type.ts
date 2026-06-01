export type ArrivalType = 'regular' | 'consignment' | 'bonus' | 'transfer' | 'return_in' | 'other'
export type StockType = 'good' | 'bad'

export interface GRProductLite {
  id: number
  code: string
  name: string
  uomGroup?: {
    levels: { levelOrder: number; uom?: { symbol: string } }[]
  }
}

export interface GoodsReceiptHeader {
  id: number
  no: string
  receiptDate: string
  warehouseId: number
  warehouse?: { id: number; name: string }
  arrivalType: ArrivalType
  stockType: StockType
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
  [key: string]: unknown
}

export interface GoodsReceiptDetailResponse {
  id: number
  goodsReceiptHeaderId: number
  productId: number
  quantity: string
  price: string
  subAmount: string
  createdAt: string
  updatedAt: string | null
}

export interface GoodsReceiptResponse {
  id: number
  no: string
  receiptDate: string
  warehouseId: number
  warehouseName: string | null
  arrivalType: string
  stockType: string
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
  receiptDate: string
  warehouseId: number
  arrivalType: ArrivalType
  stockType: StockType
  remark?: string | null
  details: CreateGoodsReceiptDetailDto[]
  createdBy: number
}

export interface CreateGoodsReceiptDetailDto {
  productId: number
  quantity: string
  price: string
}
