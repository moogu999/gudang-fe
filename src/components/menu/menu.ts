const mainMenu = [
  {
    label: 'Organizations',
    icon: 'pi pi-building',
    items: [
      {
        label: 'Branches',
        route: '/branches',
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
