/** Mirror of `gudang-be/api/ap_outstanding.yaml`. Read-only — a projection over `ap_open_items`. */
export type ApOutstandingDocumentType = 'ap_invoice' | 'credit_note' | 'debit_note'

export interface ApOutstandingItem {
  documentType: ApOutstandingDocumentType
  documentId: number
  documentNo: string
  supplierId: number
  supplierName: string
  documentDate: string
  /** For a credit/debit note this equals documentDate — the view has no separate due date for a note. */
  dueDate: string
  /** Negative for a credit note, positive otherwise. */
  signedTotalAmount: string
  settledAmount: string
  outstandingAmount: string
}
