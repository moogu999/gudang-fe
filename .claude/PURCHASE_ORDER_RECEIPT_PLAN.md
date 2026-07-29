# PO Receipt & Moving-Average Valuation — Frontend Plan

> Sub-plan. All business rationale and locked decisions live in the master:
> [`../../.claude/PURCHASE_ORDER_RECEIPT_PLAN.md`](../../.claude/PURCHASE_ORDER_RECEIPT_PLAN.md).
> This document is file-level implementation detail only.

## Summary of what changes

1. **Goods Receipt** gains a draft → approval → approved lifecycle, an approval panel, a branch
   picker, an edit view, and — when a PO is selected — a PO-locked line table with partial receipt
   and per-line good/bad split.
2. **New Goods Receipt config** tab on the shared `/configs` page.
3. **Inventory Status / Stock Movements** surface average cost and COGS.

`src/views/purchase-orders/` is the reference implementation throughout: it is the newest full
document module and the only one that already wires number series, approvals, branch resolution and
a tiered-UOM line grid.

---

## F1. Endpoint constants

`src/constants/api.ts` — the Goods Receipt block is at lines 174-175, Purchase Order at 242-249.

```ts
GOODS_RECEIPT_BY_ID: (id: number) => `/v1/goods-receipts/${id}`,
PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT: '/v1/purchase-orders/available-for-receipt',
GOODS_RECEIPT_CONFIGS: '/v1/goods-receipt-configs',
GOODS_RECEIPT_CONFIG_MY_BRANCH: '/v1/goods-receipt-configs/my-branch',
GOODS_RECEIPT_CONFIG_BY_BRANCH: (branchId: number) => `/v1/goods-receipt-configs/${branchId}`,
```

`GEN_PURCHASE_ORDER_DETAILS` (line 246) already exists and is how the receipt form loads PO lines —
the backend adds `receivedQuantity` to that schema, so no new endpoint is needed for the lines
themselves.

## F2. Types

Hand-written, no codegen — cross-check field-by-field against `gudang-be/api/goods_receipt.yaml`,
since a missed field fails silently as `undefined` at runtime.

`src/types/goodsReceipt.type.ts`:

- `GoodsReceiptHeader` += `status: 'draft' | 'need_approval' | 'approved'`, `branchId`,
  `purchaseOrderHeaderId?`, `purchaseOrderNo?`, `supplierId?`, `supplierName?`, `supplierDoNo?`.
- `GoodsReceiptDetail` += `purchaseOrderDetailId?`, `stockType: 'good' | 'bad'`.
- `GoodsReceiptDetailRow` (the local edit-state interface) += `_localId`, `_poQuantity`,
  `_poReceivedQuantity`, `_remainingQuantity` — all `_`-prefixed, so never sent.
- `AvailablePurchaseOrder` for the picker.

`src/types/goodsReceiptConfig.type.ts` — copy `purchaseOrderConfig.type.ts`.

`src/types/inventoryBalance.type.ts` — `lastCost` → `averageCost`.
`src/types/stockMovement.type.ts` — += `costAmount?: string | null`,
`averageCostAfter?: string | null`.

All decimals are `string` on the wire. Export everything through `src/types/index.ts`.

## F3. Services

- `src/services/goodsReceipts.service.ts` — add `update`, `remove`, `getById`, and
  `listAvailablePurchaseOrders(queryString?)`. Static-class style,
  `private static readonly BASE_URL`, JSDoc with `@example`.
- `src/services/goodsReceiptConfig.service.ts` — copy `purchaseOrderConfig.service.ts`.
- Re-export both from `src/services/index.ts`.

## F4. Goods Receipt form

`src/views/goods-receipts/GoodsReceiptForm.vue` (currently ~400 lines) is the main edit. Mirror
`PurchaseOrderForm.vue` section for section.

**Header additions**
- **PO reference** — `InfiniteSelect` over `PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT` with a two-line
  `#option` slot (PO no + supplier on top, date + total below). This is the
  source-document-picker pattern already proven in
  `src/views/goods-issue-notes/GoodsIssueNoteCreateView.vue` — `watch(selectedId)` → fetch the PO's
  details → hydrate the line table. Only rendered in ADD mode; in VIEW/EDIT it is a read-only link.
