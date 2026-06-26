import { useI18n } from 'vue-i18n'
import { mainMenu } from '@/components/menu/menu'
import { usePermissions } from './usePermissions'
import type { PermissionId } from '@/constants'

/**
 * A single searchable, navigable menu entry (a leaf with a route).
 */
export interface MenuSearchResult {
  /** Translated label of the menu item. */
  label: string
  /** Translated parent section label (empty for top-level items). */
  section: string
  /** Route path to navigate to when selected. */
  route: string
  /** Icon class inherited from the parent section. */
  icon: string
}

interface RawMenuItem {
  label?: string
  labelKey?: string
  icon?: string
  route?: string
  permissionsAny?: number[]
  items?: RawMenuItem[]
}

/**
 * Composable that exposes the application menu as a flat, permission-filtered,
 * searchable list — used by the header search bar to find and jump to pages.
 *
 * @example
 * ```ts
 * const { search } = useMenuSearch()
 * const results = search('cust') // [{ label: 'Customers', route: '/customers', ... }]
 * ```
 */
export function useMenuSearch() {
  const { t } = useI18n()
  const { canAccessRoute, hasPermission } = usePermissions()

  /**
   * Whether the current user can access a given menu item.
   * Mirrors the permission logic used by the sidebar (PanelMenuComponent).
   */
  function canAccess(item: RawMenuItem): boolean {
    if (item.permissionsAny && Array.isArray(item.permissionsAny)) {
      return item.permissionsAny.some((p) => hasPermission(p as PermissionId))
    }
    return item.route ? canAccessRoute(item.route) : true
  }

  /**
   * Build the flat list of accessible, navigable menu entries with translated labels.
   * Recomputed on each call so labels follow the active locale.
   */
  function buildEntries(): MenuSearchResult[] {
    const entries: MenuSearchResult[] = []

    for (const section of mainMenu as RawMenuItem[]) {
      const sectionLabel = section.labelKey ? t(section.labelKey) : (section.label ?? '')
      const icon = section.icon ?? 'pi pi-circle'

      if (section.items) {
        for (const item of section.items) {
          if (!item.route || !canAccess(item)) continue
          entries.push({
            label: item.labelKey ? t(item.labelKey) : (item.label ?? ''),
            section: sectionLabel,
            route: item.route,
            icon,
          })
        }
        continue
      }

      // Top-level item with a direct route (e.g. Superset).
      if (section.route && canAccess(section)) {
        entries.push({
          label: sectionLabel,
          section: '',
          route: section.route,
          icon,
        })
      }
    }

    return entries
  }

  /**
   * Search accessible menu entries by label or section (case-insensitive).
   * An empty query returns the full accessible list.
   */
  function search(query: string): MenuSearchResult[] {
    const entries = buildEntries()
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.section.toLowerCase().includes(q),
    )
  }

  return { search }
}
