# Stock Movements Ledger — Frontend Plan

> Detail plan for `gudang-fe/`. See the master plan at
> [`../../.claude/stock-movements-ledger.md`](../../.claude/stock-movements-ledger.md) for context,
> decisions, the shared data model, and overall progress.

Model the whole feature on the existing **audit-trails** feature (date-range + entity filters +
server-side paginated table), but point it at the custom `/v1/stock-movements` endpoint. Vue 3
`<script setup>`, strict TS (no `any`), PrimeVue + TailwindCSS.

---

## 1. API endpoint constant
`src/constants/api.ts` — add:
```ts
STOCK_MOVEMENTS: '/v1/stock-movements',
```

## 2. Types
`src/types/stockMovement.type.ts`:
```ts
export interface StockMovement {
  id: number
  warehouseId: number
  warehouseName?: string
  productId: number
  productCode?: string
  productName?: string
  stockType: string
  movementType: 'receipt' | 'reserve' | 'release' | 'issue' | 'delivery'
  onHandDelta: string        // decimals as strings
  reservedDelta: string
  inTransitDelta: string
  onHandAfter: string
  reservedAfter: string
  inTransitAfter: string
  unitCost?: string | null
  referenceType?: string | null
  referenceId?: number | null
  referenceNo?: string | null
  note?: string | null
  createdBy?: number | null
  createdByUser?: { email: string }
  createdAt: string
}

export interface BalanceSnapshot {
  onHand: string
  reserved: string
  inTransit: string
}

export interface StockMovementFilters {
  productId?: number
  warehouseId?: number
  stockType?: string
  dateRange?: [string, string]   // ISO YYYY-MM-DD
}
```
Re-export from `src/types/index.ts`. List responses use the existing `Base<T>` (`{ data, meta }`)
from `src/types/api.type.ts`; the optional `opening: BalanceSnapshot` rides alongside.

## 3. Service
`src/services/stockMovements.service.ts` — static class like `products.service.ts`:
```ts
export class StockMovementsService {
  private static readonly BASE_URL = API_ENDPOINTS.STOCK_MOVEMENTS
  static async list(queryString?: string): Promise<Base<StockMovement> & { opening?: BalanceSnapshot }> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get(url)
  }
}
```
Export from `src/services/index.ts`.

## 4. View
`src/views/stock-movements/StockMovementsView.vue` — uses `TableComponent` (lazy, server-side) with
a computed `url` built from active filters via `GenericQueryBuilder` (mirror
`views/audit-trails/AuditTrailsView.vue`):
- Date range → `GenericQueryBuilder.withFilter('createdAt', FilterOperator.BETWEEN, range.join(','))`
  OR the endpoint's `startDate`/`endDate` params (match whatever the BE expects — endpoint takes
  explicit `startDate`/`endDate`, so append those query params directly).
- `productId`, `warehouseId`, `stockType` → query params.
- Columns (`computed<Column[]>` for reactive i18n): Date (`createdAt`, `DateFormat.DATE_TIME`),
  Product, Warehouse, Stock Type, Movement Type, On-hand Δ, Reserved Δ, In-transit Δ,
  On-hand after, Reserved after, In-transit after, Reference No, Moved By.
- When a single product is selected, render an opening/closing balance summary card above the table
  using the response `opening` snapshot + the last in-range row's `*After` fields.

## 5. Filters component
`src/views/stock-movements/components/StockMovementFilters.vue` (mirror `AuditTrailFilters.vue`):
- PrimeVue `DatePicker` `selection-mode="range"`, `date-format="yy-mm-dd"`, `show-clear`,
  ISO-formatting on change.
- Product selector via `InfiniteSelect` (cascading dropdown component).
- Optional `warehouseId` selector and `stockType` dropdown (good/bad).
- Emits a `change` event with the `StockMovementFilters` payload; the view rebuilds `url`.

## 6. Routing, permission, nav
- `src/router/index.ts`: add child route under `MainLayout`:
  ```ts
  { path: 'stock-movements', name: 'StockMovements',
    component: () => import('@/views/stock-movements/StockMovementsView.vue'),
    meta: { requiredPermission: PERMISSIONS.STOCK_MOVEMENT_READ } }
  ```
- Add `STOCK_MOVEMENT_READ` to the permissions constant (and confirm the backend issues it).
- Add a sidebar nav entry (where audit-trails / products entries live).

## 7. i18n
Add a `stockMovements.*` namespace (title, column headers, movement-type labels, filter labels) to
`src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts`.

## 8. Tests
`src/views/stock-movements/components/StockMovementFilters.spec.ts` — Vitest + `@vue/test-utils`,
stub PrimeVue components (`DatePicker`, selects), assert the emitted `change` payload (product +
ISO date range) — following `views/audit-trails/components/AuditTrailFilters.spec.ts`.

---

## Verification
1. `npm run type-check && npm run lint && npm run test:unit` → all green.
2. `npm run dev`; open **Stock Movements**, pick a product + date range, confirm the table renders
   movements with running balances and that the date/product filters drive the request. With a
   single product selected, confirm the opening/closing summary appears.

## Progress
- [x] `STOCK_MOVEMENTS` endpoint constant
- [x] Types + barrel export
- [x] Service + barrel export
- [x] `StockMovementsView.vue`
- [x] `StockMovementFilters.vue`
- [x] Route + `STOCK_MOVEMENT_READ` permission + sidebar entry
- [x] i18n (en-US, id-ID)
- [x] Tests
- [ ] Verification pass
