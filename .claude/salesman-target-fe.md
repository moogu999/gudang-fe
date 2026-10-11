# Salesman Target — Frontend Plan

Companion to `.claude/salesman-target-master-plan.md` (decisions D1–D16 are referenced by number throughout) and `gudang-be/.claude/salesman-target-be.md` (API contract in BE §4 and §6).

---

## 1. Files

```
src/types/salesmanTarget.type.ts
src/services/salesmanTargets.service.ts
src/services/salesmanTargetConfigs.service.ts            (+ export from services/index.ts)

src/views/salesman-target-configs/
  SalesmanTargetConfigsView.vue                          config tab content (embedded)
  components/SalesmanTargetConfigDialog.vue

src/views/salesman-targets/
  SalesmanTargetsView.vue                                list
  SalesmanTargetCreateView.vue
  SalesmanTargetEditView.vue                             tabs: Target | History
  SalesmanTargetForm.vue                                 header + items + grid + action bar
  salesmanTargetGrid.ts                                  pure helpers (units, cells, totals, paste, split) (+ .spec.ts)
  salesmanTargetHelpers.ts                               toApiPeriod/fromApiPeriod, status severity, item label
  components/
    MonthPicker.vue                                      thin wrapper on DatePicker view="month" (first one in the codebase)
    SalesmanTargetStatusTag.vue
    TargetItemChips.vue
    TargetItemPickerDialog.vue                           (+ .spec.ts)
    SalesmanTargetGrid.vue
    SalesmanTargetAddLineDialog.vue
    SalesmanTargetHistoryTab.vue
```

Changes outside these folders:
- `constants/api.ts`, `constants/permissions.ts`
- `router/index.ts`, `components/menu/menu.ts`
- `views/configs/ConfigsView.vue`
- both locale files

---

## 2. Reuse: do not rebuild any of these

| Need | Use |
|---|---|
| Create → land on edit, stay on edit after save, re-read + `:key` remount | `usePostSaveNavigation('/salesman-targets')`, as in `GiroReceiptCreateView` / `CreditDebitNoteEditView` |
| Code Auto/Manual toggle + preview | The `codeMode` pattern from `SalesTeamForm.vue` / `ProductDialog.vue` + `NumberSeriesService.preview('salesman_targets')` |
| Branch picker limited to the user's branches | `InfiniteSelect` + `userBranchesFetcher(authStore.branchIds)` + `branchLabel` (`views/sales-teams/salesTeamHelpers.ts`, `utils/branchHelper.ts`) |
| Principal options | `loadLabelFilterOptions('principal', …)` in `salesTeamHelpers.ts` (move it to a shared `utils/systemLabels.ts` if importing across views feels wrong; behaviour stays the same) |
| `/v1` list paging/search | `createListQueryAdapter` + `static toListQuery`. It drops sort, so **no sortable columns** |
| List filter → table refresh | The `SalesTeamsView` pattern: a computed `url`, then `watch(url)` → `nextTick` → `table.clearSearch()` |
| Inline numeric grid cells | `InputNumber` in DataTable `#body` with `:locale`, `input-class="text-right"`, as `BankSettlementMutationTable.vue` / `GiroLinesTable.vue` (subtotal footer) |
| Dynamic columns from data | `JournalConfigMatrix.vue` + `journalConfigMatrix.ts` (pure builder + spec) |
| Branch config tab | `CashDepositConfigsView.vue` (`embedded` prop, `defineExpose({ openAddDialog })`) and its wiring in `ConfigsView.vue` |
| Tabs | PrimeVue `Tabs/TabList/Tab/TabPanels/TabPanel`, as in `SalesTeamEditView` |
| Confirm dialogs / toasts | `useConfirm`, the house toast helpers |
| Permissions | `usePermissions('/salesman-targets')` → `canRead`, `canWrite`; activate via `authStore.hasPermission(PERMISSIONS.SALESMAN_TARGET_ACTIVATE)` (check what `usePermissions` exposes first) |

### Conventions that have caused bugs before

