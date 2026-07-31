import { watch } from 'vue'
import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores'
import { PERMISSIONS } from '@/constants'
import i18n from '@/i18n'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiredPermission?: number
    /** i18n key resolved as the page/entity name (usually a `navigation.*` or `pageTitle.*` key). */
    titleKey?: string
    /** Optional verb composed with the entity name via `pageTitle.*` (e.g. action 'create' on entity 'Customers' → "Create Customers"). */
    titleAction?: 'create' | 'edit' | 'view'
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
      meta: { requiresAuth: false, titleKey: 'pageTitle.signIn' },
    },

    // Print routes (no layout, requires auth)
    {
      path: '/delivery-orders/:id/print',
      name: 'DeliveryOrderPrint',
      component: () => import('@/views/delivery-orders/DeliveryOrderPrintView.vue'),
      meta: {
        requiresAuth: true,
        requiredPermission: PERMISSIONS.DELIVERY_ORDER_READ,
        titleKey: 'navigation.deliveryOrders',
        titleAction: 'view',
      },
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
          meta: { titleKey: 'navigation.home' },
        },
        {
          path: 'superset',
          name: 'Superset',
          component: () => import('@/views/superset/SupersetView.vue'),
          meta: { titleKey: 'navigation.superset' },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/users/UsersView.vue'),
          meta: { requiredPermission: PERMISSIONS.USER_READ, titleKey: 'navigation.users' },
        },
        {
          path: 'roles',
          name: 'Roles',
          component: () => import('@/views/roles/RolesView.vue'),
          meta: { requiredPermission: PERMISSIONS.ROLE_READ, titleKey: 'navigation.roles' },
        },
        {
          path: 'permissions',
          name: 'Permissions',
          component: () => import('@/views/permissions/PermissionsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PERMISSION_READ,
            titleKey: 'navigation.permissions',
          },
        },
        {
          path: 'branches',
          name: 'Branches',
          component: () => import('@/views/branches/BranchesView.vue'),
          meta: { requiredPermission: PERMISSIONS.BRANCH_READ, titleKey: 'navigation.branches' },
        },
        {
          path: 'companies',
          name: 'Companies',
          component: () => import('@/views/companies/CompaniesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.COMPANY_READ,
            titleKey: 'navigation.companies',
          },
        },
        {
          path: 'departments',
          name: 'Departments',
          component: () => import('@/views/departments/DepartmentsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DEPARTMENT_READ,
            titleKey: 'navigation.departments',
          },
        },
        {
          path: 'divisions',
          name: 'Divisions',
          component: () => import('@/views/divisions/DivisionsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DIVISION_READ,
            titleKey: 'navigation.divisions',
          },
        },
        {
          path: 'sales-organizations',
          name: 'SalesOrganizations',
          component: () => import('@/views/salesOrganizations/SalesOrganizationsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.SALES_ORGANIZATION_READ,
            titleKey: 'navigation.salesOrganizations',
          },
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/customers/CustomersView.vue'),
          meta: { requiredPermission: PERMISSIONS.CUSTOMER_READ, titleKey: 'navigation.customers' },
        },
        {
          path: 'customers/create',
          name: 'CustomerCreate',
          component: () => import('@/views/customers/CustomerCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.CUSTOMER_WRITE,
            titleKey: 'navigation.customers',
            titleAction: 'create',
          },
        },
        {
          path: 'customers/:id/edit',
          name: 'CustomerEdit',
          component: () => import('@/views/customers/CustomerEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.CUSTOMER_WRITE,
            titleKey: 'navigation.customers',
            titleAction: 'edit',
          },
        },
        {
          path: 'customers/:id',
          name: 'CustomerDetail',
          component: () => import('@/views/customers/CustomerDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.CUSTOMER_READ,
            titleKey: 'navigation.customers',
            titleAction: 'view',
          },
        },
        {
          path: 'customer-label-definitions',
          name: 'CustomerLabelDefinitions',
          component: () =>
            import('@/views/customer-label-definitions/CustomerLabelDefinitionView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.CUSTOMER_LABEL_DEFINITION_READ,
            titleKey: 'navigation.customerLabelDefinitions',
          },
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/products/ProductsView.vue'),
          meta: { requiredPermission: PERMISSIONS.PRODUCT_READ, titleKey: 'navigation.products' },
        },
        {
          path: 'product-label-definitions',
          name: 'ProductLabelDefinitions',
          component: () =>
            import('@/views/product-label-definitions/ProductLabelDefinitionsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRODUCT_LABEL_DEFINITION_READ,
            titleKey: 'navigation.productLabelDefinitions',
          },
        },
        {
          path: 'unit-of-measurements',
          name: 'UnitOfMeasurements',
          component: () => import('@/views/unit-of-measurements/UnitOfMeasurementsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.UNIT_OF_MEASUREMENT_READ,
            titleKey: 'navigation.unitOfMeasurements',
          },
        },
        {
          path: 'uom-groups',
          name: 'UomGroups',
          component: () => import('@/views/uom-groups/UomGroupsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.UOM_GROUP_READ,
            titleKey: 'navigation.uomGroups',
          },
        },
        {
          path: 'booking-orders',
          name: 'BookingOrders',
          component: () => import('@/views/booking-orders/BookingOrdersView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.BOOKING_ORDER_READ,
            titleKey: 'navigation.bookingOrders',
          },
        },
        {
          path: 'delivery-orders',
          name: 'DeliveryOrders',
          component: () => import('@/views/delivery-orders/DeliveryOrdersView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_ORDER_READ,
            titleKey: 'navigation.deliveryOrders',
          },
        },
        {
          path: 'delivery-orders/:id',
          name: 'DeliveryOrderDetail',
          component: () => import('@/views/delivery-orders/DeliveryOrderDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_ORDER_READ,
            titleKey: 'navigation.deliveryOrders',
            titleAction: 'view',
          },
        },
        {
          path: 'sales-orders',
          name: 'SalesOrders',
          component: () => import('@/views/sales-orders/SalesOrdersView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.SALES_ORDER_READ,
            titleKey: 'navigation.salesOrders',
          },
        },
        {
          path: 'sales-orders/create',
          name: 'SalesOrderCreate',
          component: () => import('@/views/sales-orders/SalesOrderCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.SALES_ORDER_WRITE,
            titleKey: 'navigation.salesOrders',
            titleAction: 'create',
          },
        },
        {
          path: 'sales-orders/:id/edit',
          name: 'SalesOrderEdit',
          component: () => import('@/views/sales-orders/SalesOrderEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.SALES_ORDER_WRITE,
            titleKey: 'navigation.salesOrders',
            titleAction: 'edit',
          },
        },
        {
          path: 'sales-orders/:id',
          name: 'SalesOrderDetail',
          component: () => import('@/views/sales-orders/SalesOrderDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.SALES_ORDER_READ,
            titleKey: 'navigation.salesOrders',
            titleAction: 'view',
          },
        },
        {
          path: 'return-delivery-orders/create',
          name: 'ReturnDeliveryOrderCreate',
          component: () =>
            import('@/views/return-delivery-orders/ReturnDeliveryOrderCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_ORDER_WRITE,
            titleKey: 'navigation.returnDeliveryOrders',
            titleAction: 'create',
          },
        },
        {
          path: 'number-series',
          name: 'NumberSeries',
          component: () => import('@/views/number-series/NumberSeriesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.NUMBER_SERIES_READ,
            titleKey: 'navigation.numberSeries',
          },
        },
        {
          path: 'price-lists',
          name: 'PriceLists',
          component: () => import('@/views/price-lists/PriceListsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_LIST_READ,
            titleKey: 'navigation.priceLists',
          },
        },
        {
          path: 'price-lists/create',
          name: 'PriceListCreate',
          component: () => import('@/views/price-lists/PriceListCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_LIST_WRITE,
            titleKey: 'navigation.priceLists',
            titleAction: 'create',
          },
        },
        {
          path: 'price-lists/:id/edit',
          name: 'PriceListEdit',
          component: () => import('@/views/price-lists/PriceListEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_LIST_WRITE,
            titleKey: 'navigation.priceLists',
            titleAction: 'edit',
          },
        },
        {
          path: 'price-lists/:id',
          name: 'PriceListDetail',
          component: () => import('@/views/price-lists/PriceListDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_LIST_READ,
            titleKey: 'navigation.priceLists',
            titleAction: 'view',
          },
        },
        {
          path: 'price-matrices',
          name: 'PriceMatrices',
          component: () => import('@/views/price-matrices/PriceMatricesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_MATRIX_READ,
            titleKey: 'navigation.priceMatrices',
          },
        },
        {
          path: 'price-matrices/create',
          name: 'PriceMatrixCreate',
          component: () => import('@/views/price-matrices/PriceMatrixCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_MATRIX_WRITE,
            titleKey: 'navigation.priceMatrices',
            titleAction: 'create',
          },
        },
        {
          path: 'price-matrices/:id/edit',
          name: 'PriceMatrixEdit',
          component: () => import('@/views/price-matrices/PriceMatrixEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_MATRIX_WRITE,
            titleKey: 'navigation.priceMatrices',
            titleAction: 'edit',
          },
        },
        {
          path: 'price-matrices/:id',
          name: 'PriceMatrixDetail',
          component: () => import('@/views/price-matrices/PriceMatrixDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_MATRIX_READ,
            titleKey: 'navigation.priceMatrices',
            titleAction: 'view',
          },
        },
        {
          path: 'price-matrix-priorities',
          name: 'PriceMatrixPriorities',
          component: () => import('@/views/price-matrices/PriceMatrixPrioritiesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PRICE_MATRIX_PRIORITY_READ,
            titleKey: 'navigation.priceMatrixPriorities',
          },
        },
        {
          path: 'promotions',
          name: 'Promotions',
          component: () => import('@/views/promotions/PromotionsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PROMOTION_READ,
            titleKey: 'navigation.promotions',
          },
        },
        {
          path: 'promotions/create',
          name: 'PromotionCreate',
          component: () => import('@/views/promotions/PromotionCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PROMOTION_WRITE,
            titleKey: 'navigation.promotions',
            titleAction: 'create',
          },
        },
        {
          path: 'promotions/:id/edit',
          name: 'PromotionEdit',
          component: () => import('@/views/promotions/PromotionEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PROMOTION_WRITE,
            titleKey: 'navigation.promotions',
            titleAction: 'edit',
          },
        },
        {
          path: 'promotions/:id',
          name: 'PromotionDetail',
          component: () => import('@/views/promotions/PromotionDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PROMOTION_READ,
            titleKey: 'navigation.promotions',
            titleAction: 'view',
          },
        },
        {
          path: 'audit-trails',
          name: 'AuditTrails',
          component: () => import('@/views/audit-trails/AuditTrailsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.AUDIT_TRAIL_READ,
            titleKey: 'navigation.auditTrails',
          },
        },
        {
          path: 'audit-trails/:id',
          name: 'AuditTrailDetail',
          component: () => import('@/views/audit-trails/AuditTrailDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.AUDIT_TRAIL_READ,
            titleKey: 'navigation.auditTrails',
            titleAction: 'view',
          },
        },
        {
          path: 'employees',
          name: 'Employees',
          component: () => import('@/views/employees/EmployeesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.EMPLOYEE_READ,
            titleKey: 'navigation.employees',
          },
        },
        {
          path: 'employees/new',
          name: 'EmployeeNew',
          component: () => import('@/views/employees/EmployeeDetailView.vue'),
          props: { mode: 'add' },
          meta: {
            requiredPermission: PERMISSIONS.EMPLOYEE_CREATE,
            titleKey: 'navigation.employees',
            titleAction: 'create',
          },
        },
        {
          path: 'employees/:id',
          name: 'EmployeeDetail',
          component: () => import('@/views/employees/EmployeeDetailView.vue'),
          props: (route) => ({ mode: 'view', id: Number(route.params.id) }),
          meta: {
            requiredPermission: PERMISSIONS.EMPLOYEE_READ,
            titleKey: 'navigation.employees',
            titleAction: 'view',
          },
        },
        {
          path: 'warehouses',
          name: 'Warehouses',
          component: () => import('@/views/warehouses/WarehousesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.WAREHOUSE_READ,
            titleKey: 'navigation.warehouses',
          },
        },
        {
          path: 'vehicles',
          name: 'Vehicles',
          component: () => import('@/views/vehicles/VehiclesView.vue'),
          meta: { requiredPermission: PERMISSIONS.VEHICLE_READ, titleKey: 'navigation.vehicles' },
        },
        {
          path: 'vehicles/new',
          name: 'VehicleNew',
          component: () => import('@/views/vehicles/VehicleDetailView.vue'),
          props: { mode: 'add' },
          meta: {
            requiredPermission: PERMISSIONS.VEHICLE_WRITE,
            titleKey: 'navigation.vehicles',
            titleAction: 'create',
          },
        },
        {
          path: 'vehicles/:id',
          name: 'VehicleDetail',
          component: () => import('@/views/vehicles/VehicleDetailView.vue'),
          props: (route) => ({ mode: 'view', id: Number(route.params.id) }),
          meta: {
            requiredPermission: PERMISSIONS.VEHICLE_READ,
            titleKey: 'navigation.vehicles',
            titleAction: 'view',
          },
        },
        {
          path: 'goods-receipts',
          name: 'GoodsReceipts',
          component: () => import('@/views/goods-receipts/GoodsReceiptsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RECEIPT_READ,
            titleKey: 'navigation.goodsReceipts',
          },
        },
        {
          path: 'goods-receipts/create',
          name: 'GoodsReceiptCreate',
          component: () => import('@/views/goods-receipts/GoodsReceiptCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RECEIPT_WRITE,
            titleKey: 'navigation.goodsReceipts',
            titleAction: 'create',
          },
        },
        {
          path: 'goods-receipts/:id/edit',
          name: 'GoodsReceiptEdit',
          component: () => import('@/views/goods-receipts/GoodsReceiptEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RECEIPT_WRITE,
            titleKey: 'navigation.goodsReceipts',
            titleAction: 'edit',
          },
        },
        {
          path: 'goods-receipts/:id',
          name: 'GoodsReceiptDetail',
          component: () => import('@/views/goods-receipts/GoodsReceiptDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RECEIPT_READ,
            titleKey: 'navigation.goodsReceipts',
            titleAction: 'view',
          },
        },
        {
          path: 'inventory-status',
          name: 'InventoryStatus',
          component: () => import('@/views/inventory-status/InventoryStatusView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.INVENTORY_READ,
            titleKey: 'navigation.inventoryStatus',
          },
        },
        {
          path: 'configs',
          name: 'Configs',
          component: () => import('@/views/configs/ConfigsView.vue'),
          meta: { titleKey: 'navigation.configs' },
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
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_NOTE_READ,
            titleKey: 'navigation.deliveryNotes',
          },
        },
        {
          path: 'delivery-notes/create',
          name: 'DeliveryNoteCreate',
          component: () => import('@/views/delivery-notes/DeliveryNoteCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_NOTE_WRITE,
            titleKey: 'navigation.deliveryNotes',
            titleAction: 'create',
          },
        },
        {
          path: 'delivery-notes/:id/edit',
          name: 'DeliveryNoteEdit',
          component: () => import('@/views/delivery-notes/DeliveryNoteCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_NOTE_WRITE,
            titleKey: 'navigation.deliveryNotes',
            titleAction: 'edit',
          },
        },
        {
          path: 'delivery-notes/:id',
          name: 'DeliveryNoteDetail',
          component: () => import('@/views/delivery-notes/DeliveryNoteDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_NOTE_READ,
            titleKey: 'navigation.deliveryNotes',
            titleAction: 'view',
          },
        },
        {
          path: 'picking-lists',
          name: 'PickingLists',
          component: () => import('@/views/picking-lists/PickingListsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PICKING_LIST_READ,
            titleKey: 'navigation.pickingLists',
          },
        },
        {
          path: 'picking-lists/:id',
          name: 'PickingListDetail',
          component: () => import('@/views/picking-lists/PickingListDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PICKING_LIST_READ,
            titleKey: 'navigation.pickingLists',
            titleAction: 'view',
          },
        },
        {
          path: 'invoices',
          name: 'Invoices',
          component: () => import('@/views/invoices/InvoicesView.vue'),
          meta: { requiredPermission: PERMISSIONS.INVOICE_READ, titleKey: 'navigation.invoices' },
        },
        {
          path: 'invoices/:id',
          name: 'InvoiceDetail',
          component: () => import('@/views/invoices/InvoiceDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.INVOICE_READ,
            titleKey: 'navigation.invoices',
            titleAction: 'view',
          },
        },
        {
          path: 'goods-issue-notes',
          name: 'GoodsIssueNotes',
          component: () => import('@/views/goods-issue-notes/GoodsIssueNotesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_READ,
            titleKey: 'navigation.goodsIssueNotes',
          },
        },
        {
          path: 'goods-issue-notes/create',
          name: 'GoodsIssueNoteCreate',
          component: () => import('@/views/goods-issue-notes/GoodsIssueNoteCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_WRITE,
            titleKey: 'navigation.goodsIssueNotes',
            titleAction: 'create',
          },
        },
        {
          path: 'goods-issue-notes/:id',
          name: 'GoodsIssueNoteDetail',
          component: () => import('@/views/goods-issue-notes/GoodsIssueNoteDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_READ,
            titleKey: 'navigation.goodsIssueNotes',
            titleAction: 'view',
          },
        },
        {
          path: 'delivery-confirmations',
          name: 'DeliveryConfirmations',
          component: () => import('@/views/delivery-confirmations/DeliveryConfirmationsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_CONFIRMATION_READ,
            titleKey: 'navigation.deliveryConfirmations',
          },
        },
        {
          path: 'delivery-confirmations/create',
          name: 'DeliveryConfirmationCreate',
          component: () =>
            import('@/views/delivery-confirmations/DeliveryConfirmationCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_CONFIRMATION_WRITE,
            titleKey: 'navigation.deliveryConfirmations',
            titleAction: 'create',
          },
        },
        {
          path: 'delivery-confirmations/:id',
          name: 'DeliveryConfirmationDetail',
          component: () =>
            import('@/views/delivery-confirmations/DeliveryConfirmationDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.DELIVERY_CONFIRMATION_READ,
            titleKey: 'navigation.deliveryConfirmations',
            titleAction: 'view',
          },
        },
        {
          path: 'stock-movements',
          name: 'StockMovements',
          component: () => import('@/views/stock-movements/StockMovementsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.STOCK_MOVEMENT_READ,
            titleKey: 'navigation.stockMovements',
          },
        },
        {
          path: 'goods-return-notes',
          name: 'GoodsReturnNotes',
          component: () => import('@/views/goods-return-notes/GoodsReturnNotesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RETURN_NOTE_READ,
            titleKey: 'navigation.goodsReturnNotes',
          },
        },
        {
          path: 'goods-return-notes/create',
          name: 'GoodsReturnNoteCreate',
          component: () => import('@/views/goods-return-notes/GoodsReturnNoteCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RETURN_NOTE_WRITE,
            titleKey: 'navigation.goodsReturnNotes',
            titleAction: 'create',
          },
        },
        {
          path: 'goods-return-notes/:id',
          name: 'GoodsReturnNoteDetail',
          component: () => import('@/views/goods-return-notes/GoodsReturnNoteDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.GOODS_RETURN_NOTE_READ,
            titleKey: 'navigation.goodsReturnNotes',
            titleAction: 'view',
          },
        },
        {
          path: 'approval-flows',
          name: 'ApprovalFlows',
          component: () => import('@/views/approval-flows/ApprovalFlowsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.APPROVAL_FLOW_READ,
            titleKey: 'navigation.approvalFlows',
          },
        },
        {
          path: 'approval-flows/create',
          name: 'ApprovalFlowCreate',
          component: () => import('@/views/approval-flows/ApprovalFlowCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.APPROVAL_FLOW_WRITE,
            titleKey: 'navigation.approvalFlows',
            titleAction: 'create',
          },
        },
        {
          path: 'approval-flows/:id/edit',
          name: 'ApprovalFlowEdit',
          component: () => import('@/views/approval-flows/ApprovalFlowDetailView.vue'),
          props: (route) => ({ mode: 'edit', id: Number(route.params.id) }),
          meta: {
            requiredPermission: PERMISSIONS.APPROVAL_FLOW_WRITE,
            titleKey: 'navigation.approvalFlows',
            titleAction: 'edit',
          },
        },
        {
          path: 'approval-flows/:id',
          name: 'ApprovalFlowDetail',
          component: () => import('@/views/approval-flows/ApprovalFlowDetailView.vue'),
          props: (route) => ({ mode: 'view', id: Number(route.params.id) }),
          meta: {
            requiredPermission: PERMISSIONS.APPROVAL_FLOW_READ,
            titleKey: 'navigation.approvalFlows',
            titleAction: 'view',
          },
        },
        {
          path: 'my-approvals',
          name: 'MyApprovals',
          component: () => import('@/views/my-approvals/MyApprovalsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.APPROVAL_REQUEST_READ,
            titleKey: 'navigation.myApprovals',
          },
        },
        {
          path: 'payment-terms',
          name: 'PaymentTerms',
          component: () => import('@/views/payment-terms/PaymentTermsView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PAYMENT_TERM_READ,
            titleKey: 'navigation.paymentTerms',
          },
        },
        {
          path: 'suppliers',
          name: 'Suppliers',
          component: () => import('@/views/suppliers/SuppliersView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.SUPPLIER_READ,
            titleKey: 'navigation.suppliers',
          },
        },
        {
          path: 'purchase-orders',
          name: 'PurchaseOrders',
          component: () => import('@/views/purchase-orders/PurchaseOrdersView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PURCHASE_ORDER_READ,
            titleKey: 'navigation.purchaseOrders',
          },
        },
        {
          path: 'purchase-orders/create',
          name: 'PurchaseOrderCreate',
          component: () => import('@/views/purchase-orders/PurchaseOrderCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PURCHASE_ORDER_WRITE,
            titleKey: 'navigation.purchaseOrders',
            titleAction: 'create',
          },
        },
        {
          path: 'purchase-orders/:id/edit',
          name: 'PurchaseOrderEdit',
          component: () => import('@/views/purchase-orders/PurchaseOrderEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PURCHASE_ORDER_WRITE,
            titleKey: 'navigation.purchaseOrders',
            titleAction: 'edit',
          },
        },
        {
          path: 'purchase-orders/:id',
          name: 'PurchaseOrderDetail',
          component: () => import('@/views/purchase-orders/PurchaseOrderDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.PURCHASE_ORDER_READ,
            titleKey: 'navigation.purchaseOrders',
            titleAction: 'view',
          },
        },
        {
          path: 'purchase-order-configs',
          redirect: { path: '/configs', query: { tab: 'po' } },
        },
        {
          path: 'goods-receipt-configs',
          redirect: { path: '/configs', query: { tab: 'gr' } },
        },
        {
          path: 'ap-invoices',
          name: 'ApInvoices',
          component: () => import('@/views/ap-invoices/ApInvoicesView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.AP_INVOICE_READ,
            titleKey: 'navigation.apInvoices',
          },
        },
        {
          path: 'ap-invoices/create',
          name: 'ApInvoiceCreate',
          component: () => import('@/views/ap-invoices/ApInvoiceCreateView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.AP_INVOICE_WRITE,
            titleKey: 'navigation.apInvoices',
            titleAction: 'create',
          },
        },
        // Declared before `ap-invoices/:id` — the detail route would otherwise swallow it.
        {
          path: 'ap-invoices/:id/edit',
          name: 'ApInvoiceEdit',
          component: () => import('@/views/ap-invoices/ApInvoiceEditView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.AP_INVOICE_WRITE,
            titleKey: 'navigation.apInvoices',
            titleAction: 'edit',
          },
        },
        {
          path: 'ap-invoices/:id',
          name: 'ApInvoiceDetail',
          component: () => import('@/views/ap-invoices/ApInvoiceDetailView.vue'),
          meta: {
            requiredPermission: PERMISSIONS.AP_INVOICE_READ,
            titleKey: 'navigation.apInvoices',
            titleAction: 'view',
          },
        },
        {
          path: 'ap-invoice-configs',
          redirect: { path: '/configs', query: { tab: 'ap' } },
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
          meta: { titleKey: 'pageTitle.notFound' },
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
 * Resolves the localized page title from the matched route's `meta.titleKey`/`meta.titleAction`
 * and applies it to `document.title`. Falls back to the bare app name when the route has no mapping.
 */
function setDocumentTitle(route: RouteLocationNormalized): void {
  const { t } = i18n.global
  const titleKey = route.meta.titleKey

  if (!titleKey) {
    document.title = APP_NAME
    return
  }

  const entity = t(titleKey)
  const page = route.meta.titleAction
    ? t(`pageTitle.${route.meta.titleAction}`, { entity })
    : entity
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
