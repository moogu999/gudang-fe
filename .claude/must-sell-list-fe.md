# Must Sell List — Frontend Plan

**Status:** PLANNED 2026-10-11. FE IMPLEMENTED 2026-10-11 (phases 3-5), uncommitted; unit tests, type-check and lint green. Live E2E (master plan §9) NOT run, waiting for the user's go-ahead.
**Master plan:** `../../.claude/must-sell-list-master-plan.md` (decisions D1–D19, E2E §9). Backend contract: `../../gudang-be/.claude/must-sell-list-be.md` §4–§6. This doc covers phases 3–5.

**Forms:** the MSL form is a **page** (create / edit routes, `usePostSaveNavigation`). The config form is a **dialog** inside the Configs tab `msl`.
**Wording:** **Customer**, never Outlet; **Product**, never "SKU". The mockup's "Tipe Outlet" is the existing **Customer Type** (`customers.outletType` i18n key).

---

## 1. Files

```
src/types/mustSellList.type.ts, mustSellListConfig.type.ts      (+ src/types barrel)
src/services/mustSellLists.service.ts, mustSellListConfigs.service.ts   (+ src/services barrel;
                                                                  also export CustomerCategoriesService, currently missing)
src/views/must-sell-list-configs/
  MustSellListConfigsView.vue                                    (tab `msl`, copy of SalesmanTargetConfigsView)
  MustSellListConfigDialog.vue
src/views/must-sell-lists/
  MustSellListsView.vue                                          (mockup UI 1)
  MustSellListCreateView.vue  MustSellListEditView.vue
  MustSellListForm.vue                                           (mockup UI 2; mode add|edit, readonly)
  mustSellListHelpers.ts (+ .spec.ts)                            pure: status severity, field locks, unit conversion, payload builder
  mustSellListErrors.ts (+ .spec.ts)                             BE code → i18n key / form field
  components/
    MslStatusTag.vue
    MslScopeCard.vue                                             chips + All, level from the MSL snapshot / branch config
    MslProductsTable.vue                                         reorder, suggested unit, min qty
    MslProductPickerDialog.vue (+ .spec.ts)                      adapted from ComparisonProductPickerDialog
    MslCategoryPickerDialog.vue                                  "Add from product category"
    MslReachPanel.vue                                            customer count + View customers
    MslOverlapPanel.vue
    MslCustomersDialog.vue
    MslHistoryTab.vue                                            copy of SalesmanTargetHistoryTab
```

---

## 2. Reuse: do not rebuild any of these

| Need | Use |
|---|---|
| Create → land on edit, stay on edit after save, re-read + `:key` remount | `usePostSaveNavigation('/must-sell-lists')`, as in `SalesmanTargetCreateView` / `SalesmanTargetEditView` |
| Stale-version 409 dialog | `SalesmanTargetEditView.vue` (`TARGET_STALE` ConfirmDialog → reload) |
| Code Auto/Manual toggle + preview | The `codeMode` pattern from `SalesmanTargetForm.vue` / `SalesTeamForm.vue` + `NumberSeriesService.preview('must_sell_lists')` |
| Branch picker limited to the user's branches | `InfiniteSelect` + `userBranchesFetcher(authStore.branchIds)` + `branchLabel` |
| Principal options | `loadLabelFilterOptions('principal', …)` (`views/sales-teams/salesTeamHelpers.ts`), as `SalesmanTargetsView` uses it (drop `NO_LABEL`) |
| Category options | `loadLabelFilterOptions('category', …)` |
| Customer-category options | `CustomerOutletTypesService`, `CustomerChannelsService`, `CustomerCategoriesService` (`/gen/v1/customer-*`), picked by scope level |
| `/v1` list paging/search | `createListQueryAdapter` + `static toListQuery`. It drops sort, so **no sortable columns** |
| List filter → table refresh | The `SalesmanTargetsView` pattern: a computed `url`, `watch(url)` → `nextTick` → `table.clearSearch()` |
| Label-filtered multi-select product picker | `views/competitor-products/components/ComparisonProductPickerDialog.vue` (selection `Map` across pages, `excludeIds`) |
| Drag reorder | `views/reasons/ReasonsView.vue` (`<Column row-reorder>`, `@row-reorder`) |
| Unit helpers | `unitOf()` in `views/salesman-targets/salesmanTargetGrid.ts`; copy the to-base/to-display functions into `mustSellListHelpers.ts` (or move them to `utils/uom.ts` if the copy is verbatim; note it in Deviations) |
| Date ↔ API | `toApiDate` / `fromApiDate` (`salesTeamHelpers.ts`) |
| Start / end pickers | Two `DatePicker`s like `views/promotions/PromotionForm.vue` (no "no end date": end is required) |
| History tab | `SalesmanTargetHistoryTab.vue` + `constants/auditReferenceTypes.ts` |
| Branch config tab | `SalesmanTargetConfigsView.vue` (`embedded`, `defineExpose({ openAddDialog })`) and its `ConfigsView.vue` wiring |
| Delete confirm | `useConfirmDelete` |
| Permissions | `usePermissions('/must-sell-lists')` → `canRead`, `canWrite`; publish via `hasPermission(PERMISSIONS.MSL_PUBLISH)` |

