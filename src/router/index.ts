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
