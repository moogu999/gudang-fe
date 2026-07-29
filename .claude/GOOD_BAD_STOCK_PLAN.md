# Good/Bad Stock — Frontend Plan

> Master plan: [`../../.claude/GOOD_BAD_STOCK_PLAN.md`](../../.claude/GOOD_BAD_STOCK_PLAN.md).
> Backend counterpart: [`gudang-be/.claude/GOOD_BAD_STOCK_PLAN.md`](../../gudang-be/.claude/GOOD_BAD_STOCK_PLAN.md).

## Context

- **Sales Order creation** (`src/views/sales-orders/*`) has no inventory/availability
  awareness at all today — no `InventoryService` call, no `stockType` anywhere in that flow.
  "Sales only sees good stock" is enforced entirely backend-side, at booking-order reservation
  time (see BE plan §D). **No FE change is needed for that half of the ask.**
- **Goods Return Note create** (`GoodsReturnNoteCreateView.vue`) already fetches
  `DriverStockItem.sourceType` (`'partial_delivery' | 'failed_delivery' | 'sales_return'`) per
  pooled item and already groups/tags rows by it (`groupedPool`, `sourceTypeSeverity()`,
  lines ~298-327) — but sends no `stockType` in the create payload; it was explicitly locked
  as "good only" when GRN was first built (`goods-return-note-plan.md:13`).
- `GoodsReturnNoteItemStockType` is currently the single-value union `'good'`
  (`types/goodsReturnNote.type.ts:5`).
- `InventoryBalance` (backing the Inventory Status table) already carries `stockType`
  (`types/inventoryBalance.type.ts`), but the table doesn't render it — good and bad rows
  would appear unlabeled today.
- Reference pattern already in the codebase: `GoodsReceiptForm.vue:124-136,270-280,400` has a
  working good/bad selector at intake — reuse its shape for consistency.

## A. Types

`src/types/goodsReturnNote.type.ts`:
- `GoodsReturnNoteItemStockType`: widen `'good'` → `'good' | 'bad'`.
- `CreateGoodsReturnNoteRequest.items[]`: add optional `stockType?: GoodsReturnNoteItemStockType`
  (optional to match the backend's server-side default — see BE plan §E; the FE always sends
  it explicitly in practice, since the selector is always shown with a pre-filled value, but
  the type stays optional so the request shape matches the API contract).

## B. Goods Return Note create form

`GoodsReturnNoteCreateView.vue`:
- `selection` map (keyed by `driverStockItemId`) gains `stockType`, initialized when
  `fetchDriverStock()` populates the pool (same place `checked`/`receivedQty` are seeded,
  lines ~376-381): default `'bad'` when `item.sourceType === 'sales_return'`, else `'good'`
  (mirrors the existing `sourceTypeSeverity()` branch shape at lines 323-327).
- Per-row template (lines ~140-178): add a stock-type control next to the qty input — a
  PrimeVue `SelectButton` (good/bad) bound to `selection[item.driverStockItemId].stockType`,
  styled like `GoodsReceiptForm.vue`'s existing selector for visual consistency across the app.
- `onSubmitClick` (lines ~397-465): include `stockType: selection[id].stockType` in each
  submitted item (currently only `{driverStockItemId, receivedQty}` is sent, lines ~437-440).
- i18n: add stock-type labels. Prefer a shared key (e.g. `common.stockType.good` /
  `common.stockType.bad`) reused by both `GoodsReceiptForm.vue` and this view instead of
  duplicating per-module strings — check whether `goodsReceipts.stockType.*` already exists
  and either promote it to a shared namespace or add a parallel `goodsReturnNotes.stockType.*`.

## C. Inventory Status visibility

`src/views/inventory-status/InventoryStatusView.vue`: the balances table already receives
`stockType` per row (`InventoryBalance.stockType`) — render it as a column/Tag (`good` =
success, `bad` = danger, same severity convention as `sourceTypeSeverity()`), so bad-stock
rows aren't silently unlabeled once GRN can produce them. No new API call needed — the field
is already in the fetched data.

## Files (representative)

- `src/types/goodsReturnNote.type.ts`
- `src/views/goods-return-notes/GoodsReturnNoteCreateView.vue`
- `src/views/inventory-status/InventoryStatusView.vue`
- Reference: `src/views/goods-receipts/GoodsReceiptForm.vue:124-136,270-280,400`

## Verification

- `npm run type-check`, `npm run lint`.
- Manual (`npm run dev`):
  - Open a driver with a `sales_return` pooled item — stock-type selector defaults to `bad`.
  - Open a driver with a `partial_delivery`/`failed_delivery` item — defaults to `good`
    (unchanged from today).
  - Submit a BTB with one of each; confirm via `/gen/v1/inventory-balances` that separate
    `good`/`bad` rows were created/updated correctly for the respective products.
  - Flip a `sales_return` line to `good` before submitting; confirm it lands in the `good`
    balance row instead.
  - Inventory Status page shows a visible `bad` tag on the row once the above BTB is submitted.
