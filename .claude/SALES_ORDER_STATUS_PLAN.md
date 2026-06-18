# Sales Order Status — Frontend Plan

See the master plan: [`../../.claude/SALES_ORDER_STATUS_PLAN.md`](../../.claude/SALES_ORDER_STATUS_PLAN.md)
for the shared status model and transition rules. Depends on the backend plan
([`../../gudang-be/.claude/SALES_ORDER_STATUS_PLAN.md`](../../gudang-be/.claude/SALES_ORDER_STATUS_PLAN.md))
shipping first (new `status` field + `PUT /v1/sales-orders/{id}`).

## Context

The Sales Order frontend has no status concept: `SalesOrderForm.vue` supports only `ADD` and
`VIEW` (no `EDIT`), the list shows payment tags but no order status, and the form has a single
**Save** button. This plan adds the status display, the two save buttons (draft vs approve), and
a draft edit flow consuming the new backend update endpoint.

Status values: `draft` | `need_approval` | `approved` | `applied`.

## 1. Types — `src/types/salesOrder.type.ts`

```ts
export type SalesOrderStatus = 'draft' | 'need_approval' | 'approved' | 'applied'
```
- Add `status: SalesOrderStatus` to `SalesOrderHeader`.
- Add optional `status?: SalesOrderStatus` to `CreateSalesOrderRequest`.
- Add `UpdateSalesOrderRequest` = `CreateSalesOrderRequest` shape (the `id` is passed separately
  as a path param).

## 2. Service — `src/services/salesOrders.service.ts`

- Add `static async update(id: number, data: UpdateSalesOrderRequest): Promise<SalesOrderHeader>`
  → `PUT` to `${API.SALES_ORDERS}/${id}`.
- `create` already POSTs to `API.SALES_ORDERS`; allow passing `status` through.
- (No new entry in `src/constants/api.ts` needed — reuse `SALES_ORDERS` with the id suffix.)

## 3. Form — `src/views/sales-orders/SalesOrderForm.vue`

- **Two save buttons** (replace the single Save at ~lines 316-326) shown in `ADD`/`EDIT` modes:
  - **Save as Draft** → submit with `status='draft'`.
  - **Save & Approve** → submit with `status='approved'`.
  Track the chosen status in a ref set by each button's click before submitting the form.
- **`onFormSubmit`** (~lines 805-885): set `request.status` from the chosen action; call
  `SalesOrdersService.create` in `ADD` mode, `SalesOrdersService.update(id, request)` in `EDIT`.
- **EDIT mode** (new): prefill header fields, details, manual discounts, and resolved
  pricing from a fetched SO. The `no` field is read-only in EDIT. Reuse the existing resolve
  machinery / `SalesOrderDetailsTable` so editing recomputes prices like create does.
- **Status tag**: show a PrimeVue `Tag` in the header area for `VIEW`/`EDIT` modes using the
  shared severity mapper (below).

## 4. List view — `src/views/sales-orders/SalesOrdersView.vue`

- Add a **Status** column rendered with PrimeVue `Tag`, mirroring `DeliveryOrdersView.vue`:
  ```ts
  function statusSeverity(status: SalesOrderStatus) {
    if (status === 'approved') return 'success'
    if (status === 'applied') return 'info'
    if (status === 'need_approval') return 'warn'
    return 'secondary' // draft
  }
  ```
  Value: `t(\`salesOrders.status.${data.status}\`)`.
- Add an **Edit** row action visible only when `status === 'draft'`, routing to the edit view.

## 5. Routing + edit view

- Add an edit route, e.g. `/sales-orders/:id/edit`, in the router.
- Add a wrapper view (mirror `SalesOrderCreateView.vue`) that loads the SO by id
  (`SalesOrderHeadersService.getById` + `SalesOrderDetailsService` for line items) and renders
  `SalesOrderForm` in `EDIT` (`DialogMode.EDIT`) mode with the fetched data as initial values.

## 6. i18n — `src/i18n/locales/*` (e.g. `en-US.ts`)

```ts
salesOrders: {
  status: { draft: 'Draft', need_approval: 'Needs Approval', approved: 'Approved', applied: 'Applied' },
  actions: { saveAsDraft: 'Save as Draft', saveAndApprove: 'Save & Approve' },
}
```
Add equivalent entries to every locale file.

## 7. Booking view — `src/views/booking-orders/BookingOrdersView.vue`

- No filtering change needed: the backend now returns only `approved` SOs in the bookable list.
- Optionally show the SO status tag in the table.
- The frontend never writes `applied` — it is a backend side-effect of submitting the booking.

## Verification

1. With the backend running: create an SO via **Save as Draft** → status column shows `Draft`;
   it is absent from the Booking Order bookable list.
2. Use the draft's **Edit** action → **Save & Approve** → status shows `Approved`; it now appears
   in the bookable list.
3. Confirm the **Edit** action is hidden for non-draft rows.
4. Book the approved SO → it shows `Applied` and leaves the bookable list; cancel the Delivery
   Order → it reverts to `Approved`.
5. `npm run type-check`, `npm run lint`, `npm run test:unit`, `npm run build`.
