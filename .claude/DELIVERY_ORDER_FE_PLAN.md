# Delivery Order — Frontend Plan

> See master plan: `../../.claude/DELIVERY_ORDER_PLAN.md` and backend plan
> `../../gudang-be/.claude/DELIVERY_ORDER_BE_PLAN.md`.

## Context

There is no Delivery Order (DO) UI today — DOs only appear as a "DO No" column in the Booking
Orders page (`src/views/booking-orders/BookingOrdersView.vue`). We add a **list page** and a
**detail page**, a **Cancel** action, and link the DO No from the booking page. The detail screen
reuses the existing Sales Order presentation for the item list and order summary.

The detail screen has two parts:
1. **DO header card** — DO no, created time, fulfillment warehouse, status badge, and SO-derived
   info (SO no link, customer, delivery date, remark).
2. **Items + order summary** — reuse the existing read-only Sales Order view
   (`src/views/sales-orders/SalesOrderForm.vue` in `DialogMode.VIEW`, which already renders the
   line items and summary identically). The DO line quantity equals the SO quantity under
   today's full-fulfillment rule, so reusing `SalesOrderForm` is correct now; when partial
   fulfillment lands, swap in a DO-details-driven items table showing Ordered vs Fulfilled.

## 1. Constants

- `src/constants/api.ts`: add
  ```ts
  DELIVERY_ORDERS: '/v1/delivery-orders',
  DELIVERY_ORDER_BY_ID: (id: number) => `/v1/delivery-orders/${id}`,
  DELIVERY_ORDER_CANCEL: (id: number) => `/v1/delivery-orders/${id}/cancel`,
  ```
- `src/constants/permissions.ts`: add `delivery_order:view`, `delivery_order:cancel` (mirror the
  existing booking-order permission entries).

## 2. Types — `src/types/deliveryOrder.type.ts` (+ barrel `src/types/index.ts`)

```ts
export type DeliveryOrderStatus = 'open' | 'cancelled'

export interface DeliveryOrderListItem {
  id: number; no: string; createdAt: string; status: DeliveryOrderStatus
  warehouseId: number; warehouseName: string
  salesOrderHeaderId: number; soNo: string; customerName: string; deliveryDate: string | null
}

export interface DeliveryOrderViewLine {
  productId: number; productCode: string; productName: string
  quantity: string            // delivered/fulfilled (snapshot)
  price: string; discount: string; subAmount: string; taxIncluded: boolean
}

export interface DeliveryOrderDetail {
  id: number; no: string; createdAt: string; status: DeliveryOrderStatus
  warehouseId: number; warehouseName: string
  salesOrderHeaderId: number; soNo: string
  customer: { id: number; name: string; code?: string }
  deliveryDate: string | null; remark: string | null
  subtotalAmount: string; discountAmount: string; dppAmount: string
  taxAmount: string; totalAmount: string
  lines: DeliveryOrderViewLine[]
}
```

## 3. Service — `src/services/deliveryOrders.service.ts` (+ barrel `src/services/index.ts`)

Static-class pattern like `bookingOrders.service.ts`:
- `list(queryString?: string): Promise<Base<DeliveryOrderListItem>>` → GET `DELIVERY_ORDERS`.
- `get(id: number): Promise<DeliveryOrderDetail>` → GET `DELIVERY_ORDER_BY_ID(id)`.
- `cancel(id: number): Promise<void>` → POST `DELIVERY_ORDER_CANCEL(id)`.

## 4. Views — `src/views/delivery-orders/`

### `DeliveryOrdersView.vue` (list)
Model on `BookingOrdersView.vue` (lazy `DataTable` with paginator + `fetchData`) or the generic
`TableComponent`. Columns: DO No (RouterLink → `DeliveryOrderDetail`), SO No, Customer, Warehouse,
Delivery Date (`dayjs … DateFormat.DATE`), Created At (`DateFormat.DATE_TIME`), Status (`Tag`:
`open`→info/success, `cancelled`→danger). Optional row Cancel action (guarded by permission and
`status === 'open'`).

### `DeliveryOrderDetailView.vue` (detail)
- Back button + title (like `SalesOrderDetailView.vue`).
- **DO header card** (`ResponsiveCard`): DO no, created time, warehouse name, status `Tag`,
  SO No as `RouterLink` to `{ name: 'SalesOrderDetail', params: { id: salesOrderHeaderId } }`,
  customer, delivery date, remark.
- **Items + summary**: embed `<SalesOrderForm :mode="DialogMode.VIEW" :sales-order-id="salesOrderHeaderId" />`.
- **Cancel button** (visible when `status==='open'` and user has `delivery_order:cancel`): use
  `ConfirmationDialog` + `useConfirm` (pattern in `BookingOrdersView.vue`), call
  `DeliveryOrdersService.cancel(id)`, toast via `commonSuccessToast`/`commonErrorToast`, then
  refetch so the status flips to `cancelled`.

## 5. Routing & navigation

- `src/router/index.ts`: add lazy routes near `booking-orders`:
  - `{ path: 'delivery-orders', name: 'DeliveryOrders', component: () => import('@/views/delivery-orders/DeliveryOrdersView.vue') }`
  - `{ path: 'delivery-orders/:id', name: 'DeliveryOrderDetail', component: () => import('@/views/delivery-orders/DeliveryOrderDetailView.vue') }`
- `src/components/menu/menu.ts`: add a **Delivery Orders** item next to Booking Orders
  (`labelKey: 'navigation.deliveryOrders'`, `route: '/delivery-orders'`).

## 6. i18n — `src/i18n/locales/en-US.ts` & `id-ID.ts`

Add `navigation.deliveryOrders` and a `deliveryOrders` block: `title`, `fields.*`
(no, soNo, customer, warehouse, deliveryDate, createdAt, status, quantity), `status.open`,
`status.cancelled`, `actions.cancel`, and `messages.confirmCancel` / `messages.cancelSuccess`.

## 7. Link from Booking Orders

In `BookingOrdersView.vue`, make the existing **DO No** cell (currently plain text ~line 88) a
`RouterLink` to `{ name: 'DeliveryOrderDetail', params: { id: <delivery order id> } }` when present.
(The list row exposes `deliveryOrderNo`; if the DO id isn't already returned by
`/v1/booking-orders/sales-orders`, add it to that response, or navigate by looking up via SO id.)

## Verification

```bash
npm run type-check && npm run build
npm run dev   # then exercise the flow
```
Flow: Booking Orders → book an SO → open **Delivery Orders** from the menu → row appears → open
detail → verify DO no, created time, warehouse, SO no link, customer, delivery date, remark,
item list and order summary (matching the SO) → click **Cancel**, confirm → status badge flips to
**Cancelled** and the success toast shows. Confirm the SO No link navigates to the SO detail.
