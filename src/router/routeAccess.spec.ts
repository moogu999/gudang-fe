import { describe, it, expect } from 'vitest'
import router from '@/router'
import { PERMISSIONS } from '@/constants/permissions'
import { canEnterRoute } from './routeAccess'

/** A permission check for a user holding exactly these permissions. */
function holding(...ids: number[]) {
  return (id: number) => ids.includes(id)
}

const approver = holding(PERMISSIONS.APPROVAL_REQUEST_READ, PERMISSIONS.APPROVAL_ACT)

describe('canEnterRoute', () => {
  it('lets a user with the route permission in', () => {
    const to = router.resolve('/purchase-orders/1')
    expect(canEnterRoute(to, holding(PERMISSIONS.PURCHASE_ORDER_READ))).toBe(true)
  })

  it('lets anyone onto a route that declares no permission', () => {
    expect(canEnterRoute(router.resolve('/'), holding())).toBe(true)
  })

  it('turns away a user without the permission', () => {
    expect(canEnterRoute(router.resolve('/purchase-orders/1'), holding())).toBe(false)
  })

  // Every document page Persetujuan Saya links to (approvalModules.ts documentLink).
  it.each([
    '/sales-orders/1?approval=12',
    '/purchase-orders/1?approval=12',
    '/goods-receipts/1?approval=12',
    '/ap-invoices/1?approval=12',
    '/ap-payments/1?approval=12',
    '/credit-debit-notes/1?approval=12',
    '/cash-deposits/1?approval=12',
  ])('lets an approver open %s from an approval request', (path) => {
    expect(canEnterRoute(router.resolve(path), approver)).toBe(true)
  })

  it('accepts either approval permission on its own', () => {
    const to = router.resolve('/purchase-orders/1?approval=12')
    expect(canEnterRoute(to, holding(PERMISSIONS.APPROVAL_ACT))).toBe(true)
    expect(canEnterRoute(to, holding(PERMISSIONS.APPROVAL_REQUEST_READ))).toBe(true)
  })

  it('needs the approval request in the URL', () => {
    expect(canEnterRoute(router.resolve('/purchase-orders/1'), approver)).toBe(false)
    expect(canEnterRoute(router.resolve('/purchase-orders/1?approval='), approver)).toBe(false)
  })

  it('needs an approval permission, not just the query', () => {
    const to = router.resolve('/purchase-orders/1?approval=12')
    expect(canEnterRoute(to, holding())).toBe(false)
  })

  it.each([
    // Edit and list pages are not approver-readable: an approver reviews, never edits.
    '/purchase-orders/1/edit?approval=12',
    '/purchase-orders?approval=12',
    '/goods-receipts/1/edit?approval=12',
    // Not a document of an approval module.
    '/customers/1?approval=12',
  ])('does not open %s to an approver', (path) => {
    expect(canEnterRoute(router.resolve(path), approver)).toBe(false)
  })
})
