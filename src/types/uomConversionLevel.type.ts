import type { UnitOfMeasurementLite } from './unitOfMeasurement.type'

/**
 * UOM Conversion Level entity
 * Represents one level in a product base UOM's ordered conversion chain.
 * Level 1 is the top-most unit (e.g. Box); qtyPerParent is null for level 1
 * and a positive integer for all subsequent levels.
 *
 * Example: Box (level 1) → Pack (level 2, 10 per box) → Piece (level 3, 5 per pack)
 */
export interface UomConversionLevel {
  id: number
  uomGroupId: number
  levelOrder: number
  uomId: number
  qtyPerParent: number | null
  // Relations
  uom?: UnitOfMeasurementLite
}

/**
 * DTO for creating a new UOM Conversion Level
 */
export interface CreateUomConversionLevelDto {
  uomGroupId: number
  levelOrder: number
  uomId: number
  qtyPerParent?: number | null
}

/**
 * DTO for updating a UOM Conversion Level
 */
export interface UpdateUomConversionLevelDto {
  levelOrder?: number
  uomId?: number
  qtyPerParent?: number | null
}
