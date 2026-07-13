# Frontend Plan — Goods Return Note (BTB)

> Part of the [master plan](../../.claude/goods-return-note-master-plan.md). Backend counterpart:
> [`gudang-be/.claude/goods-return-note-plan.md`](../../gudang-be/.claude/goods-return-note-plan.md).

## Context

Undelivered stock from partial/failed delivery confirmations now stays with the **driver**
(a driver stock pool held in `in_transit`) instead of returning to warehouse `on_hand`. This
adds a new **Goods Return Note (BTB — Bukti Terima Barang)** module so an operator can receive
that pooled stock back into the warehouse. Reference UI: `n_command_btb_v1.html`.

**Locked decisions:** good stock only (no good/bad selector), origin warehouse only (no
"Gudang Tujuan" dropdown), partial+failed sources only. Module mirrors existing document
modules — closest models: `views/delivery-confirmations/` and `views/goods-issue-notes/`.

Quantities cross the API as **decimal strings** (project convention: `parseFloat` in /
`.toString()` out).

---

## B1. API constants, types, service

**`src/constants/api.ts`** (near the delivery-confirmation block, `:190-222`):
```ts
GOODS_RETURN_NOTES: '/v1/goods-return-notes',
GOODS_RETURN_NOTE_BY_ID: (id) => `/v1/goods-return-notes/${id}`,
GOODS_RETURN_NOTE_DRIVER_STOCK: '/v1/goods-return-notes/driver-stock',
GOODS_RETURN_NOTE_AVAILABLE_DRIVERS: '/v1/goods-return-notes/available-drivers',
```

**`src/types/goodsReturnNote.type.ts`** (mirror `deliveryConfirmation.type.ts`):
- `GoodsReturnNoteStatus = 'applied'`
- `DriverStockSourceType = 'partial_delivery' | 'failed_delivery'`
- `AvailableDriver { driverEmployeeId; driverName; vehiclePlate: string | null; openItemCount: number }`
- `DriverStockItem { driverStockItemId; deliveryOrderId; deliveryOrderNo; sourceType; productId; productCode; productName; warehouseId; outstandingQty: string; pinnedUom: string | null }`
- `DriverStockGroup { deliveryOrderId; deliveryOrderNo; sourceType; items: DriverStockItem[] }` (client-side grouping of the flat list by DO)
- `GoodsReturnNoteListItem`, `GoodsReturnNoteItemLine`, `GoodsReturnNoteDetail`
- `CreateGoodsReturnNoteRequest { driverEmployeeId: number; returnDate: string; notes?: string | null; items: { driverStockItemId: number; receivedQty: string }[] }`

**`src/services/goodsReturnNotes.service.ts`** (static-class over singleton `ApiService`,
like `deliveryConfirmations.service.ts`):
`list(queryString?)`, `get(id)`, `create(payload)`, `listDriverStock(driverEmployeeId)`,
`listAvailableDrivers()`.

## B2. Views (`src/views/goods-return-notes/`)

**`GoodsReturnNotesView.vue`** (list) — mirror `DeliveryConfirmationsView.vue`: lazy PrimeVue
`DataTable`, `fetchData(page)` building `URLSearchParams`, `@page="onPage"`, row action →
detail route. Columns: no, return date, driver, item count, status.

**`GoodsReturnNoteCreateView.vue`** — the BTB form, adapting the reference HTML. Full-page
form like `DeliveryConfirmationCreateView.vue`:
- **Header**: auto/manual number-series toggle (`NumberSeriesService.preview('goods_return_notes')`),
  return date, notes.
- **Driver picker**: `InfiniteSelect` fed by `GoodsReturnNotesService.listAvailableDrivers`;
  on select, load the pool via `listDriverStock(driverId)` and show a **driver info card**
  (name, vehicle plate, pending item count) — the reference's `.driver-card`.
- **Driver stock pool**: group the flat pool list by `deliveryOrderId` into
  `DriverStockGroup[]`; render one source-group card per DO (ref `.source-group`) with a
  source-type badge (`partial_delivery`/`failed_delivery`). Each line row: product, "Qty di
  Driver" (`outstandingQty`), a row checkbox, and an editable **"Qty Diterima"** `InputNumber`
  (`:min="0"`, `:max="parseFloat(outstandingQty)"`). **Omit** the reference's "Tipe Stok"
  (good/bad) select and the "Gudang Tujuan" dropdown per the locked decisions.
- **Summary** table of selected lines, then submit → `create` with
  `items: [{ driverStockItemId, receivedQty: qty.toString() }]` for checked rows with qty > 0;
  `router.push` to the new detail on success.
- Reuse `usePermissions()` + `PERMISSIONS.GOODS_RETURN_NOTE_WRITE`, `commonSuccessToast` /
  `commonErrorToast`, `ResponsiveCard`, per-view `toastGroup`, i18n `t()`.

**`GoodsReturnNoteDetailView.vue`** — read-only detail (header info + received-lines table),
mirroring `GoodsIssueNoteDetailView.vue`.

## B3. Router, permissions, i18n, nav

- **Router** (`src/router/index.ts`, near the delivery-confirmation routes `:432-449`): routes
  `GoodsReturnNotes` `/goods-return-notes`, `GoodsReturnNoteCreate` `/goods-return-notes/create`,
  `GoodsReturnNoteDetail` `/goods-return-notes/:id`; gate with meta permission
  `GOODS_RETURN_NOTE_READ`.
- **Permissions constant**: add `GOODS_RETURN_NOTE_READ` / `GOODS_RETURN_NOTE_WRITE` to the
  `PERMISSIONS` map (matching backend `goods_return_note.read`/`.write`).
- **Nav**: add a menu entry near Delivery Confirmations / Goods Issue Notes, gated by
  `GOODS_RETURN_NOTE_READ`.
- **i18n**: `goodsReturnNotes.*` keys in `src/i18n/locales/en-US.ts` and `id-ID.ts` (id-ID
  title "Bukti Terima Barang").

## B4. Copy tweak (optional, low priority)

In `DeliveryConfirmationDetailView.vue`, adjust partial/failed helper text to say undelivered
qty is **held by the driver pending a Goods Return Note** (no longer "returned to warehouse").
The confirm API call is unchanged — backend behaviour changes transparently.

---

## Verification

- `npm run type-check`, `npm run lint`, `npm run test:unit`, `npm run build` all pass.
- Manual (dev server / Playwright MCP): partially confirm a DO → open Goods Return Note create
  → pick the driver → pooled item appears grouped by source DO with max = outstanding qty →
  submit → BTB shows in list/detail and the item disappears from the driver pool (or its
  outstanding qty drops on partial receive).
