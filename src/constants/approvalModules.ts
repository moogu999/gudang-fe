import { APPROVAL_QUERY } from '@/router/routeAccess'

/**
 * How My Approvals shows a request of a given module: a readable name and,
 * where one exists, the page the approver can review it on. Modules not listed
 * keep showing their raw key and id.
 */
export interface ApprovalModuleEntry {
  labelKey: string
  /** The page that reviews the request: its document (referenceId) and the request itself. */
  link?: (referenceId: number, requestId: number) => string
}

/**
 * A document's detail page, carrying the request it is opened for. The request id is
 * what lets an approver onto a page marked `meta.approverReadable` without the module's
 * read permission (see canEnterRoute); on other pages it is ignored.
 */
function documentLink(basePath: string): ApprovalModuleEntry['link'] {
  return (referenceId, requestId) => `${basePath}/${referenceId}?${APPROVAL_QUERY}=${requestId}`
}

// Keys are the backend's approval module keys (each module's ModuleDefinition.Key,
// registered in gudang-be cmd/router.go). A module missing here still works but
// shows its raw key and id, with no way to open the document.
export const APPROVAL_MODULES: Record<string, ApprovalModuleEntry> = {
  sales_order: {
    labelKey: 'approvals.modules.sales_order',
    link: documentLink('/sales-orders'),
  },
  purchase_order: {
    labelKey: 'approvals.modules.purchase_order',
    link: documentLink('/purchase-orders'),
  },
  goods_receipt: {
    labelKey: 'approvals.modules.goods_receipt',
    link: documentLink('/goods-receipts'),
  },
  ap_invoice: {
    labelKey: 'approvals.modules.ap_invoice',
    link: documentLink('/ap-invoices'),
  },
  ap_payment: {
    labelKey: 'approvals.modules.ap_payment',
    link: documentLink('/ap-payments'),
  },
  credit_debit_note: {
    labelKey: 'approvals.modules.credit_debit_note',
    link: documentLink('/credit-debit-notes'),
  },
  cash_deposit: {
    labelKey: 'approvals.modules.cash_deposit',
    link: documentLink('/cash-deposits'),
  },
  // The reference is an accounting period, which has no page of its own; the
  // periods list is where its state is reviewed.
  accounting_period_reopen: {
    labelKey: 'approvals.modules.accounting_period_reopen',
    link: () => '/accounting-periods',
  },
  // Its screen already takes the request it reviews, keyed by the reference.
  device_binding: {
    labelKey: 'approvals.modules.device_binding',
    link: (referenceId) => `/device-binding?request=${referenceId}`,
  },
}