- **Supplier** and **Surat Jalan no** (`supplierDoNo`) — supplier auto-fills from the chosen PO and
  is read-only when PO-linked.
- **Branch** — `InfiniteSelect` rendered **only when `authStore.branchIds.length > 1`**, exactly as
  `PurchaseOrderForm.vue` does, so single-branch users see the mockup's form unchanged.
- **Status** `Tag` in non-ADD modes, with a `statusSeverity()` mapper copied from
  `PurchaseOrdersView.vue:127-132` (`approved` → success, `need_approval` → warn, else secondary).
- **Approval `Panel`** (collapsible, non-ADD only) holding `ApprovalTimeline` + `ApprovalActionBar`
  with `module-key="goods_receipt"` and `:reference-id`, `@changed` → reload. Copy
  `PurchaseOrderForm.vue:25-44` verbatim; `canAct` is server-provided and must not be re-derived
  client-side.

**Footer** — replace the single submit with **Cancel | Save as Draft | Submit for Approval**,
the last one behind `confirm.require`, matching PO. There is no separate "Post" action: posting
happens server-side on the transition into `approved` (master decision 4).

**Fix the timezone bug at line 397.** `receiptDate` is currently serialised with
`.toISOString().split('T')[0]`, which converts to UTC and lands a day early at UTC+7. Use
`dayjs(...).format('YYYY-MM-DD')`, the corrected pattern already used at
`PurchaseOrderForm.vue:632`. Keep the existing future-date guard (`:max-date` plus the zod
`.refine()` that re-reads the clock at validation time, lines 253-259 and 291-295).

## F5. PO-linked line table

**New `src/views/goods-receipts/PurchaseOrderReceiptLinesTable.vue`**, a sibling of the existing
`GoodsReceiptDetailsTable.vue` rather than a `poMode` flag on it. The two grids differ in most of
their columns, and forking keeps standalone GR untouched — the form picks one or the other on
whether a PO is selected.

Columns, per the mockup: `#` · SKU (code + name, read-only) · UOM · **Qty PO** · **Qty diterima**
(tiered editor) · **Stok** (Good/Bad `Select`) · **Harga (PO)** (read-only) · Subtotal. Plus a
per-row action to **split a line into a second row** against the same `purchaseOrderDetailId`, which
is how the mockup's 18 Good + 2 Bad case is entered.

Two mechanics to copy verbatim from `PurchaseOrderDetailsTable.vue`:

- the `_isPlaceholder` row — auto-seeded, kept in edit mode, and filtered out of `emitRows()` so it
  never reaches the payload;
- the `skipNextWatch` + field-wise merge in the deep `modelValue` watcher. Replacing the array
  remounts the editors and steals focus — see the comment at lines 298-301.

**Tiered quantity** via `src/utils/uomHelper.ts` (`pinnedToLevels` / `computeBaseQty` /
`decomposeBaseQty`), so `50/0` renders as `1.200 PCS` per the mockup. PO qty and received qty are
both base-UOM decimals off the same pinned chain, so they compare directly with no conversion.

**Over-receipt block, client-side** mirroring the server cap: `Σ received across all rows sharing a
purchaseOrderDetailId ≤ poQuantity − poReceivedQuantity`. Reject the row-edit save, reopen the
editor, and `commonWarnToast` — the pattern `GoodsReceiptDetailsTable.vue` already uses via
`rowError(data, row)`. Never offer an override.

Prices are display-only here; the server re-derives them from the PO regardless of what is sent.

## F6. Views and routing

- **New `GoodsReceiptEditView.vue`** — thin wrapper around the form in EDIT mode, matching
  `PurchaseOrderEditView.vue`.
- `GoodsReceiptsView.vue` — add a status column and a Delete row action gated on `canWrite` **and**
  `status === 'draft'`. Note this view currently does *not* gate its Add button; add
  `usePermissions` gating to match `PurchaseOrdersView.vue:8,60`.
