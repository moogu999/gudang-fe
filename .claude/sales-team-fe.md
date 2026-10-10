# Sales Team — Frontend Plan

Companion to `.claude/sales-team-master-plan.md` (decisions D1–D14 referenced by number) and `gudang-be/.claude/sales-team-be.md`.

| Module | Screens | Template |
|---|---|---|
| `src/views/sales-teams/` (new) | list / create / edit (+ Products and Members tabs, picker, move dialog) | `src/views/customers/` for the page-based create/edit with tabs, `src/views/employees/EmployeesView.vue` for the filtered list, `src/views/ap-payments/components/ApPaymentOpenItemPicker.vue` for multi-select tables |
| `src/views/product-label-definitions/` | existing | lock system definitions (D5) |
| `src/views/products/ProductsView.vue` | existing | "No principal" filter (D5) |
| `src/views/employees/` | existing | Sales Supervisor icon; readable 409 on branch/type change (D13) |

---

## 1. Files

```
src/constants/api.ts                       + SALES_TEAMS: '/v1/sales-teams'
src/constants/permissions.ts               + SALES_TEAM_READ: 133, SALES_TEAM_WRITE: 134, route maps
src/types/salesTeam.type.ts                (new)
src/types/productLabelDefinition.type.ts   + systemKey
src/services/salesTeams.service.ts         (new, exported from services/index.ts)
src/services/salesTeams.service.spec.ts    (new)
src/router/index.ts                        + 3 routes
src/components/menu/menu.ts                + Organizations › Sales Teams (after Sales Organizations)
src/views/sales-teams/
  SalesTeamsView.vue
  SalesTeamCreateView.vue
  SalesTeamEditView.vue
  SalesTeamForm.vue
  components/
    SalesTeamRowMenu.vue
    SalesTeamDuplicateDialog.vue
    SalesTeamProductsTab.vue
    SalesTeamProductPickerDialog.vue
    SalesTeamMembersTab.vue
    SalesTeamAddMemberDialog.vue
    SalesTeamMoveMemberDialog.vue
    SalesTeamEndMemberDialog.vue
  salesTeamGrouping.ts                     pure: group product rows principal → category
  *.spec.ts
src/i18n/locales/en-US.ts, id-ID.ts
```

**Menu placement:** Organizations, next to Sales Organizations. A team is org master data; the Sales group holds transactional documents.

---

## 2. Reuse: do not rebuild any of these

| Need | Use |
|---|---|
| Create → land on edit, stay on edit after save, re-read + `:key` remount | `usePostSaveNavigation` (`composables/usePostSaveNavigation.ts`), as in `CustomerCreateView` / `CustomerEditView` |
| Code Auto/Manual toggle + preview | The `codeMode` pattern in `views/products/ProductDialog.vue` + `NumberSeriesService.preview('sales_teams')` |
| Branch picker | `InfiniteSelect` + `BranchesService.list` + `branchLabel` (`utils/branchHelper.ts`); limit to the user's branches as in `GiroReceiptForm.vue` (~l.476–510) |
| Supervisor picker | `InfiniteSelect` + `EmployeesService.listForSelect` with `customFilters` `employeeTypeId` (id of "Sales Supervisor", looked up by name from `EmployeeTypesService.list()`, as `SalesOrderForm.vue` ~l.1426 does for Salesman), `branchId`, `isActive = 'true'`. Never `EmployeesService.list(` in a `fetch-fn` (guard spec `services/employeePickers.spec.ts`) |
| Channel picker | `InfiniteSelect` on `CustomerChannelsService` (`GEN_CUSTOMER_CHANNELS`) with `isActive` filter |
| Principal options for the list filter | `ProductLabelOptionsService` filtered by `product_label_definition_id` = the principal definition id (fetch once via `ProductLabelDefinitionsService` with `filterBy=system_key&filterValue=principal`) |
| `/v1` list paging/search | `createListQueryAdapter` (`services/listQueryAdapter.ts`) + `static toListQuery` on the service; it drops sort, so **no sortable columns** |
| Multi-select paged table with selection kept across pages | `ApPaymentOpenItemPicker.vue` (raw PrimeVue `DataTable`, `selectionMode="multiple"`) |
| Tabs | PrimeVue `Tabs/TabList/Tab/TabPanels/TabPanel` as in `CustomerForm.vue` |
| Permissions in views | `usePermissions('/sales-teams')` → `canWrite` |
| Delete/confirm dialogs | PrimeVue `ConfirmDialog` / `useConfirm`, the house toast helpers (`commonSuccessToast`) |

