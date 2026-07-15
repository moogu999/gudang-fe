export interface CreateReturnDeliveryOrderDto {
  salesOrderId: number
  driverEmployeeId: number
  no?: string | null
}

export interface ReturnDeliveryOrderResult {
  salesOrderId: number
  deliveryOrderId: number
  deliveryOrderNo: string
}
