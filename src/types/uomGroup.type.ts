import type { UomConversionLevel } from './uomConversionLevel.type'
import type { UnitOfMeasurementLite } from './unitOfMeasurement.type'

/**
 * UomGroup entity
 *
 * Represents a reusable, named UOM configuration for a product type.
 * Contains an ordered chain of conversion levels (e.g. Box → Pack → Piece)
 * and a default display UOM for UI presentation.
 */
export interface UomGroup {
  id: number
  name: string
  description: string | null
  isActive: boolean
  defaultDisplayUomId: number | null
  levels: UomConversionLevel[]
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
  // Relations
  defaultDisplayUom?: UnitOfMeasurementLite
}

/**
 * DTO for creating a new UomGroup
 */
export interface CreateUomGroupDto {
  name: string
  description?: string | null
  isActive: boolean
  defaultDisplayUomId?: number | null
  createdBy: number
}

/**
 * DTO for updating an existing UomGroup
 */
export interface UpdateUomGroupDto {
  name?: string
  description?: string | null
  isActive?: boolean
  defaultDisplayUomId?: number | null
}