- **Locales:** both locale files change in the same commit, with the same keys in the same order.
- **Dates:** `period` goes on the wire as `dayjs(d).startOf('month').format('YYYY-MM-DD')`, never `toISOString()`.
- **Omitted keys = empty (D8):** Go omits nil pointers and missing map keys. A cell is empty when `cells[itemId] === undefined`; never test `!== null`, and never default to `0`.
- **Decimals are strings** on the wire. Parse with `Number()` only for display and `InputNumber`, and send back with `String()`. For qty, round the base value to 4 decimals before sending.
- **SelectButton:** a programmatic write doesn't repaint it. Use local refs for the source toggle, code mode and config level.
- **Picker prop timing:** pickers that depend on `branchId` / `principalOptionId` must `watch` + `nextTick` (the AP Payment picker bug).
- **Remount:** `@primevue/forms` reads `initialValues` only on mount, so remount with `:key` after the re-read.
- **UI wording:** **Customer**, never Outlet ("Active Customer (OA)").

---

## 3. Types: `src/types/salesmanTarget.type.ts`

```ts
export type TargetSource = 'principal' | 'internal'
export type TargetStatus = 'draft' | 'active' | 'closed'
export type TargetLevel  = 'product' | 'category'

export interface TargetUnit { uomId: number; code: string; name: string; factorToBase: string; isBase: boolean }

export interface SalesmanTargetItem {
  id?: number; key?: string                 // key for unsaved items
  productId?: number; productCode?: string; productName?: string
  categoryOptionId?: number; categoryName?: string
  principalOptionId?: number; principalName?: string
  uomId?: number                            // absent = base unit
  units?: TargetUnit[]; skuCount?: number; skuSample?: string[]; alsoIn?: number[]
  sortOrder: number
}
export interface SalesmanTargetLine {
  id?: number; key?: string
  employeeId: number; employeeCode?: string; employeeName?: string; employeeTypeName?: string
  employeeActive?: boolean; teamCodes?: string[]
  targetValue?: string; effectiveCall?: number; activeOutlet?: number
  cells: Record<string, string>              // itemId|key → base qty; missing key = not targeted
  sortOrder: number
}
export interface SalesmanTarget { id: number; code: string; branchId: number; branchName?: string; period: string
  source: TargetSource; principalOptionId?: number; principalName?: string; targetLevel: TargetLevel
  hasValue: boolean; hasQty: boolean; hasEffectiveCall: boolean; hasActiveOutlet: boolean
  principalTargetValue?: string; notes?: string; status: TargetStatus; version: number
  activatedAt?: string; activatedByName?: string; closedAt?: string; closedByName?: string
  items: SalesmanTargetItem[]; lines: SalesmanTargetLine[] }
export interface SalesmanTargetListRow { /* BE §6 list row */ }
export interface SalesmanTargetCandidate { employeeId: number; code: string; name: string; typeName: string; teamCodes: string[]; principals: string[] }
export interface SalesmanTargetConfig { branchId: number; branchName?: string; targetLevel: TargetLevel; updatedAt?: string }
```

---

## 4. Services, list and config tab

### `salesmanTargets.service.ts`

- `toListQuery = createListQueryAdapter(['period','branchId','source','principalOptionId','status'])`
- `get`, `create`, `update`, `remove`, `activate(id, version)`, `close(id, version)`
- `candidates({ branchId, period, source, principalOptionId, excludeTargetId })` (also returns `existingTargetId`)
- `itemOptions({ branchId, level, principalOptionId, q, limit, offset })`
- Error mapping: a 409 body `code` → i18n key `salesmanTargets.errors.<code>`, rethrown as a plain `Error`, as the reason-code delete does.

### `salesmanTargetConfigs.service.ts`

`list`, `myBranch(branchId)` (404 → `null`, not a throw), `get`, `upsert(branchId, targetLevel)`, `remove`.

### `api.ts`

`SALESMAN_TARGETS`, `SALESMAN_TARGET_BY_ID(id)`, `..._ACTIVATE(id)`, `..._CLOSE(id)`, `..._CANDIDATES`, `..._ITEM_OPTIONS`, `SALESMAN_TARGET_CONFIGS`, `..._MY_BRANCH`, `..._BY_BRANCH(id)`.

### `SalesmanTargetConfigsView.vue` (tab `stg` in ConfigsView)

- Model it on `CashDepositConfigsView`.
- Table: branch, level (tag "Per product" / "Per category"), last updated, edit/delete actions.
- `SalesmanTargetConfigDialog`: branch `InfiniteSelect` (locked when editing) and a level `SelectButton` with a local ref.
- Help text: "Applies to new target documents only. Existing documents keep the level they were created with." (D4)
- `ConfigsView.vue` wiring:
  - `usePermissions('/salesman-target-configs')`
  - option `{ label: t('navigation.salesmanTargetConfigs'), value: 'stg' }`
  - a `canWriteActive` branch, an `onAddClick` branch and the `v-if` render
  - optional legacy redirect `/salesman-target-configs` → `/configs?tab=stg`

