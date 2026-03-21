/**
 * Lite version of UnitOfMeasurement used in nested relations
 */
export interface UnitOfMeasurementLite {
  id: number
  name: string
  symbol: string
}

/**
 * Unit of Measurement entity
 */
export interface UnitOfMeasurement {
  id: number
  name: string
  symbol: string
  isCustom: boolean
  createdBy: number | null
  createdAt: string
}

/**
 * DTO for creating a new Unit of Measurement
 */
export interface CreateUnitOfMeasurementDto {
  name: string
  symbol: string
  isCustom: boolean
  createdBy: number
}

/**
 * DTO for updating a Unit of Measurement
 */
export interface UpdateUnitOfMeasurementDto {
  name: string
  symbol: string
}
