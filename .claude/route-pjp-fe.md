# Routes & Permanent Journey Plan — Frontend Plan

**Status:** IMPLEMENTED 2026-10-15 (phases 1, 3, 4, 5, 6 and the config tab). Unit, type-check, lint and a production build are green. The live E2E (master §10) has not been run. Deviations are in §13.
Companion to `.claude/route-pjp-master-plan.md`, whose decisions D1–D16 are referenced by number throughout. The backend companion is `gudang-be/.claude/route-pjp-be.md`; its endpoint tables and error codes are the contract.

| Screen / piece | Template | Why |
|---|---|---|
| Routes list | `views/sales-teams/SalesTeamsView.vue` + the `...` Menu from `views/display-programs/DisplayProgramsView.vue` | Header stats line, warn banner + dialog, branch-default filters, one popup `Menu` per page |
| Create / edit page | `SalesTeamCreateView` / `SalesTeamEditView` / `SalesTeamForm` + `usePostSaveNavigation` | Shared form, `formKey` remount after save, tabs with counts |
| Customers & Schedule table | `views/reasons/ReasonsView.vue` (persisted `row-reorder`) | The only reorder that saves to the server, with an optimistic update |
| Add customer dialog | `views/display-programs/components/DisplayCustomerPickerDialog.vue` | Lazy paged multi-select across pages |
| Change salesman dialog | `views/sales-teams/components/SalesTeamMoveMemberDialog.vue` | "Current → new" cards, effective-date `DatePicker`, info `Message` |
| Salesman picker | `InfiniteSelect` like `SalesTeamAddMemberDialog.vue`, re-keyed on team change | |
| Config tab | `views/must-sell-list-configs/` + `views/configs/configTabs.ts` | Per-branch config embedded in `ConfigsView` |
| History tab | `MslHistoryTab.vue` + `constants/auditReferenceTypes.ts` | |
| Error mapping | `views/display-programs/displayProgramErrors.ts`, `utils/customerBranchErrors.ts` | |

**New to the codebase (no template):** a map (`maplibre-gl`), a month calendar grid, and a weekday-chip toggle. These are built as small reusable components under `components/`.

---

## 1. Files

```
src/types/route.type.ts                  Route, RouteListRow, RouteSummary, RouteCustomer, Pattern, Holder, LoadGrid, CustomerOption, …
src/types/journeyPlan.type.ts            JourneyPlanRow, JourneyPlanStatus, JourneyPlanSalesmanCount, AdditionInput
src/types/journeyPlanConfig.type.ts
src/services/routes.service.ts           static class, BASE_URL = API_ENDPOINTS.ROUTES, toListQuery = createListQueryAdapter([...])
src/services/journeyPlans.service.ts
src/services/journeyPlanConfig.service.ts   getMyBranch / list / upsert / delete (copy mustSellListConfig.service.ts)
src/utils/visitCycle.ts                  cycleWeek(d, anchor), matches(freq, f1Week, week), daysMaskHas/Toggle, patternLabelKey, monthPreview(...)
src/utils/visitCycle.spec.ts             shared vectors from gudang-be/internal/journey_plan/domain/testdata/cycle_vectors.json (copied)
src/utils/geo.ts                         haversineKm(a, b), nearestNeighbourOrder(points, startId)
src/utils/geo.spec.ts
src/utils/customDates.ts                 copyToNextMonth(dates, …) mirror for the preview only (server is authoritative)

src/components/map/BaseMap.vue           lazy maplibre-gl, style from VITE_MAP_STYLE_URL, attribution, resize observer, exposes fitTo(points)
src/components/map/NumberedMarker.ts     DOM element factory for numbered / grey pins
src/components/map/LocationPickerDialog.vue
src/components/calendar/MonthCalendar.vue   7-col Tailwind grid; props month, selected[], disabled(fn), decorations(fn), readonly; emits toggle(date), update:month
src/components/calendar/WeekdayChips.vue    Mon..Sat(+Sun) toggles bound to a days mask; readonly variant for table cells

src/views/routes/
  RoutesView.vue                         list
  RouteCreateView.vue / RouteEditView.vue / RouteForm.vue
  routeErrors.ts                         API code → i18n key + field
  routeHelpers.ts                        tomorrow(), toApiDate/fromApiDate (reuse salesTeamHelpers where possible)
  components/
    RouteRowMenu (inline in RoutesView, Menu model computed)
    RouteUnroutedDialog.vue
    RouteCustomNextMonthDialog.vue       list + bulk copy + result panel
    RouteCustomersTab.vue                table + day filter + side panel
    RouteScheduleDialog.vue              Pattern | Custom editor
    RouteAddCustomerDialog.vue
    RouteMoveCustomerDialog.vue          confirm move from another route of the same team
    RouteLoadGrid.vue
    RouteMapPanel.vue                    BaseMap + numbered pins + "Sort from map" preview/apply
    RouteChangeSalesmanDialog.vue
    RouteSalesmenTab.vue                 holder history (+ cancel pending)
    RouteHistoryTab.vue
    RouteHolidayConflicts.vue            small Message list in the Customers tab

src/views/journey-plans/
  JourneyPlansView.vue                   viewer
  components/JourneyPlanStatusBar.vue
  components/JourneyPlanAddVisitDialog.vue

src/views/journey-plan-configs/JourneyPlanConfigsView.vue  (embedded in ConfigsView)
```

