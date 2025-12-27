import type { UnitOfMeasurement } from './unitOfMeasurement.type'

/**
 * UOM Conversion Detail entity
 * Represents an individual conversion rule within a conversion header
 * Example: 1 Box = 10 Packs
 */
export interface UomConversionDetail {
  id: number
  headerId: number
  fromUomId: number
  toUomId: number
  conversionFactor: number
  createdAt: string
  updatedAt: string
  // Relations
  fromUom?: UnitOfMeasurement
  toUom?: UnitOfMeasurement
}

/**
 * DTO for creating a new UOM Conversion Detail
 */
export interface CreateUomConversionDetailDto {
  headerId: number
  fromUomId: number
  toUomId: number
  conversionFactor: number
}

/**
 * DTO for updating a UOM Conversion Detail
 */
export interface UpdateUomConversionDetailDto {
  fromUomId: number
  toUomId: number
  conversionFactor: number
}
