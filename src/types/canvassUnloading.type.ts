import type { PinnedUom } from './pinnedUom.type'
import type { CanvassRef, CanvassSalesmanRef } from './canvassLoading.type'

export type CanvassUnloadingStatus = 'draft' | 'posted' | 'cancelled'
export type CanvassStockType = 'good' | 'bad'

export interface CanvassUnloadingLine {
  productId: number
  productCode: string
  productName: string
  stockType: CanvassStockType
  pinnedUom?: PinnedUom
  /** The van's balance when posted; absent for a draft. */
  expectedQty?: string
  /** The van's balance right now; present for a draft. */
  vanBalance?: string
  returnedQty: string
  unitCost?: string
  /** Expected (draft: the van's current balance) less returned: the "Selisih". */
  shortage: string
}

export interface CanvassUnloading {
  id: number
  no: string
  status: CanvassUnloadingStatus
  unloadDate: string
  notes?: string
  branch: CanvassRef
  vanWarehouse: CanvassRef
  destinationWarehouse: CanvassRef
  salesman: CanvassSalesmanRef
  postedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt?: string
  lines: CanvassUnloadingLine[]
}

export interface CanvassUnloadingRow {
  id: number
  no: string
  status: CanvassUnloadingStatus
  unloadDate: string
  branch: CanvassRef
  vanWarehouse: CanvassRef
  destinationWarehouse: CanvassRef
  salesman: CanvassSalesmanRef
  lineCount: number
  createdAt: string
}

export interface SaveCanvassUnloadingRequest {
  no?: string
  vanWarehouseId: number
  destinationWarehouseId: number
  unloadDate: string
  notes?: string
  /** Required on update; on create, omit to prefill from the van's stock. */
  lines?: { productId: number; stockType: CanvassStockType; returnedQty: string }[]
}

export interface CanvassVanStock {
  productId: number
  productCode: string
  productName: string
  stockType: CanvassStockType
  onHand: string
  averageCost: string
  pinnedUom?: PinnedUom
}
