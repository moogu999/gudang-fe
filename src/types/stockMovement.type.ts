export interface StockMovement {
  id: number
  warehouseId: number
  warehouseName?: string
  productId: number
  productCode?: string
  productName?: string
  stockType: string
  movementType:
    | 'receipt'
    | 'reserve'
    | 'release'
    | 'issue'
    | 'delivery'
    | 'return_receipt'
    | 'sales_return_receipt'
    | 'transfer_out'
    | 'transfer_revert'
    | 'transfer_complete'
    | 'transfer_in'
    | 'transfer_out_direct'
    | 'transfer_in_direct'
  onHandDelta: string
  reservedDelta: string
  inTransitDelta: string
  onHandAfter: string
  reservedAfter: string
  inTransitAfter: string
  unitCost?: string | null
  costAmount?: string | null
  averageCostAfter?: string | null
  referenceType?: string | null
  referenceId?: number | null
  referenceNo?: string | null
  note?: string | null
  createdBy?: number | null
  createdByUser?: { email: string }
  createdAt: string
}

export interface BalanceSnapshot {
  onHand: string
  reserved: string
  inTransit: string
}

export interface StockMovementFilters {
  productId?: number
  warehouseId?: number
  warehouseKind?: 'regular' | 'canvass'
  stockType?: string
  dateRange?: [string, string]
}
