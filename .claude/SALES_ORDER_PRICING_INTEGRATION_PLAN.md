# Sales Order ↔ Price List & Promotion Integration — Frontend Plan

> Master plan: `../../.claude/SALES_ORDER_PRICING_INTEGRATION_PLAN.md`
> Backend plan: `../../gudang-be/.claude/SALES_ORDER_PRICING_INTEGRATION_PLAN.md`

## Context

The sales order form (`src/views/sales-orders/SalesOrderDialog.vue`) currently lets the
user type prices and discounts by hand. This change makes the form **resolve** prices,
discounts, and bonus goods automatically from the backend as the order is built, and
display the discounts/bonuses under each product. Resolved price and discount fields
become **read-only**; the only manual promotional input is picking customer-choice
bonus items.

See the master plan for the confirmed decisions and the shared resolve contract.

## 1. Types — `src/types/salesOrder.type.ts`

Add API types mirroring the resolve contract:
- `ResolveSalesOrderRequest` — `{ customerId, orderDate, priceDate?, details: [{ productId, quantity }] }`.
- `LineDiscount` — `{ promotionId, promotionCode, discountType, value, amount }`.
- `LineBonus` — `{ promotionId, promotionCode, bonusProductId, qty }`.
- `ChoicePoolItem` — `{ productId, bonusAmount }`.
- `ChoiceOffer` — `{ promotionId, promotionCode, pickableCount, pool: ChoicePoolItem[] }`.
- `ResolvedLine` — `{ productId, price, priceListId, priceListCode, discount,
  discounts: LineDiscount[], bonuses: LineBonus[], choiceOffers: ChoiceOffer[] }`.
- `ResolveSalesOrderResponse` — `{ details: ResolvedLine[], headerDiscountAmount }`.

Extend `SalesOrderDetailRow` (local edit state) with resolution fields:
- read-only `_priceListId`, `_priceListCode`, `_discounts`, `_bonuses`;
- `_choiceOffers` and the user's `_choicePicks` (map of `promotionId → productId[]`).

Extend `CreateSalesOrderRequest` detail with optional
`customerChoices: { promotionId, productIds }[]`.

Extend `SalesOrderDetail` (response type) with `priceListId`, `discounts`, `bonuses`
so existing orders render their breakdown.

## 2. API constant & service

- `src/constants/api.ts` — add `RESOLVE_SALES_ORDER: '/v1/sales-orders/resolve'`.
- `src/services/salesOrders.service.ts` — add
  `static resolve(data: ResolveSalesOrderRequest): Promise<ResolveSalesOrderResponse>`
  (POST to the new endpoint), following the existing static-class pattern.

## 3. `SalesOrderDialog.vue`

### Live resolution
- Add a **debounced** `resolve()` trigger that fires when the customer changes or any
  line's product or quantity changes.
- Skip the call until a customer and at least one complete line exist.
- On response, for each line: set `price`, `discount`, `_priceListId`,
  `_priceListCode`, `_discounts`, `_bonuses`, `_choiceOffers`; preserve any existing
  `_choicePicks` that are still valid.
- Track an in-flight/loading state to disable submit while resolving.

### Read-only fields
- The **price** and **discount** columns of the line-items `InlineEditableTable` become
  read-only (display-only) — per the confirmed decision. The editable inputs remain
  product and quantity (and UOM tier).

### Per-product discount & bonus display
- Under each product row, render an expansion / sub-rows section:
  - one row per `_discounts` entry — `promotionCode` · `discountType`+`value` · `amount`;
  - one row per `_bonuses` entry — `bonus product × qty`;
  - render nothing when a line has neither.

### Customer-choice picker
- For each `_choiceOffers` entry on a line, render a picker (e.g. multi-select limited
  to `pickableCount`) over the offer's `pool` products.
- Picks write into `_choicePicks`; an offer with fewer than `pickableCount` picks
  blocks submit (validation message on the line).

### Summary & submit
- Feed `headerDiscountAmount` into the existing header discount field (also read-only).
- Recompute the summary block (subtotal / discount / dpp / tax / total) from the
  resolved line values + header discount.
- On submit, build `CreateSalesOrderRequest` with each detail's `productId` +
  `quantity` and `customerChoices` from `_choicePicks`; do **not** trust local
  price/discount — the server re-resolves and validates.
- Extend the Zod schema: require every `_choiceOffers` entry to have a complete pick.

## 4. Detail / list views

- `SalesOrderDetailView` (and any read-only SO display) — render each line's
  `discounts` and `bonuses` from the extended `SalesOrderDetail` response, matching the
  dialog's per-product layout.
- `SalesOrdersView` list — no structural change; totals already come from the header.

## Verification

1. `npm run dev` — open the SO dialog:
   - pick a customer and add products → prices auto-fill and are read-only;
   - discount and bonus rows appear under products that receive them;
   - a customer-choice promotion shows a picker; submit is blocked until picks are
     complete;
   - the summary totals match the backend response.
2. Open an existing SO with promotions → its discounts/bonuses render in the detail
   view.
3. `npm run type-check && npm run lint && npm run test:unit`.
