import type { TrackingTypeLite } from './trackingType.type'
import type { UomGroup } from './uomGroup.type'

export interface ProductLabelDefinitionLite {
  id: number
  name: string
}

export interface ProductLabelOptionLite {
  id: number
  value: string
}

export interface ProductLabelValue {
  id: number
  productId: number
  labelDefinitionId: number
  labelOptionId: number
  definition?: ProductLabelDefinitionLite
  option?: ProductLabelOptionLite
}

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
  uomGroupId?: number
  createdAt: string
  updatedAt: string
  createdBy?: number

  // Relations
  trackingType?: TrackingTypeLite
  uomGroup?: UomGroup
  createdByUser?: {
    email: string
  }
  labels?: ProductLabelValue[]
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
  uomGroupId?: number
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
  uomGroupId?: number
  updatedBy: number
}
