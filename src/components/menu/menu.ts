const mainMenu = [
  {
    label: 'Users',
    icon: 'pi pi-user',
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
