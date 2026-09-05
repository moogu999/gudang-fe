import type { TreeNode } from 'primevue/treenode'
import type { ChartOfAccount, ChartOfAccountNode } from '@/types/chartOfAccount.type'

/** Typed adapter over PrimeVue's TreeNode — `data` is always a ChartOfAccount here. */
export interface CoaTreeNode extends TreeNode {
  data: ChartOfAccount
  children: CoaTreeNode[]
}

/**
 * Normalize a tree fetched from the API: a leaf's `children` comes back as
 * `null` (a nil Go slice serializes that way), not `[]`, so every function
 * below assumes `normalizeTree` has already run once at the fetch boundary.
 */
export function normalizeTree(
  nodes: ChartOfAccountNode[] | null | undefined,
): ChartOfAccountNode[] {
  return (nodes ?? []).map((node) => ({ ...node, children: normalizeTree(node.children) }))
}

/** Map the API's ChartOfAccountNode[] onto PrimeVue's TreeNode shape, preserving order. */
export function toTreeNodes(nodes: ChartOfAccountNode[]): CoaTreeNode[] {
  return nodes.map((node) => {
    const { children, ...data } = node
    return {
      key: String(node.id),
      data,
      children: toTreeNodes(children),
    }
  })
}

/**
 * Keep any node matching the predicate, plus every ancestor of a match (so
 * matches are reachable) — but not non-matching descendants of a non-matching node.
 */
export function filterTree(
  nodes: ChartOfAccountNode[],
  predicate: (n: ChartOfAccountNode) => boolean,
): ChartOfAccountNode[] {
  const result: ChartOfAccountNode[] = []

  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, predicate)
    if (predicate(node) || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren })
    }
  }

  return result
}

/**
 * Expansion map ({ [key]: true }) covering every ancestor of a match.
 *
 * Intended to run over the *filtered* tree (see filterTree): there, any node
 * that still has children necessarily has a match somewhere beneath it — a
 * non-matching leaf with no matching descendants is dropped by filterTree —
 * so expanding every node with children reveals every match.
 */
export function expandedKeysFor(nodes: ChartOfAccountNode[]): Record<string, boolean> {
  const expanded: Record<string, boolean> = {}

  function walk(node: ChartOfAccountNode) {
    if (node.children.length > 0) {
      expanded[String(node.id)] = true
      node.children.forEach(walk)
    }
  }

  nodes.forEach(walk)

  return expanded
}

/** Expansion map with every node that has children marked expanded — for "Expand all". */
export function allExpandedKeys(nodes: ChartOfAccountNode[]): Record<string, boolean> {
  const expanded: Record<string, boolean> = {}

  function walk(node: ChartOfAccountNode) {
    if (node.children.length > 0) {
      expanded[String(node.id)] = true
      node.children.forEach(walk)
    }
  }

  nodes.forEach(walk)

  return expanded
}

/** Flatten a tree into a single array, depth-first. */
export function flattenTree(nodes: ChartOfAccountNode[]): ChartOfAccountNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)])
}
