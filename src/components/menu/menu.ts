import { PERMISSIONS } from '@/constants'

/**
 * Main navigation menu configuration
 *
 * Each menu item includes a `labelKey` for i18n translation.
 * The `label` field is kept for backwards compatibility and as a fallback.
 */
const mainMenu = [
  {
    label: 'HR',
    labelKey: 'navigation.hr',
    icon: 'pi pi-id-card',
    items: [
      {
        label: 'Employees',
        labelKey: 'navigation.employees',
        route: '/employees',
      },
    ],
  },
  {
    label: 'Organizations',
    labelKey: 'navigation.organizations',
    icon: 'pi pi-building',
    items: [
      {
        label: 'Companies',
        labelKey: 'navigation.companies',
        route: '/companies',
      },
      {
        label: 'Branches',
        labelKey: 'navigation.branches',
        route: '/branches',
      },
      {
        label: 'Departments',
        labelKey: 'navigation.departments',
        route: '/departments',
      },
      {
        label: 'Divisions',
        labelKey: 'navigation.divisions',
        route: '/divisions',
      },
      {
        label: 'Sales Organizations',
        labelKey: 'navigation.salesOrganizations',
        route: '/sales-organizations',
      },
    ],
  },
  {
    label: 'Customers',
    labelKey: 'navigation.customers',
    icon: 'pi pi-users',
    items: [
      {
        label: 'Customer',
        labelKey: 'navigation.customers',
        route: '/customers',
      },
      {
        label: 'Customer Label Definitions',
        labelKey: 'navigation.customerLabelDefinitions',
        route: '/customer-label-definitions',
      },
    ],
  },
  {
    label: 'Products',
    labelKey: 'navigation.products',
    icon: 'pi pi-box',
    items: [
      {
        label: 'Products',
        labelKey: 'navigation.products',
        route: '/products',
      },
      {
        label: 'Unit of Measurements',
        labelKey: 'navigation.unitOfMeasurements',
        route: '/unit-of-measurements',
      },
      {
        label: 'UOM Groups',
        labelKey: 'navigation.uomGroups',
        route: '/uom-groups',
      },
      {
        label: 'Product Label Definitions',
        labelKey: 'navigation.productLabelDefinitions',
        route: '/product-label-definitions',
      },
    ],
  },
  {
    label: 'Fleet',
    labelKey: 'navigation.fleet',
    icon: 'pi pi-truck',
    items: [
      {
        label: 'Vehicles',
        labelKey: 'navigation.vehicles',
        route: '/vehicles',
      },
    ],
  },
  {
    label: 'Inventory',
    labelKey: 'navigation.inventory',
    icon: 'pi pi-warehouse',
    items: [
      {
        label: 'Warehouses',
        labelKey: 'navigation.warehouses',
        route: '/warehouses',
      },
      {
        label: 'Goods Receipts',
        labelKey: 'navigation.goodsReceipts',
        route: '/goods-receipts',
      },
      {
        label: 'Inventory Status',
        labelKey: 'navigation.inventoryStatus',
        route: '/inventory-status',
      },
      {
        label: 'Stock Movements',
        labelKey: 'navigation.stockMovements',
        route: '/stock-movements',
      },
    ],
  },
  {
    label: 'Pricing',
    labelKey: 'navigation.pricing',
    icon: 'pi pi-tag',
    items: [
      {
        label: 'Price Lists',
        labelKey: 'navigation.priceLists',
        route: '/price-lists',
      },
      {
        label: 'Price Matrices',
        labelKey: 'navigation.priceMatrices',
        route: '/price-matrices',
      },
      {
        label: 'Price Matrix Priority',
        labelKey: 'navigation.priceMatrixPriorities',
        route: '/price-matrix-priorities',
      },
    ],
  },
  {
    label: 'Sales',
    labelKey: 'navigation.sales',
    icon: 'pi pi-shopping-cart',
    items: [
      {
        label: 'Sales Orders',
        labelKey: 'navigation.salesOrders',
        route: '/sales-orders',
      },
      {
        label: 'Booking Orders',
        labelKey: 'navigation.bookingOrders',
        route: '/booking-orders',
      },
      {
        label: 'Delivery Orders',
        labelKey: 'navigation.deliveryOrders',
        route: '/delivery-orders',
      },
      {
        label: 'Return Delivery Orders',
        labelKey: 'navigation.returnDeliveryOrders',
        route: '/return-delivery-orders/create',
      },
      {
        label: 'Delivery Notes',
        labelKey: 'navigation.deliveryNotes',
        route: '/delivery-notes',
      },
      {
        label: 'Picking Lists',
        labelKey: 'navigation.pickingLists',
        route: '/picking-lists',
      },
      {
        label: 'Goods Issue Notes',
        labelKey: 'navigation.goodsIssueNotes',
        route: '/goods-issue-notes',
      },
      {
        label: 'Delivery Confirmations',
        labelKey: 'navigation.deliveryConfirmations',
        route: '/delivery-confirmations',
      },
      {
        label: 'Goods Return Notes',
        labelKey: 'navigation.goodsReturnNotes',
        route: '/goods-return-notes',
      },
      {
        label: 'Invoices',
        labelKey: 'navigation.invoices',
        route: '/invoices',
      },
      {
        label: 'Promotions',
        labelKey: 'navigation.promotions',
        route: '/promotions',
      },
    ],
  },
  {
    label: 'Purchasing',
    labelKey: 'navigation.purchasing',
    icon: 'pi pi-shopping-bag',
    items: [
      {
        label: 'Purchase Orders',
        labelKey: 'navigation.purchaseOrders',
        route: '/purchase-orders',
      },
      {
        label: 'AP Invoices',
        labelKey: 'navigation.apInvoices',
        route: '/ap-invoices',
      },
      {
        label: 'Credit/Debit Notes',
        labelKey: 'navigation.creditDebitNotes',
        route: '/credit-debit-notes',
      },
      {
        label: 'AP Outstanding',
        labelKey: 'navigation.apOutstanding',
        route: '/ap-outstanding',
      },
      {
        label: 'Term of Payment',
        labelKey: 'navigation.paymentTerms',
        route: '/payment-terms',
      },
      {
        label: 'Correction Categories',
        labelKey: 'navigation.correctionCategories',
        route: '/correction-categories',
      },
      {
        label: 'Suppliers',
        labelKey: 'navigation.suppliers',
        route: '/suppliers',
      },
    ],
  },
  {
    label: 'Approvals',
    labelKey: 'navigation.approvals',
    icon: 'pi pi-check-square',
    items: [
      {
        label: 'My Approvals',
        labelKey: 'navigation.myApprovals',
        route: '/my-approvals',
      },
      {
        label: 'Approval Flows',
        labelKey: 'navigation.approvalFlows',
        route: '/approval-flows',
      },
    ],
  },
  {
    label: 'Access Controls',
    labelKey: 'navigation.accessControls',
    icon: 'pi pi-lock',
    items: [
      {
        label: 'Users',
        labelKey: 'navigation.users',
        route: '/users',
      },
      {
        label: 'Roles',
        labelKey: 'navigation.roles',
        route: '/roles',
      },
      {
        label: 'Permissions',
        labelKey: 'navigation.permissions',
        route: '/permissions',
      },
      {
        label: 'Audit Trails',
        labelKey: 'navigation.auditTrails',
        route: '/audit-trails',
      },
    ],
  },
  {
    label: 'Settings',
    labelKey: 'navigation.settings',
    icon: 'pi pi-cog',
    items: [
      {
        label: 'Number Series',
        labelKey: 'navigation.numberSeries',
        route: '/number-series',
      },
      {
        label: 'Config',
        labelKey: 'navigation.configs',
        route: '/configs',
        permissionsAny: [
          PERMISSIONS.SALES_ORDER_CONFIG_READ,
          PERMISSIONS.BOOKING_ORDER_CONFIG_READ,
          PERMISSIONS.PURCHASE_ORDER_CONFIG_READ,
          PERMISSIONS.GOODS_RECEIPT_CONFIG_READ,
          PERMISSIONS.AP_INVOICE_CONFIG_READ,
        ],
      },
    ],
  },
  {
    label: 'Superset',
    labelKey: 'navigation.superset',
    icon: 'pi pi-chart-line',
    route: '/superset',
  },
]

export { mainMenu }
