export interface PinnedUomLevel {
  levelOrder: number
  uomId: number
  symbol: string
  qtyPerParent: number | null
}

export interface PinnedUom {
  uomGroupId: number
  name: string
  levels: PinnedUomLevel[]
}
