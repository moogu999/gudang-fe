import { describe, it, expect, vi } from 'vitest'

const granted = new Set<number>()

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    hasPermission: (id: number) => granted.has(id),
  }),
}))

const { usePermissions } = await import('./usePermissions')
const { default: router } = await import('@/router')
const { mainMenu } = await import('@/components/menu/menu')
const { PERMISSIONS } = await import('@/constants')
const { CONFIG_TABS } = await import('@/views/configs/configTabs')

/**
 * Menu visibility resolves each item's route and reads the permission the router
 * declares on it, so a menu route matching no route is hidden from everyone —
 * silently, with nothing in the UI to say why. These assertions make that loud.
 */
describe('menu routes', () => {
  const menuRoutes = mainMenu.flatMap((section) => {
    const own = 'route' in section && section.route ? [section.route] : []
    const children = 'items' in section && section.items ? section.items : []
    return [...own, ...children.map((item) => item.route).filter(Boolean)]
  })

  it('collects every menu route', () => {
    expect(menuRoutes.length).toBeGreaterThan(0)
  })

  it.each(menuRoutes)('%s matches a registered route', (path) => {
    const matched = router.resolve(path).matched
    expect(matched.length).toBeGreaterThan(0)
    // Falling through to the catch-all is what an unregistered path looks like.
    expect(matched.map((record) => record.name)).not.toContain('NotFound')
  })
})

describe('canAccessRoute', () => {
  function withPermissions(...ids: number[]) {
    granted.clear()
    ids.forEach((id) => granted.add(id))
    return usePermissions()
  }

  it('denies a path that matches no route', () => {
    const { canAccessRoute } = withPermissions()
    expect(canAccessRoute('/not-a-real-route')).toBe(false)
  })

  it('allows a route that declares no permission', () => {
    const { canAccessRoute } = withPermissions()
    expect(canAccessRoute('/')).toBe(true)
  })

  it('denies a route whose permission the user lacks', () => {
    const { canAccessRoute } = withPermissions(PERMISSIONS.SALES_ORDER_READ)
    expect(canAccessRoute('/purchase-orders')).toBe(false)
  })

  it('allows a route whose permission the user holds', () => {
    const { canAccessRoute } = withPermissions(PERMISSIONS.PURCHASE_ORDER_READ)
    expect(canAccessRoute('/purchase-orders')).toBe(true)
  })

  // The two menu entries that leaked: one pointing at a sub-path the old lookup had
  // no key for, one at a path missing from the lookup entirely.
  it('checks the permission on a menu route with a sub-path', () => {
    const { canAccessRoute } = withPermissions(PERMISSIONS.SALES_ORDER_READ)
    expect(canAccessRoute('/return-delivery-orders/create')).toBe(false)

    granted.add(PERMISSIONS.DELIVERY_ORDER_WRITE)
    expect(canAccessRoute('/return-delivery-orders/create')).toBe(true)
  })

  it('checks the permission on /ap-outstanding', () => {
    const { canAccessRoute } = withPermissions(PERMISSIONS.SALES_ORDER_READ)
    expect(canAccessRoute('/ap-outstanding')).toBe(false)

    granted.add(PERMISSIONS.AP_INVOICE_READ)
    expect(canAccessRoute('/ap-outstanding')).toBe(true)
  })
})

