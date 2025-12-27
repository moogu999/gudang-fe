/**
 * UOM Conversion Header entity
 * Represents a named conversion set that can be shared across multiple products
 */
export interface UomConversionHeader {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdBy: number | null
  createdAt: string
  updatedAt: string
}

/**
 * DTO for creating a new UOM Conversion Header
 */
export interface CreateUomConversionHeaderDto {
  name: string
  description?: string | null
  isActive: boolean
  createdBy: number
}

/**
 * DTO for updating a UOM Conversion Header
 */
export interface UpdateUomConversionHeaderDto {
  name: string
  description?: string | null
  isActive: boolean
}
