/**
 * Main navigation menu configuration
 *
 * Each menu item includes a `labelKey` for i18n translation.
 * The `label` field is kept for backwards compatibility and as a fallback.
 */
const mainMenu = [
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
    ]
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
