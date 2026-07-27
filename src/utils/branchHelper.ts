import type { Branch } from '@/types/branch.type'

/**
 * A branch as it is known to a dropdown: some payloads (e.g. the employee API)
 * carry only the id and name, so both label parts are optional here.
 */
type BranchLike = Partial<Pick<Branch, 'code' | 'name'>>

/**
 * Build the display label for a branch: "B01 - Head Office".
 *
 * Neither part identifies a branch on its own — the code is short but opaque,
 * the name is readable but not unique — so dropdowns show both. Falls back to
 * whichever part is available when a payload carries only one of them.
 *
 * @param branch - Branch (or partial branch) to label
 * @returns The label, or an empty string when neither code nor name is present
 *
 * @example
 * ```vue
 * <InfiniteSelect :option-label="branchLabel" option-value="id" ... />
 * ```
 */
export function branchLabel(branch: BranchLike): string {
  if (!branch.code) {
    return branch.name ?? ''
  }

  return branch.name ? `${branch.code} - ${branch.name}` : branch.code
}
