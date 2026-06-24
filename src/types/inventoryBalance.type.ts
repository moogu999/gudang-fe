export type InventoryBalanceStatus = 'out' | 'normal'

export interface InventoryBalance {
  id: number
  warehouseId: number
  warehouseName?: string
  warehouseCode?: string
  productId: number
  productCode?: string
  productName?: string
  uomSymbol?: string
  stockType: string
  onHand: string
  inTransit: string
  reserved: string
  available: string
  lastCost: string
  value: string
  status: InventoryBalanceStatus | null
  updatedAt: string | null
}

export interface InventorySummary {
  onHand: string
  inTransit: string
  reserved: string
  available: string
}
