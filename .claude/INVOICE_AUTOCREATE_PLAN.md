# Frontend Plan: Read-only Invoice UI

> Part of the feature described in the repo-root master plan
> (`../../.claude/INVOICE_AUTOCREATE_PLAN.md`). Backend plan:
> `../../gudang-be/.claude/INVOICE_AUTOCREATE_PLAN.md`.

## Context

The backend auto-creates a `draft` invoice whenever a delivery order (DO) is booked, and exposes it via
read-only endpoints (`GET /v1/invoices`, `GET /v1/invoices/{id}`). The frontend must let users **view**
invoices but **never edit or create** them. A future feature will transition invoices `draft` → `applied`;
the status mapping accommodates it now.

### Confirmed decisions
- Full Invoices list + read-only detail pages, a nav item, and a link from the DO detail.
- Statuses: `draft | applied | cancelled`.

Mirror the existing read-only resource UI (delivery-orders / delivery-notes). The FE never creates invoices.

## 1. Types — `src/types/invoice.type.ts`
```ts
export type InvoiceStatus = 'draft' | 'applied' | 'cancelled'

export interface InvoiceListItem {
  id: number
  no: string
  status: InvoiceStatus
  deliveryOrderId: number
  doNo: string
  customerName?: string
  totalAmount: string
  createdAt: string
}

export interface InvoiceDetailLine {
  productId: number
  productCode: string
  productName: string
  quantity: string
  price: string
  discount: string
  subAmount: string
  isBonus: boolean
}

export interface InvoiceDetail extends InvoiceListItem {
  subtotalAmount: string
  discountAmount: string
  taxBaseAmount: string
  taxAmount: string
  lines: InvoiceDetailLine[]
}
```
No DTOs (no create/update). No `any` (per FE CLAUDE.md). Monetary values are strings.

## 2. API + service
- `src/constants/api.ts`:
  ```ts
  INVOICES: '/v1/invoices',
  INVOICE_BY_ID: (id: number) => `/v1/invoices/${id}`,
  ```
- `src/services/invoices.service.ts` — copy `deliveryOrders.service.ts`, keep **only** read methods:
  ```ts
  export class InvoicesService {
    private static readonly BASE_URL = API_ENDPOINTS.INVOICES
    static async list(queryString?: string): Promise<Base<InvoiceListItem>> { /* ... */ }
    static async get(id: number): Promise<InvoiceDetail> { /* ... */ }
  }
  ```

## 3. Views (mirror `delivery-orders/` + read-only `delivery-notes/DeliveryNoteDetailView.vue`)
- `src/views/invoices/InvoicesView.vue` — lazy PrimeVue `DataTable` with server pagination
  (`page`/`limit` query params, `@page` handler). Columns: `no`, `doNo`, `status` (`Tag`), `totalAmount`,
  `createdAt`, and a view action that routes to the detail page.
- `src/views/invoices/InvoiceDetailView.vue` — **fully read-only**:
  - Header grid (no / doNo / status / dates / customer) as label-value pairs (no inputs).
  - Status `Tag`.
  - Line-items `DataTable` (display only). **Show bonus rows** (`isBonus = true`, price 0) — these cover
    both per-item and per-transaction bonuses; visually mark them (e.g. a "Bonus" tag) so they read as free
    goods.
  - Financial summary (subtotal / discount / tax / total).
  - **No** edit/save/create buttons or form inputs anywhere.
- Status severity helper: `draft → secondary`, `applied → success`, `cancelled → danger`.

## 4. Routing, permissions, nav, i18n
- `src/router/index.ts`: routes `invoices` (list) and `invoices/:id` (detail), both with
  `meta.requiredPermission = PERMISSIONS.INVOICE_READ`.
- `src/constants/permissions.ts`: `INVOICE_READ` (69), `INVOICE_WRITE` (70) — ids match the BE migration.
- `src/components/menu/menu.ts`: "Invoices" item (e.g. `pi pi-file`), gated on `INVOICE_READ`.
- i18n `src/i18n/locales/en-US.ts` + `id-ID.ts`: `invoices.fields.*`,
  `invoices.status.{draft,applied,cancelled}`, `navigation.invoices`.

## 5. Link from Delivery Order detail
In `src/views/delivery-orders/DeliveryOrderDetailView.vue`, add a read-only "Invoice" line/button linking
to the invoice for that DO. **Preferred** approach (coordinate with BE): the DO detail response includes
`invoiceId` / `invoiceNo`, so the link needs no extra request. Fallback: fetch via
`GET /v1/invoices?delivery_order_id=` using the `genericQueryBuilder.ts` filter pattern.

## 6. Tests (vitest, mirror existing `*.spec.ts`)
- `InvoiceDetailView.spec.ts`: asserts the view is read-only (no input/edit/save controls), status tag
  maps correctly, line items + financial summary render.
- Optional `invoices.service.spec.ts`: mock `ApiService`, assert `list`/`get` URL + query construction.

## 7. Verification
1. `npm run type-check && npm run test:unit`.
2. `npm run dev` — with `INVOICE_READ`, the Invoices nav item appears; the list shows the draft invoice;
   the detail page is read-only; the DO detail links to its invoice.
3. The `applied` status path is deferred to the future confirm-delivery feature; the status mapping already
   handles it.
