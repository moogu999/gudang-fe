# Goods Receipt & Inventory Status — Frontend Plan (`gudang-fe`)

> Part of the [master plan](../../.claude/GOODS_RECEIPT_INVENTORY_PLAN.md). Backend counterpart:
> [`gudang-be/.claude/GOODS_RECEIPT_INVENTORY_PLAN.md`](../../gudang-be/.claude/GOODS_RECEIPT_INVENTORY_PLAN.md).

## Context

Two new pages modeled on the mockup `n_command_goods_receipt_v1_1.html`:

1. **Goods Receipt** — full-page create form that posts stock on submit.
2. **Inventory Status** — read-only balance table with KPI cards.

Mirrors `src/views/sales-orders/` (full-page views, not dialogs). The GR line-item editor is a
**simplified fork** of `SalesOrderDetailsTable.vue`. Decimals are sent/received as **strings**.
Integrate dropdowns with PrimeVue Forms via `name`/`option-value` (see project CLAUDE.md).

## Step F1 — Constants, types, services

- `src/constants/api.ts` — add:
  ```ts
  GOODS_RECEIPTS: '/v1/goods-receipts',
  GEN_GOODS_RECEIPT_HEADERS: '/gen/v1/goods-receipt-headers',
  GEN_INVENTORY_BALANCES: '/gen/v1/inventory-balances',
  INVENTORY_SUMMARY: '/v1/inventory/summary',
  ```
- `src/types/goodsReceipt.type.ts` — `GoodsReceiptHeader`, `GoodsReceiptDetail`,
  `GoodsReceiptDetailRow` (local-edit row with `_localId`, `_isPlaceholder`),
  `CreateGoodsReceiptRequest`, and `ArrivalType` / `StockType` enums. Model on `salesOrder.type.ts`.
- `src/types/inventoryBalance.type.ts` — `InventoryBalance`, `InventorySummary`.
- `src/services/goodsReceipts.service.ts` — static class (like `salesOrders.service.ts`):
  `create(data: CreateGoodsReceiptRequest)` → POST `GOODS_RECEIPTS`; `list(query?)` →
  `GEN_GOODS_RECEIPT_HEADERS` for the list page.
- `src/services/inventory.service.ts` — `summary(warehouseId?)` → GET `INVENTORY_SUMMARY`
  (list goes through `TableComponent` `:url`).
- Export services from `src/services/index.ts`, types from `src/types/index.ts`.

## Step F2 — Goods Receipt pages (`src/views/goods-receipts/`)

- `GoodsReceiptsView.vue` — list via `TableComponent` (`:url=GEN_GOODS_RECEIPT_HEADERS`); columns
  No / Date / Warehouse / Arrival Type / Stock Type / Total. “Add” button → `/goods-receipts/create`.
  Mirror `SalesOrdersView.vue`.
- `GoodsReceiptCreateView.vue` — thin wrapper around `GoodsReceiptForm` (mirror
  `SalesOrderCreateView.vue`); on submit → success toast → `router.push('/goods-receipts')`.
- `GoodsReceiptForm.vue` — header section (PrimeVue `Form` + Zod resolver):
  - Receive date (`DatePicker`), Warehouse (`InfiniteSelect` → `WarehousesService.list`,
    `option-label="name"`, `option-value="id"`), Arrival Type (`Select`), Stock Type (`Select`,
    Good/Bad), Notes (`Textarea`), optional received-by.
  - Embeds `GoodsReceiptDetailsTable`.
  - Totals panel (computed client-side): Total Qty, Total Nilai, PPN (11%), Total incl. PPN.
  - `ConfirmationDialog` (“Konfirmasi Terima”) before POST; submit builds `CreateGoodsReceiptRequest`
    (quantities/prices as strings).
- `GoodsReceiptDetailsTable.vue` — **fork of `SalesOrderDetailsTable.vue`**:
  - **Keep**: placeholder-row pattern (`createPlaceholderRow`/`ensurePlaceholder`/`addRow`/
    `removeRow`/`onRowEditSave`), product `InfiniteSelect` (`ProductsService.list`), quantity
    `InputNumber`, computed subtotal, `emitRows` to parent.
  - **Remove**: `SalesOrdersService.resolve` call and all resolved/read-only pricing, discounts,
    bonuses, choice offers, `ManualDiscountEditor`, row-expansion, multi-level UOM tier inputs.
  - **Change**: Price becomes an **editable free-input** `InputNumber`; `subAmount = quantity × price`.
    UOM shown read-only from the selected product.
- *(Optional)* `GoodsReceiptDetailView.vue` — read-only view of a posted GR at `/goods-receipts/:id`.

## Step F3 — Inventory Status page (`src/views/inventory-status/`)

- `InventoryStatusView.vue`:
  - **KPI cards** (4): On Hand / In Transit / Reserved / Available from `InventoryService.summary()`.
  - **Warehouse filter** `Select` (drives both summary refetch and table filter), **filter chips**
    (Semua / Stockout / Ada In Transit / Ada Reserved — **Low/Excess deferred**), **search** box.
  - **`TableComponent`** (`:url=GEN_INVENTORY_BALANCES`) columns: SKU code, Name, UOM, On Hand,
    In Transit, Reserved, Available, Komposisi (stacked bars from on_hand/in_transit/reserved,
    rendered client-side), Status pill, Nilai HPP (`value`).
  - **Skip**: principal column, movement log / historical table, export.
  - Chips / search / warehouse map to server-side query params via `GenericQueryBuilder`
    (`status`, `warehouse_id`; transit/reserved>0 handled as client filters).

## Step F4 — Routing, menu, i18n

- `src/router/index.ts` — lazy routes: `/goods-receipts`, `/goods-receipts/create`,
  `/goods-receipts/:id` (optional detail), `/inventory-status`.
- `src/components/menu/menu.ts` — under the existing **Inventory** group add **Goods Receipts** and
  **Inventory Status** entries (with `labelKey`).
- `src/i18n/locales/en-US.ts` and `id-ID.ts` — add navigation + page string keys.

## Verification

1. `npm run type-check` and `npm run lint` clean.
2. `npm run dev`: create a GR end-to-end (pick warehouse, add products, free-input price, confirm) →
   success toast → row appears in the GR list.
3. Inventory Status reflects the new On Hand; KPI cards, filter chips, search, and warehouse filter
   all work; composition bars and status pill render correctly.

## Out of scope / deferred

- Movement-log UI; Inventory export; principal column.
- Arrival-type sub-blocks (transfer/retur/lainnya); supplier fields.
- Low/Excess status (needs backend reorder thresholds).
- GR edit/delete from the UI.