---

## 2. Wiring

- **`constants/api.ts`:**
  - `ROUTES: '/v1/routes'`
  - `ROUTE_CUSTOMERS(id)`, `ROUTE_CUSTOMER(id, rcId)`, `ROUTE_CUSTOMER_DATES(id, rcId)`, …
  - `JOURNEY_PLANS: '/v1/journey-plans'`
  - `JOURNEY_PLAN_CONFIGS: '/v1/journey-plan-configs'`
- **`constants/permissions.ts`:** `ROUTE_READ: 170`, `ROUTE_WRITE: 171`, `JOURNEY_PLAN_READ: 172`, `JOURNEY_PLAN_WRITE: 173`, `JOURNEY_PLAN_CONFIG_READ: 174`, `JOURNEY_PLAN_CONFIG_WRITE: 175`.
- **Router** (`router/index.ts`, main layout children):
  - `/routes` (READ)
  - `/routes/create` (WRITE)
  - `/routes/:id/edit` (READ; renders read-only without WRITE)
  - `/journey-plans` (`JOURNEY_PLAN_READ`)

  All carry `meta.titleKey`.
- **Menu** (`components/menu/menu.ts`, sales section next to MSL / Display Programs / Surveys): `navigation.routes`, `navigation.journeyPlans`.
- **Config tab:** add `{ value: 'journey-plan', labelKey: 'journeyPlanConfigs.title', readPermission: JOURNEY_PLAN_CONFIG_READ }` to `configTabs.ts`, plus the `canWrite…` line and the `v-if` render in `ConfigsView.vue`.
- **i18n namespaces** in **both** `en-US.ts` and `id-ID.ts`, same order: `routes.*`, `journeyPlans.*`, `journeyPlanConfigs.*`, `map.*`, `calendar.*` (weekday short names, if no existing key covers them; grep `days.mon` / `weekdays` first), plus `navigation.*` and audit reference labels.
- **Audit reference type labels** (`constants/auditReferenceTypes.ts`): `route`, `route_customer`, `route_salesman`, `journey_plan_config`, `journey_plan_addition`, `journey_plan_regenerate`.
- **Pattern labels:** keep the F-codes literal in both locales. Examples: en `routes.pattern.F2_ODD = 'F2 odd (W1, W3)'`, id `'F2 ganjil (W1, W3)'`. `pattern_label` values from the API (`F4`, `F2_ODD`, `F2_EVEN`, `F1:3`, `CUSTOM`) are parsed in `visitCycle.ts`, `patternLabelKey()`.
- **Tag colours** (mockup): F4 success, F2 info, F1 purple (use PrimeVue `Tag` severities + a `pt` class for purple, or `secondary`), Custom warn/coral. One map in `visitCycle.ts`.
- **Wording:** Customer, never Outlet (master §1).

---

## 3. Routes list (`RoutesView.vue`)

- **Header:**
  - Title "Routes".
  - Stats line: `t('routes.stats', { branch, routes, customers, week })`, from `RoutesService.summary(branchId)`, e.g. "Tangerang Selatan · 24 routes · 1,512 customers in routes · this week W1".
  - Create button (`canWrite`).