### `SalesmanTargetsView.vue` (mockup UI 1)

- Title "Salesman Targets", with a subtitle line showing the month and counts per status for the current filter (the mockup's "5 active documents · 1 draft"). Computed from one extra list call with `limit=1` per status, or skipped if it complicates things; note it under Deviations.
- **Filters:**
  - `MonthPicker`, defaulting to the current month
  - branch, defaulting to the primary branch, with "All branches"
  - source: All / Internal / "Principal: X" for each principal option, which sets `source` + `principalOptionId`
  - status
- **Columns** (all `sortable: false`):
  - code (link)
  - branch
  - source: a `Principal` tag + principal name, or `Internal` + "all products"
  - salesmen
  - target value (`Rp` formatted; `—` when the doc has no value type)
  - items
  - status tag (draft = secondary, active = success, closed = contrast)
- **Row actions:** Open, and Delete for drafts with WRITE (with a confirm).
- "Create target" button with WRITE.

---

## 5. Create / edit page (mockup UI 2, UI 2c)

### `SalesmanTargetCreateView.vue` / `SalesmanTargetEditView.vue`

- **Create** renders `SalesmanTargetForm mode="create"`. On save → `afterCreate(saved)`, which lands on `/:id/edit`.
- **Edit** loads the document, renders the `Tabs` *Target* (the form) and *History* (§8), and remounts the form with `formKey` after each save, activate or close.
- Without WRITE, or when `status === 'closed'`, the form is readonly.

### `SalesmanTargetForm.vue`: header card

| Field | Create | After create |
|---|---|---|
| Code (Auto/Manual) | editable | read-only |
| Source: `SelectButton` Principal / Internal, with help text from the mockup | editable | read-only (D2) |
| Period: `MonthPicker` | editable | read-only (D3) |
| Branch | editable | read-only |
| Principal (principal source only) | required | read-only |
| Principal target (Rp, optional, principal only) | editable | editable |
| Target types: 4 checkboxes Value (Rp) · Qty per item · Effective Call (EC) · Active Customer (OA), at least one on | editable | editable (D6) |
| Notes | editable | editable |
| Level | read-only tag from `myBranch(branchId)` | read-only tag from the document |

- **Value basis help text** under the types: "Value = net after all discounts, excl. VAT, regular items only (bonus not counted). This basis is fixed." (D6)
- **Missing config** (create): when `myBranch` returns `null`, show an inline `Message` "This branch has no target level yet. Set it in Configs → Salesman Target" with a router link to `/configs?tab=stg`, and disable everything below the header (D4).
- **Duplicate check** (create): after branch, period, source and principal are all set, call `candidates`. If `existingTargetId` is set, show "A target for this period already exists" with a link, and block save. Otherwise prefill the lines from the candidates (D9) and show a toast "N salesmen loaded from Sales Teams" (principal) or "N active salesmen in branch" (internal). Changing a key field after prefilling asks for confirmation before reloading the lines.
- **Unchecking a type** that has values asks for confirmation ("Clear N values in EC?") and then hides the column. The values are stripped on save; the BE normalizes too.
- **Action bar** (sticky bottom, as the mockup):
  - left: "N salesmen · M items (x categories / y products)"
  - right:
    - **Save** (WRITE, not closed): "Save draft" while draft, "Save changes" while active
    - **Activate** (ACTIVATE, draft): confirm; disabled with a tooltip when there are 0 lines
    - **Close** (ACTIVATE, active): disabled with the tooltip "Available after <last day of period>" until the period ends
    - **Delete** (WRITE, draft)
  - Activate and Close send `version`. If the form is dirty, Activate saves first and then activates.
- **Stale version (409 `TARGET_STALE`):** a confirm dialog "This target was changed by someone else. Reload? Your unsaved changes will be lost." Reload re-reads the document and remounts the form.
- **Meta line** under the title: "Created by X · date", plus "Activated by Y · date" when set.

---

## 6. Items and grid

### `TargetItemChips.vue` (mockup "Item target qty")

- Hidden when `hasQty` is off.
- **Header line:** "Level: Category" or "Level: Product", from the document (D5).
- **One chip per item:**
  - a `KAT` or `SKU` badge, the name, and a principal tag on internal documents (the qualifier, or "All principals")
  - a unit `Select` showing only `units[]`; if there is only the base unit it is shown as plain text with the tooltip "Locked to base unit: products in this category use different pack sizes" (D7)
  - a remove (×) button, which asks for confirmation if any cell has a value
- **Hover tooltip on a category chip:** `skuCount` and the first names from `skuSample`.
- Items with `alsoIn` show "also in <label>" under the column header (master §4 assumption 5).
- "Add item" opens the picker.
- **Changing an item's unit** re-renders its column values in the new unit. The stored base qty never changes, because the cells hold base qty.

### `TargetItemPickerDialog.vue` (mockup UI 2b, single level)

- **Search plus a paged table** from `itemOptions`.
  - Level `product`: code, name, principal, category.
  - Level `category`: name, `skuCount`, and units, or "base unit only".
- **Principal:**
  - Principal documents: fixed to the header principal, with no filter shown.
  - Internal documents: a principal filter `Select` with an "All principals" option, which adds the `(category, all)` row.
- Rows already in the document are disabled. Multi-select, then **Add**. New items get `key = crypto.randomUUID()` and `uomId = defaultUomId`.
- No level switcher; the level comes from the document (D4, D5).

### `SalesmanTargetGrid.vue` (mockup "Target per salesman")

- PrimeVue `DataTable` with `ColumnGroup` headers in three groups:
  - **Value** ("Target value", subtitle "Rp, net excl. VAT", or "all products" on internal documents)
  - **Qty per item**: one column per item, header = item label + principal tag (internal) + unit code
  - **Call**: EC ("visits with order") and OA ("customers buying ≥ 1×")
  - Groups for disabled types are not rendered.
- **Frozen first column:** salesman name, plus a sub line with code · team codes (principal) or principals carried (internal), as in the mockup. Add an "Inactive" tag when `employeeActive === false`, and a "new" tag for unsaved lines.
- **Cells:** `InputNumber`.
  - Value: 0 fraction digits.
  - Qty: up to 1 fraction digit when the unit is not the base unit, else 0.
  - EC/OA: integers.
  - `:min="0"`, and **null when empty**. Clearing a cell deletes the key; it never writes 0.
- **Keyboard:** Enter moves down and Tab moves right. Implement it with a `data-cell="r:c"` attribute and focusing the neighbour's input.
- **Paste:** a `paste` handler on the grid container reads `clipboardData.getData('text/plain')` and runs `parseTsv` (in `salesmanTargetGrid.ts`). It accepts `480000000`, `480.000.000`, `480,000,000` and `1.200`/`1,200` per the mockup's import rule. Empty pasted cells are treated as clearing the cell.

  `parseTsv` assumes `id-ID` style when a value is ambiguous: `.` is a thousands separator, unless the value has exactly one `.` followed by 1–2 digits and no `,`.

  Values are applied from the focused cell rightward and downward. Anything outside the grid is dropped with a toast "N values outside the grid were ignored". Negative or non-numeric values are skipped and listed in a toast.
- **Row actions:** remove line (confirm if it has values). The "Add salesman" button opens `SalesmanTargetAddLineDialog`, which lists candidates not already in the grid (`candidates` with `excludeTargetId`).
- **Footer rows:**
  - **Total allocation:** sum per column, with qty in the column's unit.
  - **Principal target** and **Gap**, principal documents only and only when `principalTargetValue` is set. The gap is shown in the Value column with its %, and every other column shows `—`.
  - Below the grid, a warning `Message` when the gap ≠ 0: "Total value is short of / over the principal target by Rp X (y%). Warning only; the document can still be activated." (D11)
- **Toolbar above the grid:**
  - **Split principal target evenly** (principal documents with a target): fills the Value column using `splitEvenly(total, n)`, which rounds down to whole Rupiah and puts the remainder on the last line. Asks for confirmation if any value cell is already filled.
  - **Value / Qty per item / Call** jump buttons that scroll the column group into view (mockup tabs).
- **Validation shown inline:** negatives can't be typed (min 0). Show a summary line if a line has no values at all ("2 salesmen have no target yet"). It is informational and never blocks (D8).

### `salesmanTargetGrid.ts` (pure, unit-tested)

```ts
toDisplay(baseQty: string, unit?: TargetUnit): number | null
toBase(displayQty: number | null, unit?: TargetUnit): string | undefined   // undefined = delete key
columnTotals(lines, items, opts): Record<string, number>
principalGap(totalValue, principalTarget): { amount: number; pct: number } | null
splitEvenly(total: number, n: number): number[]
parseTsv(text: string): (number | null | 'invalid')[][]
buildPayload(form, items, lines): UpdateSalesmanTargetRequest   // strips switched-off types, maps keys
```

---

## 7. Status and read-only behaviour

| Status | Header | Items / grid | Actions |
|---|---|---|---|
| draft | editable per §5 table | editable | Save draft, Activate, Delete |
| active | non-locked fields editable | editable; every save is audited (D10, D14) | Save changes, Close (after the period ends) |
| closed | read-only | read-only | none |
| any, without WRITE | read-only | read-only | Activate/Close still shown if the user has ACTIVATE |

---

## 8. History tab: `SalesmanTargetHistoryTab.vue` (D14)

- Fetch `GEN_AUDIT_TRAILS` with the strict generic-CRUD filters `reference_type = salesman_target` and `reference_id = id`, sorted by `created_at` desc and paged. Check that `created_at` is in the audit-trail SortMap.
- Each entry is a timeline row: actor name, date-time, an action tag (create / update / activate / close), then `description` split by newline into a bullet list.
- Collapse after 10 bullets, with "Show all".
- Empty state: "No changes recorded yet."
- Reload after each save. The edit view bumps a `historyKey`.

---

## 9. Wiring

### `src/constants/permissions.ts`

- `SALESMAN_TARGET_READ: 141`, `SALESMAN_TARGET_WRITE: 142`, `SALESMAN_TARGET_ACTIVATE: 143`, `SALESMAN_TARGET_CONFIG_READ: 144`, `SALESMAN_TARGET_CONFIG_WRITE: 145`
- `ROUTE_PERMISSIONS['/salesman-targets'] = READ`, `ROUTE_WRITE_PERMISSIONS['/salesman-targets'] = WRITE`
- The same for `/salesman-target-configs` with CONFIG_READ / CONFIG_WRITE

### `src/router/index.ts`

- `salesman-targets`: READ, `titleKey: 'navigation.salesmanTargets'`
- `salesman-targets/create`: WRITE
- `salesman-targets/:id/edit`: READ (read-only without WRITE, as in sales teams)
- Optional legacy redirect `salesman-target-configs` → `/configs?tab=stg`

### `src/components/menu/menu.ts`

Add "Salesman Targets" (`navigation.salesmanTargets`, `/salesman-targets`) under **Sales**, next to Sales Orders.

### i18n: both files, same change, same key order

- `navigation.salesmanTargets`, `navigation.salesmanTargetConfigs`
- `salesmanTargetConfigs.*`: title, columns, dialog, level labels, help text, delete confirm
- `salesmanTargets.*`, in these groups:
  - `list.*`: title, subtitle, filters, columns, empty
  - `source.*`: principal, internal, allProducts, help
  - `status.*`
  - `form.*`: header fields, types, valueBasis, missingConfig, existingTarget, prefillToast, meta
  - `items.*`: title, level, addItem, lockedBaseUnit, alsoIn, allPrincipals, removeConfirm
  - `grid.*`: column groups, sub-headers, footer rows, gapWarning, splitEvenly, addSalesman, inactive, new, pasteIgnored, pasteInvalid, noTargetYet
  - `actions.*`: saveDraft, saveChanges, activate, close, delete, closeAvailableAfter, confirms
  - `history.*`
  - `errors.*`: one per BE error code (`TARGET_CONFIG_MISSING`, `TARGET_DUPLICATE`, `TARGET_CODE_DUPLICATE`, `TARGET_STALE`, `not_draft`, `closed`, `period_not_ended`, `no_lines`, `EMPLOYEE_NOT_ELIGIBLE`, `ITEM_OUT_OF_SCOPE`, `UOM_NOT_ALLOWED`)
- id-ID wording follows the mockup: "Target Salesman", "Sumber target", "Periode", "Jenis target", "Total alokasi", "Target dari principal", "Selisih", "Bagi rata dari target principal", "Aktifkan", "Riwayat perubahan". Use "Customer Aktif (OA)", not "Outlet Aktif".
- Audit-trail reference-type labels for `salesman_target` and `salesman_target_config`, wherever the audit-trail view maps reference types (grep how `sales_team` was added).

---

## 10. Tests (vitest)

| Spec | Covers |
|---|---|
| `salesmanTargetGrid.spec.ts` | `toDisplay`/`toBase` round-trip with factor 40 and 1.5 CTN; empty ↔ undefined (never 0); 0 stays 0; `columnTotals` ignores missing keys; `principalGap` sign and %; `splitEvenly(100, 3) = [33, 33, 34]`; `parseTsv` with the three number formats, blanks, negatives, CRLF and a trailing newline; `buildPayload` strips switched-off types and maps keys |
| `TargetItemPickerDialog.spec.ts` | Disabled rows for existing items; the principal filter is hidden on principal documents; `defaultUomId` is applied |
| `SalesmanTargetGrid.spec.ts` (light) | Disabled types hide their column groups; clearing a cell removes the key; footer gap rows only on principal documents |
| `salesmanTargets.service.spec.ts` | `toListQuery` allowlist; 409 code → translated error |
| `services/employeePickers.spec.ts` | Still green (no `EmployeesService.list(` in a fetch-fn) |

Run `npm run test:unit`, `npm run type-check` and `npm run lint`.

---

## 11. Verification

1. Unit tests, type-check and lint are green.
2. The live walk-through follows master plan §9, FE items 1–2, 5–13, 16–18. Playwright notes:
   - `InputNumber` needs `pressSequentially`.
   - For the month picker, click the month cell.
   - For paste, dispatch a `paste` event with a `DataTransfer` carrying `text/plain` via `browser_evaluate`.
3. Walk every screen in `id-ID`: no raw keys.

---

## 12. Deviations

FE implemented 2026-10-10 (uncommitted). Unit tests (476), type-check and lint are green. **No live E2E yet**: it waits for a green light. Deviations from the plan above:

1. **The grid is a hand-rolled `<table>`, not a `DataTable` with `ColumnGroup`.** A sticky first column, Enter-to-move-down, and a capture-phase `paste` handler that keeps each cell's own `InputNumber` paste logic from seeing the block are all simpler to get right directly. The column groups, footer rows and frozen salesman column behave as specified.
2. **Non-base qty cells allow up to 4 fraction digits**, not 1. One decimal would show 1 piece of a 40-per-carton unit as `0.0` and hide the rounding. The stored value is still rounded to 4 decimals.
3. **Key-field changes on create (`SalesmanTargetForm.vue`).** Changing branch, source or principal confirms only when items or values exist, then clears items and reloads salesmen; rejecting puts the old values back. Changing only the period reloads the candidates silently and keeps the values entered for salesmen who are still candidates.
4. **Close is disabled while the form has unsaved changes**, with the tooltip "Save your changes first". Activate saves first, as planned.
5. **Error translation is a view-level helper** (`translateTargetError` in `salesmanTargetHelpers.ts`) rather than inside the service, because the service has no `t`. The create and edit views run every caught error through it before the toast. A `TARGET_STALE` opens the reload dialog instead.
6. **The config dialog's branch picker lists only the caller's branches** (`userBranchesFetcher`), since the API answers 403 for any other.
7. **The History tab is not gated on the audit-trail permission.** `/gen/v1/audit-trails` has no permission scoping (the known systemic gap), so hiding the tab would not protect anything. Its action tag comes from the entry's `action` (activate / close) and otherwise from the description (`Created`, else "Updated").
8. **Header counts** on the list are computed with three `limit=1` list calls (draft / active / closed) for the current month, branch and source filter.
9. **A reloaded line has no `principals`**, because the API does not return them on a saved document. Internal documents therefore show team codes under the salesman name after reload; candidates added in the same session show the principals they carry.
10. **Config service is `SalesmanTargetConfigService` in `salesmanTargetConfig.service.ts`** (singular, like `CashDepositConfigService`). Its `getMyBranch(branchId)` returns `null` on 404 and rethrows other errors.
11. **`common.actions.remove` does not exist**, so the item chip uses `salesmanTargets.items.remove`.
12. **Specs added:** `salesmanTargetGrid.spec.ts`, `SalesmanTargetGrid.spec.ts`, `TargetItemPickerDialog.spec.ts` and `salesmanTargets.service.spec.ts`. A throw-away check confirmed every i18n key used exists in both locales and that the `salesmanTargets` / `salesmanTargetConfigs` trees match key for key.
