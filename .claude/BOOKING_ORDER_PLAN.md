# Booking Order — Frontend Plan (`gudang-fe`)

> Master plan: `../../.claude/BOOKING_ORDER_PLAN.md`. Backend plan: `../../gudang-be/.claude/BOOKING_ORDER_PLAN.md`.

## Context

Adds a **Booking Order** page under the **Sales** menu group. The operator sees outstanding sales orders oldest-first (SO number, value, delivery deadline), multi-selects them, sees a per-row **fulfillment status** (full / partial / none) computed by the backend against branch warehouse inventory, and submits to **reserve the stock** and create one delivery order per sales order. Reservation is handled entirely server-side; the only frontend-visible effect is that, after a submit, availability drops — so a later evaluation of a different SO needing the same stock may now show `partial`/`none`.

Follows the established frontend conventions in `.claude/CLAUDE.md`: static-class service layer, centralized API endpoints, typed entities (no `any`), PrimeVue + Tailwind, i18n via `useI18n`, toasts via `services/toast.ts`.

> The shared `components/table/TableComponent.vue` is **single-select** and binds selection to filters, so it does **not** fit here. The booking page uses its **own** PrimeVue `DataTable` with `selection-mode="multiple"` and a checkbox column, doing lazy pagination against the custom endpoint.

## Backend endpoints consumed

- `GET /v1/booking-orders/sales-orders?page=&limit=&includeBooked=` → `Base<BookableSalesOrder>` (`{ data, meta }`), oldest first.
- `POST /v1/booking-orders/evaluate` `{ salesOrderIds }` → `[{ salesOrderId, status, items }]`.
- `POST /v1/booking-orders` `{ salesOrderIds }` → `201 [{ salesOrderId, deliveryOrderId, no }]`; `400` if any SO is already booked or not fully fulfillable.

## Files

### `src/constants/api.ts`
Add to `API_ENDPOINTS`:
```ts
BOOKING_ORDER_SALES_ORDERS: '/v1/booking-orders/sales-orders',
BOOKING_ORDER_EVALUATE: '/v1/booking-orders/evaluate',
BOOKING_ORDERS: '/v1/booking-orders',
```

### `src/types/bookingOrder.type.ts` (new)
```ts
export interface BookableSalesOrder {
  id: number
  no: string
  totalAmount: string        // decimal as string
  deliveryDate: string | null
  createdAt: string
  booked: boolean
}

export type FulfillmentStatus = 'full' | 'partial' | 'none'

export interface FulfillmentItem {
  productId: number
  required: string
  available: string
}

export interface SalesOrderFulfillment {
  salesOrderId: number
  status: FulfillmentStatus
  items: FulfillmentItem[]
}

export interface CreateBookingOrderResult {
  salesOrderId: number
  deliveryOrderId: number
  no: string
}
```
(Export via `src/types/index.ts` barrel if used elsewhere.)

### `src/services/bookingOrders.service.ts` (new) — static-class pattern
```ts
import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  BookableSalesOrder, SalesOrderFulfillment, CreateBookingOrderResult,
} from '@/types/bookingOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

export class BookingOrdersService {
  static async list(queryString?: string): Promise<Base<BookableSalesOrder>> {
    const url = queryString
      ? `${API_ENDPOINTS.BOOKING_ORDER_SALES_ORDERS}?${queryString}`
      : API_ENDPOINTS.BOOKING_ORDER_SALES_ORDERS
    return ApiService.get<Base<BookableSalesOrder>>(url)
  }

  static async evaluate(salesOrderIds: number[]): Promise<SalesOrderFulfillment[]> {
    return ApiService.post<SalesOrderFulfillment[]>(API_ENDPOINTS.BOOKING_ORDER_EVALUATE, { salesOrderIds })
  }

  static async submit(salesOrderIds: number[]): Promise<CreateBookingOrderResult[]> {
    return ApiService.post<CreateBookingOrderResult[]>(API_ENDPOINTS.BOOKING_ORDERS, { salesOrderIds })
  }
}
```
Add to `src/services/index.ts` barrel.