- **Banners** (one branch selected only, loaded with `Promise.allSettled`; late replies for an old branch are discarded, as in Sales Teams):
  1. **Unrouted:** `Message severity="warn"`: "N active customers are not in any route and won't be visited. Most: <outlet type>." Button "View customers" opens `RouteUnroutedDialog` (paged table: code, name, customer type, city).
  2. **Custom next month** (only when `summary.customNextMonthMissing > 0`): "N custom-schedule customers have no dates in November." Button "Review & copy" opens `RouteCustomNextMonthDialog`:
     - The list: route, customer, this month's dates.
     - Select all → **Copy to next month** → `POST /v1/routes/custom-dates/copy-next-month`.
     - Shows a result panel (copied count, skipped rows with reasons), not a toast, the same pattern as Bank Settlement split.
- **Filters:**
  - search (code / name / salesman)
  - branch `InfiniteSelect` (default `authStore.primaryBranchId`)
  - team (`Select`, branch teams)
  - salesman (`InfiniteSelect` + a "No salesman" option → `holderState=none`)
  - status (Active default / Inactive / All)
- **Columns** (`sortable: false`):
  - Code (mono)
  - Name
  - Team (`code name`)
  - Salesman:
    - holder name
    - with a pending holder, a second line "→ Yoga from 13 Oct"
    - with none, an amber "No salesman" tag
  - Visit days (`WeekdayChips readonly`, plus a "Custom" tag if `hasCustom`)
  - Customers (right)
  - Status tag: Active / Inactive / **No salesman** (warn), as in the mockup
  - `...` button
- **Row menu items** (computed by row + permissions): Open, **Change salesman** (opens the dialog in place), Deactivate / Activate (confirm dialog). There is no Duplicate (D3).
- **Footnote** under the table (`text-xs`): "Visit days are derived from the route's customers."

---

## 4. Create / edit page

### `RouteForm.vue` (header)
- **Code:** `useNumberSeries('routes')` Auto/Manual toggle (create only).
- **Name**, **Description**.
- **Branch:** create only, locked after (shown as a disabled input on edit, hint "Locked after save").
- **Sales team:** `Select` of active teams in the branch.
  - Disabled on edit when `customerCount > 0`, hint "Locked: the route has customers".
  - Changing the team on create re-keys the salesman picker.
- **Salesman:** create only, optional. `InfiniteSelect` over the team's open members.
  - Each option shows load hints from `salesman-load/bulk` ("2 routes · 42 customers").
  - Hint: "Starts tomorrow. Change later with 'Change salesman'." On edit this field is replaced by a read-only "Salesman" display (+ pending) and a **Change salesman** button.
- **SPV:** read-only on edit, the team supervisor's name, "from the team master".
- **Info `Message`** on create (mockup callout): a route without a salesman can still get customers and schedules; its customers appear in nobody's journey plan until a salesman is set.
- **Save:**
  - Create → `usePostSaveNavigation('/routes').afterCreate` → `/routes/:id/edit` on the Customers tab.
  - Edit sends `version`. On `STALE`, show a toast with "Reload".
- **Errors:** `routeErrors.ts` maps codes to field errors (`ROUTE_NAME_DUPLICATE` → name, `ROUTE_CODE_DUPLICATE` → code, `ROUTE_TEAM_LOCKED` → team).

### `RouteEditView.vue`
- Back button, `code — name`, status tag, and actions: Change salesman, Activate/Deactivate.
- **Tabs:** **Customers & Schedule** (count), **Salesman history**, **History**. On create, the later tabs are disabled with a "Save first" tooltip, as in `DisplayProgramCreateView`.
- Every tab gets `:route`, `:can-write`, `:toast-group`, and emits `changed`, which reloads the route.
- With `route.isActive = false`: a read-only banner "Inactive routes are not planned". Customer mutations are disabled (the API returns `ROUTE_INACTIVE` anyway).

---

## 5. Customers & Schedule tab

Layout: `grid lg:grid-cols-[1fr_340px] gap-4`. Below `lg` the side panel stacks under the table.

