# Manual Discount — Frontend Plan (`gudang-fe/`)

## Context

During sales-order creation, a user can add a **manual discount** to a **line item** or
to the **whole invoice**, as a **flat amount** or a **percentage**, always with a
**reason**. Manual discounts **stack on top** of promotion discounts and feed into the
order summary. Before submit they can be **deleted** (remove the row). After the order
is saved, manual discounts and their reasons are shown **read-only** in VIEW mode.

Percentage base is **gross**: line = `quantity × price`; invoice = `Σ(quantity × price)`.

Decimal-as-string convention: API requests/responses carry decimals as strings; the
form uses numbers internally and converts back to strings on submit (existing pattern).

## Existing code being reused / touched

- `src/types/salesOrder.type.ts` — entity types, `SalesOrderDetailRow`, create DTOs.
- `src/views/sales-orders/SalesOrderForm.vue` — main form; `calculatedTotals`
  (~468–487), `loadSalesOrder` (~767), submit payload construction.
- `src/views/sales-orders/SalesOrderDetailsTable.vue` — line-items table; row
  expansion `#expansion` (currently shows read-only promo discounts/bonuses).
- `src/i18n/locales/en-US.ts`, `id-ID.ts` — translations.
- PrimeVue `Select`, `InputNumber`, `InputText`/`Textarea`, `Button`.

## Steps

### 1. Types (`src/types/salesOrder.type.ts`)
```ts
export interface ManualDiscount {
  id?: number
  discountType: 'flat' | 'percentage'
  value: string
  amount: string
  reason: string
}
```
- Add `manualDiscounts?: ManualDiscount[]` to `SalesOrderDetail` and `SalesOrderHeader`.
- Add `_manualDiscounts?: ManualDiscount[]` to `SalesOrderDetailRow`.
- DTOs: add optional `manualDiscounts?: { discountType: 'flat' | 'percentage'; value: string; reason: string }[]`
  to the create-detail DTO and to `CreateSalesOrderRequest` (header level).

### 2. Shared component `src/views/sales-orders/ManualDiscountEditor.vue`
- Props: `modelValue: ManualDiscount[]`, `disabled?: boolean` (VIEW), plus the row's
  gross (for live percentage preview) — pass `gross?: number`.
- Emits `update:modelValue`.
- Add-form row: `Select` (flat/percentage), `InputNumber` (value, min 0), `InputText`
  (reason), Add button. Block add when reason is empty or value ≤ 0 (inline message).
- List of applied entries: type, value, computed amount, reason, and a trash button
  (hidden when `disabled`). On add/remove, emit the new array.
- Amount preview: flat → value; percentage → `gross × value / 100` (rounded 2).

### 3. Line-level (`SalesOrderDetailsTable.vue`)
- In `#expansion`, add a "Manual Discounts" section rendering `ManualDiscountEditor`
  bound to `row._manualDiscounts` with `:gross="(row.quantity||0)*(row.price||0)"` and
  `:disabled="mode === DialogMode.VIEW"`. On update, write back to the row and
  `emitRows()` (same flow as existing row edits).

### 4. Invoice-level + totals (`SalesOrderForm.vue`)
- Add `headerManualDiscounts` ref (`ManualDiscount[]`).
- Render an "Invoice Manual Discounts" block near the payment/summary section using
  `ManualDiscountEditor` bound to `headerManualDiscounts`, `:gross="grossTotal"`,
  `:disabled="mode === DialogMode.VIEW"`.
- Extend `calculatedTotals`:
  - line manual sum: per row, flat → value, percentage → `qty×price×value/100`;
  - header manual sum: flat → value, percentage → `grossTotal×value/100`;
  - add both to `discountTotal` (which then flows to `dppTotal`, tax, `total`).
- `loadSalesOrder` (VIEW): map `detail.manualDiscounts` → `row._manualDiscounts` and
  `header.manualDiscounts` → `headerManualDiscounts`.
- Submit: include `manualDiscounts` (`{discountType, value, reason}`, value as string)
  in each detail DTO and in the header payload. Drop the `amount`/`id` fields on submit
  (backend recomputes amount).

### 5. i18n (`en-US.ts`, `id-ID.ts`)
Under `salesOrders`: `manualDiscount.title`, `manualDiscount.add`,
`manualDiscount.type`, `manualDiscount.flat`, `manualDiscount.percentage`,
`manualDiscount.value`, `manualDiscount.reason`, and
`validation.manualDiscountReasonRequired`, `validation.manualDiscountValueInvalid`.

## Verification

- `npm run dev`: create a sales order; add a line manual discount (flat) and an invoice
  manual discount (percentage), each with a reason; confirm the summary
  discount/DPP/tax/total update live. Submit. Re-open in VIEW mode and confirm the
  discounts + reasons render read-only (no add/delete controls). Verify removing a row
  pre-submit recalculates totals.
- `npm run type-check`
- `npm run lint`
