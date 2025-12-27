/**
 * TrackingType entity
 *
 * Represents the inventory tracking method for products.
 * - Non: Simple quantity tracking without additional details
 * - Lot: Batch/lot number tracking for expiry dates and traceability
 */
export interface TrackingType {
  id: number
  code: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Lite version of TrackingType for use in dropdown selections
 */
export interface TrackingTypeLite {
  id: number
  code: string
  name: string
}