describe('canWrite', () => {
  // canWrite used to read a separate ROUTE_WRITE_PERMISSIONS map, keyed by path
  // string, that defaulted to "allowed" for any path it didn't contain — the same
  // failure mode item C guards on the read side. It now reads meta.requiredWritePermission
  // off the route instead, so there had never been a test for this before item E.
  function withPermissions(...ids: number[]) {
    granted.clear()
    ids.forEach((id) => granted.add(id))
    return usePermissions
  }

  it('denies write on a route whose write permission the user lacks', () => {
    const { canWrite } = withPermissions()('/warehouses')
    expect(canWrite.value).toBe(false)
  })

  it('allows write on a route whose write permission the user holds', () => {
    const { canWrite } = withPermissions(PERMISSIONS.WAREHOUSE_WRITE)('/warehouses')
    expect(canWrite.value).toBe(true)
  })

  it('allows write on a route that declares no write permission', () => {
    const { canWrite } = withPermissions()('/superset')
    expect(canWrite.value).toBe(true)
  })

  it('denies write on a path matching no route', () => {
    const { canWrite } = withPermissions()('/not-a-real-route')
    expect(canWrite.value).toBe(false)
  })

  it('allows write with no routePath argument', () => {
    const { canWrite } = withPermissions()()
    expect(canWrite.value).toBe(true)
  })

  // The write permission for the *-configs paths lives on a redirect-only route record
  // (there is no "real" route to declare it on) — confirms router.resolve() surfaces
  // that record's own meta rather than the target it redirects to.
  it('reads the write permission off a redirect-only *-configs route', () => {
    const deny = withPermissions()('/cash-deposit-configs')
    expect(deny.canWrite.value).toBe(false)

    const allow = withPermissions(PERMISSIONS.CASH_DEPOSIT_CONFIG_WRITE)('/cash-deposit-configs')
    expect(allow.canWrite.value).toBe(true)
  })
})

describe('menu filtering for a sales-only user', () => {
  function sectionItems(label: string) {
    const section = mainMenu.find((s) => s.label === label)
    if (!section || !('items' in section) || !section.items) {
      throw new Error(`menu section "${label}" has no items`)
    }
    return section.items
  }

  function visibleLabels(label: string) {
    granted.clear()
    granted.add(PERMISSIONS.SALES_ORDER_READ)
    granted.add(PERMISSIONS.SALES_ORDER_WRITE)
    const { canAccessMenuItem } = usePermissions()
    return sectionItems(label)
      .filter((item) => canAccessMenuItem(item))
      .map((item) => item.label)
  }

  it('hides the whole Purchasing section', () => {
    expect(visibleLabels('Purchasing')).toEqual([])
  })

  it('leaves Sales showing only what sales order permissions cover', () => {
    expect(visibleLabels('Sales')).toEqual(['Sales Orders'])
  })
})

describe('Config menu entry', () => {
  // The Config screen shows a tab per permission in CONFIG_TABS. If the menu's
  // permissionsAny falls out of sync with that list again — the bug item B recorded —
  // this is the test that catches it.
  it('permissionsAny matches CONFIG_TABS exactly', () => {
    const configItem = mainMenu
      .flatMap((section) => ('items' in section && section.items ? section.items : []))
      .find((item) => item.route === '/configs')

    expect(configItem?.permissionsAny).toBeDefined()
    expect(new Set(configItem!.permissionsAny)).toEqual(
      new Set(CONFIG_TABS.map((tab) => tab.readPermission)),
    )
  })
})

describe('canAccessMenuItem', () => {
  it('accepts an item when the user holds any of its declared permissions', () => {
    granted.clear()
    granted.add(PERMISSIONS.AP_INVOICE_CONFIG_READ)
    const { canAccessMenuItem } = usePermissions()

    expect(
      canAccessMenuItem({
        route: '/configs',
        permissionsAny: [PERMISSIONS.SALES_ORDER_CONFIG_READ, PERMISSIONS.AP_INVOICE_CONFIG_READ],
      }),
    ).toBe(true)
  })

  it('rejects an item when the user holds none of them', () => {
    granted.clear()
    granted.add(PERMISSIONS.SALES_ORDER_READ)
    const { canAccessMenuItem } = usePermissions()

    expect(
      canAccessMenuItem({
        route: '/configs',
        permissionsAny: [PERMISSIONS.SALES_ORDER_CONFIG_READ, PERMISSIONS.AP_INVOICE_CONFIG_READ],
      }),
    ).toBe(false)
  })
})
