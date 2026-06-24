# Frontend Plan — Whole-Invoice Promotion Rewards Persistence

> Master plan: [`../../.claude/WHOLE_INVOICE_REWARDS_PERSISTENCE_PLAN.md`](../../.claude/WHOLE_INVOICE_REWARDS_PERSISTENCE_PLAN.md)
> Status: Planning · Created: 2026-06-04

Render persisted whole-invoice (header-level) promotion **bonuses** and **discount lines** on the SO VIEW page. Most rendering already exists — this is mostly wiring the read response into existing refs.

## Current state

- **ADD mode** already resolves and displays header rewards: `resolveOrder()` populates `headerDiscounts` / `headerBonuses` from the `/resolve` response (`SalesOrderForm.vue:591-592`), and `SalesOrderDetailsTable.vue` already renders them (props `headerDiscounts` / `headerBonuses`, template `:382+`).
- **VIEW mode** (`loadSalesOrder()`, `:863-930`) loads the header via generic CRUD `SalesOrderHeadersService.getById` and details via `SalesOrderDetailsService.list`. It **never populates** `headerDiscounts` / `headerBonuses` — so they stay `[]` and nothing renders. It also reads `detail.discounts` / `detail.bonuses` (`:918-919`), which today come back empty (the BE read model didn't surface them — fixed in BE plan §4).

## Depends on (backend)

- BE §2d/§2e: create response includes `headerBonuses` / `headerDiscounts`.
- BE §4: generic-CRUD `getById` for `sales-order-headers` returns `headerBonuses` / `headerDiscounts` (and ideally detail `discounts`/`bonuses`).

## Changes

### 1. Types — `src/types/salesOrder.type.ts`
On `SalesOrderHeader` (`:86`), add (the `LineDiscount` / `LineBonus` interfaces at `:23`/`:32` already exist):
```ts
export interface SalesOrderHeader {
  // ...existing...
  manualDiscounts?: ManualDiscount[]
  headerDiscounts?: LineDiscount[]
  headerBonuses?: LineBonus[]
}
```
Ensure field/json names match what the BE generic-CRUD model emits (`headerDiscounts`, `headerBonuses`).

### 2. VIEW population — `src/views/sales-orders/SalesOrderForm.vue`
In `loadSalesOrder()` (after `headerManualDiscounts.value = header.manualDiscounts ?? []`, `:884`):
```ts
headerDiscounts.value = header.headerDiscounts ?? []
headerBonuses.value = header.headerBonuses ?? []
```
The refs already exist (`:417-418`) and are already passed to `SalesOrderDetailsTable` (`:248-249`). No template change needed for the basic case.

### 3. (Optional) Header reward amount in VIEW summary
`headerDiscountAmount` is already set from `header.discountAmount` (`:881`) and the summary uses saved totals in VIEW mode, so currency math is correct without change. If a per-promotion header-discount breakdown line is desired in the summary panel, render from `headerDiscounts.value`; otherwise the existing `SalesOrderDetailsTable` header-rewards block is sufficient.

### 4. i18n
Reuse existing header-reward / bonus / discount keys already used by `SalesOrderDetailsTable` in ADD mode. Only add new keys to both `src/i18n/locales/en-US.ts` and `id-ID.ts` if a new VIEW-only label is introduced (likely none).

### 5. (Optional, paired with BE §4 detail fidelity)
Once BE returns `detail.discounts` / `detail.bonuses`, the existing `:918-919` mapping will light up line-level promo breakdowns in VIEW with no FE change. Verify rendering in `SalesOrderDetailsTable` for the per-line case.

## Verification

- View a saved SO that had a whole-invoice promo bonus → header bonus rows render.
- View a saved SO that had a whole-invoice promo discount → header discount lines render; displayed total matches the saved `totalAmount`.
- `npm run type-check`, `npm run lint`, `npm run test:unit` pass.

## File-change checklist

- [ ] `src/types/salesOrder.type.ts` (+`headerDiscounts`/`headerBonuses` on `SalesOrderHeader`)
- [ ] `src/views/sales-orders/SalesOrderForm.vue` (`loadSalesOrder` population)
- [ ] i18n locales (only if new labels)
- [ ] Manual VIEW verification + `npm run type-check`/`test:unit`
