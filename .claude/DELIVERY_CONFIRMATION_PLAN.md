# Delivery Confirmation (DC) — Frontend Plan

> Master plan: [`../../.claude/DELIVERY_CONFIRMATION_PLAN.md`](../../.claude/DELIVERY_CONFIRMATION_PLAN.md). Read it first for context, the endpoint contract, and the per-DO outcome rules.

## Goal

Add a Delivery Confirmation feature: list DCs, create a `draft` DC from an `applied` Delivery Note, and confirm each Delivery Order (delivered / partial / failed) — which on the backend applies/adjusts/cancels the DO's invoice and reconciles stock. UI follows `n_command_delivery_confirmation_v3_1.html`.

## Reuse map (mirror these existing features)

| Need | Reuse / mirror |
|---|---|
| Feature triplet (List / Create / Detail views) | `src/views/delivery-notes/` and `src/views/goods-issue-notes/` |
| Service (static class) | `src/services/deliveryNotes.service.ts` |
| List table | `TableComponent` (`#content` slot) per `.claude/CLAUDE.md` §3 |
| Source picker (auto/manual no + select source) | `DeliveryNoteCreateView.vue` / `GoodsIssueNoteCreateView.vue` (number auto-vs-manual toggle) |
| Single-select source list | `InfiniteSelect` pattern (`.claude/CLAUDE.md` §4) |
| Modal + form + validation | PrimeVue `Dialog` + `Form` + Zod; `useDialog`; `commonSuccessToast`/`commonErrorToast` |
| Responsive sizing | `useResponsiveSize` |
| Endpoint constants | `src/constants/api.ts` (DN/GIN/invoice block, ~line 191–212) |

## 1. `src/constants/api.ts`

Add near the DN/GIN endpoints:
```ts
DELIVERY_CONFIRMATIONS: '/v1/delivery-confirmations',
DELIVERY_CONFIRMATION_BY_ID: (id: number) => `/v1/delivery-confirmations/${id}`,
DELIVERY_CONFIRMATION_AVAILABLE_DNS: '/v1/delivery-confirmations/available-delivery-notes',
DELIVERY_CONFIRMATION_CONFIRM_DO: (id: number, doId: number) =>
  `/v1/delivery-confirmations/${id}/delivery-orders/${doId}/confirm`,
```

## 2. `src/types/deliveryConfirmation.type.ts`

Decimal/monetary fields typed as `string` (per cross-project convention). Define:
- `DeliveryConfirmationListItem` — `id, no, deliveryNoteNo, driverName?, confirmationDate, status: 'draft' | 'confirmed', doTotal, doConfirmed`.
- `DeliveryConfirmationDODetail` — `id, deliveryOrderId, deliveryOrderNo, customerName, status: 'pending' | 'delivered' | 'partial' | 'failed', invoiceNo?, invoiceStatus?, invoiceTotal?, reasonCode?, items: DeliveryConfirmationItemLine[]`.
- `DeliveryConfirmationItemLine` — `productId, productCode, productName, orderedQty, receivedQty, price, pinnedUom?`.
- `DeliveryConfirmationDetail` — DC header (no, date, notes, status) + DN/driver/vehicle info + `deliveryOrders: DeliveryConfirmationDODetail[]`.
- `AvailableDeliveryNote` — `id, no, deliveryDate, driverName?, vehiclePlate?, doCount, totalAmount`.
- `CreateDeliveryConfirmationRequest` — `{ no?: string; deliveryNoteId: number; confirmationDate: string; notes?: string }`.
- `ConfirmDeliveryOrderRequest` — `{ outcome: 'delivered' | 'partial' | 'failed'; items: { productId: number; receivedQty: string }[]; reasonCode?: string; reasonNote?: string }`.

Add to `src/types/index.ts`.

## 3. `src/services/deliveryConfirmations.service.ts`

Copy `deliveryNotes.service.ts` structure:
```ts
export class DeliveryConfirmationsService {
  static list(queryString?: string): Promise<Base<DeliveryConfirmationListItem>>
  static get(id: number): Promise<DeliveryConfirmationDetail>
  static create(payload: CreateDeliveryConfirmationRequest): Promise<{ id: number; no: string }>
  static listAvailableDeliveryNotes(queryString?: string): Promise<Base<AvailableDeliveryNote>>
  static confirmDeliveryOrder(id: number, doId: number, payload: ConfirmDeliveryOrderRequest): Promise<void>
}
```
Add to `src/services/index.ts`.

## 4. Views — `src/views/delivery-confirmations/`