### Conventions that have caused bugs before

- **Locales:** both files in the same commit, same keys, same order.
- **Dates:** `YYYY-MM-DD` via `toApiDate`, never `toISOString()`.
- **Omitted keys = empty:** `uomId`, `minQty`, `scopeValues`, `notes` may be absent. Test `=== undefined` / `?? []`, never `!== null`, and never default a min qty to 0.
- **Decimals are strings** on the wire. Base min qty → display: `Number(minQty) / factor`; display → base: round `value × factor` to 4 decimals, then `String()`.
- **SelectButton:** programmatic writes don't repaint it. Use a local ref for the config level and the code mode.
- **Picker prop timing:** pickers depending on `principalOptionId` / `branchId` `watch` + `nextTick` (the AP Payment picker bug).
- **Remount:** `@primevue/forms` reads `initialValues` only on mount, so remount with `:key` after the re-read.
- **Toast groups:** every view hosts its own Toast group and passes it down.

---

## 3. Types

```ts
export type MslScopeLevel = 'outlet_type' | 'channel' | 'category'
export type MslStatus = 'draft' | 'published'
export type MslDisplayStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type MslStatusFilter = 'current' | MslDisplayStatus | 'all'

export interface MustSellListConfig {
  branchId: number; branchName: string; scopeLevel: MslScopeLevel; reasonRequired: boolean
  updatedAt?: string; updatedByName?: string
}

export interface LabelRef { id: number; name: string }
export interface MslUnit { uomId: number; name: string; factorToBase: string; isBase: boolean }

export interface MustSellListListItem {
  id: number; code: string; name: string
  branch: LabelRef; principal: LabelRef
  startDate: string; endDate: string
  scopeLevel: MslScopeLevel; scopeAll: boolean; scopeValues?: LabelRef[]
  itemCount: number; customerCount: number
  status: MslStatus; displayStatus: MslDisplayStatus; showInCanvass: boolean
}

export interface MustSellListItem {
  id: number; productId: number; code: string; name: string; categoryName?: string
  uomGroupId: number; units: MslUnit[]
  uomId?: number                       // omitted = base unit
  minQty?: string                      // base unit; omitted = any qty
  sortOrder: number
}

export interface MustSellList extends Omit<MustSellListListItem, 'scopeValues' | 'itemCount'> {
  notes?: string; version: number
  scopeValues?: (LabelRef & { isActive: boolean })[]
  items?: MustSellListItem[]
  createdAt: string; createdByName: string
  updatedAt?: string; updatedByName?: string
  publishedAt?: string; publishedByName?: string
}

export interface MustSellListPayload {
  code?: string                        // create only; omitted = Auto
  branchId?: number                    // create only
  version?: number                     // update only
  name: string; principalOptionId: number; startDate: string; endDate: string; notes?: string
  scopeAll: boolean; scopeValueIds: number[]; showInCanvass: boolean
  items: { id?: number; productId: number; uomId?: number; minQty?: string }[]   // array order = sort order
}

export interface MslPreview {
  customerCount: number
  overlaps?: {
    id: number; code: string; name: string; startDate: string; endDate: string
    displayStatus: MslDisplayStatus; sharedCustomerCount: number
    sharedProducts?: { productId: number; name: string; thisMinQty?: string; otherMinQty?: string
                       effectiveMinQty?: string; baseUomName: string }[]
  }[]
}
```

