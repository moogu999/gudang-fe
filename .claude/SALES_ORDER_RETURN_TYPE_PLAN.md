# Sales Order Return Type — Frontend Plan

> Master plan: `../../.claude/SALES_ORDER_RETURN_TYPE_PLAN.md`. This document covers the
> `gudang-fe` (Vue 3, TypeScript, PrimeVue, TailwindCSS v4) work.

## Context

Add a master-data **Sales Order Type** (`sales` | `return`). A return SO has a **negative
value**, **no promotions**, and can be created **direct** (current price-matrix prices) or
**from an applied invoice** (partial: drop lines / reduce qty). A new **Create Return DO**
page lets the user pick a return SO + a driver. The existing Goods Return Note UI then
surfaces the return DO automatically (its items are seeded into the driver-stock pool).

## A. Sales Order Type master-data CRUD
Follow the warehouses template (`views/warehouses/WarehousesView.vue` + `WarehouseDialog.vue`).
- `constants/api.ts`: `SALES_ORDER_TYPES: '/gen/v1/sales-order-types'`.
- `services/salesOrderTypes.service.ts` (static class); `types/salesOrderType.type.ts`.
- `views/sales-order-types/SalesOrderTypesView.vue` + `SalesOrderTypeDialog.vue`
  (code/name/isActive).
- Route in `router/index.ts`; menu entry (master-data/config group) in `components/menu/menu.ts`;
  i18n keys in `en-US.ts` + `id-ID.ts`; `PERMISSIONS` constant if permission-gated.

## B. SO create form — type selector + return sources
Edit `views/sales-orders/SalesOrderForm.vue` and `types/salesOrder.type.ts`.
- **Type field:** header `SelectButton`/`InfiniteSelect` (`SalesOrderTypesService`), default `sales`.
  Add `salesOrderTypeId` (+ `returnSource: 'direct'|'invoice'`, `sourceInvoiceId`) to the header
  type, `CreateSalesOrderRequest`, `initialValues`, and the Zod schema (conditional: `invoice`
  source requires `sourceInvoiceId`).
- **When `return`:** show a `direct | from invoice` toggle; **hide/disable the promotions UI**
  (`headerChoicePicks`, choice offers, bonuses) and don't call promotion resolution.
  - **direct:** keep the debounced `resolveOrder()` for current price-list prices, but signal the
    backend it's a return (type id) so promotions are skipped; render totals **negative**.
  - **from invoice:** an `InfiniteSelect` of **applied** invoices for the selected customer
    (`InvoicesService.list` filtered by customerId + status). On pick, `InvoicesService.get` and
    prefill `SalesOrderDetailsTable` rows with invoice line prices; allow removing rows and
    **reducing** qty (cap at invoiced qty); no resolve call.
- **Summary:** show negative totals for returns (existing `calculatedTotals`, sign-aware).
- **List** `SalesOrdersView.vue`: add a Type column/Tag (and optional filter).
- Editing gated to `draft` as today.

## C. Create Return DO page (NEW)
- `constants/api.ts`: `RETURN_DELIVERY_ORDERS: '/v1/return-delivery-orders'`; a helper to list
  return-type approved SOs without a DO (via `GEN_SALES_ORDER_HEADERS` filtered by type + status,
  or a dedicated `/v1` list).
- `services/returnDeliveryOrders.service.ts`; `types/returnDeliveryOrder.type.ts`.
- `views/return-delivery-orders/ReturnDeliveryOrderCreateView.vue`:
  - Pick a **return-type approved SO** (`InfiniteSelect`).
  - Pick a **driver** — reuse the `InfiniteSelect` + `EmployeesService` driver pattern from
    `DeliveryNoteCreateView.vue` (lines ~78-90).
  - Show the SO's (negative) lines read-only; optional number-series auto/manual toggle via
    `useNumberSeries` if a distinct DO number is wanted (else backend auto).
  - Submit → `ReturnDeliveryOrdersService.create({ salesOrderId, driverEmployeeId, ... })`.
  - Success toast + route to the created DO / invoice detail.
- Entry points: a **"Create Delivery Order"** button on the return-SO detail
  (`SalesOrderDetailView.vue`, shown only for `return` + `approved`) routing here with `soId`,
  **plus** a standalone menu item.
- Route + menu + i18n + permission as usual.

## D. Goods Return Note — (near) no change
Because the return DO seeds `driver_stock_items`, the existing
`views/goods-return-notes/GoodsReturnNoteCreateView.vue` flow already surfaces the return DO:
pick the driver → its `sales_return` items appear **grouped by source DO** in `groupedPool`.
Optional polish: show a `sales_return` source tag/label alongside the existing
`failed_delivery`/`partial_delivery` tags. No structural change.

## Files (representative)
- `constants/api.ts`; `services/{salesOrderTypes,returnDeliveryOrders}.service.ts`;
  `types/{salesOrderType,returnDeliveryOrder,salesOrder}.type.ts`.
- `views/sales-order-types/*`; `views/sales-orders/{SalesOrderForm.vue,SalesOrdersView.vue,SalesOrderDetailView.vue}`;
  `views/return-delivery-orders/ReturnDeliveryOrderCreateView.vue`;
  optional `views/goods-return-notes/GoodsReturnNoteCreateView.vue`.
- `router/index.ts`; `components/menu/menu.ts`; `i18n/locales/{en-US,id-ID}.ts`; `constants` PERMISSIONS.

## Verification
- `npm run type-check` and `npm run build`.
- Drive the app (Playwright/browser): create a **direct** return SO and a **from-invoice** return
  SO (verify partial qty cap, negative totals, no promotions UI); open the Return DO page, pick the
  SO + driver, submit; open Goods Return Note, pick the driver, confirm the return DO's items appear
  and receive them.