### `DeliveryConfirmationsView.vue` (list)
Copy `DeliveryNotesView.vue`. `TableComponent` with `url = API_ENDPOINTS.DELIVERY_CONFIRMATIONS`. Columns: No, Delivery Note, Driver, Date, Status (badge: draft = grey, confirmed = green), DO progress (`doConfirmed / doTotal`). Row click → detail. Toolbar "New DC" → `/delivery-confirmations/create`. Search + status filter.

### `DeliveryConfirmationCreateView.vue` (create)
Mirror `GoodsIssueNoteCreateView.vue`:
- **DC info card**: No field with **auto-generate vs manual** toggle (reuse the DN/GIN create pattern — when manual, show an `InputText` bound to `no`; when auto, show "Auto-generate" placeholder and omit `no`); `confirmationDate` (date, default today); `notes` (optional).
- **Delivery Note picker**: single-select list/`InfiniteSelect` over `listAvailableDeliveryNotes`, showing no, date, driver, plate, DO count, total. Info banner: "Only applied delivery notes (with a goods issue note) can be confirmed."
- Submit → `create` → redirect to `DeliveryConfirmationDetailView` (`/delivery-confirmations/:id`).
- Zod resolver wrapped in `computed()` for i18n (per `.claude/CLAUDE.md` §8); validate DN selected and (manual mode) `no` non-empty.

### `DeliveryConfirmationDetailView.vue` (confirm) — the main screen (mockup Scene 2)
- **Summary card**: DN no, driver, vehicle/plate, date, route; status badge (draft/confirmed).
- **Stat row** (computed from `deliveryOrders`): Total DO, Pending, Delivered, Partial, Failed, Total invoice confirmed.
- **DO list**: one row per DO. Pending rows show a "Confirm" button; confirmed rows are read-only with an **invoice strip** (invoice no link + status: applied / adjusted-amount / cancelled, styled green/amber/red).
- **Confirm dialog** (PrimeVue `Dialog` via `useDialog`, mockup modal):
  - **Outcome toggle**: Delivered ↔ Failed. (Partial is derived: outcome `delivered` with any line `received < ordered` is sent as `partial`.)
  - **Delivered panel**: a table of products with `orderedQty` and a numeric `receivedQty` input per line, clamped `0 ≤ received ≤ ordered`; visual state exact/short; when a line is short, show a required **reason** select. Live "value after confirmation" total.
  - **Failed panel**: required failure-reason select + optional note; banner that the invoice will be cancelled.
  - Submit builds `ConfirmDeliveryOrderRequest` (`outcome` = `failed` | (`partial` if any short else `delivered`); `items` = received qty per product as strings; `reasonCode`/`reasonNote`), calls `confirmDeliveryOrder`, toasts, refreshes `get(id)`. When the last DO is confirmed the backend returns the DC as `confirmed`; reflect the new status.
- Reason code option lists can live as local constants (mirror the mockup's reason arrays); add i18n labels.

## 5. Router — `src/router/index.ts`

Add lazy routes near the DN routes (~line 366):
```ts
{ path: 'delivery-confirmations', name: 'delivery-confirmations',
  component: () => import('@/views/delivery-confirmations/DeliveryConfirmationsView.vue') },
{ path: 'delivery-confirmations/create', name: 'delivery-confirmation-create',
  component: () => import('@/views/delivery-confirmations/DeliveryConfirmationCreateView.vue') },
{ path: 'delivery-confirmations/:id', name: 'delivery-confirmation-detail',
  component: () => import('@/views/delivery-confirmations/DeliveryConfirmationDetailView.vue') },
```

## 6. Menu — `src/components/menu/menu.ts`

Add after "Goods Issue Notes" (~line 185):
```ts
{ label: 'Delivery Confirmations', labelKey: 'navigation.deliveryConfirmations', route: '/delivery-confirmations' }
```

## 7. i18n — `src/i18n/locales/{en-US,id-ID}.ts`

Add `navigation.deliveryConfirmations` and a `deliveryConfirmations` block: title, fields, statuses (draft/confirmed; delivered/partial/failed), reason-code labels, validation messages, and confirm-dialog strings — in both locales.

## Verification

```bash
cd gudang-fe
npm run type-check
npm run lint
npm run dev
```
With the backend running and an `applied` DN available: Warehouse → **Delivery Confirmations** → New DC (try both auto and manual number) → pick the DN → on the detail screen confirm DOs as delivered, partial, and failed. Verify: status badges, stat counts, per-DO invoice strips (applied / reduced amount / cancelled), the DC flipping to `confirmed` after the last DO, and the mobile (card) layout + 44px touch targets per `.claude/CLAUDE.md` §7.
