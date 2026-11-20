# Canvass Loading & Unloading: frontend

> Status: IMPLEMENTED 2026-11-20 (unit/type/lint/build green; E2E not run). Web + BE only; mobile (salesman screens) gets its own plan later. Mockup: N-Force visit flow v1.3, section B2 (screens 11–13).

Full cross-project plan: `/.claude/canvass-loading-master-plan.md`. The FE depends on the BE endpoints listed there (B4/B5).

## Context

The N-Force visit flow v1.3 (section B2, screens 11–13) says that after depot attendance, a **Canvass** salesman checks the van load per SKU ("Konfirmasi Muatan"):
- The warehouse prepares a **Loading Kanvas** document in N-Command (the web app): a transfer from the main warehouse to the salesman's **Gudang Mobil**.
- The salesman confirms it (stock moves from *dalam perjalanan* into the van warehouse) or rejects the whole document with a physical qty per SKU and a note.
- The warehouse revises (Rev 2, Rev 3, …) and resends. Canvass selling stays locked until the load is confirmed.

Today nothing exists:
- Warehouses are code + name + branch only, with no link to a salesman.
- There is no warehouse-to-warehouse transfer.
- Visit Rules already lists `load_confirmation` ("Dokumen muat Canvass (segera)") as a placeholder.

