# Reason Code — Frontend Plan

**Status:** IMPLEMENTED 2026-10-10 (phases 3–4; live E2E not run yet).
**Master plan:** `../../.claude/reason-code-master-plan.md` (decisions D1–D12, E2E §9). Backend contract: `../../gudang-be/.claude/reason-code-be.md` §2. This doc covers phases 3–4.

**Form = dialog** (user decision: not the mockup's side panel). The pattern is `src/views/payment-methods/` (View + Dialog), with the Auto/Manual code toggle from `src/views/suppliers/SupplierDialog.vue`.

---

## 1. Wiring (phase 3)

| File | Change |
|---|---|
| `src/constants/api.ts` | `REASONS: '/v1/reasons'` |
| `src/constants/permissions.ts` | `REASON_READ: 139`, `REASON_WRITE: 140`; `'/reasons'` in the read map and the write map |
| `src/router/index.ts` | `{ path: 'reasons', name: 'Reasons', component: () => import('@/views/reasons/ReasonsView.vue'), meta: { requiredPermission: PERMISSIONS.REASON_READ, titleKey: 'navigation.reasons' } }` |
| `src/components/menu/menu.ts` | `{ label: 'Reasons', labelKey: 'navigation.reasons', route: '/reasons' }`, right after Device Binding |
| `src/types/reason.type.ts` (+ export from `src/types` index) | See below |
| `src/services/reasons.service.ts` (+ export from `src/services` index) | `list(params?)`, `get(id)`, `create(payload)`, `update(id, payload)`, `delete(id)`, `reorder(type, ids)`. Follow `salesTeams.service.ts` |

### Types

```ts
export type ReasonType =
  | 'customer_no_order' | 'outside_radius' | 'skipped_visit'
  | 'return' | 'order_cancellation' | 'msl_not_sold'

/** Tab order; prefix is display-only (the number series owns the real prefix). */
export const REASON_TYPES: { key: ReasonType; prefix: string }[] = [ … six, in master order … ]

export type ReasonStockType = 'good' | 'bad'

export interface Reason {
  id: number; code: string; type: ReasonType; name: string
  forTakingOrder: boolean; forCanvass: boolean
  requiresPhoto: boolean; requiresNote: boolean
  defaultStockType?: ReasonStockType      // omitted (not null) for non-return types
  sortOrder: number; isActive: boolean
  createdAt: string; updatedAt?: string; updatedByName?: string
}

export interface ReasonCreatePayload { code?: string; type: ReasonType; name: string; forTakingOrder: boolean; forCanvass: boolean; requiresPhoto: boolean; requiresNote: boolean; defaultStockType?: ReasonStockType }
export type ReasonUpdatePayload = Omit<ReasonCreatePayload, 'code' | 'type'> & { isActive: boolean }
```

---

## 2. `src/views/reasons/ReasonsView.vue` (phase 4)

### Layout

- `Toast` + `ConfirmationDialog` sharing one overlay group (`'reasonsView'`).
- An `h1` title, then a `Toolbar` with an "Add reason" `ResponsiveButton` (only when `canWrite` from `usePermissions('/reasons')`).
- `ResponsiveCard` containing:
  1. **Tabs** (PrimeVue `Tabs/TabList/Tab`), one per `REASON_TYPES` entry: the label plus a `Badge` with the type's **active** count. The active tab is a ref, remembered in the route query `?type=` so a reload keeps it.
  2. **Filter row**: a search `InputText` (code or name, client-side, case-insensitive), a selling-mode `Select` (All / Taking Order / Canvas), and a status `Select` (Active default / Inactive / All).
  3. **Plain `DataTable`** over the filtered rows of the active tab. The rows are already ordered by the server (active by `sortOrder`, then inactive).
  4. A muted note: "Display order in the app follows the order of active rows. Keep 'Other' last."
- A `Dialog` hosting `ReasonDialog` with the same breakpoints and style as `PaymentMethodsView.vue`.

### Data

One `ReasonsService.list()` on mount loads every reason (unpaged). Counts, tab filtering, search and filters are all `computed`. Refetch after a dialog save, a delete, or a reorder error.

### Why not `TableComponent`

It is lazy and server-paged, and it has no row reorder. A type holds tens of rows, so a plain `DataTable` is simpler. The same trade-off was accepted for Cash Deposit's custom table.

### Columns

| Column | Notes |
|---|---|
| Reorder handle | `<Column rowReorder>`. **Rendered only when** `canWrite && status === 'active' && !search && mode === 'all'`. Reordering a filtered subset is ambiguous, and the server needs exactly the active id set |
| Code | Monospace |
| Name | |
| Photo | `pi pi-camera` when `requiresPhoto`, otherwise a muted dot |
| Note | `pi pi-pencil` when `requiresNote`, otherwise a muted dot |
| Modes | Small tags "TO" / "KV", with the full label as a tooltip |
| Default stock | **Return tab only**: a Good/Bad tag |
| Status | Active / Inactive `Tag` (same as Payment Methods) |
| Actions | `TableActionButtons` (view / edit / delete, `can-write`) |

Inactive rows get a muted `rowClass`.

### Reorder

`@row-reorder="onRowReorder"`:

1. Optimistically apply `event.value` to the local list.
2. Call `ReasonsService.reorder(activeType, ids)`.
3. On an error (e.g. `stale_order` because someone else edited the type), show an error toast with `reasons.errors.staleOrder` and refetch.

### Delete

`useConfirmDelete({ overlayGroup, entityName: 'reason', onSuccess: refetch })`. A 409 `last_active_reason` or `reason_in_use` must show its specific i18n message rather than the generic delete failure. Check whether `useConfirmDelete` surfaces the server message. If it doesn't, catch it locally and toast `reasons.errors.<code>`.

### Add

Opens the dialog in ADD mode with `initialType = activeTab`.

---

## 3. `src/views/reasons/ReasonDialog.vue` (phase 4)

Props: `mode: DialogMode`, `reason?: Reason`, `initialType?: ReasonType`. Emits `close(saved: boolean)`. Uses the same PrimeVue `Form` + resolver pattern as `PaymentMethodDialog.vue`.

| Field | ADD | EDIT | VIEW | Notes |
|---|---|---|---|---|
| Type | `Select` of `REASON_TYPES` (i18n labels), default `initialType` | disabled + `pi pi-lock` hint "Type can't be changed after saving" | disabled | |
| Type info | `Message severity="info"` | same | same | `reasons.types.<key>.trigger` + `.impact` |
| Code | Auto/Manual toggle copied from `SupplierDialog.vue` (lines ~15–60). Auto = read-only preview from `NumberSeriesService.preview('reasons.' + type)`, **refetched when the type changes**, with an "assigned on save" hint. Manual = `InputText` max 32 | read-only | read-only | |
| Name | `InputText` maxlength 40 + a `n/40` counter | editable | read-only | Required |
| Selling modes | Two `Checkbox`es: Taking Order, Canvas | editable | read-only | At least one (resolver error on the group) + hint "Follows the employee type: Salesman = Taking Order, Canvass = Canvas" |
| Default stock type | `RadioButton` Good / Bad, **only when type = `return`** | same | same | Required for return. Use a local ref, not `SelectButton`, because of the programmatic-write bug. Example hint copied from the mockup |
| Requires photo | `ToggleSwitch` row with a description | editable | read-only | |
| Requires note | `ToggleSwitch` row with a description | editable | read-only | |
| Active | hidden (new = active) | `ToggleSwitch` with a description "Inactive reasons disappear from the app after the next sync; history is kept" | read-only | |
| Footer | Cancel / Save | "Last changed: {updatedByName} · {updatedAt}" + Cancel / Save | Close | Date via `DateFormat.DATE_TIME` |

When the type changes away from `return` in ADD, clear `defaultStockType`. Never send it for other types.

### Server error mapping on save (by `code`)

| Server `code` | Shown on |
|---|---|
| `code_duplicate` | the Code field |
| `name_duplicate` | the Name field |
| `last_active_reason` | a toast + an inline error under Active / Selling modes |
| anything else | the generic error toast |

### Payload

ADD sends `ReasonCreatePayload`, omitting `code` in Auto mode. EDIT sends `ReasonUpdatePayload`. Trim the name and code.

---

## 4. i18n (`src/i18n/locales/en-US.ts` + `id-ID.ts`, same keys, same order)

```
navigation.reasons                                  Reasons / Alasan
reasons.title                                       Reason Codes / Kode Alasan
reasons.add | edit | view                           Add reason / Edit reason / View reason (+ id)
reasons.types.<key>.label                           (master §3 table)
reasons.types.<key>.trigger                         "Appears when …" / "Muncul saat …"
reasons.types.<key>.impact                          "Impact: …" / "Dampak: …"
reasons.fields.{type,code,name,sellingModes,defaultStockType,requiresPhoto,requiresNote,active,lastChanged}
reasons.fields.{requiresPhotoHint,requiresNoteHint,activeHint,typeLockedHint}
reasons.sellingModes.{takingOrder,canvas,takingOrderShort,canvasShort}   Taking Order/Kanvas, TO/KV
reasons.stockTypes.{good,bad}                       Good Stock / Bad Stock
reasons.filters.{search,allModes,statusActive,statusInactive,statusAll}
reasons.hints.{order,sellingModes,stockTypeExample,codeAssignedOnSave}
reasons.errors.{codeDuplicate,nameDuplicate,lastActiveReason,inUse,staleOrder,noSellingMode,stockTypeRequired}
```

The UI says **Customer**, not Outlet. The `customer_no_order` label is "Customer Didn't Order" / "Customer Tidak Order".

---

## 5. Tests and checks

- `src/services/reasons.service.spec.ts`: paths and payloads for every method, including the `reorder` body `{ type, ids }`.
- `src/views/reasons/ReasonDialog.spec.ts`:
  - the type is disabled in EDIT
  - the stock type is shown only for `return` and cleared when switching away
  - unchecking both modes blocks submit
  - Auto mode calls the preview with `reasons.<type>` and calls it again on a type change
  - a 409 `name_duplicate` shows on the name field
- `src/views/reasons/ReasonsView.spec.ts` (light):
  - the tab counts come from active rows only
  - the reorder handle is hidden when a search is active or without `canWrite`
- Run `npm run type-check`, `npm run lint` and `npm run test:unit`.
- Live E2E: master §9 with Playwright, keeping the PrimeVue `.fill()` gotchas in mind (InputNumber/DatePicker; not used here, but the Select/Checkbox clicks need `click`, not `fill`). Stop the dev servers by PID afterwards.
