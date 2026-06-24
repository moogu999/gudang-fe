# Partial Booking Order — Price & Promotion Re-evaluation (Frontend Plan)

Master plan: `../../.claude/PARTIAL_BOOKING_PRICING_PLAN.md`

## Context

The frontend surfaces booking orders via the booking flow (`src/views/booking-orders/BookingOrdersView.vue`) and shows the resulting delivery orders (`src/views/delivery-orders/`). The backend is adding (a) a per-branch toggle on Booking Order Config that controls whether partial fulfillments re-evaluate prices/promotions, and (b) recalculated pricing stored on each delivery order. This plan exposes the toggle and renders the new DO pricing. Decimals are sent/received as JSON strings (project convention).

See the master plan for product decisions (default OFF = honor existing SO pricing pro-rated; ON = re-resolve for delivered qty; mode applies only to partial DOs).

## 1. Config toggle

- `src/types/bookingOrderConfig.type.ts`: add `recalculatePartialPricing: boolean` to the config type and the upsert DTO.
- `src/services/bookingOrderConfig.service.ts`: include `recalculatePartialPricing` in the `upsert` payload.
- `src/views/booking-order-configs/BookingOrderConfigDialog.vue`: add a PrimeVue `ToggleSwitch` bound to the new field (follow the toggle pattern in `src/views/promotions/PromotionForm.vue:98`). Label e.g. *"Recalculate prices & promotions on partial fulfillment"* with a hint: OFF = honor the original sales-order pricing (pro-rated to delivered qty); ON = recompute prices and promotions for the delivered quantity.

## 2. Delivery order pricing display

- `src/types/deliveryOrder.type.ts`: add header amounts (`subtotalAmount`, `discountAmount`, `taxBaseAmount`, `taxAmount`, `totalAmount` as decimal strings), `pricingMode: 'existing' | 'new'`, per-line `price`, `discount`, `subAmount`, `taxIncluded`, `priceListId`, and the per-line/header discount breakdown arrays (mirror `LineDiscount` in `src/types/salesOrder.type.ts`).
- `src/views/delivery-orders/DeliveryOrderDetailView.vue`: render a monetary summary block (Subtotal / Discount / Tax / Total) and per-line Price & Discount columns, reusing display conventions from `src/views/sales-orders/SalesOrderDetailsTable.vue` (decimal formatting, discount expansion). Show a tag when the DO is partial and indicate which pricing mode was applied.
- `src/views/delivery-orders/DeliveryOrderPrintView.vue`: include the same monetary summary so printed booking orders show recalculated amounts.

## 3. i18n

- Add keys under the booking-order-config and delivery-order namespaces in the locale files (mirror existing `bookingOrders.*` / `salesOrders.*` keys): toggle label + hint, pricing-mode tag labels, monetary summary labels.

## 4. (Optional, out of scope for v1)

`BookingOrdersView.vue` partial-fulfillment dialog could preview recalculated totals before submit. Only if requested.

## Verification

1. `npm run dev`: open a branch's Booking Order Config — toggle appears, persists on save, and reloads correctly.
2. With toggle OFF then ON, create/book a partial SO (see master plan) and confirm the delivery-order detail + print views show the recalculated subtotal/discount/tax/total and the correct pricing-mode indicator.
3. `npm run type-check` / `npm run build` and `npm run test:unit` pass.
