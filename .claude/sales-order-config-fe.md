# Sales Order Config — Frontend Plan

## Overview

Add a config management page for per-branch SO date defaults, and update the create-SO form to auto-populate delivery/expiry dates from the config.

---

## Step 1: Types (`src/types/salesOrderConfig.type.ts`)

```ts
export interface SalesOrderConfig {
  id: number
  branchId: number
  branchName: string
  deliveryDateOffset: number
  expiredDateOffset: number
  createdAt: string
  updatedAt?: string
}

export interface UpsertSalesOrderConfigDto {
  deliveryDateOffset: number
  expiredDateOffset: number
}
```

---

## Step 2: Service (`src/services/salesOrderConfig.service.ts`)

```ts
import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { SalesOrderConfig, UpsertSalesOrderConfigDto } from '@/types/salesOrderConfig.type'

export class SalesOrderConfigService {
  static async getMyBranch(): Promise<SalesOrderConfig | null> {
    // returns null on 404 (no config for primary branch)
  }
  static async list(): Promise<SalesOrderConfig[]> { ... }
  static async getByBranch(branchId: number): Promise<SalesOrderConfig> { ... }
  static async upsert(branchId: number, dto: UpsertSalesOrderConfigDto): Promise<SalesOrderConfig> { ... }
  static async delete(branchId: number): Promise<void> { ... }
}
```

Export from `src/services/index.ts`.

---

## Step 3: API Constants (`src/constants/api.ts`)

Append:
```ts
SALES_ORDER_CONFIGS: '/v1/sales-order-configs',
SALES_ORDER_CONFIG_MY_BRANCH: '/v1/sales-order-configs/my-branch',
SALES_ORDER_CONFIG_BY_BRANCH: (branchId: number) => `/v1/sales-order-configs/${branchId}`,
```

---

## Step 4: Permission Constants (`src/constants/permissions.ts`)

Append to `PERMISSIONS`:
```ts
SALES_ORDER_CONFIG_READ: 47,
SALES_ORDER_CONFIG_WRITE: 48,
```

Add to `ROUTE_PERMISSIONS`:
```ts
'/sales-order-configs': PERMISSIONS.SALES_ORDER_CONFIG_READ,
```

Add to `ROUTE_WRITE_PERMISSIONS`:
```ts
'/sales-order-configs': PERMISSIONS.SALES_ORDER_CONFIG_WRITE,
```

---

## Step 5: Config Management Page

### `src/views/sales-order-configs/SalesOrderConfigsView.vue`

- Fetches configs via `SalesOrderConfigService.list()` (only users with `SALES_ORDER_CONFIG_READ` reach this route)
- Table columns: Branch Name, Delivery Offset (days), Expiry Offset (days), Actions
- Toolbar with "Add" button — visible only if `canWrite` (from `usePermissions('/sales-order-configs')`)
- `TableActionButtons` with edit/delete — shown only if `canWrite`
- Uses `useConfirmDelete` pattern for delete confirmation
- Opens `SalesOrderConfigDialog` for ADD/EDIT/VIEW modes

### `src/views/sales-order-configs/SalesOrderConfigDialog.vue`

Fields:
- **Branch** — `InfiniteSelect` or `Select` populated from `authStore.branchIds` (filtered to branches not yet configured when ADD; disabled when EDIT)
- **Delivery Date Offset** — `InputNumber` (integer, min: 0, suffix: " days")
- **Expiry Date Offset** — `InputNumber` (integer, min: 0, suffix: " days")

Zod schema:
```ts
z.object({
  branchId: z.number().int().positive(),
  deliveryDateOffset: z.number().int().min(0),
  expiredDateOffset: z.number().int().min(0),
})
```

On submit: `SalesOrderConfigService.upsert(branchId, { deliveryDateOffset, expiredDateOffset })`

---

## Step 6: Router (`src/router/index.ts`)

Add inside the authenticated layout route:
```ts
{
  path: 'sales-order-configs',
  name: 'SalesOrderConfigs',
  component: () => import('@/views/sales-order-configs/SalesOrderConfigsView.vue'),
  meta: { requiredPermission: PERMISSIONS.SALES_ORDER_CONFIG_READ },
},
```

---

## Step 7: Navigation Menu (`src/components/menu/menu.ts`)

Add to the Sales section (near `Sales Orders`):
```ts
{ label: 'SO Config', route: '/sales-order-configs' }
```

---

## Step 8: SalesOrderForm Auto-populate (`src/views/sales-orders/SalesOrderForm.vue`)

On form mount (`onMounted`):
1. Call `SalesOrderConfigService.getMyBranch()` — catch errors/404, treat as null
2. Store result as `soConfig`

Track `deliveryDateAutoFilled` and `expiredDateAutoFilled` flags (default `true`; set to `false` when user manually edits the respective date field via `@update:modelValue` or similar).

Computed auto-fill logic (or a `watchEffect`):
```ts
watch(orderDate, (newDate) => {
  if (!soConfig.value || !newDate) return
  if (deliveryDateAutoFilled.value) {
    form.deliveryDate = addDays(newDate, soConfig.value.deliveryDateOffset)
  }
  if (expiredDateAutoFilled.value) {
    form.expiredDate = addDays(newDate, soConfig.value.expiredDateOffset)
  }
}, { immediate: true })
```

Use a simple `addDays(date: Date, days: number): Date` helper (or `date-fns/addDays` if already available in the project).

When user manually changes a date field, set the corresponding flag to `false`:
```ts
function onDeliveryDateChange(val: Date) {
  deliveryDateAutoFilled.value = false
  form.deliveryDate = val
}
```

---

## Verification

```bash
npm run dev
```

- Assign `SALES_ORDER_CONFIG_READ` + `SALES_ORDER_CONFIG_WRITE` to test user's role
- Navigate to `/sales-order-configs` → page loads, empty list
- Click Add → pick branch, set delivery offset = 7, expiry offset = 30 → Save
- Config appears in list
- Open create-SO form → `deliveryDate` pre-filled as today + 7, `expiredDate` as today + 30
- Change order date to tomorrow → both dates shift by one day
- Manually set delivery date to a different value → date no longer shifts on order date change
- User without `SALES_ORDER_CONFIG_WRITE` → no Add/Edit/Delete buttons visible
- User without `SALES_ORDER_CONFIG_READ` → route redirects (permission guard)
- `npm run type-check` passes
- `npm run lint` passes
