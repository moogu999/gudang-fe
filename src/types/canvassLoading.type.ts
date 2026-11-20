import type { PinnedUom } from './pinnedUom.type'

export type CanvassLoadingStatus = 'draft' | 'sent' | 'rejected' | 'confirmed' | 'cancelled'

export interface CanvassRef {
  id: number
  code?: string
  name: string
}

export interface CanvassSalesmanRef {
  id: number
  name: string
  nip?: string
}

export interface CanvassLoadingLine {
  productId: number
  productCode: string
  productName: string
  /** Decimal string, in the product's base UOM. */
  quantity: string
  unitCost?: string
  pinnedUom?: PinnedUom
  /** New, or a different quantity than the previous revision. */
  changed: boolean
  previousQuantity?: string
}

export interface CanvassLoadingRevision {
  revision: number
  lines: CanvassLoadingLine[]
}

export interface CanvassRejectionLine {
  productId: number
  productCode: string
  productName: string
  /** Absent for an extra product the document did not list. */
  documentQty?: string
  physicalQty: string
}

export interface CanvassRejection {
  revision: number
  note: string
  rejectedAt: string
  rejectedBy?: number
  rejectedByEmail?: string
  lines: CanvassRejectionLine[]
}

export interface CanvassLoading {
  id: number
  no: string
  status: CanvassLoadingStatus
  /** The revision the salesman is asked to confirm. */
  revision: number
  /** The revision `lines` belongs to; the next one while a rejected loading is being revised. */
  workingRevision: number
  loadingDate: string
  notes?: string
  branch: CanvassRef
  sourceWarehouse: CanvassRef
  vanWarehouse: CanvassRef
  salesman: CanvassSalesmanRef
  sentAt?: string
  confirmedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt?: string
  lines: CanvassLoadingLine[]
  revisions?: CanvassLoadingRevision[]
  rejections: CanvassRejection[]
}

export interface CanvassLoadingRow {
  id: number
  no: string
  status: CanvassLoadingStatus
  revision: number
  loadingDate: string
  branch: CanvassRef
  sourceWarehouse: CanvassRef
  vanWarehouse: CanvassRef
  salesman: CanvassSalesmanRef
  lineCount: number
  createdAt: string
}

export interface SaveCanvassLoadingRequest {
  /** A manual document number; omit to draw one from the number series. */
  no?: string
  sourceWarehouseId: number
  salesmanId: number
  loadingDate: string
  notes?: string
  lines: { productId: number; quantity: string }[]
}

export interface CanvassLoadingAvailableStock {
  productId: number
  available: string
}
