# Frontend Plan: Pin UOM on Transactions (display-only)

> Master plan: [`../../.claude/uom-pinning-plan.md`](../../.claude/uom-pinning-plan.md) — read it
> first for context and the snapshot JSON shape.

The backend is authoritative and snapshots the UOM chain server-side from `product_id`. **Forms
send no UOM.** Frontend work is therefore display-only: read the pinned snapshot on **saved**
records, and keep using live `product.uomGroup` only in the create/edit form before save.

Depends on the backend OpenAPI/DTO shape (`pinnedUom`) shipping first — see
[`../../gudang-be/.claude/uom-pinning-plan.md`](../../gudang-be/.claude/uom-pinning-plan.md) §7.

## 1. Types — add a shared `PinnedUom` and attach to response types

- New `src/types/pinnedUom.type.ts`:
  ```ts
  export interface PinnedUom {
    uomGroupId: number
    name: string
    levels: { levelOrder: number; uomId: number; symbol: string; qtyPerParent: number | null }[]
  }
  ```
- Add `pinnedUom?: PinnedUom | null` to:
  - `SalesOrderDetail`, its **line-bonus** type, and the SO **header-bonus** type
    (`src/types/salesOrder.type.ts`)
  - `GoodsReceiptDetailResponse` (`src/types/goodsReceipt.type.ts`)
  - `DeliveryOrderViewLine` (`src/types/deliveryOrder.type.ts`)

## 2. Display — prefer pinned snapshot on saved records

Add a tiny adapter so existing helpers/utilities work unchanged:
```ts
// maps the pinned shape onto the existing UomConversionLevel shape (symbol -> uom.symbol)
function pinnedToLevels(p?: PinnedUom | null): UomConversionLevel[] | undefined
```
Then update `getUomLevels()` / `getUomLabel()` to prefer the pinned snapshot, falling back to live
product UOM (for unsaved form rows):

```ts
const levels = pinnedToLevels(data.pinnedUom) ?? data.product?.uomGroup?.levels
```

The multi-tier decompose path (`src/utils/uomHelper.ts` → `decomposeBaseQty`) then operates on the
pinned `qtyPerParent`, so historical quantities render exactly as recorded.

Apply in:
- `views/sales-orders/SalesOrderDetailsTable.vue` (lines ~709–718) and
  `views/sales-orders/SalesOrderDetailView.vue` — **including wherever line-level and header-level
  bonus items are rendered** (same `pinnedUom`-first rule on bonus rows)
- `views/goods-receipts/GoodsReceiptDetailsTable.vue` (lines ~269–274) and
  `GoodsReceiptDetailView.vue`
- `views/delivery-orders/DeliveryOrderDetailView.vue` (lines ~384–392) and
  `DeliveryOrderPrintView.vue`

Keep the create/edit form path unchanged: unsaved rows still read live `product.uomGroup` (the
fallback above handles this — `pinnedUom` is absent until the record is saved).

## Verification

- `npm run type-check` + `npm run lint`.
- With the API running: open saved SO / GR / DO detail + print views (including bonus rows) → UOM
  symbols and tier decomposition match what was recorded, independent of later product UOM edits.
- Create form still shows live product UOM before save (unchanged UX).
