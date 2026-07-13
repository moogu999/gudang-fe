import { watch } from 'vue'
import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores'
import { PERMISSIONS } from '@/constants'
import i18n from '@/i18n'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiredPermission?: number
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Auth routes (no layout)
    {
      path: '/sign-in',
      name: 'SignIn',
      component: () => import('@/views/auth/SignInView.vue'),
      meta: { requiresAuth: false },
    },

    // Print routes (no layout, requires auth)
    {
      path: '/delivery-orders/:id/print',
      name: 'DeliveryOrderPrint',
      component: () => import('@/views/delivery-orders/DeliveryOrderPrintView.vue'),
      meta: { requiresAuth: true, requiredPermission: PERMISSIONS.DELIVERY_ORDER_READ },
    },

    // Protected routes (with MainLayout)
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import('@/views/home/HomeView.vue'),
        },
        {
          path: 'superset',
          name: 'Superset',
          component: () => import('@/views/superset/SupersetView.vue'),
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/users/UsersView.vue'),
          meta: { requiredPermission: PERMISSIONS.USER_READ },
        },
        {
          path: 'roles',
          name: 'Roles',
          component: () => import('@/views/roles/RolesView.vue'),
          meta: { requiredPermission: PERMISSIONS.ROLE_READ },
        },
        {
          path: 'permissions',
          name: 'Permissions',
          component: () => import('@/views/permissions/PermissionsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PERMISSION_READ },
        },
        {
          path: 'branches',
          name: 'Branches',
          component: () => import('@/views/branches/BranchesView.vue'),
          meta: { requiredPermission: PERMISSIONS.BRANCH_READ },
        },
        {
          path: 'companies',
          name: 'Companies',
          component: () => import('@/views/companies/CompaniesView.vue'),
          meta: { requiredPermission: PERMISSIONS.COMPANY_READ },
        },
        {
          path: 'departments',
          name: 'Departments',
          component: () => import('@/views/departments/DepartmentsView.vue'),
          meta: { requiredPermission: PERMISSIONS.DEPARTMENT_READ },
        },
        {
          path: 'divisions',
          name: 'Divisions',
          component: () => import('@/views/divisions/DivisionsView.vue'),
          meta: { requiredPermission: PERMISSIONS.DIVISION_READ },
        },
        {
          path: 'sales-organizations',
          name: 'SalesOrganizations',
          component: () => import('@/views/salesOrganizations/SalesOrganizationsView.vue'),
          meta: { requiredPermission: PERMISSIONS.SALES_ORGANIZATION_READ },
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/customers/CustomersView.vue'),
          meta: { requiredPermission: PERMISSIONS.CUSTOMER_READ },
        },
        {
          path: 'customers/create',
          name: 'CustomerCreate',
          component: () => import('@/views/customers/CustomerCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.CUSTOMER_WRITE },
        },
        {
          path: 'customers/:id/edit',
          name: 'CustomerEdit',
          component: () => import('@/views/customers/CustomerEditView.vue'),
          meta: { requiredPermission: PERMISSIONS.CUSTOMER_WRITE },
        },
        {
          path: 'customers/:id',
          name: 'CustomerDetail',
          component: () => import('@/views/customers/CustomerDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.CUSTOMER_READ },
        },
        {
          path: 'customer-label-definitions',
          name: 'CustomerLabelDefinitions',
          component: () =>
            import('@/views/customer-label-definitions/CustomerLabelDefinitionView.vue'),
          meta: { requiredPermission: PERMISSIONS.CUSTOMER_LABEL_DEFINITION_READ },
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/products/ProductsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRODUCT_READ },
        },
        {
          path: 'product-label-definitions',
          name: 'ProductLabelDefinitions',
          component: () =>
            import('@/views/product-label-definitions/ProductLabelDefinitionsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRODUCT_LABEL_DEFINITION_READ },
        },
        {
          path: 'unit-of-measurements',
          name: 'UnitOfMeasurements',
          component: () => import('@/views/unit-of-measurements/UnitOfMeasurementsView.vue'),
          meta: { requiredPermission: PERMISSIONS.UNIT_OF_MEASUREMENT_READ },
        },
        {
          path: 'uom-groups',
          name: 'UomGroups',
          component: () => import('@/views/uom-groups/UomGroupsView.vue'),
          meta: { requiredPermission: PERMISSIONS.UOM_GROUP_READ },
        },
        {
          path: 'booking-orders',
          name: 'BookingOrders',
          component: () => import('@/views/booking-orders/BookingOrdersView.vue'),
          meta: { requiredPermission: PERMISSIONS.BOOKING_ORDER_READ },
        },
        {
          path: 'delivery-orders',
          name: 'DeliveryOrders',
          component: () => import('@/views/delivery-orders/DeliveryOrdersView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_ORDER_READ },
        },
        {
          path: 'delivery-orders/:id',
          name: 'DeliveryOrderDetail',
          component: () => import('@/views/delivery-orders/DeliveryOrderDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_ORDER_READ },
        },
        {
          path: 'sales-orders',
          name: 'SalesOrders',
          component: () => import('@/views/sales-orders/SalesOrdersView.vue'),
          meta: { requiredPermission: PERMISSIONS.SALES_ORDER_READ },
        },
        {
          path: 'sales-orders/create',
          name: 'SalesOrderCreate',
          component: () => import('@/views/sales-orders/SalesOrderCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.SALES_ORDER_WRITE },
        },
        {
          path: 'sales-orders/:id/edit',
          name: 'SalesOrderEdit',
          component: () => import('@/views/sales-orders/SalesOrderEditView.vue'),
          meta: { requiredPermission: PERMISSIONS.SALES_ORDER_WRITE },
        },
        {
          path: 'sales-orders/:id',
          name: 'SalesOrderDetail',
          component: () => import('@/views/sales-orders/SalesOrderDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.SALES_ORDER_READ },
        },
        {
          path: 'number-series',
          name: 'NumberSeries',
          component: () => import('@/views/number-series/NumberSeriesView.vue'),
          meta: { requiredPermission: PERMISSIONS.NUMBER_SERIES_READ },
        },
        {
          path: 'price-lists',
          name: 'PriceLists',
          component: () => import('@/views/price-lists/PriceListsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_LIST_READ },
        },
        {
          path: 'price-lists/create',
          name: 'PriceListCreate',
          component: () => import('@/views/price-lists/PriceListCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_LIST_WRITE },
        },
        {
          path: 'price-lists/:id/edit',
          name: 'PriceListEdit',
          component: () => import('@/views/price-lists/PriceListEditView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_LIST_WRITE },
        },
        {
          path: 'price-lists/:id',
          name: 'PriceListDetail',
          component: () => import('@/views/price-lists/PriceListDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_LIST_READ },
        },
        {
          path: 'price-matrices',
          name: 'PriceMatrices',
          component: () => import('@/views/price-matrices/PriceMatricesView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_READ },
        },
        {
          path: 'price-matrices/create',
          name: 'PriceMatrixCreate',
          component: () => import('@/views/price-matrices/PriceMatrixCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_WRITE },
        },
        {
          path: 'price-matrices/:id/edit',
          name: 'PriceMatrixEdit',
          component: () => import('@/views/price-matrices/PriceMatrixEditView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_WRITE },
        },
        {
          path: 'price-matrices/:id',
          name: 'PriceMatrixDetail',
          component: () => import('@/views/price-matrices/PriceMatrixDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_READ },
        },
        {
          path: 'price-matrix-priorities',
          name: 'PriceMatrixPriorities',
          component: () => import('@/views/price-matrices/PriceMatrixPrioritiesView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_PRIORITY_READ },
        },
        {
          path: 'promotions',
          name: 'Promotions',
          component: () => import('@/views/promotions/PromotionsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PROMOTION_READ },
        },
        {
          path: 'promotions/create',
          name: 'PromotionCreate',
          component: () => import('@/views/promotions/PromotionCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.PROMOTION_WRITE },
        },
        {
          path: 'promotions/:id/edit',
          name: 'PromotionEdit',
          component: () => import('@/views/promotions/PromotionEditView.vue'),
          meta: { requiredPermission: PERMISSIONS.PROMOTION_WRITE },
        },
        {
          path: 'promotions/:id',
          name: 'PromotionDetail',
          component: () => import('@/views/promotions/PromotionDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.PROMOTION_READ },
        },
        {
          path: 'audit-trails',
          name: 'AuditTrails',
          component: () => import('@/views/audit-trails/AuditTrailsView.vue'),
          meta: { requiredPermission: PERMISSIONS.AUDIT_TRAIL_READ },
        },
        {
          path: 'audit-trails/:id',
          name: 'AuditTrailDetail',
          component: () => import('@/views/audit-trails/AuditTrailDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.AUDIT_TRAIL_READ },
        },
        {
          path: 'employees',
          name: 'Employees',
          component: () => import('@/views/employees/EmployeesView.vue'),
          meta: { requiredPermission: PERMISSIONS.EMPLOYEE_READ },
        },
        {
          path: 'employees/new',
          name: 'EmployeeNew',
          component: () => import('@/views/employees/EmployeeDetailView.vue'),
          props: { mode: 'add' },
          meta: { requiredPermission: PERMISSIONS.EMPLOYEE_CREATE },
        },
        {
          path: 'employees/:id',
          name: 'EmployeeDetail',
          component: () => import('@/views/employees/EmployeeDetailView.vue'),
          props: (route) => ({ mode: 'view', id: Number(route.params.id) }),
          meta: { requiredPermission: PERMISSIONS.EMPLOYEE_READ },
        },
        {
          path: 'warehouses',
          name: 'Warehouses',
          component: () => import('@/views/warehouses/WarehousesView.vue'),
          meta: { requiredPermission: PERMISSIONS.WAREHOUSE_READ },
        },
        {
          path: 'vehicles',
          name: 'Vehicles',
          component: () => import('@/views/vehicles/VehiclesView.vue'),
          meta: { requiredPermission: PERMISSIONS.VEHICLE_READ },
        },
        {
          path: 'vehicles/new',
          name: 'VehicleNew',
          component: () => import('@/views/vehicles/VehicleDetailView.vue'),
          props: { mode: 'add' },
          meta: { requiredPermission: PERMISSIONS.VEHICLE_WRITE },
        },
        {
          path: 'vehicles/:id',
          name: 'VehicleDetail',
          component: () => import('@/views/vehicles/VehicleDetailView.vue'),
          props: (route) => ({ mode: 'view', id: Number(route.params.id) }),
          meta: { requiredPermission: PERMISSIONS.VEHICLE_READ },
        },
        {
          path: 'goods-receipts',
          name: 'GoodsReceipts',
          component: () => import('@/views/goods-receipts/GoodsReceiptsView.vue'),
          meta: { requiredPermission: PERMISSIONS.GOODS_RECEIPT_READ },
        },
        {
          path: 'goods-receipts/create',
          name: 'GoodsReceiptCreate',
          component: () => import('@/views/goods-receipts/GoodsReceiptCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.GOODS_RECEIPT_WRITE },
        },
        {
          path: 'goods-receipts/:id',
          name: 'GoodsReceiptDetail',
          component: () => import('@/views/goods-receipts/GoodsReceiptDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.GOODS_RECEIPT_READ },
        },
        {
          path: 'inventory-status',
          name: 'InventoryStatus',
          component: () => import('@/views/inventory-status/InventoryStatusView.vue'),
          meta: { requiredPermission: PERMISSIONS.INVENTORY_READ },
        },
        {
          path: 'configs',
          name: 'Configs',
          component: () => import('@/views/configs/ConfigsView.vue'),
        },
        {
          path: 'sales-order-configs',
          redirect: { path: '/configs', query: { tab: 'so' } },
        },
        {
          path: 'booking-order-configs',
          redirect: { path: '/configs', query: { tab: 'bo' } },
        },
        {
          path: 'delivery-notes',
          name: 'DeliveryNotes',
          component: () => import('@/views/delivery-notes/DeliveryNotesView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_NOTE_READ },
        },
        {
          path: 'delivery-notes/create',
          name: 'DeliveryNoteCreate',
          component: () => import('@/views/delivery-notes/DeliveryNoteCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_NOTE_WRITE },
        },
        {
          path: 'delivery-notes/:id/edit',
          name: 'DeliveryNoteEdit',
          component: () => import('@/views/delivery-notes/DeliveryNoteCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_NOTE_WRITE },
        },
        {
          path: 'delivery-notes/:id',
          name: 'DeliveryNoteDetail',
          component: () => import('@/views/delivery-notes/DeliveryNoteDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_NOTE_READ },
        },
        {
          path: 'picking-lists',
          name: 'PickingLists',
          component: () => import('@/views/picking-lists/PickingListsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PICKING_LIST_READ },
        },
        {
          path: 'picking-lists/:id',
          name: 'PickingListDetail',
          component: () => import('@/views/picking-lists/PickingListDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.PICKING_LIST_READ },
        },
        {
          path: 'invoices',
          name: 'Invoices',
          component: () => import('@/views/invoices/InvoicesView.vue'),
          meta: { requiredPermission: PERMISSIONS.INVOICE_READ },
        },
        {
          path: 'invoices/:id',
          name: 'InvoiceDetail',
          component: () => import('@/views/invoices/InvoiceDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.INVOICE_READ },
        },
        {
          path: 'goods-issue-notes',
          name: 'GoodsIssueNotes',
          component: () => import('@/views/goods-issue-notes/GoodsIssueNotesView.vue'),
          meta: { requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_READ },
        },
        {
          path: 'goods-issue-notes/create',
          name: 'GoodsIssueNoteCreate',
          component: () => import('@/views/goods-issue-notes/GoodsIssueNoteCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_WRITE },
        },
        {
          path: 'goods-issue-notes/:id',
          name: 'GoodsIssueNoteDetail',
          component: () => import('@/views/goods-issue-notes/GoodsIssueNoteDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_READ },
        },
        {
          path: 'delivery-confirmations',
          name: 'DeliveryConfirmations',
          component: () => import('@/views/delivery-confirmations/DeliveryConfirmationsView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_CONFIRMATION_READ },
        },
        {
          path: 'delivery-confirmations/create',
          name: 'DeliveryConfirmationCreate',
          component: () =>
            import('@/views/delivery-confirmations/DeliveryConfirmationCreateView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_CONFIRMATION_WRITE },
        },
        {
          path: 'delivery-confirmations/:id',
          name: 'DeliveryConfirmationDetail',
          component: () =>
            import('@/views/delivery-confirmations/DeliveryConfirmationDetailView.vue'),
          meta: { requiredPermission: PERMISSIONS.DELIVERY_CONFIRMATION_READ },
        },
        {
          path: 'stock-movements',
          name: 'StockMovements',
          component: () => import('@/views/stock-movements/StockMovementsView.vue'),
          meta: { requiredPermission: PERMISSIONS.STOCK_MOVEMENT_READ },
        },
      ],
    },

    // 404 page
    {
      path: '/:notFound(.*)',
      name: 'NotFound',
      component: () => import('@/layouts/MinimalLayout.vue'),
      children: [
        {
          path: '',
          name: 'NotFoundPage',
          component: () => import('@/views/NotFoundView.vue'),
        },
      ],
    },
  ],
})

// Navigation guard for authentication and authorization
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.waitForInit()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  // Check authentication
  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'SignIn', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'SignIn' && authStore.isAuthenticated) {
    next({ name: 'Home' })
    return
  }

  // Check permissions (only for authenticated routes)
  if (requiresAuth && authStore.isAuthenticated) {
    const requiredPermission = to.matched.find((record) => record.meta.requiredPermission)?.meta
      .requiredPermission

    if (requiredPermission && !authStore.hasPermission(requiredPermission as number)) {
      next({ name: 'Home' })
      return
    }
  }

  next()
})

// --- Document title management ---

const APP_NAME = 'N-Force'

/**
 * Maps a route name to its title definition.
 * - `key`: i18n key resolved as the page/entity name (usually a `navigation.*` key).
 * - `action`: optional verb composed with the entity name via `pageTitle.*`
 *   (e.g. action 'create' on entity 'Customers' → "Create Customers").
 */
type TitleDef = { key: string; action?: 'create' | 'edit' | 'view' }

const ROUTE_TITLES: Record<string, TitleDef> = {
  SignIn: { key: 'pageTitle.signIn' },
  Home: { key: 'navigation.home' },
  Superset: { key: 'navigation.superset' },

  Users: { key: 'navigation.users' },
  Roles: { key: 'navigation.roles' },
  Permissions: { key: 'navigation.permissions' },
  AuditTrails: { key: 'navigation.auditTrails' },
  AuditTrailDetail: { key: 'navigation.auditTrails', action: 'view' },

  Companies: { key: 'navigation.companies' },
  Branches: { key: 'navigation.branches' },
  Departments: { key: 'navigation.departments' },
  Divisions: { key: 'navigation.divisions' },
  SalesOrganizations: { key: 'navigation.salesOrganizations' },

  Customers: { key: 'navigation.customers' },
  CustomerCreate: { key: 'navigation.customers', action: 'create' },
  CustomerEdit: { key: 'navigation.customers', action: 'edit' },
  CustomerDetail: { key: 'navigation.customers', action: 'view' },
  CustomerLabelDefinitions: { key: 'navigation.customerLabelDefinitions' },

  Products: { key: 'navigation.products' },
  ProductLabelDefinitions: { key: 'navigation.productLabelDefinitions' },
  UnitOfMeasurements: { key: 'navigation.unitOfMeasurements' },
  UomGroups: { key: 'navigation.uomGroups' },

  Employees: { key: 'navigation.employees' },
  EmployeeNew: { key: 'navigation.employees', action: 'create' },
  EmployeeDetail: { key: 'navigation.employees', action: 'view' },

  Vehicles: { key: 'navigation.vehicles' },
  VehicleNew: { key: 'navigation.vehicles', action: 'create' },
  VehicleDetail: { key: 'navigation.vehicles', action: 'view' },

  Warehouses: { key: 'navigation.warehouses' },
  GoodsReceipts: { key: 'navigation.goodsReceipts' },
  GoodsReceiptCreate: { key: 'navigation.goodsReceipts', action: 'create' },
  GoodsReceiptDetail: { key: 'navigation.goodsReceipts', action: 'view' },
  InventoryStatus: { key: 'navigation.inventoryStatus' },
  StockMovements: { key: 'navigation.stockMovements' },

  PriceLists: { key: 'navigation.priceLists' },
  PriceListCreate: { key: 'navigation.priceLists', action: 'create' },
  PriceListEdit: { key: 'navigation.priceLists', action: 'edit' },
  PriceListDetail: { key: 'navigation.priceLists', action: 'view' },
  PriceMatrices: { key: 'navigation.priceMatrices' },
  PriceMatrixCreate: { key: 'navigation.priceMatrices', action: 'create' },
  PriceMatrixEdit: { key: 'navigation.priceMatrices', action: 'edit' },
  PriceMatrixDetail: { key: 'navigation.priceMatrices', action: 'view' },
  PriceMatrixPriorities: { key: 'navigation.priceMatrixPriorities' },
  Promotions: { key: 'navigation.promotions' },
  PromotionCreate: { key: 'navigation.promotions', action: 'create' },
  PromotionEdit: { key: 'navigation.promotions', action: 'edit' },
  PromotionDetail: { key: 'navigation.promotions', action: 'view' },

  SalesOrders: { key: 'navigation.salesOrders' },
  SalesOrderCreate: { key: 'navigation.salesOrders', action: 'create' },
  SalesOrderEdit: { key: 'navigation.salesOrders', action: 'edit' },
  SalesOrderDetail: { key: 'navigation.salesOrders', action: 'view' },
  BookingOrders: { key: 'navigation.bookingOrders' },
  DeliveryOrders: { key: 'navigation.deliveryOrders' },
  DeliveryOrderDetail: { key: 'navigation.deliveryOrders', action: 'view' },
  DeliveryOrderPrint: { key: 'navigation.deliveryOrders', action: 'view' },
  DeliveryNotes: { key: 'navigation.deliveryNotes' },
  DeliveryNoteCreate: { key: 'navigation.deliveryNotes', action: 'create' },
  DeliveryNoteEdit: { key: 'navigation.deliveryNotes', action: 'edit' },
  DeliveryNoteDetail: { key: 'navigation.deliveryNotes', action: 'view' },
  PickingLists: { key: 'navigation.pickingLists' },
  PickingListDetail: { key: 'navigation.pickingLists', action: 'view' },
  GoodsIssueNotes: { key: 'navigation.goodsIssueNotes' },
  GoodsIssueNoteCreate: { key: 'navigation.goodsIssueNotes', action: 'create' },
  GoodsIssueNoteDetail: { key: 'navigation.goodsIssueNotes', action: 'view' },
  DeliveryConfirmations: { key: 'navigation.deliveryConfirmations' },
  DeliveryConfirmationCreate: { key: 'navigation.deliveryConfirmations', action: 'create' },
  DeliveryConfirmationDetail: { key: 'navigation.deliveryConfirmations', action: 'view' },
  Invoices: { key: 'navigation.invoices' },
  InvoiceDetail: { key: 'navigation.invoices', action: 'view' },

  Configs: { key: 'navigation.configs' },
  NumberSeries: { key: 'navigation.numberSeries' },

  NotFoundPage: { key: 'pageTitle.notFound' },
}

/**
 * Resolves the localized page title for a route and applies it to `document.title`.
 * Falls back to the bare app name when the route has no mapping.
 */
function setDocumentTitle(route: RouteLocationNormalized): void {
  const { t } = i18n.global
  const def = typeof route.name === 'string' ? ROUTE_TITLES[route.name] : undefined

  if (!def) {
    document.title = APP_NAME
    return
  }

  const entity = t(def.key)
  const page = def.action ? t(`pageTitle.${def.action}`, { entity }) : entity
  document.title = page ? `${page} · ${APP_NAME}` : APP_NAME
}

router.afterEach((to) => {
  setDocumentTitle(to)
})

// Keep the title in sync when the user switches language.
const stopLocaleWatch = watch(
  () => i18n.global.locale.value,
  () => setDocumentTitle(router.currentRoute.value),
)

// Stop the watcher on Vite HMR so repeated module reloads don't accumulate
// duplicate watchers that all fire on every locale change.
import.meta.hot?.dispose(stopLocaleWatch)

export default router
