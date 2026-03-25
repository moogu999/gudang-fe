# Tiered Quantity Input — Frontend Changes

## Overview
The sales order dialog quantity field now supports tiered input for products with a UOM group hierarchy (e.g., Box → Pack → Piece). Users enter separate values per tier; the total is stored as the base unit (smallest unit) quantity.

Example: 1 box = 10 packs, 1 pack = 12 pcs → input `1 / 0 / 1` → stored as `121`

## Shared Utility (`src/utils/uomHelper.ts`)

Two exported functions used by both `InlineEditableTable` and `SalesOrderDialog`:

- **`computeBaseQty(tiers, levels)`** — converts tier values (e.g. `[1, 0, 1]`) to a base unit total (e.g. `121`)
- **`decomposeBaseQty(baseQty, levels)`** — reverses the above: `121` → `[1, 0, 1]`

## New Column Type: `uom-quantity` (`InlineEditableTable.vue`)

Added to the `EditableColumn` union type. Requires a `getUomLevels` function:

```typescript
{
  field: 'quantity',
  type: 'uom-quantity',
  getUomLevels: (row) => row.product?.uomGroup?.levels,
}
```

**Editor behavior:**
- If `getUomLevels(row)` returns >1 levels: renders N side-by-side `InputNumber` fields (one per level) with UOM symbol labels, separated by `/`
- Updates `data['_quantityTiers']` (a `number[]`) on each input change and recomputes `data[field]` (base qty) via `computeBaseQty`
- Falls back to a plain `InputNumber` for products without a multi-level UOM group

**Body (display) behavior:**
- If levels available: shows `decomposeBaseQty(qty, levels).join(' / ')` (e.g., `1 / 0 / 1`)
- Otherwise: shows the numeric value

## Tier Values Storage

The tier values are stored in the row as `_${field}Tiers` (e.g., `_quantityTiers`). This is a frontend-only helper field — it is never sent to the API. The API only receives `quantity` as the computed base unit string.

## Tier-Skip Validation

**Rule**: for tier[i] > 0 (i > 0), at least one preceding tier (0..i-1) must also be non-zero.

Example:
- `1 / 0 / 1` → valid (tier[0]=1 is non-zero, so tier[2] can be non-zero)
- `0 / 0 / 1` → **invalid** (no preceding non-zero tier)

Validation runs in `SalesOrderDialog.validateDetails()` before form submission. The error message key is `salesOrders.validation.tierSkippingNotAllowed`.

## View Mode Decomposition

When loading a saved sales order for viewing, `loadSalesOrder()` calls `decomposeBaseQty(qty, levels)` for each detail to populate `_quantityTiers`. The `InlineEditableTable` body template then displays these decomposed values.

This requires the sales order details API to return `product.uomGroup.levels` — see backend changes.

## Types

`SalesOrderDetailRow` has a new optional field:
```typescript
_quantityTiers?: number[]  // frontend-only, not sent to API
```

`SalesOrderDetail.product` is now typed as `ProductLiteWithUom` (includes `uomGroup.levels`).