### `src/views/booking-orders/BookingOrdersView.vue` (new)
- **Layout:** page wrapper (`p-2 sm:p-4 lg:p-10`), title `{{ t('bookingOrders.title') }}`, a "Show booked" `ToggleSwitch`/`Checkbox`, and a Submit `Button`. Include `<Toast :group="overlayGroup" />` and a `ConfirmationDialog`.
- **Table:** PrimeVue `DataTable` with `:value="items"`, `:lazy="true"`, `:paginator="true"`, `:rows`, `:total-records="total"`, `v-model:selection="selected"`, `selection-mode="multiple"`, `data-key="id"`, `@page="onPage"`. Columns:
  - `<Column selection-mode="multiple" />` checkbox.
  - **SO No** — `no`.
  - **Value** — `totalAmount` via `Intl.NumberFormat` (copy `formatCurrency` from `SalesOrdersView.vue`).
  - **Delivery deadline** — `deliveryDate` via `dayjs(...).format(DateFormat.DATE)` (handle null → '-').
  - **Fulfillment** — `Tag` from a reactive `statusMap` (`Map<number, FulfillmentStatus>`): `full`→`success`, `partial`→`warn`, `none`→`danger`, not-yet-evaluated → `secondary` placeholder.
- **Fetching:** `fetchData(page)` builds `page`/`limit`/`includeBooked` query and calls `BookingOrdersService.list`; sets `items`/`total`. Oldest-first is enforced server-side. Re-fetch when the "Show booked" toggle changes.
- **Evaluate on selection:** `watch(selected, ...)` → collect ids → `BookingOrdersService.evaluate(ids)` → write results into `statusMap` so tags render. Debounce/guard against empty selection.
- **Submit gating:** `canSubmit = computed(() => selected.length > 0 && selected.every(r => statusMap.get(r.id) === 'full'))`. Button `:disabled="!canSubmit"`.
- **Submit action:** confirm dialog (wording should note this **reserves stock**) → `BookingOrdersService.submit(ids)` → `toast.add(commonSuccessToast(t('bookingOrders.messages.submitSuccess'), overlayGroup))` → clear `selected`/`statusMap` + `fetchData(0)`. On error `toast.add(commonErrorToast(e, overlayGroup))` (covers `400` already-booked / not-fully-fulfillable — including the case where stock was reserved by a concurrent booking between evaluate and submit).
- **i18n:** all labels via `t(...)`; columns in a `computed` for locale reactivity (per CLAUDE.md).

### `src/router/index.ts`
Add child route in the main layout block (alongside `sales-orders`, no `requiredPermission`):
```ts
{
  path: 'booking-orders',
  name: 'BookingOrders',
  component: () => import('@/views/booking-orders/BookingOrdersView.vue'),
},
```

### `src/components/menu/menu.ts`
Add to the **Sales** group `items`:
```ts
{ label: 'Booking Orders', labelKey: 'navigation.bookingOrders', route: '/booking-orders' },
```

### `src/i18n/locales/en-US.ts` & `id-ID.ts`
- `navigation.bookingOrders` — "Booking Orders" / "Pesanan Booking".
- A `bookingOrders` block: `title`, `fields.no/value/deliveryDeadline/fulfillment`, `status.full/partial/none`, `showBooked`, `actions.submit`, `messages.confirmSubmit/submitSuccess`.

## Tests (optional)

`src/views/booking-orders/__tests__` (or co-located) vitest spec for:
- status → Tag severity mapping;
- `canSubmit` logic (true only when ≥1 selected and all selected are `full`).
Follow `src/views/audit-trails/components/*.spec.ts`.

## Verification

1. `npm run type-check`
2. `npm run dev` (backend running with the booking-order endpoints), open `/booking-orders`:
   - List shows oldest first with No / Value / Delivery deadline.
   - Selecting rows populates fulfillment tags; Submit stays disabled until all selected are `full`.
   - Submitting shows success, clears selection, removes booked SOs; "Show booked" reveals them again.
   - Because submit **reserves** stock, selecting a different SO that needs the same product afterwards shows reduced availability (status may drop to `partial`/`none`).
3. `npm run lint` and `npm run build`.
