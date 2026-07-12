# Discount Tax Breakdown — Frontend Plan

See master plan at `../.claude/DISCOUNT_TAX_BREAKDOWN_PLAN.md` (relative to repo root: `gudang/.claude/DISCOUNT_TAX_BREAKDOWN_PLAN.md`) for context, business rationale, and locked-in decisions, and `gudang-be/.claude/DISCOUNT_TAX_BREAKDOWN_BE_PLAN.md` for the backend contract this depends on. This document is the frontend-specific implementation plan.

## 1. Types

- `src/types/salesOrder.type.ts`: add `taxBaseAmount: string; taxAmount: string` to `LineDiscount` (26-33), `ManualDiscount` (6-12), `SalesOrderDetail` (129-146), and to the resolve-preview types `ResolvedLine`/`ResolveSalesOrderResponse` (66-92) so live previews carry real numbers. Add `_taxBaseAmount?`/`_taxAmount?` to `SalesOrderDetailRow` (183-204, the frontend-only edit row).
- `src/types/deliveryOrder.type.ts`: same two fields on `DeliveryOrderViewLine` (42-57) and its discount/manual-discount sub-types.
- `src/types/invoice.type.ts`: same two fields on `InvoiceDiscountItem` (5-13) and `InvoiceDetailLine` (28-39).

No codegen safety net exists here — these are hand-authored and must be kept in lockstep with the backend OpenAPI changes, or missing fields fail silently as `undefined`.

## 2. `SalesOrderForm.vue` — replace the JS approximation

Today's `calculatedTotals` (525-611) re-derives an *approximate* proportional tax split in JS (`inclusiveFraction` applied uniformly across all lines, 578-586) purely because the backend never returned real per-row numbers. Since ADD/EDIT mode already calls a backend resolve/preview endpoint on every line/quantity/customer change, **extend that endpoint's response** (per backend plan §6) to return real per-line/per-discount `taxBaseAmount`/`taxAmount`. Then rewrite `calculatedTotals` to simply sum the real values returned from resolve instead of approximating — delete the `inclusiveFraction` proportional-split logic entirely. This closes an existing correctness gap (today's client approximation can already silently diverge from what the backend actually persists).

In VIEW mode, continue reading header-persisted totals directly (they are now literally a sum of the same numbers, so no behavior change needed there).

## 3. `SalesOrderDetailsTable.vue` — surface the breakdown

Reuse the existing expandable-row + mini-table convention already used for promotion discounts (`#expansion` slot, 205-395, `<table><colgroup>` pattern at 212-250) rather than inventing new UI (no popover/overlay pattern exists in this codebase today). Add two right-aligned columns ("DPP" / "PPN") to the existing discount table, and a summary line showing the product line's own DPP/PPN. Apply the identical treatment to the header-level footer slot (400-544) for `HeaderDiscounts`/`HeaderManualDiscounts`.

## 4. `ManualDiscountEditor.vue`

Add "DPP" / "PPN" columns to the applied-discounts table (8-50, currently reason/type/value/amount), sourced from the discount item's new fields once the resolve round-trip returns them.

## 5. `DeliveryOrderDetailView.vue` / `InvoiceDetailView.vue`

Both are read-only — simpler. Extend their line tables / expansion rows with the same DPP/PPN columns using the identical convention, sourced directly from the persisted per-row values (no client-side calc needed since these are read-only views).

## Critical files

- `gudang-fe/src/types/salesOrder.type.ts` (type source of truth, must track backend exactly)
- `gudang-fe/src/views/sales-orders/SalesOrderForm.vue` (`calculatedTotals` — replaces approximation with real numbers)
- `gudang-fe/src/views/sales-orders/SalesOrderDetailsTable.vue` (expansion panel — where breakdown UI lives)
- `gudang-fe/src/views/sales-orders/ManualDiscountEditor.vue`
- `gudang-fe/src/views/delivery-orders/DeliveryOrderDetailView.vue`, `gudang-fe/src/views/invoices/InvoiceDetailView.vue`

## Verification (once implementation begins)

1. Backend: `make test` after each rollout stage; new `sales_order_header_test.go` must pass with both the tolerance-equivalence check and the bottom-up-sum invariant check.
2. Manual E2E via `make run`: create SO with tax-inclusive line + promo discount + header manual discount → verify via `GET` that every row's DPP+tax is internally consistent and the header equals the sum of all rows → book to DO → fetch DO detail, confirm identical per-row values → confirm auto-created Invoice matches.
3. Frontend: `npm run type-check` after type updates (will catch any missed `.type.ts` field), `npm run dev` and manually create/view a Sales Order with a discount to confirm the new DPP/PPN columns render correctly in the expansion panel, matching what the backend persisted.
