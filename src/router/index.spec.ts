import { describe, it, expect } from 'vitest'
import router from './index'
import { PERMISSIONS } from '@/constants'

/**
 * usePermissions.spec.ts proves every *menu* route matches a registered route, but says
 * nothing about routes that were never added to the menu. A route can be registered
 * without `meta.requiredPermission` and stay invisible here, open to any authenticated
 * user. This is the regression guard for that gap — see item C of
 * gudang-fe/.claude/permission-gating-hardening-fe.md.
 *
 * Adding to the allowlist is a visible decision in a diff; forgetting the meta on a new
 * route is not, which is the point.
 */

const ALLOWED_WITHOUT_PERMISSION = new Set<string>([
  '/sign-in',
  '/',
  '/superset',
  '/configs',
  // Gates itself via a custom `beforeEnter` (GIRO_RECEIPT_READ || GIRO_CLEARING_READ)
  // rather than a single static meta.requiredPermission — same shape as /configs
  // self-gating its tabs.
  '/giro',
  '/:notFound(.*)',
])

const routes = router.getRoutes().filter((record) => !record.redirect)

describe('router permission coverage', () => {
  it('collects a non-trivial number of routes', () => {
    expect(routes.length).toBeGreaterThan(100)
  })

  it.each(routes.map((record) => record.path))(
    '%s declares meta.requiredPermission or is on the allowlist',
    (path) => {
      const record = routes.find((r) => r.path === path)!
      if (ALLOWED_WITHOUT_PERMISSION.has(path)) {
        expect(record.meta.requiredPermission, `${path} is allowlisted but now declares a permission — remove it from the allowlist`).toBeUndefined()
      } else {
        expect(record.meta.requiredPermission, `${path} declares no meta.requiredPermission and is not on the allowlist`).toBeTypeOf('number')
      }
    },
  )

  it('does not allowlist a path that no longer exists', () => {
    const paths = new Set(routes.map((record) => record.path))
    for (const allowed of ALLOWED_WITHOUT_PERMISSION) {
      expect(paths.has(allowed), `${allowed} is allowlisted but no such route is registered`).toBe(true)
    }
  })
})

/**
 * Item E deleted ROUTE_WRITE_PERMISSIONS (a path -> permission map, separate from the
 * router, that defaulted to "allowed" for any path it didn't list) in favor of
 * `meta.requiredWritePermission` declared on the route itself, read by `canWrite` the
 * same way `canRead` already read `meta.requiredPermission`.
 *
 * This is the migration-completeness check the plan asked for: every path the old map
 * covered (minus the ones nothing ever actually called `usePermissions()` on — verified
 * dead by grepping every `usePermissions('/path')` call site before deleting the map)
 * now declares the same permission id via the route, and nothing else picked one up by
 * accident.
 */
