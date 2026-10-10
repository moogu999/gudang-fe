/**
 * How My Approvals shows a request of a given module: a readable name and,
 * where one exists, the page the approver can review it on. Modules not listed
 * keep showing their raw key and id.
 */
export interface ApprovalModuleEntry {
  labelKey: string
  /** The page that reviews the request with this reference id. */
  link?: (referenceId: number) => string
}

// Keys are the backend's approval module keys (each module's ModuleDefinition.Key,
// registered in gudang-be cmd/router.go). A module missing here still works but
// shows its raw key and id, with no way to open the document.
export const APPROVAL_MODULES: Record<string, ApprovalModuleEntry> = {
  sales_order: {
    labelKey: 'approvals.modules.sales_order',
    link: (referenceId) => `/sales-orders/${referenceId}`,
  },
  purchase_order: {
    labelKey: 'approvals.modules.purchase_order',
    link: (referenceId) => `/purchase-orders/${referenceId}`,
  },
  goods_receipt: {
    labelKey: 'approvals.modules.goods_receipt',
    link: (referenceId) => `/goods-receipts/${referenceId}`,
  },
  ap_invoice: {
    labelKey: 'approvals.modules.ap_invoice',
    link: (referenceId) => `/ap-invoices/${referenceId}`,
  },
  ap_payment: {
    labelKey: 'approvals.modules.ap_payment',
    link: (referenceId) => `/ap-payments/${referenceId}`,
  },
  credit_debit_note: {
    labelKey: 'approvals.modules.credit_debit_note',
    link: (referenceId) => `/credit-debit-notes/${referenceId}`,
  },
  cash_deposit: {
    labelKey: 'approvals.modules.cash_deposit',
    link: (referenceId) => `/cash-deposits/${referenceId}`,
  },
  // The reference is an accounting period, which has no page of its own; the
  // periods list is where its state is reviewed.
  accounting_period_reopen: {
    labelKey: 'approvals.modules.accounting_period_reopen',
    link: () => '/accounting-periods',
  },
  device_binding: {
    labelKey: 'approvals.modules.device_binding',
    link: (referenceId) => `/device-binding?request=${referenceId}`,
  },
}
