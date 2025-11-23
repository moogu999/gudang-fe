const mainMenu = [
  {
    label: 'Organizations',
    icon: 'pi pi-building',
    items: [
      {
        label: 'Companies',
        route: '/companies',
      },
      {
        label: 'Branches',
        route: '/branches',
      },
      {
        label: 'Departments',
        route: '/departments',
      },
      {
        label: 'Divisions',
        route: '/divisions',
      },
    ],
  },
  {
    label: 'Users',
    icon: 'pi pi-user',
    route: '/users',
  },
  {
    label: 'Access Controls',
    icon: 'pi pi-lock',
    items: [
      {
        label: 'Roles',
        route: '/roles',
      },
      {
        label: 'Permissions',
        route: '/permissions',
      },
    ],
  },
  {
    label: 'Superset',
    icon: 'pi pi-chart-line',
    route: '/superset',
  },
]

export { mainMenu }
