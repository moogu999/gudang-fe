import { useRouter } from 'vue-router'

// Long enough for the form's success toast to be read before the page changes.
const NAVIGATE_DELAY_MS = 1000

interface SavedRecord {
  id: number
  // Absent for always-editable resources (price lists, promotions, …).
  status?: string
}

/**
 * Where to land after a create/edit page saves. A record that is still editable
 * (a draft, or a resource without a status) keeps the user on its edit page so they
 * can keep making changes; one that left draft goes to its read-only detail page.
 *
 * @param basePath Resource root, e.g. '/purchase-orders'
 *
 * @example
 * const { afterCreate, afterUpdate } = usePostSaveNavigation('/purchase-orders')
 * // create view: afterCreate(saved)  → /purchase-orders/:id/edit or /purchase-orders/:id
 * // edit view:   afterUpdate(saved)  → stays (returns true) or /purchase-orders/:id
 */
export function usePostSaveNavigation(basePath: string) {
  const router = useRouter()

  function isEditable(saved: SavedRecord) {
    return saved.status === undefined || saved.status === 'draft'
  }

  function afterCreate(saved: SavedRecord) {
    // replace, not push: Back should skip the now-stale create form.
    const target = isEditable(saved) ? `${basePath}/${saved.id}/edit` : `${basePath}/${saved.id}`
    setTimeout(() => router.replace(target), NAVIGATE_DELAY_MS)
  }

  /** Returns true when the user stays on the edit page. */
  function afterUpdate(saved: SavedRecord): boolean {
    if (isEditable(saved)) return true
    setTimeout(() => router.push(`${basePath}/${saved.id}`), NAVIGATE_DELAY_MS)
    return false
  }

  return { afterCreate, afterUpdate }
}
