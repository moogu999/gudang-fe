# Price List — Frontend Plan (`gudang-fe`)

## Context

Price lists will be managed through dedicated pages — list, create, edit, detail — mirroring the existing `Customers` flow. No dialogs for the main CRUD. The only dialog used is a small `AddProductDialog.vue` for picking a product to add as a line item; if an inline `InfiniteSelect` in the line-item row works cleanly, we drop the dialog entirely.

Tier editing happens inline in the create/edit page: each line item row expands to reveal a tier sub-table with add/remove buttons for rows.

## Routes (`src/router/index.ts`)

Add under the authenticated layout, following the Customer shape:

```ts
{ path: 'price-lists', name: 'PriceLists',
  component: () => import('@/views/price-lists/PriceListsView.vue'),
  meta: { requiredPermission: PERMISSIONS.PRICE_LIST_READ } },
{ path: 'price-lists/create', name: 'PriceListCreate',
  component: () => import('@/views/price-lists/PriceListCreateView.vue'),
  meta: { requiredPermission: PERMISSIONS.PRICE_LIST_WRITE } },
{ path: 'price-lists/:id', name: 'PriceListDetail',
  component: () => import('@/views/price-lists/PriceListDetailView.vue'),
  meta: { requiredPermission: PERMISSIONS.PRICE_LIST_READ } },
{ path: 'price-lists/:id/edit', name: 'PriceListEdit',
  component: () => import('@/views/price-lists/PriceListEditView.vue'),
  meta: { requiredPermission: PERMISSIONS.PRICE_LIST_WRITE } },
```

## Permissions (`src/constants/permissions.ts`)

```ts
PRICE_LIST_READ:  26,
PRICE_LIST_WRITE: 27,
```

And register in `ROUTE_PERMISSIONS` / `ROUTE_WRITE_PERMISSIONS` for `/price-lists`.

## API (`src/constants/api.ts`)

```ts
GEN_PRICE_LISTS: '/gen/v1/price-lists',
PRICE_LISTS:     '/v1/price-lists',
```

## Service (`src/services/price-lists.service.ts`)

Follow `CustomersService` shape. Methods:
- `list(queryString?)` → `ApiService.get<Base<PriceListSummary>>(GEN_PRICE_LISTS?…)`
- `getById(id)` → `GET /v1/price-lists/{id}` returning nested `PriceList`.
- `create(dto)` → `POST /v1/price-lists`.
- `update(id, dto)` → `PUT /v1/price-lists/{id}`.
- `delete(id)` → `DELETE /gen/v1/price-lists/{id}`.

## Types (`src/types/price-list.ts`)

```ts
export interface PriceListTier { id?: number; minQuantity: string; price: string }
export interface PriceListItem {
  id?: number
  productId: number
  product?: { id: number; code: string; name: string; smallestUomName: string }
  currencyId: number
  currency?: { id: number; code: string; name: string }
  taxIncluded: boolean
  tiers: PriceListTier[]
}
export interface PriceList {
  id: number; code: string; description: string
  startDate: string          // YYYY-MM-DD
  endDate: string | null
  items: PriceListItem[]
}
```

## Pages

### `PriceListsView.vue`
Uses `TableComponent` with `url = GEN_PRICE_LISTS`. Columns: `code`, `description`, `startDate`, `endDate` (display "—" when null), actions (view/edit/delete). Header has a "Create" button guarded by `canWrite`.

### `PriceListForm.vue`
Reusable by create & edit, props `{ mode, initial? }`. Sections:

1. **Header**: `InputText` code, `InputText` description, `DatePicker` startDate (required), `DatePicker` endDate (nullable — include an explicit "No end date" checkbox that clears the value).
2. **Items** table: rows contain product (`InfiniteSelect` → products), currency (`InfiniteSelect` → currencies, `option-label="code"`, `option-value="id"`; set `initial-option` when editing so the selected currency is pre-populated regardless of pagination), taxIncluded (`Checkbox`). Row action to add tier, remove item.
3. **Tiers** shown as an inline expansion under each item row — a small editable grid with columns `minQuantity`, `price`, remove; plus an "Add tier" button. The UI enforces that a tier with `minQuantity=0` exists before submit (the form pre-seeds one that cannot be removed).

Submission converts all decimal inputs with `String(value)`; emits DTO to the parent view.

Smallest UOM label pulled from the product lookup payload (products API already includes UOM group; if the smallest UOM is not currently included, add it to the product response — note as a follow-up in the backend plan if needed).

### `PriceListCreateView.vue`
Wraps `PriceListForm` in create mode; on success toasts and `router.push({ name: 'PriceLists' })`.

### `PriceListEditView.vue`
Loads via `PriceListsService.getById(id)`, passes to `PriceListForm` in edit mode; on success routes back to detail.

### `PriceListDetailView.vue`
Read-only rendering of header + item/tier tables. "Edit" button guarded by `canWrite`.

## Menu (`src/components/menu/menu.ts`)

Add under the "Products" group (or whichever group feels right — check existing grouping):

```ts
{ label: 'Price Lists', labelKey: 'navigation.priceLists', route: '/price-lists' }
```

Add i18n key `navigation.priceLists` in the locale files.

## Files to create/modify

Create:
- `src/views/price-lists/PriceListsView.vue`
- `src/views/price-lists/PriceListCreateView.vue`
- `src/views/price-lists/PriceListEditView.vue`
- `src/views/price-lists/PriceListDetailView.vue`
- `src/views/price-lists/PriceListForm.vue`
- `src/services/price-lists.service.ts`
- `src/types/price-list.ts`

Modify:
- `src/router/index.ts`
- `src/constants/permissions.ts`
- `src/constants/api.ts`
- `src/components/menu/menu.ts`
- i18n locale files

## Verification

1. `npm run type-check` and `npm run lint` pass.
2. `npm run dev` against local backend; sign in with a user that has permissions 26 + 27.
3. Manual flow: create a price list with two items, one having three tiers (0, 100, 1000); save → list shows new row → open detail → edit (add another tier, remove an item) → save; detail reflects changes.
4. Permission guard: temporarily strip permission 26 from the role and confirm `/price-lists` redirects home.
5. Decimal fidelity: enter `1000000.50` for a price, submit, reload edit — value round-trips exactly.
