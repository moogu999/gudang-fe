import { computed } from 'vue'
import { useAuthStore } from '@/stores'
import { ROUTE_PERMISSIONS, ROUTE_WRITE_PERMISSIONS, type PermissionId } from '@/constants'

/**
 * Composable for checking user permissions
 *
 * Provides reactive permission checking for RBAC (Role-Based Access Control).
 * Use this to show/hide UI elements based on user permissions.
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePermissions } from '@/composables'
 *
 * const { canRead, canWrite, hasPermission } = usePermissions('/users')
 *
 * // Check specific permission
 * if (hasPermission(PERMISSIONS.USER_WRITE)) {
 *   // User can write
 * }
 * </script>
 *
 * <template>
 *   <Button v-if="canWrite" @click="create">Create User</Button>
 *   <TableComponent v-if="canRead" />
 * </template>
 * ```
 */
export function usePermissions(routePath?: string) {
  const authStore = useAuthStore()

  /**
   * Check if user has a specific permission by ID
   */
  const hasPermission = (permissionId: PermissionId): boolean => {
    return authStore.hasPermission(permissionId)
  }

  /**
   * Check if user can read (view) the current route
   */
  const canRead = computed(() => {
    if (!routePath) return true
    const requiredPermission = ROUTE_PERMISSIONS[routePath]
    if (!requiredPermission) return true
    return hasPermission(requiredPermission)
  })

  /**
   * Check if user can write (create/edit/delete) on the current route
   */
  const canWrite = computed(() => {
    if (!routePath) return true
    const requiredPermission = ROUTE_WRITE_PERMISSIONS[routePath]
    if (!requiredPermission) return true
    return hasPermission(requiredPermission)
  })

  /**
   * Check if user can access a specific route path
   */
  const canAccessRoute = (path: string): boolean => {
    const requiredPermission = ROUTE_PERMISSIONS[path]
    if (!requiredPermission) return true
    return hasPermission(requiredPermission)
  }

  return {
    hasPermission,
    canRead,
    canWrite,
    canAccessRoute,
  }
}
