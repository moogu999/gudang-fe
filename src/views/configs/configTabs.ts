import { PERMISSIONS, type PermissionId } from '@/constants'

/**
 * The Config screen's tabs, and the `*_CONFIG_READ` permission that gates each one's
 * visibility. `ConfigsView` derives which tabs to show from this list; `menu.ts` derives
 * the Config menu entry's `permissionsAny` from the same list — one edit here adds a tab
 * in both places instead of the two staying in sync by hand.
 *
 * See item B of gudang-fe/.claude/permission-gating-hardening-fe.md.
 */
export interface ConfigTabDef {
  value: string
  labelKey: string
  readPermission: PermissionId
}

export const CONFIG_TABS: ConfigTabDef[] = [
  {
    value: 'so',
    labelKey: 'navigation.salesOrderConfigs',
    readPermission: PERMISSIONS.SALES_ORDER_CONFIG_READ,
  },
  {
    value: 'bo',
    labelKey: 'navigation.bookingOrderConfigs',
    readPermission: PERMISSIONS.BOOKING_ORDER_CONFIG_READ,
  },
  {
    value: 'po',
    labelKey: 'navigation.purchaseOrderConfigs',
    readPermission: PERMISSIONS.PURCHASE_ORDER_CONFIG_READ,
  },
  {
    value: 'gr',
    labelKey: 'navigation.goodsReceiptConfigs',
    readPermission: PERMISSIONS.GOODS_RECEIPT_CONFIG_READ,
  },
  {
    value: 'ap',
    labelKey: 'navigation.apInvoiceConfigs',
    readPermission: PERMISSIONS.AP_INVOICE_CONFIG_READ,
  },
  {
    value: 'cdn',
    labelKey: 'navigation.creditDebitNoteConfigs',
    readPermission: PERMISSIONS.CREDIT_DEBIT_NOTE_CONFIG_READ,
  },
  {
    value: 'bkk',
    labelKey: 'navigation.apPaymentConfigs',
    readPermission: PERMISSIONS.AP_PAYMENT_CONFIG_READ,
  },
  {
    value: 'apc',
    labelKey: 'navigation.accountingPeriodConfigs',
    readPermission: PERMISSIONS.ACCOUNTING_PERIOD_READ,
  },
  {
    value: 'cd',
    labelKey: 'navigation.cashDepositConfigs',
    readPermission: PERMISSIONS.CASH_DEPOSIT_CONFIG_READ,
  },
]
