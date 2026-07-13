import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mainMenu } from '@/components/menu/menu'
import { usePermissions } from './usePermissions'

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
  const { canAccessMenuItem } = usePermissions()

  /**
   * Flat list of accessible, navigable menu entries with translated labels.
   *
   * Cached as a `computed` so it is rebuilt only when its reactive dependencies
   * change (the active locale via `t()` and the permissions store via
   * `canAccessMenuItem`) — not on every keystroke. As a bonus, the labels stay
   * in sync with the active locale automatically.
   */
  const entries = computed<MenuSearchResult[]>(() => {
    const result: MenuSearchResult[] = []

    for (const section of mainMenu as RawMenuItem[]) {
      const sectionLabel = section.labelKey ? t(section.labelKey) : (section.label ?? '')
      const icon = section.icon ?? 'pi pi-circle'

      if (section.items) {
        for (const item of section.items) {
          if (!item.route || !canAccessMenuItem(item)) continue
          result.push({
            label: item.labelKey ? t(item.labelKey) : (item.label ?? ''),
            section: sectionLabel,
            route: item.route,
            icon,
          })
        }
        continue
      }

      // Top-level item with a direct route (e.g. Superset).
      if (section.route && canAccessMenuItem(section)) {
        result.push({
          label: sectionLabel,
          section: '',
          route: section.route,
          icon,
        })
      }
    }

    return result
  })

  /**
   * Search accessible menu entries by label or section (case-insensitive).
   * An empty query returns the full accessible list.
   */
  function search(query: string): MenuSearchResult[] {
    const q = query.trim().toLowerCase()
    if (!q) return entries.value
    return entries.value.filter(
      (e) => e.label.toLowerCase().includes(q) || e.section.toLowerCase().includes(q),
    )
  }

  return { search }
}