### Conventions that have caused bugs before

- **Locales:** both locale files change in the same commit, with the same keys in the same order.
- **Dates:** sent as `dayjs(d).format('YYYY-MM-DD')`, never `toISOString()` (timezone shift).
- **Omitted keys:** Go omits nil pointers/slices. Use `channel?.name`, never `!== null` checks against fields that may be absent.
- **Picker prop timing:** a picker that depends on a prop arriving after mount (e.g. `branchId`) must react to it with `watch` + `nextTick` (the AP Payment picker bug).
- **Remounting:** `@primevue/forms` reads `initialValues` only on mount, so remount with `:key` after the re-read.
- **SelectButton:** a programmatic write through `formRef.states.x.value` doesn't repaint SelectButton; use a local ref for the code-mode and segment toggles.
- **Name-matched types:** employee types are matched by **name** (`'Salesman'`, `'Canvass'`, `'Sales Supervisor'`); keep the names in one exported constant, not scattered literals.

---

## 3. Types: `src/types/salesTeam.type.ts`

```ts
export interface SalesTeamPrincipalSummary { optionId: number | null; name: string; skuCount: number }
export interface SalesTeamEmployeeLite { id: number; nip: string; name: string; isActive: boolean; employeeType?: { id: number; name: string } }

export interface SalesTeam {
  id: number; code: string; name: string; isActive: boolean
  branch: { id: number; code: string; name: string }
  channel?: { id: number; code: string; name: string }
  supervisor: SalesTeamEmployeeLite
  skuCount: number; memberCount: number
  principals: SalesTeamPrincipalSummary[]
  createdAt?: string; createdBy?: { name: string }; updatedAt?: string; updatedBy?: { name: string }
}
export interface SalesTeamSummary { activeTeams: number; salesmen: number; salesmenInTeams: number; salesmenWithoutTeam: number }
export interface CreateSalesTeamRequest {
  code?: string; name: string; branchId: number; supervisorEmployeeId: number
  customerChannelId?: number | null; copyFromTeamId?: number; productIds?: number[]
}
export type UpdateSalesTeamRequest = Pick<CreateSalesTeamRequest, 'name' | 'supervisorEmployeeId' | 'customerChannelId'>

export interface LabelRef { optionId: number; value: string }
export interface SalesTeamProduct { productId: number; code: string; name: string; uomGroup?: { name: string }; principal?: LabelRef | null; category?: LabelRef | null; addedAt: string }
export type PickerSegment = 'notInTeam' | 'all' | 'uncovered'
export interface PickerTreeNode { principalOptionId: number | null; name: string; count: number; categories: { categoryOptionId: number | null; name: string; count: number }[] }
export interface PickerCandidate extends Omit<SalesTeamProduct, 'addedAt'> { inThisTeam: boolean; otherTeams: { id: number; code: string }[] }

export interface SalesTeamMember { membershipId: number; employee: SalesTeamEmployeeLite; startDate: string; endDate?: string | null; isCurrent: boolean }
export interface MemberCandidate { employee: SalesTeamEmployeeLite; currentTeam?: { id: number; code: string; name: string; skuCount: number; startDate: string } | null }
export interface AddMemberRequest { employeeId: number; startDate: string; move: boolean }
```

`productLabelDefinition.type.ts`: add `systemKey?: 'principal' | 'category' | null`.

---

## 4. Services: `src/services/salesTeams.service.ts`

One class with static methods mirroring the BE routes (BE §5–7):