---

## 4. Services, config tab and list (phase 3)

### `mustSellLists.service.ts`

Static class like `salesmanTargets.service.ts`:
- `toListQuery = createListQueryAdapter(['branchId', 'principalOptionId', 'scopeOptionId', 'status', 'search'])`
- `list(params)` (also returns `meta.counts`), `get(id)`, `create(p)`, `update(id, p)`, `remove(id)`
- `publish(id, version)`, `unpublish(id, version)`, `endEarly(id, version)`, `duplicate(id)`
- `preview(body)`, `customers(params)`, `productOptions(params)`

### `mustSellListConfigs.service.ts`

`list()`, `getMyBranch(branchId)` (404 `MSL_CONFIG_MISSING` → resolve `null`), `get(branchId)`, `upsert(branchId, { scopeLevel, reasonRequired })`, `remove(branchId)`.

### `api.ts`

`MUST_SELL_LISTS`, `MUST_SELL_LIST_BY_ID(id)`, `_PUBLISH(id)`, `_UNPUBLISH(id)`, `_END_EARLY(id)`, `_DUPLICATE(id)`, `MUST_SELL_LISTS_PREVIEW`, `MUST_SELL_LISTS_CUSTOMERS`, `MUST_SELL_LISTS_PRODUCT_OPTIONS`; `MUST_SELL_LIST_CONFIGS`, `MUST_SELL_LIST_CONFIGS_MY_BRANCH`, `MUST_SELL_LIST_CONFIG_BY_BRANCH(id)`. No `_v` handling is needed: the interceptor picks up the backend's cache groups automatically.

### `MustSellListConfigsView.vue` (tab `msl` in ConfigsView)

- A copy of `SalesmanTargetConfigsView`.
- Table: branch, scope level (tag: Customer Type / Channel / Category), reason required (Yes/No), last updated, edit/delete actions.
- `MustSellListConfigDialog`:
  - branch `InfiniteSelect` (locked when editing)
  - scope level `SelectButton` with a local ref
  - "Require a reason for unsold MSL products" `ToggleSwitch` (default on), hint: "Used by N-Force once taking order supports MSL. Off = a warning only."
- Help text: "Applies to new lists only. Existing lists keep the level they were created with." (D3)
- `ConfigsView.vue` wiring:
  - `usePermissions('/must-sell-list-configs')`
  - option `{ label: t('navigation.mustSellListConfigs'), value: 'msl' }`
  - `canWriteActive`, `onAddClick` and the `v-if` render
  - redirect route `must-sell-list-configs` → `/configs?tab=msl`
  - add 154/155 to the Config menu item's `permissionsAny` (`menu.ts`)

### `MustSellListsView.vue` (mockup UI 1)

