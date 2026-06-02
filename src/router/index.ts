import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores'
import { PERMISSIONS } from '@/constants'

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
          path: 'sales-orders',
          name: 'SalesOrders',
          component: () => import('@/views/sales-orders/SalesOrdersView.vue'),
        },
        {
          path: 'sales-orders/create',
          name: 'SalesOrderCreate',
          component: () => import('@/views/sales-orders/SalesOrderCreateView.vue'),
        },
        {
          path: 'sales-orders/:id',
          name: 'SalesOrderDetail',
          component: () => import('@/views/sales-orders/SalesOrderDetailView.vue'),
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
          meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_READ },
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
          path: 'goods-receipts',
          name: 'GoodsReceipts',
          component: () => import('@/views/goods-receipts/GoodsReceiptsView.vue'),
        },
        {
          path: 'goods-receipts/create',
          name: 'GoodsReceiptCreate',
          component: () => import('@/views/goods-receipts/GoodsReceiptCreateView.vue'),
        },
        {
          path: 'goods-receipts/:id',
          name: 'GoodsReceiptDetail',
          component: () => import('@/views/goods-receipts/GoodsReceiptDetailView.vue'),
        },
        {
          path: 'inventory-status',
          name: 'InventoryStatus',
          component: () => import('@/views/inventory-status/InventoryStatusView.vue'),
        },
        {
          path: 'sales-order-configs',
          name: 'SalesOrderConfigs',
          component: () => import('@/views/sales-order-configs/SalesOrderConfigsView.vue'),
          meta: { requiredPermission: PERMISSIONS.SALES_ORDER_CONFIG_READ },
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

export default router
