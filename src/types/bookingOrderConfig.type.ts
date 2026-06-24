export interface BookingOrderConfig {
  id: number
  branchId: number
  branchName: string
  warehouseId: number
  warehouseName: string
  recalculatePartialPricing: boolean
  createdAt: string
  updatedAt?: string
}

export interface UpsertBookingOrderConfigDto {
  warehouseId: number
  recalculatePartialPricing: boolean
}
