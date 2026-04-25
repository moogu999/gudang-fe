# Price Matrix Priorities — Frontend Plan

## Context
Add a dedicated `/price-matrix-priorities` page where users manually build and manage the price matrix priority list. Users can add any price matrix (not already in the list) to the end, remove entries, and move them up/down. Integrates with the new backend endpoints.

---

## 1. Types

**File:** `src/types/price-matrix.type.ts`

Add:
```ts
export interface PriceMatrixPriorityItem {
  id: number
  priority: number
  code: string
  description: string | null
}
```

---

## 2. API Constants

**File:** `src/constants/api.ts`

Add:
```ts
PRICE_MATRIX_PRIORITIES: '/v1/price-matrix-priorities',
PRICE_MATRIX_PRIORITY_LIST: '/v1/price-matrix-priority-list',
PRICE_MATRIX_PRIORITY_LIST_ITEM: (id: number) => `/v1/price-matrix-priority-list/${id}`,
PRICE_MATRIX_PRIORITY: (id: number) => `/v1/price-matrices/${id}/priority`,
```

---

## 3. Service

**File:** `src/services/price-matrices.service.ts`

Add four methods:
```ts
getPriorities(): Promise<{ data: PriceMatrixPriorityItem[] }>
// GET API.PRICE_MATRIX_PRIORITIES

addToPriorityList(priceMatrixId: number): Promise<void>
// POST API.PRICE_MATRIX_PRIORITY_LIST  body: { price_matrix_id: priceMatrixId }

removeFromPriorityList(priceMatrixId: number): Promise<void>
// DELETE API.PRICE_MATRIX_PRIORITY_LIST_ITEM(priceMatrixId)

movePriority(id: number, direction: 'up' | 'down'): Promise<void>
// PATCH API.PRICE_MATRIX_PRIORITY(id)  body: { direction }
```

---

## 4. View

**File:** `src/views/price-matrices/PriceMatrixPrioritiesView.vue` (new)

### Data fetching
- `priorities` ref — result of `getPriorities()`; loaded on `onMounted` and after every mutating action.
- `availableMatrices` ref — all price matrices from the generic CRUD endpoint filtered client-side to exclude those already in `priorities`. Used to populate the add dropdown.

### Layout
Two sections:

**Add section (top)**
- An `InfiniteSelect` (or plain PrimeVue `Select`) listing price matrices not yet in the priority list (`option-label="code"`, `option-value="id"`).
- An "Add" button next to it (disabled when nothing selected or `!canWrite`).
- On click: call `addToPriorityList(selectedId)`, clear selection, re-fetch both lists. Show error toast on 409 (already in list) or other failures.

**Priority list table**
- PrimeVue `DataTable` (no pagination, full list).
- Columns:

  | Column | Content |
  |---|---|
  | Priority | `item.priority` |
  | Code | `item.code` |
  | Description | `item.description` |
  | Actions | ↑ button + ↓ button + Remove button |

- ↑ disabled when `item.priority === 1`.
- ↓ disabled when item is last (`index === priorities.length - 1`).
- All action buttons hidden with `v-if="canWrite"`.
- Global `loading` ref disables all action buttons while any request is in-flight.
- On ↑/↓: call `movePriority(item.id, direction)`, re-fetch. Show error toast on 409 (boundary).
- On Remove: call `removeFromPriorityList(item.id)`, re-fetch. Show error toast on failure.

---

## 5. Permissions

**File:** `src/constants/permissions.ts`

Add `/price-matrix-priorities` to both maps (reuses existing `PRICE_MATRIX_*` permissions):
```ts
// In ROUTE_PERMISSIONS:
'/price-matrix-priorities': PERMISSIONS.PRICE_MATRIX_READ,

// In ROUTE_WRITE_PERMISSIONS:
'/price-matrix-priorities': PERMISSIONS.PRICE_MATRIX_WRITE,
```

In `PriceMatrixPrioritiesView.vue`, use `usePermissions`:
```ts
const { canWrite } = usePermissions('/price-matrix-priorities')
```

Gate the add button and all row action buttons with `v-if="canWrite"`.

---

## 6. Router

**File:** `src/router/index.ts`

Add:
```ts
{
  path: '/price-matrix-priorities',
  name: 'PriceMatrixPriorities',
  component: () => import('@/views/price-matrices/PriceMatrixPrioritiesView.vue'),
  meta: { requiresAuth: true },
}
```

---

## 7. Navigation Menu

**File:** `src/components/menu/menu.ts`

Add entry in the Products section directly after the Price Matrices entry:
```ts
{
  label: t('navigation.priceMatrixPriorities'),
  route: '/price-matrix-priorities',
}
```

---

## 8. i18n

**Files:** `src/locales/en-US.json` and `src/locales/id-ID.json`

Add under `navigation`:
```json
"priceMatrixPriorities": "Price Matrix Priority"
```

Add new top-level key:
```json
"priceMatrixPriority": {
  "title": "Price Matrix Priority",
  "addPlaceholder": "Select a price matrix to add",
  "columns": {
    "priority": "Priority",
    "code": "Code",
    "description": "Description"
  },
  "actions": {
    "add": "Add",
    "moveUp": "Move Up",
    "moveDown": "Move Down",
    "remove": "Remove"
  },
  "messages": {
    "moved": "Priority updated.",
    "added": "Price matrix added to priority list.",
    "removed": "Price matrix removed from priority list."
  },
  "errors": {
    "alreadyAtBoundary": "Already at the boundary of the priority list.",
    "alreadyInList": "This price matrix is already in the priority list."
  }
}
```

For `id-ID.json`, translate accordingly.

---

## Critical Files
| File | Change |
|---|---|
| `src/types/price-matrix.type.ts` | Add `PriceMatrixPriorityItem` |
| `src/constants/api.ts` | Add 4 constants |
| `src/constants/permissions.ts` | Add `/price-matrix-priorities` to route permission maps |
| `src/services/price-matrices.service.ts` | Add `getPriorities`, `addToPriorityList`, `removeFromPriorityList`, `movePriority` |
| `src/views/price-matrices/PriceMatrixPrioritiesView.vue` | New — add dropdown + priority table with move/remove actions |
| `src/router/index.ts` | Add route |
| `src/components/menu/menu.ts` | Add nav entry |
| `src/locales/en-US.json` | Add i18n keys |
| `src/locales/id-ID.json` | Add i18n keys (translated) |