### Table (left)
- **Top bar:**
  - A `SelectButton` day filter: "All" + only the weekdays used by this route (derived), like the mockup's `Semua | Sen | Rab | Jum`.
  - "Add customer" (WRITE).
  - Under "All", the table shows route order. Under a day, it shows that day's customers in route order. Reorder is **enabled only under "All"**, to keep one global sequence (D6).
- **Columns:**
  - reorder handle (`row-reorder`, WRITE + "All" only)
  - `#`
  - Customer (name bold; sub-line: customer type · address)
  - Days:
    - cycle → `WeekdayChips readonly`
    - custom → "Oct: 6, 15, 26, 30 · Nov not set", coral
  - Pattern tag
  - remove `x` (confirm: "Removed from tomorrow. Today's plan is kept.")
- **Row click** opens `RouteScheduleDialog`.
- **Reorder:** optimistic. `PUT /customers/order` with the full id list. On error, revert and toast. This persists exactly like `ReasonsView.vue`.
- **Footnote** (mockup): "Order = default visit order on the phone for each day. A customer may be scheduled on a day the route doesn't usually visit; route days are derived."
- **`RouteHolidayConflicts`** above the table, when non-empty: a warn `Message` listing "TK Sinar Terang: 20 Oct is now a holiday — reschedule". Clicking opens the schedule dialog on that month.
- A tiny note under the title on every mutation success: "Changes apply from tomorrow" (D10). Shown as the toast detail, not a permanent banner.

### Side panel (right)
1. **`RouteLoadGrid`:**
   - Grid W1–W4 × Mon–Sat (+ Sun if `allowSunday`), from `GET /{id}/load`.
   - Cell classes: 0 → muted; ≥ 85% of `maxVisitsPerDay` → amber; > max → red-ish amber + a tooltip "Over the limit of 18/day (warning only)".
   - A `+N custom visits in <month>` line under the grid.
   - The current cycle week row label is bold (from `summary.cycleWeekToday`, or computed with `visitCycle.ts` + the config anchor).
   - Note: "This route only. Salesman totals across routes are shown when changing salesman."
   - Clicking a cell sets the map's (week, day).
2. **`RouteMapPanel`** (§10): title "Map · Mon W1", selectors for week (W1–W4) and day. Pins for customers matching that (week, day), in route order. The list of customers without coordinates goes below. Button **Sort from map** (WRITE).

### `RouteScheduleDialog.vue` (mockup 2b)
- **Header:** customer name, sub "RT-001 · order 5". A `SelectButton` **Pattern | Custom**.
- **Pattern mode:**
  - `WeekdayChips` (Sun hidden unless `allowSunday`).
  - Frequency `Select` (F4 / F2 odd / F2 even / F1), and a W1–W4 select when F1.
  - Then "Result · <month>": a read-only `MonthCalendar` with prev/next month. Highlighted days come from `visitCycle.monthPreview(mask, freq, f1Week, anchor, month)`. Holidays are shaded and labelled "holiday" (from `/gen/v1/branch-holidays` filtered by `branch_id`); Sundays and past days are muted.
  - Note: "N visits in October. Preview only; holidays are skipped automatically."
- **Custom mode:**
  - An editable `MonthCalendar` with prev/next month. Disabled: past, today (unless the branch has never generated; ignore that edge in the UI, the server decides), Sundays unless allowed, holidays.
  - Clicking toggles.
  - Footer note: "N dates selected."
  - If next month has no dates: a warn `Message` "November has no visit dates — this customer won't appear in November's journey plan", with buttons **Copy to November (same weekdays)** and **Open November**.
  - Copy calls `POST …/custom-dates/copy-next-month`, then shows the copied/skipped summary inline.
  - Note (mockup): "Copy uses the same weekday and week-of-month (2nd Tue → 2nd Tue); you can adjust afterwards."
- **Save:**
  - Pattern → `PUT /customers/{rcId}`.
  - Custom → `PUT /customers/{rcId}/custom-dates?month=` for each month the user touched (track dirty months), plus the pattern-type switch first if it changed.
  - Switching custom → pattern shows a confirm: "Future custom dates will be removed".
- **Errors:** `ROUTE_CUSTOM_DATE_INVALID` details are mapped back to the offending days, which get a red outline.

