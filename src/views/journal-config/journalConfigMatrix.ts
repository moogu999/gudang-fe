import type {
  DimensionSource,
  JournalConfig,
  JournalConfigRole,
  JournalDimension,
  JournalMappingValue,
} from '@/types/journalConfig.type'

export interface BasisLike {
  position: number
  source: DimensionSource
  refId?: number | null
}

/** Stable identifier for a dimension: "branch" or "product_label:7". Must
 *  match the backend's Dimension.Key() — used to compare/dedupe selections
 *  across basis slots and dimension-catalog entries. */
export function dimensionKey(source: DimensionSource, refId?: number | null): string {
  return refId != null ? `${source}:${refId}` : source
}

/** Byte-identical to the backend's canonical combination_key: segments in
 *  position order, `_` for a null value, `''` when the role has no bases.
 *  This is a stored value on both sides — keep it exactly in sync. */
export function buildCombinationKey(values: JournalMappingValue[]): string {
  return values
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((v) => `${dimensionKey(v.source, v.refId)}=${v.valueId ?? '_'}`)
    .join('|')
}

/** Unmapped-row count per role code — drives the tab badges. */
export function unmappedCountsByRole(roles: JournalConfigRole[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const role of roles) {
    result[role.roleCode] = role.unmappedRows
  }
  return result
}

/** A config can be activated only once every role has at least one mapping
 *  row and none of them are unmapped — mirrors the backend's ActivateConfig
 *  completeness check so the button never promises what the server will
 *  refuse with a 409. */
export function isActivatable(config: Pick<JournalConfig, 'roles'>): boolean {
  if (config.roles.length === 0) {
    return false
  }
  return config.roles.every((role) => role.totalRows > 0 && role.unmappedRows === 0)
}

/** True when the ordered (position, source, refId) sequence actually
 *  differs — decides whether to warn before PUT .../bases, since the
 *  backend treats an identical resubmit as a no-op and the UI must not
 *  scare the user over nothing. */
export function basisChanged(oldBases: BasisLike[], newBases: BasisLike[]): boolean {
  if (oldBases.length !== newBases.length) {
    return true
  }
  const sortedOld = oldBases.slice().sort((a, b) => a.position - b.position)
  const sortedNew = newBases.slice().sort((a, b) => a.position - b.position)
  return sortedOld.some((b, i) => {
    const n = sortedNew[i]!
    return (
      b.position !== n.position || b.source !== n.source || (b.refId ?? null) !== (n.refId ?? null)
    )
  })
}

/** Dimensions available for one basis slot: the full catalog minus whatever
 *  is already picked in another slot. The backend rejects a duplicate
 *  dimension outright, so the UI must never offer one. */
export function dimensionOptionsFor(
  catalog: JournalDimension[],
  usedKeys: string[],
  currentKey?: string | null,
): JournalDimension[] {
  return catalog.filter((d) => d.key === currentKey || !usedKeys.includes(d.key))
}
