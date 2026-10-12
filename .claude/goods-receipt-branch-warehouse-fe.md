# Purchasing Forms — Dropdowns That Offer Invalid Choices

Two SIT findings in the same family: a purchasing form's dropdown offers a choice that
should not be valid there.

1. **Goods Receipt:** the warehouse dropdown ignores the branch (this section and
   the sections that follow).
2. **Purchase Order:** the supplier dropdown offers inactive suppliers. See
   [Item 2](#item-2--purchase-order-inactive-suppliers-in-the-supplier-dropdown) at the end.

# Item 1 — Goods Receipt: Connect Branch and Warehouse

Status: **planned, not started.** Found during SIT (Produk dan satuan → "Di transaksi, input 2 Karton").

## Problem

Saving a goods receipt fails with:

> receiving warehouse does not belong to the resolved branch

The rule itself is correct. The form just lets the user build a combination the backend
will refuse, and only says so on Save.

| Layer | What it does today |
|---|---|
| Database | `warehouses.branch_id → branches`. `goods_receipt_headers` has its own FKs to `branches` and `warehouses`, but no constraint ties the two together. |
| Backend | `create_goods_receipt.go` / `update_goods_receipt.go`: resolves the branch (picker value, or the user's only branch), then rejects with `ErrWarehouseBranchMismatch` (400) when `warehouses.branch_id` differs. Data in the database stays consistent. |
| Frontend | `GoodsReceiptForm.vue:122`: the Warehouse `InfiniteSelect` lists **every warehouse of every branch**, unfiltered. The Branch picker below it (shown only when the user has more than one branch) is independent of it. |

Reproduced locally: `admin@gudang.com` (branches BT 001, BT 002) can pick *Gudang Jelupang*
(B02) and gets the 400. Three failed `POST /v1/goods-receipts` at 2026-10-10 08:30.

Hit again in SIT-02-B01 (2026-10-10 13:53), in a quieter form: the Branch picker **defaults to
the user's primary branch** (`users.primary_branch_id`, BT 002 for admin), and it sits **below**
the Warehouse select. Picking *Warehouse Branch A 02* (BT 001) without noticing the default
branch gave the same 400, twice, and burned two GR numbers (see `sit-findings-fe.md` F10).
Design steps 1 and 4 below (effective branch drives the warehouse list, Branch above Warehouse)
remove this case.

The rest of SIT-02-B (B02–B08) passed once the branch was set to BT 001 before the warehouse,
which confirms that order is all the form needs. Three more creates failed during that run
(14:21, 14:25 ×2), cause not captured. If they were the same default-branch slip, P1 removes them
too (F10 lists them).

## Goal

The Warehouse dropdown offers only warehouses of the receipt's branch, so the mismatch
cannot be built in the UI. **FE only:** the backend check stays as the safety net, and no
API or schema change is needed.

## Design

Follow the existing pattern in `src/views/booking-order-configs/BookingOrderConfigDialog.vue`
(lines 67–79, 148–182): a computed `customFilters` on `branch_id`, `:key` on the select to
reset it, and the select disabled until a branch is known.

### 1. Effective branch

One computed, `effectiveBranchId`, that the warehouse filter reads:

| Case | Source |
|---|---|
| ADD, user has 1 branch (picker hidden) | `authStore.branchIds[0]` (the backend resolves the same one) |
| ADD, user has >1 branch | the Branch picker's current value. It is already defaulted to `authStore.primaryBranchId` (`GoodsReceiptForm.vue:~905`) |
| EDIT / VIEW | `receipt.branchId` (the picker is disabled outside ADD, line ~154) |
| User has 0 branches | `undefined`: keep the warehouse select disabled. The backend would answer `ErrBranchRequired` anyway. |

### 2. Filter the Warehouse select

- `:custom-filters="warehouseFilters"` with `{ filterBy: 'branch_id', filterOperator: EQUAL, filterValue: effectiveBranchId }`.
  `branch_id` is a real column on `schema.Warehouse`, so generic CRUD accepts it with no backend change.
  `InfiniteSelect` already refetches when `customFilters` changes (`InfiniteSelect.vue:242`).
- `:disabled` also when `effectiveBranchId` is `undefined`, with a hint such as "Pilih cabang dulu" (new i18n key in `en-US.ts` and `id-ID.ts`).

### 3. Branch changes → clear the warehouse

- On Branch `@select-option`: if the chosen warehouse belongs to another branch, clear the
  `warehouseId` form value and `initialWarehouse`, and remount the select (`:key="effectiveBranchId"`).
- Simplest rule: always clear on a real branch change. A warehouse belongs to exactly one
  branch, so it can never still be valid after the change.

### 4. Field order

Move the Branch block **above** Warehouse in the template, so the user picks in dependency
order. Today Warehouse (line 117) comes before Branch (line 143).

### 5. EDIT mode

Warehouse stays editable in EDIT, but is now filtered to `receipt.branchId`. The initial
option (`initialWarehouse`, line ~834) still displays because it belongs to that branch.

## Out of scope: related findings to raise separately

- **PO branch is not checked against the receipt branch.** `listReceivablePurchaseOrders`
  (`gudang-be/internal/goods_receipt/adapter/repository/goods_receipt.go:460`) does not filter by
  branch, and `AvailablePurchaseOrder.branchId` is returned but unused by the form. A receipt
  can therefore be posted on branch A against a PO of branch B. This needs a product decision
  (filter POs to the receipt branch? set the branch from the PO?) and probably a backend
  check, so it should be its own change.
- No database constraint ties `goods_receipt_headers.branch_id` to its warehouse's branch.
  The backend use case check covers both write paths today. A constraint would need a
  composite FK or a trigger, which is not worth it unless another write path appears.

## Tests

- `GoodsReceiptForm` spec (new or extended):
  - the warehouse fetch is called with the `branch_id` filter of the effective branch, for each case in the table above;
  - changing the branch clears `warehouseId`;
  - the warehouse select is disabled when there is no effective branch;
  - EDIT filters by `receipt.branchId`.
- `npm run type-check`, `eslint`, `vitest run`.

## Manual verification (SIT data)

| User | Branches | Expected warehouse options |
|---|---|---|
| `admin@gudang.com` | BT 001, BT 002 | BT 001 → WT 001, WT 002. BT 002 → WT 003. Never Gudang Jelupang / Pondok Jagung. |
| `sales1@yahoo.com` | B02 (picker hidden) | Gudang Jelupang, Gudang Pondok Jagung |
| `admin1@gudang.com` | none | warehouse select disabled |

Then save a receipt for each valid pair: no `ErrWarehouseBranchMismatch`.

## Delivery

Per the scope rule, this goes in its own branch and PR (FE only), not inside the open
`dev-rian → main` PR (gudang-fe#13).

---

# Item 2 — Purchase Order: Inactive Suppliers in the Supplier Dropdown

Status: **planned, not started.** Found during SIT (SIT-02-A01): supplier **Gangnam
(SUP-0003, `is_active = false`)** could be picked for a new PO.

It goes further than picking: **PO-202610-00003** (supplier Gangnam, inactive) was created,
approved through both tiers (request #15) and fully received in SIT-02-B (GR-202610-00025,
-00027), with nothing stopping it at any step. The backend check proposed below (reject an
inactive supplier on PO create) is what would have stopped it, since the FE filter alone does not
cover a PO created another way.

## Problem

| Layer | Today |
|---|---|
| Frontend | `PurchaseOrderForm.vue:112`: the supplier `InfiniteSelect` calls `SuppliersService.listForSelect(query)` with no active filter, so inactive suppliers are listed. |
| Backend | `GET /v1/suppliers` already accepts `isActive` (`gudang-be/api/suppliers.yaml`). `create_purchase_order.go` only checks `SupplierID > 0`, so a PO is accepted for an inactive supplier. |

## Goal

A **new** PO can only be raised for an active supplier. Existing documents for a supplier
that was deactivated later still open and display normally.

## Design

### Frontend (this plan)

1. **ADD mode:** pass `isActive=true` to the supplier list in `PurchaseOrderForm.vue`.
   Either add an optional `{ isActive }` argument to `SuppliersService.listForSelect`, or
   append it to the query before `toListQuery`. The endpoint already supports it, so no
   backend change is needed for the filter.
2. **EDIT / VIEW mode:** keep showing the PO's current supplier even if it is inactive now.
   It arrives through `initialSupplier` (the select's initial option), which does not depend on
   the list query. Filtering the options list only stops picking a *different* inactive
   supplier.
3. Optional: mark the current supplier as "(nonaktif)" in EDIT/VIEW when `isActive` is false,
   so the user understands why it is missing from the options.

### Which other supplier pickers to change

The same unfiltered `listForSelect` is used in five forms. Only the ones that **start a new
relationship with the supplier** should filter:

| Form | Filter to active? | Why |
|---|---|---|
| Purchase Order | **Yes** | raises a new purchase |
| Goods Receipt (manual, without PO) | Yes, proposed | new receipt from the supplier. A GR from a PO takes the PO's supplier, so it is unaffected. |
| AP Invoice | **No** | must still record invoices for goods already received |
| AP Payment | **No** | must still pay outstanding debt to a supplier that was deactivated |
| Credit/Debit Note | **No** | corrections on past transactions |

Confirm the GR row with the business before implementing it.

### Backend (separate PR, `gudang-be`)

The FE filter alone does not stop an API client. Proposed: `create_purchase_order.go` rejects
an inactive supplier with a new `ErrSupplierInactive` (400), and `update_purchase_order.go`
only rejects it when the supplier is **changed** to an inactive one. The supplier repository
already exposes an active-status lookup (`internal/supplier/adapter/repository/supplier.go:121-134`)
that the PO module can mirror.

## Tests

- FE: in ADD mode, the supplier fetch carries `isActive=true`. In EDIT mode, an inactive current
  supplier still renders as the selected value.
- BE (if done): create with an inactive supplier returns 400. Update that keeps the same
  inactive supplier is still allowed.

## Manual verification (SIT data)

- New PO: the supplier dropdown lists **Supplier 1** and **Zurich**, but not **Gangnam**.
- Open an existing PO whose supplier was deactivated afterwards: it still shows the supplier.

## Delivery

FE change in its own branch/PR. The backend check, if accepted, goes in a separate `gudang-be` PR.
Neither goes inside the open `dev-rian → main` PRs.
