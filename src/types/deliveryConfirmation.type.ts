export type DeliveryConfirmationStatus = 'draft' | 'confirmed'
export type DeliveryConfirmationDOStatus = 'pending' | 'delivered' | 'partial' | 'failed'
export type DeliveryConfirmationOutcome = 'delivered' | 'partial' | 'failed'

export interface DeliveryConfirmationListItem {
  id: number
  no: string
  deliveryNoteNo: string
  driverName: string | null
  confirmationDate: string
  status: DeliveryConfirmationStatus
  doTotal: number
  doConfirmed: number
}

export interface DeliveryConfirmationItemLine {
  productId: number
  productCode: string
  productName: string
  orderedQty: string
  receivedQty: string
  price: string
  pinnedUom: string | null
}

export interface DeliveryConfirmationDODetail {
  id: number
  deliveryOrderId: number
  deliveryOrderNo: string
  customerName: string
  status: DeliveryConfirmationDOStatus
  invoiceNo: string | null
  invoiceStatus: string | null
  invoiceTotal: string | null
  reasonCode: string | null
  items: DeliveryConfirmationItemLine[]
}

export interface DeliveryConfirmationDetail {
  id: number
  no: string
  confirmationDate: string
  notes: string | null
  status: DeliveryConfirmationStatus
  deliveryNoteId: number
  deliveryNoteNo: string
  driverName: string | null
  vehiclePlate: string | null
  deliveryOrders: DeliveryConfirmationDODetail[]
}

export interface AvailableDeliveryNote {
  id: number
  no: string
  deliveryDate: string
  driverName: string | null
  vehiclePlate: string | null
  doCount: number
  totalAmount: string
}

export interface CreateDeliveryConfirmationRequest {
  no?: string | null
  deliveryNoteId: number
  confirmationDate: string
  notes?: string | null
}

export interface CreateDeliveryConfirmationResponse {
  id: number
  no: string
}

export interface ConfirmDeliveryOrderRequest {
  outcome: DeliveryConfirmationOutcome
  items: { productId: number; receivedQty: string }[]
  reasonCode?: string | null
  reasonNote?: string | null
}
