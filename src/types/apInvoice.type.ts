/**
 * AP Invoice types.
 *
 * Hand-written mirror of `gudang-be/api/ap_invoices.yaml` and of the generic-CRUD
 * schema `internal/pkg/genericcrud/schema/ap_invoice_header.go`. There is no codegen
 * here — a field missing from these interfaces fails silently as `undefined` at
 * runtime rather than as a compile error, so keep them in step with the backend.
 */

export type ApInvoiceStatus = 'draft' | 'need_approval' | 'approved'

/**
 * A row of `/gen/v1/ap-invoice-headers` — the list page's data source.
 * Mirrors `schema.ApInvoiceHeader`, which is a wider projection than the
 * `/v1/ap-invoices/{id}` read model (it carries `createdByEmail`, it does not
 * carry the company NPWP or the detail rows).
 */
export interface ApInvoiceHeader {
  id: number
  no: string
  branchId: number
  companyId: number
  companyName: string
  supplierId: number
  supplierName: string
  supplierInvoiceNo: string
  taxInvoiceNo: string | null
  invoiceDate: string
  paymentTermId: number
  dueDate: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  remark: string | null
  status: ApInvoiceStatus
  createdBy: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string | null
}

/** One covered Goods Receipt on a saved invoice. */
export interface ApInvoiceDetailResponse {
  id: number
  goodsReceiptHeaderId: number
  goodsReceiptNo: string
  receiptDate: string
  warehouseName: string
  purchaseOrderNo: string
  /** Snapshot of the receipt's `subtotal_amount` at save time. */
  taxBaseAmount: string
}

/** The `/v1/ap-invoices/{id}` read model. */
export interface ApInvoiceResponse {
  id: number
  no: string
  status: ApInvoiceStatus
  branchId: number
  companyId: number
  companyName: string | null
  /** The legal entity's NPWP. */
  companyTaxId: string | null
  supplierId: number
  supplierName: string | null
  supplierInvoiceNo: string
  taxInvoiceNo: string | null
  invoiceDate: string
  paymentTermId: number
  paymentTermName: string | null
  dueDate: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  remark: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
  details: ApInvoiceDetailResponse[]
}

/** A row in the invoiceable-GR picker (`/v1/goods-receipts/available-for-invoicing`). */
export interface InvoiceableGoodsReceipt {
  id: number
  no: string
  receiptDate: string
  warehouseId: number
  warehouseName: string
  purchaseOrderHeaderId: number
  purchaseOrderNo: string
  subtotalAmount: string
}

/**
 * Note there is no `taxBaseAmount` here: DPP is derived server-side from the
 * covered receipts and any client-supplied value is ignored.
 */
export interface CreateApInvoiceRequest {
  /** Omitted (null) in auto mode — the server pulls the next number series code. */
  no?: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId?: number | null
  status: 'draft' | 'approved'
  supplierId: number
  supplierInvoiceNo: string
  taxInvoiceNo?: string | null
  /** 'YYYY-MM-DD' */
  invoiceDate: string
  goodsReceiptIds: number[]
  /** Omit to let the server compute DPP × the configured tax rate. */
  taxAmount?: string | null
  remark?: string | null
}

export type UpdateApInvoiceRequest = Omit<CreateApInvoiceRequest, 'no' | 'branchId'>
