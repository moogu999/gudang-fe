export type DeliveryNoteStatus = 'open' | 'cancelled'

export interface DeliveryNoteListItem {
  id: number
  no: string
  deliveryDate: string
  vehiclePlate: string | null
  driverName: string | null
  doCount: number
  status: DeliveryNoteStatus
  createdAt: string
}

export interface DeliveryNoteDeliveryOrder {
  id: number
  no: string
  customerName: string
  warehouseName: string
}

export interface DeliveryNotePickingListRef {
  id: number
  no: string
}

export interface DeliveryNoteDetail {
  id: number
  no: string
  deliveryDate: string
  vehicleId: number | null
  vehiclePlate: string | null
  driverEmployeeId: number | null
  driverName: string | null
  notes: string | null
  status: DeliveryNoteStatus
  createdAt: string
  createdBy: number
  cancelledAt: string | null
  deliveryOrders: DeliveryNoteDeliveryOrder[]
  pickingList: DeliveryNotePickingListRef | null
}

export interface AvailableDeliveryOrder {
  id: number
  no: string
  customerName: string
  warehouseName: string
  totalAmount: string
  createdAt: string
}

export interface CreateDeliveryNoteRequest {
  no?: string | null
  deliveryDate: string
  vehicleId?: number | null
  driverEmployeeId?: number | null
  notes?: string | null
  deliveryOrderIds: number[]
}

export interface CreateDeliveryNoteResponse {
  deliveryNoteId: number
  no: string
  pickingListId: number
  pickingListNo: string
}