- **Teams:** `list(query)`, `summary(branchId?)`, `uncoveredProducts(branchId, page?, limit?)`, `get(id)`, `create(body)`, `update(id, body)`, `activate(id)`, `deactivate(id)`
- **Products:** `listProducts(id, filters)`, `addProducts(id, productIds)`, `removeProducts(id, productIds)`, `pickerTree(id, segment)`, `pickerCandidates(id, query)`
- **Members:** `listMembers(id, includeHistory)`, `memberCandidates(id, q)` (with a `listForSelect`-style wrapper for `InfiniteSelect`), `addMember(id, body)`, `endMember(id, membershipId, endDate)`
- `static readonly toListQuery = createListQueryAdapter(['branchId', 'principalOptionId', 'noPrincipal', 'status'])`

`ProductsService`: add a helper that appends `withoutLabelDefinitionId=<id>` to the `/v1/products` query (D5).

---

## 5. List and header form (mockup screens 1 + 2 header)

### `SalesTeamsView.vue`

**Header:** title, a stats line `t('salesTeams.stats', {teams, salesmen, withoutTeam})` from `summary`, and a "Create team" button (`canWrite`).

**Banner** (`Message severity="warn"`), only when one branch is selected and `uncoveredProducts(branchId, 1, 1).meta.total > 0`:
- Text: "{n} SKUs not carried by any team in {branch}. Latest: {name} (added {date})."
- Action "View & add" opens a read-only dialog listing the uncovered products (paged).
- Tooltip with the D10 caveat (discontinued products count too).

**Filters** (pattern: `EmployeesView.vue` computed `url` + `watch` → `nextTick` → `table.clearSearch()`):
- Branch `InfiniteSelect` (defaults to `authStore.primaryBranchId`, clearable = "All branches").
- Principal select (options of the principal definition + "(No principal)" → `noPrincipal=true`).
- Status `Select` (Active default / Inactive / All).

**`TableComponent` columns, all `sortable: false`:**

| Column | Content |
|---|---|
| Code | Code |
| Name | Name + channel `Tag` (`channel.code`) |
| Supervisor | Name; warn icon + tooltip when `!supervisor.isActive` (D13) |
| Principal | First 2 `principals` as "Indofood 128", then "+n" with a tooltip listing the rest; "(No principal)" via i18n |
| SKU | `skuCount` |
| Salesman | `memberCount` |
| Status | `Tag` (Active / Inactive) |
| Actions | Edit button + `SalesTeamRowMenu` |

Clicking a row opens the edit view.

### `components/SalesTeamRowMenu.vue`

This is the first overflow menu in the app: a PrimeVue `Menu` with `popup`, toggled by a `pi pi-ellipsis-v` button.
- **Duplicate** → `SalesTeamDuplicateDialog`.
- **Deactivate** (confirm) → `deactivate`. Disabled with a tooltip "End or move the {n} members first" when `memberCount > 0` (D12). The BE 409 is still handled with a toast.
- **Activate** when inactive.

Hidden entirely without `canWrite`. Emits `changed`, so the list refreshes.

### `components/SalesTeamDuplicateDialog.vue` (D9)

- Fields: code Auto/Manual, name (prefilled `t('salesTeams.duplicate.namePrefix', {name})`), branch (prefilled, editable), supervisor (cleared when the branch changes), channel (prefilled).
- Shows "{n} SKUs will be copied; members are not copied."
- POST `create({..., copyFromTeamId})`, then navigate to the new team's edit view.

### `SalesTeamForm.vue` (create and edit)

- **Code:** Auto/Manual on create (local ref, see conventions). Read-only on edit.
- **Name:** required.
- **Branch:** required, disabled on edit, with the hint `t('salesTeams.form.branchLocked')` ("Branch can't be changed. Use Duplicate to create a team in another branch.").
- **Supervisor:** required, picker as in §2, re-filtered when the branch changes. On edit, if the saved supervisor is inactive or no longer eligible, show an inline warning and require a re-pick before save.
- **Channel:** optional.
- **Audit line on edit:** "Last changed: {user} · {date}".
- **Save:** create → `usePostSaveNavigation('/sales-teams').afterCreate(saved)` (always lands on edit, since there is no status); edit → save, re-read, remount.
- **Tabs on edit only:** Products ({skuCount}), Members ({memberCount}). On create, a note says SKUs and members are added after saving.