**Decisions taken with the user (2026-11-20):**
- The van warehouse is linked to the **salesman** (one per Canvass employee), not to the vehicle.
- **Costing:** a confirmed Loading **recomputes the van warehouse's average cost**, using the cost the stock left the main warehouse with. This is a third cost-writing path, scoped to the van side. Main-warehouse average cost is never recomputed by this feature.
- **Unloading (van → main) is in scope.**
- Canvass sales drawing from van stock (Penjualan Kanvas) is **out of scope**. It gets a separate plan together with mobile.
- The BE builds the **salesman-side endpoints now** (today's loading, confirm, reject). They are curl-tested. Mobile only adds screens later.

## Behaviour rules (shared)

**Van warehouse.**
- A regular `warehouses` row with `kind = 'canvass'` and `salesman_employee_id`.
- One per salesman. The salesman must be employee type `Canvass`.
- The warehouse's branch must equal the salesman's effective branch (open team's branch, else employee branch; the same resolver as attendance and visit rules).
- Regular-only flows reject van warehouses as their warehouse, both in pickers and on the BE: Goods Receipt / PO Receipt, Booking Order config, Delivery Note / Picking, Goods Return Note.
- Inventory Status and Stock Movements show van warehouses, with a filter.

**Loading document** (`canvass_loadings`, number series `LD`, auto/manual number toggle).
- Header: source warehouse (regular, same branch as the van), salesman → van warehouse (derived), loading date (business TZ), notes, `revision` (starts 1), status.
- Lines: product, qty in base UOM (PCS, entered as CTN+PCS via the tiered input), good stock only.
- At most one non-cancelled loading per salesman per loading date.

| Status | Meaning | Who moves it |
|---|---|---|
| `draft` | being prepared, editable, no stock effect | warehouse |
| `sent` | waiting for the salesman; stock is in transit | warehouse (send / resend) |
| `rejected` | salesman reported a mismatch; still in transit; editable | salesman (reject) |
| `confirmed` | terminal; stock is in the van | salesman (confirm) |
| `cancelled` | terminal; transit stock returned to source | warehouse (from draft / sent / rejected) |

**Stock effects** (source = main warehouse, dest = van). The delta logic lives in a shared transfer helper:
- **Send (draft → sent, Rev 1):** per line, source `on_hand −q, in_transit +q` (movement `transfer_out`). Requires `on_hand − reserved ≥ q`, so stock reserved for booking orders is never taken. Snapshot the source `average_cost` onto the line (`unit_cost`).
- **Resend after reject (rejected → sent, Rev n+1):** per product, apply the delta from the previous revision.
  - Increase → `transfer_out` for the extra qty. The line's `unit_cost` becomes the weighted average of the tranches.
  - Decrease or removed line → `transfer_revert` (`in_transit −q, on_hand +q`) at the source's current average, with no recompute. This is the same rule returns already follow.
  - Lines are stored per revision, so "Diubah" (changed) markers can be computed.
- **Confirm:**
  - The body carries `revision`, which must equal the current revision (409 `stale_revision` otherwise).
  - Per line, at the source: `transfer_complete` (`in_transit −q`).
  - Per line, at the van: `transfer_in` (`on_hand +q`), which **recomputes the van `average_cost`** with the line's `unit_cost`.
- **Reject:** no stock effect. The body carries `revision`, a note, and at least one line. Each line is either a document product with `physicalQty`, or an extra product not on the document with `physicalQty`. It is stored as a rejection record for that revision.
- **Cancel:** `transfer_revert` of everything currently in transit.
- **No GL journal:** source and van share a branch, and the inventory account is per branch.

**Unloading document** (`canvass_unloadings`, number series `UL`, auto/manual toggle). Recorded by the warehouse when the van returns.
- Header: van warehouse (→ salesman), destination warehouse (regular, same branch), unload date, notes, status `draft` → `posted` (terminal), or `cancelled` from draft.
- Lines are prefilled from the van's current `on_hand` per (product, stock_type), good **and** bad. They show `expectedQty` (the van balance when posted) and an editable `returnedQty`. The "Selisih" (difference) column is `expected − returned`.
- **Post:** per line, van `on_hand −q` (`transfer_out_direct`, at the van's average) and destination `on_hand +q` (`transfer_in_direct` at the destination's **current** average, with no recompute). The main warehouse is never re-averaged, per the user's costing decision.
  - `returnedQty` may not exceed the van's live `on_hand` (re-checked under row lock).
  - Any shortage stays in the van balance and is shown on the document. Settling it with the salesman is out of scope.
- A posted unloading doesn't block the next day's loading. The van can carry leftover stock over.

## Frontend (`gudang-fe`): phases F1–F6

### F1. Types, services, constants
- Add `types/canvassLoading.type.ts` and `types/canvassUnloading.type.ts`, with services and `API_ENDPOINTS`.
- Add the permission constants 180–184 to `constants/permissions.ts`.
- Add the new movement and reference types to `types/stockMovement.type.ts`, `constants/auditReferenceTypes.ts` if applicable, and both locales (memory: a new enum value has 4+ touchpoints).

### F2. Warehouse master (`views/warehouses/WarehouseDialog.vue`, `WarehousesView.vue`)
- A Kind selector (Regular / Canvass).
- When the kind is Canvass: a salesman `InfiniteSelect` (employees filtered to type Canvass), with the branch auto-set from the salesman and locked.
- A Kind column with a tag, and a salesman column.
- Regular-only pickers add `filterBy=kind&filterValue=regular`: `GoodsReceiptForm.vue`, `BookingOrderConfigDialog.vue`, `DeliveryNoteCreateView.vue`.
- `InventoryStatusView.vue` and `StockMovementFilters.vue` get a kind filter.

### F3. Canvass Loading (`views/canvass-loadings/`)
Page-based, following `views/cash-deposits/`: list, create, edit and detail views plus a shared form.
- **List:** a status tag, the revision, the salesman and the van, with filters.
- **Form:**
  - Header: number with the Auto/Manual toggle, branch, source warehouse (regular only), salesman (→ van warehouse shown read-only, with a "set up van warehouse" hint when it's missing), loading date, notes.
  - Lines: an `InlineEditableTable` using the `uom-quantity` column (CTN+PCS, stored as PCS), with an available-stock column from `available-stock`.
  - Footer actions by status: Save draft, Send to salesman, Revise & resend (when rejected), Cancel.
  - Stay on `/:id/edit` after save while the loading is draft or rejected (memory: stay on edit after save).
- **Detail:**
  - Lines show a "Changed" tag against the previous revision.
  - A rejection panel per revision lists the SKU, the document qty → the physical qty, extra SKUs, the note and who/when.
  - A revision timeline.
  - "Rejected by salesman" is the prominent state the warehouse acts on.

### F4. Canvass Unloading (`views/canvass-unloadings/`)
List, create and detail views.
- **Create:** pick the van warehouse; lines prefill from `van-stock` (good and bad, with a stock-type tag). The `returnedQty` input uses the uom-quantity column. Pick the destination warehouse (regular, same branch).
- A live "Selisih" column. Post asks for confirmation if any line has a shortage.
- Detail is read-only once posted.

### F5. Navigation, routes, i18n
- Routes in `router/index.ts`, with permission meta.
- Menu entries under the inventory/warehouse group in `components/menu/menu.ts`: "Canvass Loading" / "Muat Kanvas" and "Canvass Unloading" / "Bongkar Kanvas".
- Every string goes in both `en-US.ts` and `id-ID.ts`.
- Update `visitRules.rules.load_confirmation.setIn` in both locales so it points to the Canvass Loading module, dropping "(segera)".
- No Tailwind `dark:` (memory).

### F6. Tests
- Unit specs for the revision-diff "changed" helper and the unloading selisih helper.
- A warehouse dialog spec for the Canvass kind (salesman required, branch locked).
- Run `npm run test:unit`, `type-check`, `lint` and `build`.

## Verification (end-to-end, after implementation)
1. **BE:** `go test ./...` passes, including the integration test, and `go build ./...` is green.
2. **Live flow.** Run BE + FE locally, signed in as super admin plus a Canvass salesman account.
   1. Create the van warehouse for the salesman. A non-Canvass employee or a wrong branch gives 409.
   2. Receive stock into the main warehouse (Goods Receipt). Check that the van warehouse is absent from the GR picker.
   3. Create a Loading and send it. Main warehouse: on_hand ↓ and in_transit ↑ (Inventory Status); Stock Movements shows `transfer_out`.
   4. Over-send against reserved stock → 422.
   5. Salesman `GET /me/today` (curl with the salesman token) → reject with physical qty plus one extra SKU. The web detail shows the rejection.
   6. Revise (decrease one line, increase another) and resend as Rev 2. Check the delta movements and the "Changed" tags. Confirming Rev 1 → 409 `stale_revision`. Confirm Rev 2. The van on_hand matches, main in_transit returns to its pre-load level, and the van `average_cost` equals the snapshot cost.
   7. Parallel curl confirm vs cancel: exactly one wins and the balances stay consistent.
   8. Unload part of the stock and post. Van ↓, main ↑ at main's unchanged average, and the selisih shows. Posting more than the van holds → 422.
3. **FE:** unit/type/lint/build green; both locales are checked visually.
4. Drop fixtures and stop the dev servers by PID (memory). Run `graphify update .` from the repo root.

## Open points (confirm during implementation)
- Whether a second loading on the same day (a top-up after confirm) is needed. Currently one non-cancelled loading per day.
- Bad stock is never loaded. Unloading handles bad stock only if a later canvass-return flow puts it in the van.
- The "Centang semua" (check all) config toggle and attendance gating belong to the mobile plan.