- `src/router/index.ts` — add `/goods-receipts/:id/edit` **before** the existing `/goods-receipts/:id`
  route, or the detail route swallows it. Lazy, under `MainLayout`, with
  `meta: { requiredPermission, titleKey, titleAction: 'edit' }`.

## F7. Config tab

- **New `src/views/goods-receipt-configs/`** — `GoodsReceiptConfigsView.vue` +
  `GoodsReceiptConfigDialog.vue`, copied from `src/views/purchase-order-configs/`.
- `src/views/configs/ConfigsView.vue` — add a fourth option, `?tab=gr`, beside Sales Order, Booking
  Order and Purchase Order.
- `src/constants/permissions.ts` — add `GOODS_RECEIPT_CONFIG_READ: 91`,
  `GOODS_RECEIPT_CONFIG_WRITE: 92`, plus the `ROUTE_PERMISSIONS` / `ROUTE_WRITE_PERMISSIONS`
  entries.

## F8. Inventory and ledger cost columns

- `src/views/inventory-status/InventoryStatusView.vue` — `lastCost` → `averageCost` and **render it
  as a column**. It is fetched today but never displayed; with a real average behind it, it is worth
  showing next to the existing Inventory Value.
- `src/views/stock-movements/StockMovementsView.vue` — add **Unit Cost** and **Cost Amount**
  columns. `unitCost` is already in the type and the backend select list but has never been a
  column. Render `costAmount` with its sign intact — negative is COGS.

Both use the shared `formatValue` + `Intl.NumberFormat` guard pattern (duplicated in
`PurchaseOrderDetailsTable.vue:402-410` and `GoodsReceiptDetailsTable.vue:337-345`; extracting it is
optional but welcome).

## F9. i18n

Extend the `goodsReceipts` namespace (`en-US.ts:1604-1680`) with status labels, PO-reference fields,
supplier/Surat Jalan labels, the over-receipt message, the split-line action, and the draft/submit
buttons; add a `goodsReceiptConfigs` namespace; extend `inventoryStatus` and `stockMovements` with
the new column labels; add the `navigation.*` key for the config tab.

**Both locale files must stay structurally parallel.** `en-US.ts` and `id-ID.ts` are identical in
shape today; a key present in one and missing from the other renders as a raw key string. Reactive
strings (column definitions, zod resolvers) must be wrapped in `computed()`.

Indonesian copy for the over-receipt block, from the mockup:

> "Qty diterima tidak boleh melebihi qty PO (80 CTN). Kelebihan barang harus dikembalikan ke driver
> atau dicatat lewat GR terpisah di luar PO."

---

## Build order

1. F1–F3 — constants, types, services.
2. F4 + F6 lifecycle only (status, draft edit, approval panel, branch picker) — **re-verify
   standalone Goods Receipt still works end-to-end before moving on.** This step changes shipped
   behaviour: receipts no longer post on create.
3. F5 — the PO picker and the PO-linked line table.
4. F7 — config tab and permissions.
5. F8 — inventory and ledger cost columns.
6. F9 — i18n sweep across both locales.

## Testing

`npm run test:unit`, `npm run type-check`, `npm run lint`.
`src/components/approval/ApprovalActionBar.spec.ts` is the repo's testing style guide;
`src/views/stock-movements/components/StockMovementFilters.spec.ts` is the closest view-level
precedent. Cover at minimum: the client-side over-receipt cap including the good/bad split case, the
tiered-qty round trip through `computeBaseQty`/`decomposeBaseQty`, and the `_isPlaceholder` row being
excluded from the submit payload.

## Verification

See the master plan's End-to-end verification for the full walkthrough. The frontend-specific checks
are: the branch picker appears only for multi-branch users; the approval panel renders and
`canAct` gates the buttons; `85/0` against 80 ordered is rejected in-grid with the message above and
no override path; a draft reopens with every field intact and moved no stock; and the receipt date
saved from the picker matches the date shown (the UTC+7 off-by-one regression).
