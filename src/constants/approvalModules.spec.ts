import { describe, it, expect } from 'vitest'
import router from '@/router'
import enUS from '@/i18n/locales/en-US'
import idID from '@/i18n/locales/id-ID'
import { APPROVAL_MODULES } from './approvalModules'
import { APPROVAL_QUERY } from '@/router/routeAccess'

// The backend's approval module keys (ModuleDefinition.Key in gudang-be cmd/router.go).
// A module missing from APPROVAL_MODULES shows its raw key and id in My Approvals,
// with no way for the approver to open the document.
const BACKEND_MODULE_KEYS = [
  'sales_order',
  'purchase_order',
  'goods_receipt',
  'ap_invoice',
  'credit_debit_note',
  'ap_payment',
  'cash_deposit',
  'accounting_period_reopen',
  'device_binding',
]

function lookup(messages: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part]
    return undefined
  }, messages)
}

describe('APPROVAL_MODULES', () => {
  it('registers every backend approval module', () => {
    expect(Object.keys(APPROVAL_MODULES).sort()).toEqual([...BACKEND_MODULE_KEYS].sort())
  })

  it.each(Object.entries(APPROVAL_MODULES))('%s has a label in both locales', (_key, entry) => {
    expect(typeof lookup(enUS, entry.labelKey)).toBe('string')
    expect(typeof lookup(idID, entry.labelKey)).toBe('string')
  })

  it.each(Object.entries(APPROVAL_MODULES))('%s links to a real route', (_key, entry) => {
    if (!entry.link) return
    const resolved = router.resolve(entry.link(1, 7))
    expect(resolved.matched.length).toBeGreaterThan(0)
    expect(resolved.matched.some((r) => r.name === 'NotFound')).toBe(false)
  })

  // The request id is what canEnterRoute reads to let an approver onto the page.
  it.each([
    ['sales_order', '/sales-orders/1'],
    ['purchase_order', '/purchase-orders/1'],
    ['goods_receipt', '/goods-receipts/1'],
    ['ap_invoice', '/ap-invoices/1'],
    ['ap_payment', '/ap-payments/1'],
    ['credit_debit_note', '/credit-debit-notes/1'],
    ['cash_deposit', '/cash-deposits/1'],
  ])('%s links to its document with the request id', (key, path) => {
    const resolved = router.resolve(APPROVAL_MODULES[key]!.link!(1, 7))
    expect(resolved.path).toBe(path)
    expect(resolved.query[APPROVAL_QUERY]).toBe('7')
  })
})