const EXPECTED_WRITE_PERMISSIONS: Record<string, number> = {
  '/users': PERMISSIONS.USER_WRITE,
  '/roles': PERMISSIONS.ROLE_WRITE,
  '/branches': PERMISSIONS.BRANCH_WRITE,
  '/companies': PERMISSIONS.COMPANY_WRITE,
  '/departments': PERMISSIONS.DEPARTMENT_WRITE,
  '/divisions': PERMISSIONS.DIVISION_WRITE,
  '/sales-organizations': PERMISSIONS.SALES_ORGANIZATION_WRITE,
  '/customers': PERMISSIONS.CUSTOMER_WRITE,
  '/unit-of-measurements': PERMISSIONS.UNIT_OF_MEASUREMENT_WRITE,
  '/products': PERMISSIONS.PRODUCT_WRITE,
  '/uom-groups': PERMISSIONS.UOM_GROUP_WRITE,
  '/product-label-definitions': PERMISSIONS.PRODUCT_LABEL_DEFINITION_WRITE,
  '/number-series': PERMISSIONS.NUMBER_SERIES_WRITE,
  '/price-lists': PERMISSIONS.PRICE_LIST_WRITE,
  '/price-matrices': PERMISSIONS.PRICE_MATRIX_WRITE,
  '/price-matrix-priorities': PERMISSIONS.PRICE_MATRIX_PRIORITY_WRITE,
  '/promotions': PERMISSIONS.PROMOTION_WRITE,
  '/customer-label-definitions': PERMISSIONS.CUSTOMER_LABEL_DEFINITION_WRITE,
  '/warehouses': PERMISSIONS.WAREHOUSE_WRITE,
  '/vehicles': PERMISSIONS.VEHICLE_WRITE,
  '/goods-receipts': PERMISSIONS.GOODS_RECEIPT_WRITE,
  '/sales-order-configs': PERMISSIONS.SALES_ORDER_CONFIG_WRITE,
  '/booking-order-configs': PERMISSIONS.BOOKING_ORDER_CONFIG_WRITE,
  '/approval-flows': PERMISSIONS.APPROVAL_FLOW_WRITE,
  '/suppliers': PERMISSIONS.SUPPLIER_WRITE,
  '/payment-terms': PERMISSIONS.PAYMENT_TERM_WRITE,
  '/purchase-orders': PERMISSIONS.PURCHASE_ORDER_WRITE,
  '/purchase-order-configs': PERMISSIONS.PURCHASE_ORDER_CONFIG_WRITE,
  '/goods-receipt-configs': PERMISSIONS.GOODS_RECEIPT_CONFIG_WRITE,
  '/ap-invoices': PERMISSIONS.AP_INVOICE_WRITE,
  '/ap-invoice-configs': PERMISSIONS.AP_INVOICE_CONFIG_WRITE,
  '/correction-categories': PERMISSIONS.CORRECTION_CATEGORY_WRITE,
  '/credit-debit-notes': PERMISSIONS.CREDIT_DEBIT_NOTE_WRITE,
  '/credit-debit-note-configs': PERMISSIONS.CREDIT_DEBIT_NOTE_CONFIG_WRITE,
  '/ap-payments': PERMISSIONS.AP_PAYMENT_WRITE,
  '/ap-payment-configs': PERMISSIONS.AP_PAYMENT_CONFIG_WRITE,
  '/payment-methods': PERMISSIONS.PAYMENT_METHOD_WRITE,
  '/branch-bank-accounts': PERMISSIONS.BRANCH_BANK_ACCOUNT_WRITE,
  '/chart-of-accounts': PERMISSIONS.CHART_OF_ACCOUNT_WRITE,
  '/accounting-periods': PERMISSIONS.ACCOUNTING_PERIOD_WRITE,
  '/journal-config': PERMISSIONS.JOURNAL_CONFIG_WRITE,
  '/cash-deposits': PERMISSIONS.CASH_DEPOSIT_WRITE,
  '/cash-deposit-configs': PERMISSIONS.CASH_DEPOSIT_CONFIG_WRITE,
  '/bank-settlements': PERMISSIONS.BANK_SETTLEMENT_WRITE,
  '/ar-clearings': PERMISSIONS.AR_CLEARING_WRITE,
  '/giro-receipts': PERMISSIONS.GIRO_RECEIPT_WRITE,
  '/giro-clearings': PERMISSIONS.GIRO_CLEARING_WRITE,
}

describe('router write-permission coverage (item E)', () => {
  const allRecords = router.getRoutes()

  it.each(Object.entries(EXPECTED_WRITE_PERMISSIONS))(
    '%s declares meta.requiredWritePermission %i',
    (path, expected) => {
      const record = allRecords.find((r) => r.path === path)
      expect(record, `no route registered for ${path}`).toBeDefined()
      expect(record!.meta.requiredWritePermission).toBe(expected)
    },
  )

  it('declares requiredWritePermission on exactly these paths, nothing more', () => {
    const actual = allRecords
      .filter((r) => typeof r.meta.requiredWritePermission === 'number')
      .map((r) => r.path)
      .sort()
    expect(actual).toEqual(Object.keys(EXPECTED_WRITE_PERMISSIONS).sort())
  })
})
