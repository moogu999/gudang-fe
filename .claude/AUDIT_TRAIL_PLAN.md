# Audit Trail — Frontend Plan

> Parent plan: `../.claude/AUDIT_TRAIL_PLAN.md` (master, contains schema + verification)
> Backend plan: `../gudang-be/.claude/AUDIT_TRAIL_PLAN.md`

## Context

The frontend introduces an `/audit-trails` page that lists changes captured by the backend audit subsystem and a detail page that shows the prev/curr JSON snapshots side-by-side, GitHub-diff style. The list supports filtering by reference type, then a searchable reference (via the entity's own list endpoint), then a date range — the cascade matches how a user would actually narrow history ("show me changes for Promotion P-2026-001 last week").

## New module: `src/views/audit-trails/`

```
src/views/audit-trails/
├── AuditTrailsView.vue            # list + filters
├── AuditTrailDetailView.vue       # detail with split diff
└── components/
    ├── AuditTrailFilters.vue      # ref-type + ref + date-range
    └── AuditTrailDiffViewer.vue   # GitHub-style split diff
```

## Types — `src/types/auditTrail.type.ts`

```ts
export type AuditReferenceType = 'promotion' // extend as more entities opt in

export type AuditTrailListItem = {
  id: number
  referenceType: AuditReferenceType
  referenceId: number
  description: string
  createdAt: string
  createdBy: { id: number; email: string; name?: string }
}

export type AuditTrail = AuditTrailListItem & {
  prev: Record<string, unknown> | null
  curr: Record<string, unknown> | null
}
```

Re-export from `src/types/index.ts` barrel.

## Reference-type registry — `src/constants/auditReferenceTypes.ts`

Each registered type carries a `fetchFn` (lazy-imports `ApiService` and calls the
entity's own list endpoint) so the filter can render a searchable reference picker:

```ts
import { API_ENDPOINTS } from './api'
import type { Base } from '@/types/api.type'

export const AUDIT_REFERENCE_TYPES: Record<string, AuditReferenceTypeEntry> = {
  promotion: {
    label: 'Promotion',
    labelKey: 'auditTrails.references.promotion',
    listEndpoint: API_ENDPOINTS.GEN_PROMOTIONS,
    fetchFn: async (query: string) => {
      const { default: ApiService } = await import('@/services/api')
      const url = query ? `${API_ENDPOINTS.GEN_PROMOTIONS}?${query}` : API_ENDPOINTS.GEN_PROMOTIONS
      return ApiService.get<Base<Record<string, unknown>>>(url)
    },
    codeField: 'code', // used as the InfiniteSelect display label
  },
}
```

Pilot ships `promotion`; every future entity that opts into audit MUST also be
registered here — see the checklist below.

## Registering a new reference type on `/audit-trails` (MANDATORY per module)

Backend emitting audit rows is **not enough** for a good page experience. Whenever
a module starts recording audit (e.g. `customer`, `employee`, `price_list`), do all
four FE steps so the entry is filterable, labeled, and click-through. Rows still
appear in the list without these (the list has no type whitelist), but the type
won't be selectable in the filter, the Reference Type column shows the raw i18n
key, and the Reference ID isn't a link.

1. **Type union** — add the `reference_type` string to `AuditReferenceType` in
   `src/types/auditTrail.type.ts` (e.g. `'promotion' | 'employee' | 'customer'`).
2. **Registry entry** — add a `<type>` entry to `AUDIT_REFERENCE_TYPES` with
   `{ label, labelKey, listEndpoint, fetchFn, codeField }`. `listEndpoint`/`fetchFn`
   point at the entity's list endpoint; `codeField` is what the picker shows
   (the reference `InfiniteSelect` sorts by `code`).
3. **i18n label** — add `auditTrails.references.<type>` to **both**
   `src/i18n/locales/en-US.ts` and `id-ID.ts` (otherwise the column renders the
   raw key).
4. **Reference deep-link** — add a `v-else-if` branch in `AuditTrailsView.vue`
   that links `referenceId` to the entity detail route (`/<entity>/{id}`),
   mirroring the existing promotion/employee branches. Verify the target route
   exists in `src/router/index.ts`.

The detail view (`AuditTrailDetailView.vue`) and diff viewer are generic — no
per-type changes needed there.

## Service — `src/services/auditTrails.service.ts`

Static class mirroring `PromotionsService` (`src/services/promotions.service.ts`):

```ts
export class AuditTrailsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_AUDIT_TRAILS

  static async list(queryString?: string): Promise<Base<AuditTrailListItem>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<AuditTrailListItem>>(url)
  }

  static async getById(id: number): Promise<AuditTrail> {
    return ApiService.get<AuditTrail>(`${API_ENDPOINTS.AUDIT_TRAILS}/${id}`)
  }
}
```

Export from `src/services/index.ts` barrel.

Add endpoints to `src/constants/api.ts`:

- `GEN_AUDIT_TRAILS: '/gen/v1/audit-trails'`
- `AUDIT_TRAILS:     '/v1/audit-trails'`

## List view — `AuditTrailsView.vue`

- Filter bar above `TableComponent` (reactive):
  - **Reference Type**: PrimeVue `Select`, options from the registry, defaults to none.
  - **Reference**: `InfiniteSelect` bound to `AUDIT_REFERENCE_TYPES[type].listEndpoint`, label = `item[codeField]`. Disabled until type is chosen; clears when type changes.
  - **Date range**: PrimeVue `DatePicker` with `selectionMode="range"`.
- Filters are applied by extending `GenericQueryBuilder`:
  - `filterBy=referenceType&filterOperator=0&filterValue=promotion`
  - `filterBy=referenceId&filterOperator=0&filterValue=42`
  - `filterBy=createdAt&filterOperator=1&filterValue=2026-01-01,2026-05-13`
- Columns: Reference Type, Reference ID, Description (truncated, full in tooltip), Created By (email), Created At (formatted via `dayjs`).
- Row click → `router.push({ name: 'AuditTrailDetail', params: { id } })`.

## Detail view — `AuditTrailDetailView.vue`

- Header: back button, ref type/id, who/when.
- Body: `AuditTrailDiffViewer` for prev/curr.
- On mount: `AuditTrailsService.getById(route.params.id)`; show `Message severity="error"` if not found (same pattern as `PromotionDetailView.vue`).

## Diff viewer — `AuditTrailDiffViewer.vue`

- Props: `{ prev: object | null; curr: object | null }`.
- Pretty-print both with `JSON.stringify(value, null, 2)`; treat `null` as the empty side.
- Compute diff via `diffLines(prevString, currString)` from `diff` (jsdiff).
- Align into row pairs:
  - Walk diff parts in order.
  - For each `unchanged` chunk: emit N pairs of `(left, right)` identical lines.
  - For each `removed` chunk: emit N `(left, blank)` pairs.
  - For each `added` chunk: emit N `(blank, right)` pairs.
  - When a `removed` chunk is immediately followed by an `added` chunk, merge them into balanced pairs of `(left removed, right added)` for that count.
- Render as two-column grid with line numbers; Tailwind classes: `bg-red-50`/`bg-green-50` rows, monospaced font, `whitespace-pre`, horizontally scrollable.
- Empty state: if `prev === null` show "Created" banner over left pane; if `curr === null` show "Deleted" over right pane.

## Routes — `src/router/index.ts`

```ts
{
  path: 'audit-trails',
  name: 'AuditTrails',
  component: () => import('@/views/audit-trails/AuditTrailsView.vue'),
  meta: { requiredPermission: PERMISSIONS.AUDIT_TRAIL_READ },
},
{
  path: 'audit-trails/:id',
  name: 'AuditTrailDetail',
  component: () => import('@/views/audit-trails/AuditTrailDetailView.vue'),
  meta: { requiredPermission: PERMISSIONS.AUDIT_TRAIL_READ },
},
```

## Menu — `src/components/menu/menu.ts`

Add inside the **Access Controls** parent:

```ts
{ label: 'Audit Trails', labelKey: 'navigation.auditTrails', route: '/audit-trails' }
```

## Permissions — `src/constants/permissions.ts`

- `AUDIT_TRAIL_READ: 34` (match the backend ID).
- `ROUTE_PERMISSIONS['/audit-trails'] = PERMISSIONS.AUDIT_TRAIL_READ`.

## i18n — `src/i18n/locales/{en-US,id-ID}.ts`

Add keys:

- `navigation.auditTrails`
- `auditTrails.title`
- `auditTrails.filters.{type,reference,dateRange}`
- `auditTrails.columns.{referenceType,referenceId,description,createdBy,createdAt}`
- `auditTrails.detail.{title,createdAt,changedBy,previous,current,created,deleted}`
- `auditTrails.references.<type>` — one per registered reference type (e.g. `promotion`, `employee`, `customer`); add whenever a new module opts into audit (see "Registering a new reference type" above)

## Dependency

- `npm install diff`
- `npm install -D @types/diff`

No other new deps.

## Existing utilities reused

- `TableComponent` (`src/components/table/TableComponent.vue`)
- `GenericQueryBuilder` (`src/services/genericQueryBuilder.ts`)
- `ResponsiveCard` (`src/components/card/ResponsiveCard.vue`)
- `InfiniteSelect` (`src/components/select/InfiniteSelect.vue`)
- `commonErrorToast` from `src/services/toast.ts`
- `dayjs` + `DateFormat` from `src/constants/dateFormat.ts`

## Tests (Vitest)

- `src/views/audit-trails/components/AuditTrailDiffViewer.spec.ts` — given prev/curr, expect known row-pair sequence (covers added/removed/changed/unchanged plus null-prev "Created" banner and null-curr "Deleted" banner).
- `src/views/audit-trails/components/AuditTrailFilters.spec.ts` — selecting a reference type enables Reference; switching type clears the Reference value.

## Verification

1. `npm install` to pull `diff` + `@types/diff`.
2. `npm run type-check` clean.
3. `npm run test:unit` — new specs pass.
4. `npm run dev` against a backend with the new migrations applied:
   - `/audit-trails` lists the audit rows produced by promotion CRUD with formatted dates and creator email.
   - Filter cascade: pick Promotion → search by code via InfiniteSelect → narrow the date range; list updates.
   - Click a row → detail page shows split diff with red/green highlighting; "Created"/"Deleted" banners on respective sides for create/delete entries.
   - Permission gate: a user without `AUDIT_TRAIL_READ` sees no menu item and is blocked by the router guard on direct URL access.