---

## 6. Products tab + picker (mockup screens 2 + 3)

### `components/SalesTeamProductsTab.vue`

**Stats strip:** SKUs carried, number of principals ("Indofood 128 · Bogasari 14"). The mockup's inactive-SKU and "new SKUs not yet added" stats are dropped (D6). The "uncovered" info lives on the list banner.

**Filters:** principal select (+ "(No principal)"), category select (options of the category definition + "(No category)"), search. Refetch `listProducts` on change.

**Table:** raw `DataTable` with `selectionMode="multiple"`, `rowGroupMode="subheader"`, `groupRowsBy="groupKey"`.
- Rows come from `salesTeamGrouping.ts`, which adds `groupKey` and `groupLabel` = "Principal › Category · N SKUs", with nulls last.
- Columns: code, name, UOM group.
- Groups are collapsible (`expandableRowGroups`); the first group is expanded, the rest collapsed.

**Bulk action (`canWrite`):** "Remove from team (n)" → confirm → `removeProducts` → refetch + emit `changed` (the header counts refresh).

**"Add SKUs" button (`canWrite`):** opens the picker.

### `components/SalesTeamProductPickerDialog.vue`

Props: `teamId`, `teamCode`. Emits `added`.

- **Top:** SelectButton for the segments (local ref) — "Not in this team" (default) / "All" / "Not carried by any team".
- **Left, PrimeVue `Tree`:** from `pickerTree(segment)`. Node label "Name (count)"; principal nodes expand to category nodes; `selectionMode="single"` used as a **filter**, not as checkboxes. An "All" root clears the filter. The selected node maps to `principalOptionId`/`noPrincipal` + `categoryOptionId`/`noCategory`.
- **Right, paged `DataTable`** (limit 100, lazy) from `pickerCandidates`:
  - Columns: checkbox, code, name, UOM group, "Carried by other teams" (code `Tag`s or "—"; "Already in this team" for `inThisTeam`).
  - `inThisTeam` rows are greyed (`:row-class`) and unselectable (filtered out in the selection-change handler).
  - The header checkbox selects every selectable row **on the current page**. Selection is kept in a `Map<productId, PickerCandidate>` across pages, segments and tree nodes.
- **Footer:** "{n} SKUs selected · {m} already in team" + Cancel / "Add {n} SKUs" → `addProducts` → toast `{added, skipped}` → emit `added` → close.
- Changing the segment refetches the tree and the table and keeps the selection.

---

## 7. Members tab + move dialog (mockup screen 4)

### `components/SalesTeamMembersTab.vue`

**Toolbar:** "Show history" `ToggleSwitch` (→ `includeHistory`) and "Add salesman" (`canWrite`, hidden when the team is inactive, with a hint).

**Table columns:**

| Column | Content |
|---|---|
| Salesman | Avatar initials, name, NIP; inactive-employee tag |
| Mode | `employee.employeeType.name`, translated via `salesTeams.members.mode.{Salesman,Canvass}` |
| Joined | `startDate` formatted |
| Left | `endDate` or "—" |
| Actions | "End membership" (`canWrite`, current rows only) → `SalesTeamEndMemberDialog` |

Closed rows are greyed. The mockup's "Rute (PJP)" column is dropped.

### `components/SalesTeamAddMemberDialog.vue`

- `InfiniteSelect` over `memberCandidates` (option label: "Name · NIP · Type", plus "currently in TM-008" when `currentTeam`).
- Effective date `DatePicker` (default today, `maxDate` today, D11).
- **Submit:**
  - No `currentTeam` → `addMember({move: false})`.
  - Otherwise open `SalesTeamMoveMemberDialog`.
  - A 409 from the race fallback re-fetches candidates and opens the move dialog.

### `components/SalesTeamMoveMemberDialog.vue`