### `RouteAddCustomerDialog.vue` (mockup 3)
- A paged multi-select over `GET /{id}/customer-options` (search + customer type filter), selection kept in a `Map` across pages.
- **Columns:** code, name, customer type, city, a geotag indicator (map-pin icon muted if missing), and a status column:
  - `inThisRoute` → "Already in this route", row disabled.
  - `teamRoute` → a red "In RT-002 Pondok Cabe (Agus) — same team", row **not selectable**, with an inline **Move here…** link that opens `RouteMoveCustomerDialog`.
  - `otherTeamRoutes` → a muted info line "Also in RT-011 · TM-008 · Melisa · Mon F4" (allowed).
- **Schedule for the selected customers** (applies to all): weekday chips + frequency (default F4). They can be adjusted per customer afterwards.
- **Add** → `POST /{id}/customers`. A 409 `ROUTE_CUSTOMER_IN_TEAM_ROUTE` (a race) refreshes the page of options and shows the error `Message` with the route named.
- **Explanatory text** (mockup): "A customer may be in routes of different teams, but only in one route per team."

### `RouteMoveCustomerDialog.vue`
- From-route card → to-route card, keeping the schedule summary. Text: "The customer keeps its schedule and is added at the end of this route. Applies from tomorrow."
- Confirm → `POST /{id}/customers/move`.

---

## 6. Salesman history tab
- A `DataTable`: salesman (avatar initials + name · NIP), from, to, status tag (Current / Pending / Ended).
- A pending row has a **Cancel** button (WRITE, confirm) → `POST /salesman/cancel-pending`.
- Empty state: "No salesman has held this route yet".

---

## 7. Change salesman dialog (`RouteChangeSalesmanDialog.vue`, mockup 4)
- **Title:** "Change salesman · RT-007 Serpong Barat", sub "27 customers · TM-005".
- **Left card:** current holder (or "No salesman"; for an employee that left: "ended 30 Sep 2026").
- **Arrow, then the right side:**
  - Salesman `InfiniteSelect`: open members of the route's team, excluding the current holder, plus an explicit "Remove salesman" option.
  - Hint: "Only members of TM-005".
- **Effective from:** `DatePicker`, `minDate = tomorrow`, default tomorrow (D4). If a pending handover exists: an info `Message` "Replaces the pending change to Yoga from 13 Oct".
- **Load warning:**
  - After picking, call `salesman-load?employeeId=X&includeRouteId=routeId`.
  - If any cell > max: a warn `Message` "Yoga's load on Mon W1 becomes 31 visits (current 16 + this route 15), above the 18/day limit. Consider splitting the route or moving some customers."
  - Pick the worst cell for the sentence.
  - Never blocks.
- **Save** → `POST /{id}/salesman`. Map `ROUTE_HOLDER_NOT_ELIGIBLE.details.reason` to readable text.

---

## 8. Journey Plans viewer (`JourneyPlansView.vue`, mockup 5)

- **Filters:**
  - Branch (default primary).
  - Date: `DatePicker`, default today, any past date allowed (archive), future up to `availableUntil`.
  - Salesman: `Select` from `GET /journey-plans/salesmen?branchId&date`, showing "Budi Santoso · KS-021 (17)", plus "All salesmen".
  - A cycle-week `Tag` (`W1`) computed for the chosen date.
- **`JourneyPlanStatusBar`** (from `GET /journey-plans/status`), a muted bar:
  - "Generated 00:30 today"
  - "Available until 16 Oct (7-day horizon)"
  - "Today: locked — only SPV additions change"
  - right-aligned "Last regenerate: 14:05 (route change, RT-01)"

  If `lastNightly.error`: a red `Message` with the error and "Regenerate now". If `!hasEverRun`: an info `Message` "No journey plans yet for this branch" with **Generate now**.
- **Actions (WRITE):**
  - **Add visit** (enabled when the date is today or tomorrow).
  - **Regenerate now**: confirm "Rebuilds tomorrow onward from the current routes. Today is not changed." Then refresh.
