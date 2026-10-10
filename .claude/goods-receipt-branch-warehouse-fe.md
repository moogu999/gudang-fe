# Goods Receipt — Connect Branch and Warehouse in the Form

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
