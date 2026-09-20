import { computed } from 'vue'
import { useAuthStore } from '@/stores'
import router from '@/router'
import { ROUTE_WRITE_PERMISSIONS, type PermissionId } from '@/constants'

/** Name of the router's catch-all record, which any unmatched path falls through to. */
const NOT_FOUND_ROUTE = 'NotFound'

/**
 * Read permission a route path requires, taken from the router's own
 * `meta.requiredPermission` — the same source the navigation guard reads. Menu
 * visibility and navigation therefore cannot drift apart: a screen the guard
 * refuses can no longer appear in the sidebar.
 *
 * Returns `undefined` for a route that deliberately declares no permission (Home,
 * Superset), and `null` for a path matching no route at all.
 */
function requiredPermissionFor(path: string): PermissionId | undefined | null {
  const resolved = router.resolve(path)
  // The catch-all 404 record matches any path, so an unknown one never leaves
  // `matched` empty — landing on that record is what "no such route" looks like.
  if (resolved.matched.length === 0 || resolved.matched.some((r) => r.name === NOT_FOUND_ROUTE)) {
    return null
  }
  // Mirrors the navigation guard, which reads the first matched record declaring one.
  const record = resolved.matched.find((r) => r.meta.requiredPermission)
  return record?.meta.requiredPermission as PermissionId | undefined
}

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
   * Check if user can access a specific route path.
   *
   * A path that matches no route is denied. Such a path is a misconfiguration —
   * a menu entry pointing at a stale or misspelled route — and denying it makes
   * that visible instead of quietly exposing the entry to everyone.
   */
  const canAccessRoute = (path: string): boolean => {
    const requiredPermission = requiredPermissionFor(path)
    if (requiredPermission === null) return false
    if (requiredPermission === undefined) return true
    return hasPermission(requiredPermission)
  }

  /**
   * Check if user can read (view) the current route
   */
  const canRead = computed(() => {
    if (!routePath) return true
    return canAccessRoute(routePath)
  })

  /**
   * Check if user can write (create/edit/delete) on the current route.
   *
   * Write permissions have no equivalent on the route itself — the router only
   * describes who may open a screen — so they stay in ROUTE_WRITE_PERMISSIONS.
   */
  const canWrite = computed(() => {
    if (!routePath) return true
    const requiredPermission = ROUTE_WRITE_PERMISSIONS[routePath]
    if (!requiredPermission) return true
    return hasPermission(requiredPermission)
  })

  /**
   * Check whether the current user can access a navigation menu item.
   *
   * An item is accessible if it declares `permissionsAny` and the user holds any
   * of those permissions, or — when no explicit permissions are declared — if the
   * user can access its route. Items without a route are always accessible.
   *
   * Shared by the sidebar (PanelMenuComponent) and the header menu search so the
   * permission logic stays in one place.
   */
  const canAccessMenuItem = (item: { permissionsAny?: number[]; route?: string }): boolean => {
    if (item.permissionsAny && Array.isArray(item.permissionsAny)) {
      return item.permissionsAny.some((p) => hasPermission(p as PermissionId))
    }
    return item.route ? canAccessRoute(item.route) : true
  }

  return {
    hasPermission,
    canRead,
    canWrite,
    canAccessRoute,
    canAccessMenuItem,
  }
}
