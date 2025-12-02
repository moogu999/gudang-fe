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
    route: '/customers',
  },
  {
    label: 'Users',
    labelKey: 'navigation.users',
    icon: 'pi pi-user',
    route: '/users',
  },
  {
    label: 'Access Controls',
    labelKey: 'navigation.accessControls',
    icon: 'pi pi-lock',
    items: [
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
    label: 'Superset',
    labelKey: 'navigation.superset',
    icon: 'pi pi-chart-line',
    route: '/superset',
  },
]

export { mainMenu }