- Title "Move salesman to this team?", subtitle "{name} · {nip}".
- Two cards: Current team (code, name, `skuCount` SKUs) → New team (this team's code, name, `skuCount`), plus the effective date (editable, max today, min = current start + 1 day).
- Note: `t('salesTeams.move.note')` ("Orders already created stay recorded under this salesman. Their previous membership ends the day before the effective date."). The mockup's target and phone-catalog sentences are dropped (D1).
- Confirm → `addMember({move: true})` → refetch + emit `changed`.

### `components/SalesTeamEndMemberDialog.vue`

End date (default today, min `startDate`, max today) → `endMember`.

---

## 8. Changes outside `sales-teams/` (D5, D3, D13)

- **`views/product-label-definitions/ProductLabelDefinitionsView.vue`:** a "System" `Tag` next to the name when `systemKey`; hide Delete for system rows (a 409 is still handled with a toast).
- **`ProductLabelDefinitionDialog.vue`:** name input `disabled` with a hint for system rows; still sends the unchanged name. Options (`ProductLabelOptionDialog.vue`) unchanged.
- **`views/products/ProductsView.vue`:** a "No principal" `Checkbox` next to the label filters. When on, the view switches to the `/v1/products` label-search path (same switch the label filters already use, ~l.231–260) and adds `withoutLabelDefinitionId=<principal def id>`.
- **`views/employees/EmployeeDetailView.vue`:** `typeIcon` map gains `'Sales Supervisor'` (e.g. `pi pi-users`). The 409 `ErrEmployeeInSalesTeam` on save already surfaces through the generic error toast; check that the message reads well. `EmployeeTypeCard` needs no change, since types load from the API.

---

## 9. Wiring

### `src/constants/permissions.ts`

```ts
SALES_TEAM_READ: 133,
SALES_TEAM_WRITE: 134,
// ROUTE_PERMISSIONS
'/sales-teams': [PERMISSIONS.SALES_TEAM_READ],
// ROUTE_WRITE_PERMISSIONS
'/sales-teams': [PERMISSIONS.SALES_TEAM_WRITE],
```

Match the exact shape of the neighbouring entries.

### `src/router/index.ts`

Follow the customers routes (~l.124–158):

| Path | View | `titleAction` | `requiredPermission` |
|---|---|---|---|
| `sales-teams` | `SalesTeamsView` | — | READ |
| `sales-teams/create` | `SalesTeamCreateView` | `create` | WRITE |
| `sales-teams/:id/edit` | `SalesTeamEditView` | `edit` | READ (read-only without WRITE) |

`titleKey: 'navigation.salesTeams'` on all three.

### `src/components/menu/menu.ts`

Organizations group, after `navigation.salesOrganizations`: `{ labelKey: 'navigation.salesTeams', icon: 'pi pi-users', route: '/sales-teams' }`.

### i18n: both files, same change, same key order

| Key | Content |
|---|---|
| `navigation.salesTeams` | "Sales Teams" / "Tim Penjualan" |
| `salesTeams.title`, `.stats`, `.createTeam`, `.banner.*` | List header and banner |
| `salesTeams.filters.*` | Branch, principal, noPrincipal, status options |
| `salesTeams.columns.*` | List columns |
| `salesTeams.rowMenu.*` | duplicate, deactivate, activate, deactivateBlocked |
| `salesTeams.duplicate.*` | Duplicate dialog |
| `salesTeams.form.*` | Fields, `branchLocked`, `supervisorInvalid`, `lastChanged`, `tabsAfterSave` |
| `salesTeams.tabs.products`, `.tabs.members` | Tab labels |
| `salesTeams.products.*` | Stats, filters, `groupLabel`, `noPrincipal`, `noCategory`, `removeSelected`, `confirmRemove` |
| `salesTeams.picker.*` | Title, segments, `otherTeams`, `alreadyInTeam`, `selected`, `add` |
| `salesTeams.members.*` | Columns, `mode.Salesman`, `mode.Canvass`, `showHistory`, `add`, `end`, `inactiveTeam` |
| `salesTeams.move.*` | Title, `currentTeam`, `newTeam`, `effectiveDate`, `note`, `confirm` |
| `salesTeams.messages.*` | Toasts |
| `auditTrails.references.sales_team`, `.sales_team_products`, `.sales_team_member` | Audit reference labels |
| `productLabelDefinitions.system`, `.systemLocked` | System label lock |
| `products.filters.noPrincipal` | Products list filter |

---

## 10. Tests (vitest)

Mocks as usual: `vue-i18n` `t: k => k`, `@/services`, `vue-router`, PrimeVue stubs; reuse `views/ar-clearings/components/dataTableStub.ts`.

| Spec | Covers |
|---|---|
| `services/salesTeams.service.spec.ts` | List query (adapter, named filters), picker params per segment/tree node (`noPrincipal`/`noCategory`), `addMember` body carries `move` and a `YYYY-MM-DD` date |
| `views/sales-teams/salesTeamGrouping.spec.ts` | Grouping order with null principal/category last; group labels and counts |
| `components/SalesTeamProductPickerDialog.spec.ts` | `inThisTeam` rows can't be selected; selection survives paging and segment change; segment change refetches tree + table; footer counts |
| `components/SalesTeamAddMemberDialog.spec.ts` | No `currentTeam` → posts `move: false`; with `currentTeam` → opens the move dialog; confirm posts `move: true` |
| `components/SalesTeamRowMenu.spec.ts` | Deactivate disabled with members; menu hidden without `canWrite` |
| `components/SalesTeamMembersTab.spec.ts` | History toggle refetches with `includeHistory`; end action only on current rows |
| `services/employeePickers.spec.ts` | Must stay green (no `EmployeesService.list(` in `fetch-fn`) |

Run `npm run test:unit`, `npm run type-check`, `npm run lint`.

---

## 11. Verification

1. Both dev servers running (see master §9 for the backend command).
2. Walk master §9 scenarios 1–18 with Playwright MCP, both locales. Use DatePicker day clicks and InputNumber real keystrokes.
3. Check the network tab: list calls carry `_v` (httpcache group active), no 400 from unknown sort/filter keys, and every write invalidates the list.
4. Stop both dev servers by port PID; delete screenshots from the repo root.

---

## 12. Implementation notes (2026-10-10)

Phases 1 (FE part), 3, 4 and 5 are implemented; type-check, lint and `npm run test:unit` are green. E2E (master §9) not run yet. Where the code differs from the sections above:

- **Move dialog date floor** is the current membership's start date, not start + 1. A move on the same day as the old start is the same-day correction (master D11, §9 scenario 7): the API deletes the mistaken row instead of closing it.
- **Duplicate** reuses `SalesTeamForm` (new `source` prop prefills it) inside `SalesTeamDuplicateDialog`; there is no separate form.
- **Form** uses local refs plus manual validation instead of `@primevue/forms`, because of the branch → supervisor cascade. Auto code mode sends no code (the API takes the next number).
- **Row actions (changed 2026-10-10 at user request):** no overflow menu. Duplicate and Deactivate/Activate are inline icon buttons with tooltips (`SalesTeamRowActions`). The disabled Deactivate gets its "end or move N members first" tooltip from a wrapping span, since a disabled button gets no hover. One `ConfirmDialog` lives in the list view for every row (`confirmGroup` prop).
- **Banner** has a "View SKUs" dialog (`SalesTeamUncoveredDialog`), paged at 20.
- **Picker footer** "{m} already in the team" is the team's `skuCount`.
- **Shared helpers:** `salesTeamHelpers.ts` (user-branch fetcher, Sales Supervisor lookup, label filter options, bucket filters, dates); employee type names live in `src/constants/employeeTypes.ts`.
- **Audit trails:** only the three reference types (type union + `auditTrails.references.*` labels). They are not added to the Audit Trails filter dropdown and have no link.
- **Outside the module:** `TableActionButtons` gained an optional `canDelete` prop (system label rows), `ProductLabelDefinitionsService.findSystem(key)`, `ProductsService.withoutLabelParam(id)`, and a 5-second error toast for a 409 on employee save.
- **Extra spec:** `SalesTeamMoveMemberDialog.spec.ts`.
