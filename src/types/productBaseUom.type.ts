import type { UomConversionHeader } from './uomConversionHeader.type'
import type { UnitOfMeasurement } from './unitOfMeasurement.type'

/**
 * ProductBaseUom entity
 *
 * Represents a reusable base UOM configuration that bundles together:
 * - Conversion header (defines all UOM conversions)
 * - Base UOM (smallest unit for calculations)
 * - Default display UOM (default unit for UI display)
 */
export interface ProductBaseUom {
  id: number
  name: string
  uomConversionHeaderId: number
  baseUomId: number
  defaultDisplayUomId: number
  createdAt: string
  updatedAt: string

  // Relations
  uomConversionHeader?: UomConversionHeader
  baseUom?: UnitOfMeasurement
  defaultDisplayUom?: UnitOfMeasurement
}

/**
 * DTO for creating a new ProductBaseUom
 */
export interface CreateProductBaseUomDto {
  name: string
  uomConversionHeaderId: number
  baseUomId: number
  defaultDisplayUomId: number
}

/**
 * DTO for updating an existing ProductBaseUom
 */
export interface UpdateProductBaseUomDto {
  name?: string
  uomConversionHeaderId?: number
  baseUomId?: number
  defaultDisplayUomId?: number
}
