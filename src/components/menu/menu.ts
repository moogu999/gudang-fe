const mainMenu = [
  {
    label: 'Superset',
    icon: 'pi pi-user',
    route: '/superset',
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
]

const avatarMenu = [
  {
    label: 'Sign Out',
  },
]

export { mainMenu, avatarMenu }