- **Table:**
  - Grouped by salesman when "All" is selected (`rowGroupMode="subheader"` on employee), flat otherwise.
  - Columns: `#`, Customer (name + sub address), Route (mono code or "—"), Pattern tag (or "—"), Source tag ("PJP" muted / "SPV addition" purple, with the reason as a tooltip), and a delete `x` on additions (WRITE, date ≥ today, confirm).
  - **No Status column** (D1).
  - Footer: "+ total N planned".
- **`JourneyPlanAddVisitDialog.vue`:**
  - Date (today / tomorrow `SelectButton`).
  - Salesman (`InfiniteSelect` of branch Salesman/Canvass, preset from the filter).
  - Customer (`InfiniteSelect` over `CustomersService.list` with `branch_id` EQUAL, the same as `SalesOrderForm.vue`).
  - Reason (`Textarea`, required, 3–200).
  - Note: "Doesn't change the route. Shows on the phone after sync."
  - A 409 duplicate → inline error.
- Not cached client-side beyond the request; always refetch on filter change.

---

## 9. Config tab (`JourneyPlanConfigsView.vue`)
Copy `MustSellListConfigsView` (embedded, `openAddDialog`). The table and dialog hold:
- branch
- cycle anchor (`DatePicker` with Monday-only `disabledDays: [0,2,3,4,5,6]`; disabled with a tooltip once the branch has plans, i.e. on a 409 `JOURNEY_PLAN_ANCHOR_LOCKED`; pre-check via `status.hasEverRun`)
- horizon days (`InputNumber` 1–14)
- max visits per day (1–200)
- allow Sunday (`ToggleSwitch`)
- custom reminder day (1–28)

A branch without a row shows "Defaults" and its values come from `getMyBranch`'s `isDefault`.

---

## 10. Map (D16, master §7)

- **Dependency:** `npm i maplibre-gl` (pin the current 5.x and record the version in §12 at implementation).
- **Environment:**
  - Add `VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty` to `.env.example`, with a comment explaining the swap options (MapTiler URL with key, self-hosted OpenFreeMap / Protomaps).
  - A missing env value falls back to that URL, in `components/map/mapConfig.ts`.
- **`BaseMap.vue`:**
  - `const maplibregl = (await import('maplibre-gl')).default`, plus a CSS import in the same lazy chunk, so it isn't in the main bundle.
  - Creates the map in `onMounted`, removes it in `onBeforeUnmount`.
  - `ResizeObserver` → `map.resize()`, for the tab and side panel.
  - Default centre: the branch centroid if known, else Jakarta (-6.2, 106.82), zoom 11.
  - Props: `markers: {id, lat, lng, label, variant}`. Exposes `fitTo()`.
  - `AttributionControl` stays on (compact).
  - If WebGL is unavailable, shows a `Message` "Map unavailable in this browser" and keeps working without the map.
- **`LocationPickerDialog.vue`:**
  - Opens at the current coordinates, or the branch centre.
  - Click to place, drag to adjust. Shows lat/lng with 6 decimals.
  - **Use my location** (`navigator.geolocation.getCurrentPosition`, error toast on deny).
  - **Save** emits `{latitude, longitude}` as strings with 8 decimals.
  - **Clear** emits nulls.
- **`CustomerForm.vue`:** next to the existing latitude/longitude inputs (`CustomerForm.vue:252`), add a **Pick on map** button. The dialog writes back into `formData`. Client-side validation: lat −90..90, lon −180..180, both or neither. Map `CUSTOMER_COORDINATES_INVALID`.
- **`RouteMapPanel.vue`:**
  - Markers for the selected (week, day), numbered by per-day order (1..n), blue.
  - Customers without coordinates are listed below in grey ("no location").
  - Clicking a marker shows a popup with name + order.
  - **Sort from map:**
    1. `geo.nearestNeighbourOrder(points, firstId)`, starting from the current #1 of that day.
    2. Show a preview (numbers update and a "Preview — not saved" tag appears).
    3. **Apply** builds a full route order: the day's customers take the new relative order within the slots they occupied, and everyone else stays where they were. Save it with `PUT /customers/order`.
    4. **Cancel** reverts.
  - Note (mockup): "Grey = customer without location. Sort orders by straight-line distance from the first customer."
- **Tests:** `geo.spec.ts` (haversine against known distances, nearest-neighbour determinism with ties broken by id) and a slot-merge spec for the "apply" step.

---