- Title "Must Sell List", subtitle "Scope by: {level} (config) · {n} active · {n} scheduled · {n} draft" from `meta.counts` and the branch config. If the branch has no config: "No config yet" + link.
- "Create MSL" button (`canWrite`).
- Filters: branch (user branches, default primary), principal `Select`, scope value `Select` (options from the branch config's level master; hidden when there is no config), status `Select` (**Active & scheduled** default / Draft / Scheduled / Active / Ended / All), search.
- `TableComponent` columns (all `sortable: false`):
  - Code (link to edit), Name, Principal
  - Period (`01 Oct – 31 Dec 2026`, formatted per locale)
  - Scope: chips of values, or "All customers"; a level tag only if it differs from the current config (a snapshot from an older config)
  - Products (`itemCount`), Customers (`customerCount`, locale-formatted), Status (`MslStatusTag`)
  - ⋯ menu: **Duplicate** (WRITE), **End early** (PUBLISH, Active only, confirm), **View customers** (opens `MslCustomersDialog` with the row's scope), **Delete** (WRITE, Draft only)
- Footnote (help text): "Customers = active customers currently matching the scope, across all branches. Status follows the period automatically."

---

## 5. Create / edit page (phase 4)

### `MustSellListCreateView.vue` / `MustSellListEditView.vue`

- **Create:** loads the branch config for the chosen branch (`getMyBranch`). With **no config**, the form body is replaced by a message "Configure the scope level for this branch first" with a link to `/configs?tab=msl` (D3). On save → `afterCreate`.
- **Edit:** Tabs **Form** / **History**. Header strip:
  - code, `MslStatusTag`, and a **Duplicate** button (WRITE; on success navigate to the new draft, and if `scopeCleared` show a warning toast "Scope cleared: the branch now uses {level}")
  - meta line: "Created {createdByName} · {date} · last changed {date}"
  - Readonly when `!canWrite || displayStatus === 'ended'`
  - Stale 409 → the reload dialog; `formKey++` after each save; `historyKey++`

### `MustSellListForm.vue`

Two-column layout on desktop (form left, panels right; stacked on mobile widths).

**Header card**
- Code (Auto/Manual, create only)
- Branch (create only, locked afterwards)
- Name (required, max 100)
- Principal `Select` (required). Disabled when not Draft, with the hint "Locked after publish". Changing it while products exist → confirm "Remove products from other principals?", then drop the non-matching items (all items, since they are principal-bound)
- Start / End `DatePicker`s (both required, end ≥ start). Start disabled when Active. End `min-date` = today when Active
- Notes (optional, textarea, max 500)

**Settings** (small card): "Show in Canvass" `ToggleSwitch`, hint "Off = Taking Order only".

**`MslScopeCard.vue`**
- Title "Customer scope", subtitle "{Level} · customer category level from config".
- Chips of selected values with ×, an "Add" `MultiSelect`/popover listing active options of the level's master (already-saved inactive values render greyed with "(inactive)"), and an "All" toggle chip. "All" and values are mutually exclusive: picking All clears the values, and adding a value turns All off.
- Help text from the mockup: "Options come from the {level} values. Customers whose {level} changes move in or out automatically. Per-customer scope isn't available yet."
- Validation: All or ≥ 1 value.

**`MslProductsTable.vue`**
- Title "Products · {n} · order = order on the phone".
- Buttons: **Add from product category**, **Add product**. Both are disabled until a principal is chosen, with a tooltip.
- DataTable with `<Column row-reorder>` (disabled when readonly).
- Columns: Code, Product (name + category muted), Suggested unit (`Select` over `units`, empty = base), Min qty (`InputNumber`, optional, in the selected unit, `min` > 0, empty allowed; suffix = unit name), remove ×.
- Changing the suggested unit keeps the **base** min qty and re-displays it (D11). A unit switch never silently changes the stored minimum.
- Help text: "Add from product category adds every product of the category for this principal; remove the ones you don't need. New products in the category are not added automatically. Empty min qty = any qty. The suggested unit is only the default on the phone."

### `MslProductPickerDialog.vue`

Adapted from `ComparisonProductPickerDialog`, backed by `MustSellListsService.productOptions({ principalOptionId, q, excludeIds })`. Multi-select across pages with a `Map`, an optional category filter, existing products disabled. Emits the selected options **with their `units`** so the table can render unit selects without a refetch.

### `MslCategoryPickerDialog.vue`

Category `Select` (categories from `loadLabelFilterOptions('category')`), a preview count, then "Add {n} products". Calls `productOptions({ principalOptionId, categoryOptionId, all: true })`, appends the products not already listed, and toasts "{added} added, {skipped} already in the list".

---

## 6. Side panels (phase 4)

### `MslReachPanel.vue`

- Big number `customerCount` + "customers". **No salesman or branch counts** (D4).
- Help text: "Customers aren't tied to branches yet, so this counts every matching active customer."
- **View customers** opens `MslCustomersDialog` (paged `TableComponent` over `customers(params)` with search; columns Code, Name, Customer Type, Channel, Category, City).
- Data comes from the same debounced `preview` call as the overlap panel.

### `MslOverlapPanel.vue`

- Calls `MustSellListsService.preview` **debounced 500 ms** on changes to branch, principal, dates, scope or items (with `excludeId` in edit mode). The panel shows a subtle loading state, and a stale response is discarded (request counter).
- Empty: "No overlap with other lists of this principal."
- For each overlap, a card as in the mockup: "{sharedCustomerCount} customers in this scope are also covered by **{code} {name}**." Then, per shared product: product name, "Min qty in this list", "Min qty in {code}", "Used on the phone: {effective} (largest)", formatted in this list's suggested unit for that product (fall back to base).
- Footer note: "Overlap isn't blocked. On the phone, a product appears once (all active lists for the customer merged) and min qty takes the largest."

---

## 7. Status and read-only behaviour

| Display status | Header | Scope / products | Actions |
|---|---|---|---|
| Draft | everything except branch | editable | Save, **Publish** (PUBLISH; needs ≥ 1 product and end ≥ today, disabled with a tooltip otherwise), Delete (WRITE), Duplicate |
| Scheduled | principal locked | editable | Save, **Unpublish** (PUBLISH, confirm), Duplicate |
| Active | principal + start locked; end ≥ today | editable; the note "Changes reach phones on their next sync" | Save, **End early** (PUBLISH, confirm "Ends after today"), Duplicate |
| Ended | read-only | read-only | Duplicate |
| any, without WRITE | read-only | read-only | Publish/Unpublish/End early still shown with PUBLISH |

Unsaved changes + Publish → save first, then publish (one click, two calls; stop if the save fails). Each transition sends the current `version`.

---

## 8. History tab: `MslHistoryTab.vue`

A copy of `SalesmanTargetHistoryTab` with `reference_type = must_sell_list`. Add the `must_sell_list` and `must_sell_list_config` entries to `constants/auditReferenceTypes.ts` and the `auditTrails.references.*` i18n keys.

---

## 9. Wiring

### `src/constants/permissions.ts`

- `MSL_READ: 151`, `MSL_WRITE: 152`, `MSL_PUBLISH: 153`, `MSL_CONFIG_READ: 154`, `MSL_CONFIG_WRITE: 155`
- `ROUTE_PERMISSIONS['/must-sell-lists'] = MSL_READ`, `ROUTE_WRITE_PERMISSIONS['/must-sell-lists'] = MSL_WRITE`
- The same for `/must-sell-list-configs` with CONFIG_READ / CONFIG_WRITE

### `src/router/index.ts`

- `must-sell-lists`: READ, `titleKey: 'navigation.mustSellLists'`
- `must-sell-lists/create`: WRITE, `titleAction: 'create'`
- `must-sell-lists/:id/edit`: READ (read-only without WRITE), `titleAction: 'edit'`
- Redirect `must-sell-list-configs` → `/configs?tab=msl`

### `src/components/menu/menu.ts`

"Must Sell List" (`navigation.mustSellLists`, `/must-sell-lists`) under **Sales**, right after Salesman Targets.

### i18n: both files, same change, same key order

- `navigation.mustSellLists` ("Must Sell List" / "Must Sell List (MSL)"), `navigation.mustSellListConfigs`
- `mustSellListConfigs.*`: title, columns, dialog, level labels (reuse wording: Customer Type / Tipe Customer, Channel, Category / Kategori), reasonRequired + hint, help, delete confirm
- `mustSellLists.*`:
  - `list.*`: title, subtitle, create, filters, statusFilter options, columns, allCustomers, footnote, empty, menu actions
  - `status.*`: draft, scheduled, active, ended (id-ID: Draft, Terjadwal, Aktif, Selesai)
  - `form.*`: header fields, principalLocked, startLocked, settings, showInCanvass + hint, missingConfig, meta, principalChangeConfirm
  - `scope.*`: title, subtitle, all, add, inactive, help, required
  - `products.*`: title, addFromCategory, addProduct, columns, suggestedUnit, minQty, help, needPrincipal, addedToast, skippedToast
  - `reach.*`, `overlap.*`, `customers.*` (dialog)
  - `actions.*`: save, publish, unpublish, endEarly, duplicate, delete, publishDisabled reasons, confirms, scopeCleared
  - `history.*`
  - `errors.*`: one per BE code (`MSL_CONFIG_MISSING`, `MSL_CODE_DUPLICATE`, `MSL_STALE`, `MSL_FIELD_LOCKED`, `MSL_ENDED`, `MSL_NOT_DRAFT`, `MSL_NOT_SCHEDULED`, `MSL_NOT_ACTIVE`, `MSL_NO_ITEMS`, `MSL_END_BEFORE_TODAY`, `MSL_INVALID_PRINCIPAL`, `MSL_PRODUCT_PRINCIPAL_MISMATCH`, `MSL_INVALID_UOM`, `MSL_INVALID_SCOPE_VALUE`, `MSL_DUPLICATE_PRODUCT`, `MSL_INVALID_SCOPE`)
- id-ID wording follows the mockup, with "Customer" for Outlet and "Produk" for SKU: "Buat MSL", "Scope customer", "Daftar Produk · urutan = urutan tampil di HP", "Tambah dari kategori produk", "Satuan saran", "Min qty (opsional)", "Jangkauan", "Overlap dengan MSL lain", "Tampilkan di Kanvas", "Akhiri lebih cepat", "Duplikat", "Lihat customer tercakup".

---

## 10. Tests (vitest)

| Spec | Covers |
|---|---|
| `mustSellListHelpers.spec.ts` | Min qty base ↔ display with factor 5 and 40 (2 PAK ↔ 10, round-trip, 4-dp rounding); undefined stays undefined (never 0); unit switch keeps base; field-lock table per display status; `buildPayload` maps array order to sort order, omits empty `uomId` / `minQty`, strips `code`/`branchId` on update |
| `mustSellListErrors.spec.ts` | Every BE code maps to a key; `MSL_FIELD_LOCKED` + `field` → the right form field; `MSL_CODE_DUPLICATE` → Code field |
| `MslProductPickerDialog.spec.ts` | Principal is passed to `productOptions`; existing products disabled; selection kept across pages; emits units |
| `mustSellLists.service.spec.ts` | `toListQuery` allowlist; URLs and bodies for publish/unpublish/end-early/duplicate/preview |
| `ConfigsView` spec (if one exists; otherwise a light mount test) | The `msl` tab renders with 154 and is absent without it |

Run `npm run test:unit`, `npm run type-check` and `npm run lint`.

---

## 11. Verification

1. Unit tests, type-check and lint are green.
2. The live walk-through follows master plan §9, FE items 1–10, 12, 14–17, **only once the user gives the go-ahead**. Playwright notes:
   - `InputNumber` needs `pressSequentially`, and `DatePicker` needs clicks.
   - Row reorder: `handle.dragTo(row)`.
3. Walk every screen in `id-ID`: no raw keys.

---

## 12. Deviations

Implemented 2026-10-11. Where the code differs from the plan above:

- **No `field` on errors.** `ApiError` carries only `message`, `status` and `code`, so a BE `field` is not available. The only code shown on a field is `MSL_CODE_DUPLICATE` / `MSL_CODE_TOO_LONG` (the Code input, via a callback from the form to the create view); every other code is a toast. `mustSellListErrors.ts` is therefore folded into `mustSellListHelpers.ts` (`translateMslError`, `errorField`).
- **Unit helpers copied**, not moved: `unitOf` / `toDisplay` / `toBase` live in `mustSellListHelpers.ts` with a `MslUnit` type. `CustomerCategoriesService` was already exported.
- **Header counts** come from `meta.counts` of one `limit=1&status=all` call per branch, not one call per status. Counts are the whole branch and ignore the other filters. The branch is required, so the branch filter is not clearable.
- **Reach and overlap** are computed in `MustSellListForm.vue` (one debounced preview, request counter); `MslReachPanel` / `MslOverlapPanel` are presentational. With no scope chosen, no request is sent and the count shows 0.
- **Category picker** is its own dialog (`MslCategoryPickerDialog.vue`): pick a category, see the count, add. Skipped duplicates are reported by the form's toast ("{added} added, {skipped} already in the list").
- **Row menu** is a PrimeVue popup `Menu` (Duplicate, End early, View customers, Delete) next to the edit button; End early uses a `ConfirmDialog`, Delete the shared `useConfirmDelete`.
- **Edit view** reads `route.params.id` through a `watch`, so Duplicate (which lands on another list's edit page) reloads in place instead of showing the old list.
- **Customers dialog** has no city column (the BE returns none): Code, Name, Customer Type, Channel, Category.
- **Menu:** `MSL_CONFIG_READ` was added to the Config item's `permissionsAny`.
- **Tests:** `mustSellListHelpers.spec.ts` (conversion, locks, payloads, error mapping), `mustSellLists.service.spec.ts`, `MslProductPickerDialog.spec.ts`. No ConfigsView spec was added because none exists to extend.
- **Not covered by unit tests:** the form, list and edit views, the scope card and the overlap panel. They are exercised by the E2E walk-through only.
