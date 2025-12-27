import type { TrackingTypeLite } from './trackingType.type'
import type { ProductBaseUom } from './productBaseUom.type'

/**
 * Product entity
 *
 * Represents a product in the system with its basic information,
 * tracking configuration, and unit of measurement settings.
 */
export interface Product {
  id: number
  code: string
  name: string
  description?: string
  taxable: boolean
  trackingTypeId: number
  productBaseUomId?: number
  createdAt: string
  updatedAt: string
  createdBy?: number

  // Relations
  trackingType?: TrackingTypeLite
  productBaseUom?: ProductBaseUom
  createdByUser?: {
    email: string
  }
}

/**
 * DTO for creating a new Product
 */
export interface CreateProductDto {
  code: string
  name: string
  description?: string
  taxable: boolean
  trackingTypeId: number
  productBaseUomId?: number
  createdBy: number
}

/**
 * DTO for updating an existing Product
 */
export interface UpdateProductDto {
  code?: string
  name?: string
  description?: string
  taxable?: boolean
  trackingTypeId?: number
  productBaseUomId?: number
  updatedBy: number
}
