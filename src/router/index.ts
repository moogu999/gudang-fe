import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/home/HomeView.vue'),
    },
    {
      path: '/roles',
      component: () => import('@/views/roles/RolesView.vue'),
    },
    {
      path: '/permissions',
      component: () => import('@/views/permissions/PermissionsView.vue'),
    },
    {
      path: '/:notFound(.*)',
      component: () => import('@/views/home/HomeView.vue'),
    },
  ],
})

export default router
