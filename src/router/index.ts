import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores'

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
        },
        {
          path: 'roles',
          name: 'Roles',
          component: () => import('@/views/roles/RolesView.vue'),
        },
        {
          path: 'permissions',
          name: 'Permissions',
          component: () => import('@/views/permissions/PermissionsView.vue'),
        },
        {
          path: 'branches',
          name: 'Branches',
          component: () => import('@/views/branches/BranchesView.vue'),
        },
        {
          path: 'companies',
          name: 'Companies',
          component: () => import('@/views/companies/CompaniesView.vue'),
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

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.waitForInit()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'SignIn', query: { redirect: to.fullPath } })
  } else if (to.name === 'SignIn' && authStore.isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