## 11. Employee "Routes" section (D15)
In `views/employees/EmployeeDetailView.vue`, for Salesman/Canvass employees only and only if the user has `ROUTE_READ`:
- A read-only card listing `GET /v1/routes?holderId=` rows: code (link to the route), name, team, customers, and a "from <date>" tag for pending ones.
- Text: "Managed from Routes".

---

## 12. Tests (vitest) and verification

- **Unit:**
  - `visitCycle.spec.ts`: the shared vectors + `monthPreview`.
  - `geo.spec.ts`.
  - `customDates.spec.ts`: 5th-occurrence skip.
  - `MonthCalendar.spec.ts`: disabled days aren't toggleable; decorations render.
  - `WeekdayChips.spec.ts`: mask round-trip.
  - `routeErrors.spec.ts`.
  - `RouteChangeSalesmanDialog.spec.ts`: min date = tomorrow; load warning sentence.
  - `RouteAddCustomerDialog.spec.ts`: same-team rows aren't selectable; Move is offered.
- `npm run test:unit`, `npm run type-check`, `npm run lint`.
- **Live E2E:** master §10. Use Playwright MCP; verify map pins through DOM markers (`.maplibregl-marker`), not pixels.
- **Deviations** found while implementing go in a new **§13 Deviations** of this file. No plan refs in code comments.

---

## 13. Deviations

What was built differently from the sections above. The backend contract it follows is `gudang-be/api/routes.yaml`, `journey_plans.yaml` and `journey_plan_configs.yaml`.

- **maplibre-gl 6.14.0** was the current release, not 5.x. The API used (`Map`, `Marker`, `Popup`, `LngLatBounds`, `AttributionControl`, `NavigationControl`) type-checks and builds; the library and its stylesheet are one lazy chunk.
- **Paging is limit/offset.** `/v1/routes` and its sub-lists read `limit`/`offset`, and the shared `createListQueryAdapter` writes the search term as `q`, while routes read `search`. `RoutesService.toListQuery` renames it.
- **Team lock.** The route API locks the sales team once the route has customers **or** a salesman (§4 says customers only). `RouteForm` follows the API.
- **Copy to next month in the schedule editor is local.** It maps the dates in the browser (`utils/customDates.ts`) into the editor's unsaved state and the server validates on Save (one `PUT /customers/{rcId}` with every future date). This avoids copying server data over unsaved edits. The bulk copy on the list banner does call `POST /v1/routes/custom-dates/copy-next-month`.
- **Custom dates are saved in one call.** `PUT /customers/{rcId}` with `patternType: custom` and `customDates` replaces all future dates, so the per-month `custom-dates?month=` endpoint is not used by the editor.
- **No `RouteRowMenu` file.** The row menu is a computed model inside `RoutesView.vue`.
- **Day filter for custom customers.** Under a weekday, a custom customer is shown when any of its dates falls on that weekday.
- **Move needs a second read.** The customer-options row names the route a customer sits in, not its route-customer id, so `RouteMoveCustomerDialog` reads that route's customers to find the id.
- **Supervisor name** in the route form is read from the team (`SalesTeamsService.get`); the route payload does not carry it.
- **History tab** reads three audit reference types (`route`, `route_customer`, `route_salesman`) and merges them newest first, because all three use the route id as their reference id.
- **Employee "Routes" card** is shown for non-draft Salesman/Canvass employees in view mode when the user holds `ROUTE_READ`.
- **Coordinates.** `CustomerForm` gained a "Pick on map" button, a both-or-neither range check, and the `CUSTOMER_COORDINATES_INVALID` message. The ship-to address pickers were not touched.
- **Not built:** the Excel import/export, Duplicate route, and the per-day sequence view (the mockup's blue future-change rows), all as planned.
- **Tests added:** `visitCycle.spec.ts` (shared vectors in `src/utils/testdata/cycle_vectors.json`, copied from the backend), `customDates.spec.ts`, `geo.spec.ts`, `routeErrors.spec.ts`, `MonthCalendar.spec.ts`, `WeekdayChips.spec.ts`, `RouteChangeSalesmanDialog.spec.ts`, `RouteAddCustomerDialog.spec.ts`, plus the three new write-permission paths in `router/index.spec.ts`.
