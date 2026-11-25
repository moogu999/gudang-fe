# Visits (Kunjungan): storage + web review, before the mobile screens

> Status: PLANNED 2026-11-20, nothing built. Mockup: N-Force visit flow v1.3, section C (screens 16–21). Mobile visit screens get their own plan after this.

## Context

The next mobile work is the N-Force visit flow (mockup `n_force_visit_flow_v1_3 (1).html`, section C, screens 16–21: Daftar Kunjungan → Detail Outlet → GPS check → Selfie → Hub → Cek Stok).

**Today nothing stores a visit.**
- `journey_plans` (000303) only holds the *plan*: which outlets a salesman should visit on a date, from the nightly PJP job or supervisor additions.
- No table records what actually happened: check-in/out, skips, GPS, selfie, the outside-radius reason, or stock-check results.
- The web Journey Plans page shows only the plan.

So this round builds BE storage plus a web review page. The mobile screens come in a separate plan afterwards, built on these endpoints.

**Decisions (user, 2026-11-20)**
- Scope: the visit record plus Cek Stok results. Order / no-order reason, Display, Survey and Tagihan results come in a later round.
- No extra calls yet. Only outlets on the salesman's journey plan for that day can be visited.
- A new web **Visits** page, following the Depot Attendance pattern (list + stat cards + drawer).

**Decisions taken in this plan (flag if you disagree)**
- **"Not visited" is computed when the page is read, not stored.** It means a plan row with no visit on a past date. This works like "missing" on the attendance page, so no end-of-day job is needed.
- **The server does not block check-out on missing activities.** The phone enforces the mandatory activities, since it works offline and most activities don't exist yet. The server records what was done, and the web shows a "stock check missing" flag when the `stock_check` rule is `required`.
- **Hybrid mode and GPS-point correction stay out of scope.** The mode comes from the employee type via `ModeForEmployeeType`, and is snapshotted on the visit.
- **The rule level and coordinates are snapshotted on each visit**, as `depot_attendances` does. The list's status therefore doesn't drift when the rules change.

**Documentation (first implementation step).** Copy this plan to:
- `/.claude/visit-master-plan.md`
- `gudang-be/.claude/visit-be.md`
- `gudang-fe/.claude/visit-fe.md`

Code comments must not cite plan files.

## Behaviour rules

**Day.** `visit_date` is the date of `capturedAt` in `BUSINESS_TIMEZONE`, the same as attendance. The time recorded is `capturedAt` from the device (device time plus the server offset), stored next to the server's own `received_at`.

**One visit per outlet per day.** UNIQUE `(employee_id, visit_date, customer_id)`.
- A replay with the same `clientId` returns the existing row through the idempotency guard.
- A different `clientId` gets 409 `VISIT_ALREADY_EXISTS`.

**Plan membership.** Check-in and skip require a `journey_plans` row for `(visit_date, employee, customer)`. Otherwise the server returns 422 `VISIT_NOT_PLANNED`; extra calls are not allowed yet.
- `journey_plan_id` is stored with `ON DELETE SET NULL`. The natural key, `plan_sequence` and `route_code` are snapshotted, so the visit survives regeneration of the plan.

**Statuses.**
- Stored: `active` (checked in) → `completed` (checked out), or `skipped`.
- Derived on read:
  - `pending`: plan row for today with no visit;
  - `not_visited`: plan row for a past date with no visit;
  - `not_checked_out`: still `active` on a past date.

**One active outlet at a time.** A check-in while another visit of the same employee is `active` gets 409 `VISIT_ANOTHER_ACTIVE` (mockup: "Check-out dulu dari …"). The phone's outbox sends operations in order, so offline sequences replay correctly.

**Check-in rules** come from the visit-rule resolver (`GetEffectiveRules`, the same one `ClockIn` uses). They are resolved on the server, and any distance the client sends is ignored.
- **`outlet_radius`:**
  - `required` / `recommended`: radius check against `customers.latitude/longitude`.
  - Outside the radius: a reason of type `outside_radius` is required, plus a note when the reason has `requires_note`. The visit is flagged; it is never blocked.
  - `off`: no radius check.
  - Outlet without coordinates: `within_radius = NULL`, and the web shows "Outlet point not set".
  - No GPS fix (null coords): treated as outside, so a reason is needed (mockup screen 18, "Sinyal GPS lemah").
- **`fake_gps`:** `mocked = true` → 422 `VISIT_MOCK_LOCATION`.
- **`check_in_selfie`:** a snapshot of `selfie_required`. The selfie is uploaded after the record, through the file module.
- **Skip:** no GPS or selfie. A reason of type `skipped_visit` is required, plus a note if that reason requires one. A visit can't be skipped once it is checked in.

**Device gate.** Every write goes through `CheckCanTransact(deviceID, date)`, as `ClockIn` does.

**Stock check.**
- Results are saved per `(visit, survey, product)`: `available`, plus `store_qty` and `display_qty` in PCS when the survey asks for them. The other survey types aren't stored this round.
- Allowed only while the visit is `active`. A save replaces the visit's whole stock-check set, so it is idempotent.
- **Validated:** the survey is published, `type = stock_check`, belongs to the visit's branch and covers `visit_date`; the products exist; qty ≥ 0; a qty is given only when its column is asked.
- **Not validated:** whether the product is still in the survey's current product list. The phone works from a download that may be older, so `survey_version` is stored instead.

## Backend (`gudang-be`)

### B1. Migration `000315_create_visits` (run `ls migrations | tail` first; renumber if main moved)

**`visits` table**
- **Identity and scope:**
  - `id BIGSERIAL`, `client_id UUID UNIQUE NOT NULL`;
  - `company_id`, `branch_id`, `employee_id`, `device_id → salesman_devices`;
  - `customer_id`, `visit_date DATE`, `mode VARCHAR(16) CHECK (taking_order|canvass)`.
- **Plan snapshot:** `journey_plan_id → journey_plans ON DELETE SET NULL`, `plan_sequence INT`, `route_code`.
- **Status:** `status VARCHAR(16) CHECK (active|completed|skipped)`.
- **Check-in:**
  - `checked_in_at TIMESTAMPTZ`;
  - `check_in_latitude`, `check_in_longitude` NUMERIC(10,8)/(11,8), `check_in_accuracy_m`;
  - `outlet_latitude/longitude` (snapshot), `distance_m`, `radius_m`;
  - `radius_rule_level`, `within_radius BOOLEAN NULL`;
  - `outside_reason_id → reasons`, `outside_note`;
  - `selfie_required BOOLEAN`.
- **Check-out:** `checked_out_at`, `check_out_latitude/longitude/accuracy_m`.
- **Skip:** `skipped_at`, `skip_reason_id → reasons`, `skip_note`.
- **Timestamps:** `received_at`, `created_at`, `updated_at` (all TIMESTAMPTZ).
- **Constraints:**
  - UNIQUE `(employee_id, visit_date, customer_id)`;
  - a partial UNIQUE `(employee_id) WHERE status = 'active'`, which enforces one active visit in the DB as well;
  - CHECKs tying each status to its columns (skipped ⇔ `skip_reason_id` and `skipped_at`, with no check-in; completed ⇒ `checked_out_at >= checked_in_at`);
  - `within_radius = false ⇒ outside_reason_id`;
  - coordinate range and pair CHECKs (copy from 000309).
- **Indexes:** `(branch_id, visit_date)`, `(employee_id, visit_date)`.

**`visit_stock_check_items` table**
- Columns: `visit_id ON DELETE CASCADE`, `survey_id`, `survey_version INT`, `product_id`, `available BOOLEAN NOT NULL`, `store_qty NUMERIC(15,4) NULL CHECK >= 0`, `display_qty NUMERIC(15,4) NULL CHECK >= 0`.
- PK `(visit_id, survey_id, product_id)`.
- CHECK: qty is NULL when not available.

**Permissions**
- `VISIT_READ = 185` and `VISIT_WRITE = 186`, using the standard seed block (copy the end of 000309), granted to SUPER_ADMIN.
- The `Salesman (N-Force)` role gets 186. It already has REASON_READ 139.

### B2. New module `internal/visit`
Copy the `internal/attendance` layout: `app.go`, `domain/`, `usecase/` (one repository, per-use-case interfaces), `adapter/http` with oapi from a new `api/visits.yaml`, and `adapter/repository`.

**Domain**
- Status/flag types and the derived-status function `DisplayStatus(plan row?, visit?, today)`.
- Radius evaluation that reuses attendance's `Haversine`/`Evaluate` logic. Move `Haversine` into `internal/pkg/geo` instead of copying it, and point attendance at it.
- Stock-check validation.

**Use cases and endpoints** (mobile endpoints are self-scoped from the JWT employee and need VISIT_WRITE):

| Use case | Endpoint | Notes |
|---|---|---|
| `CheckIn` | `POST /v1/visits/me/check-ins` | Body `{clientId, customerId, capturedAt, latitude?, longitude?, accuracyM?, mocked, reasonId?, note?}`. Steps: idempotency `Begin` → device gate → plan lookup → active-visit check → rules → evaluate → insert → `Complete`. Lock the employee's rows `FOR UPDATE` before inserting (memory: FK insert / lock deadlock). Reject a `capturedAt` more than 1 day away from server time. |
| `Skip` | `POST /v1/visits/me/skips` | `{clientId, customerId, capturedAt, reasonId, note?}`. Same guard, gate and plan check. |
| `SaveStockCheck` | `PUT /v1/visits/me/{clientId}/stock-check` | `{surveys:[{surveyId, surveyVersion, items:[{productId, available, storeQty?, displayQty?}]}]}`. Addressed by `clientId`, so the outbox can chain it before the phone knows the server id. Replaces the set while the visit is `active`; otherwise 409 `VISIT_NOT_ACTIVE`. Decimals are strings. |
| `CheckOut` | `POST /v1/visits/me/{clientId}/check-out` | `{capturedAt, latitude?, longitude?, accuracyM?, mocked}`. Replay on a completed visit → 200. `capturedAt` must not be before check-in. |
| `List` | `GET /v1/visits` (VISIT_READ, branch-scoped; `BranchScopeAll` bypasses this) | Query `dateFrom`/`dateTo` (max 31 days, no future dates), `branchId`, `teamId`, `employeeId`, `customerId`, `status`, `outsideRadius`, `q` (salesman name/NIP, customer code/name), `limit`, `offset`. Rows = `journey_plans` (date ≤ today) FULL JOIN `visits` on `(date, employee, customer)`, so a visit whose plan row was later removed still shows. Each row: `visitId?`, `planDate`, `employee{id, name, nip}`, `team?`, `customer{id, code, name}`, `planSequence`, `actualSequence` (rank of `checked_in_at` that day, computed in SQL), `status`, `checkedInAt?`, `checkedOutAt?`, `durationMin?`, `withinRadius?`, `distanceM?`, `skipReason?`, `stockCheckCount`, `stockCheckMissing`. Response `{data, meta, summary:{countsByStatus, outsideRadius}}`. Do the filtering, counting and paging in SQL (plan rows are far more numerous than attendance rows), unlike attendance's in-Go set. |
| `Get` | `GET /v1/visits/{id}` (VISIT_READ, branch-scoped) | Full row, reasons (code and name), outlet/check-in/check-out coordinates, selfie URL (`files`, owner `visit`, category `selfie`), stock-check items grouped by survey (survey name/code/version, product code/name, `available`, quantities). |

**Errors** go through `internal/pkg/apierr`:
- `VISIT_NOT_PLANNED` 422
- `VISIT_ALREADY_EXISTS` 409
- `VISIT_ANOTHER_ACTIVE` 409
- `VISIT_NOT_ACTIVE` 409
- `VISIT_MOCK_LOCATION` 422
- `VISIT_REASON_REQUIRED` / `VISIT_NOTE_REQUIRED` / `VISIT_REASON_INVALID` 422
- `VISIT_STOCK_CHECK_INVALID` 422, with `details`

**Files**
- `internal/file/domain/policy.go`: add `"visit/selfie": {imageMIMEs, 2<<20, Single, OwnerRequired}`.
- `ownerTables["visit"] = "visits"`.
- Ownership check under the owner lock, copied from the `depot_attendance` branch in `file/adapter/repository/file.go`.
- `ownerAccessByType` in `file/adapter/http/http.go`: write needs VISIT_WRITE and the owner; read needs VISIT_READ. The selfie can't be deleted (`locked`).

### B3. Wiring
- **`cmd/router.go`:** register the module with the idempotency guard, `DeviceGate`, the business location and the visit-rule service, like attendance.
- **`cmd/main.go` `protectedRoutes`:** add all 6 routes (memory: an unlisted route is public).
- **HTTP cache policy:** both GETs are uncached (live data). Check that `httpcache` defaults to no-store for unlisted routes.

### B4. Tests
- **Domain:** derived status matrix, radius evaluation, stock-check validation.
- **Use cases with fake repos:**
  - replay returns 200, a different `clientId` gets 409;
  - not planned, another visit active, mocked;
  - outside the radius without a reason, rule `off`, outlet without coordinates;
  - skip after check-in;
  - stock check on a completed visit, qty on a column the survey doesn't ask;
  - check-out replay.
- **DB integration test of the List query** (style of `attendance_integration_test.go`): the FULL JOIN, derived statuses, filters, counts and paging.
- Run `go test ./...`.

## Web (`gudang-fe`)

Copy `src/views/depot-attendance/` (view + helpers + drawer + specs).

- **Route and menu.**
  - `/visits`, gated by `VISIT_READ`, next to Depot Attendance in the router and sidebar.
  - `src/constants/api.ts` gets `VISITS`. New `src/services/visit.service.ts` and `src/types/visit.type.ts`.
- **`VisitsView.vue`:**
  - **Filters:**
    - date range (default today, max 31 days);
    - branch, team, salesman, customer pickers. These are gated endpoints; check that the role has read on them (CLAUDE.md cross-project note);
    - status multi-select;
    - "Outside radius only" toggle;
    - search.
  - **Stat cards** from `summary`: Planned, Completed, Active, Skipped, Not visited, Outside radius.
  - **DataTable columns:** Date, Salesman (name + NIP), Customer (code + name), Plan # / Actual #, Status tag, Check-in–out (time + duration), Radius (tag + distance), Stock check (count, or a "Missing" tag).
  - Lazy paging. Plain timestamps formatted in the business TZ; no `dark:` variants (memory).
- **`VisitDrawer.vue`:**
  - Visit rows load `GET /v1/visits/{id}`. Plan-only rows (pending / not visited) show the row data without a fetch.
  - Content:
    - header (status, mode, route);
    - timeline (check-in, check-out, duration);
    - map of the outlet point with the radius circle, the check-in pin and the check-out pin, reusing the attendance drawer's maplibre setup;
    - reason with its note;
    - selfie through the authenticated file URL;
    - stock-check table per survey (Product, Available, Store qty, Display qty).
- **`visitHelpers.ts`:** status → tag severity / i18n key, duration formatting, query building, decimal-string qty display.
- **i18n:** `visits.*` and `navigation.visits` in both `en-US` and `id-ID`, using "Customer"/"Pelanggan" (not Outlet) and "Product"/"Produk", as the other N-Force web pages do.
- **Permissions UI:** VISIT_READ / VISIT_WRITE show in the role editor's permission list. Check whether that list is DB-driven or needs a label key.
- **Specs:** helpers, view (filters → query, stat cards), drawer (plan-only vs visit row, stock-check grouping).

## Not in this round (next: the mobile visit plan)
- **Mobile download of today's visit data:** today's visit list with the customer, credit and MSL badges, the applicable stock-check surveys with their products (MSL source resolved per customer), and the effective rules. Designed together with mobile screens 16–21, using the write endpoints above.
- **Other activities:** order / no-order reason, Kanvas sale, Tagihan, Display and Survey results, extra calls, hybrid mode, GPS-point correction.

## Verification
1. **BE:** `go test ./...`. Then curl against the dev DB, using a salesman device token with today's journey plan rows:
   - check-in inside the radius (201), then replay (200), then a new `clientId` (409);
   - second outlet while the first is active (409);
   - outside the radius without a reason (422), then with one;
   - `mocked` (422);
   - outlet not on the plan (422);
   - skip;
   - stock check (save, re-save replaces, after check-out 409);
   - check-out and replay;
   - selfie upload by the owner only;
   - list/get as a supervisor: branch scoping, derived `pending` / `not_visited` / `not_checked_out` (backdate rows), filters, summary;
   - parallel POSTs, same and different client ids (memory: race test).
2. **FE:** unit, type and lint green. Then a Playwright E2E on `/visits` with the BE fixtures: filters, stat cards, both drawer kinds, map, selfie, stock-check table, both locales with no raw i18n keys.
3. Run `graphify update .` from the repo root. Stop the dev servers by PID (memory). Remove the fixtures.

## Supervisor close (added 2026-11-20, after the E2E)

**Problem.** A visit left `active` on an earlier day blocks every later check-in of that salesman (`VISIT_ANOTHER_ACTIVE`). Before this change, only the phone could clear it, by checking out with that visit's clientId.

**Decisions (user, 2026-11-20)**
- A supervisor closes it from the web. The visit gets a new stored status, `closed`, kept apart from `completed`.
- Only visits left open on a past day can be closed. Today's open visit is checked out from the phone.

**BE**
- Folded into the still-uncommitted `000315`:
  - `closed` is added to the status CHECK;
  - new columns `closed_at`, `closed_by → users`, `close_note`;
  - `chk_visits_closed` makes these three columns all set exactly when the status is `closed`;
  - a closed visit keeps `checked_in_at` and has no `checked_out_at`;
  - new permission `VISIT_CLOSE = 187`, granted to SUPER_ADMIN.
- **Endpoint:** `POST /v1/visits/{id}/close` with `{note}`.
  - Needs VISIT_CLOSE and is branch-scoped; a visit outside the caller's branches answers 404.
  - The note is required, at most 500 characters (422 `VISIT_NOTE_REQUIRED` / `VISIT_NOTE_TOO_LONG`).
  - A visit that is not active gets 409 `VISIT_NOT_ACTIVE`. Today's visit gets 409 `VISIT_NOT_CLOSABLE`.
  - The update runs `WHERE status = 'active'`, so a close racing the phone's check-out has one winner.
- **Phone side:**
  - a queued check-out of a closed visit answers 200 with the visit unchanged, so the outbox drains;
  - a stock-check save on it gets 409 `VISIT_NOT_ACTIVE`.
- **Read side:**
  - `closed` is a list status and filter value;
  - the detail returns `closedAt`, `closedBy`, `closeNote` and `closedByName` (the employee name, else the email).

**Web**
- A "not checked out" visit shows a warning in the drawer. With VISIT_CLOSE it also shows a "Close visit" button, which opens a dialog with a required note.
- After closing, the drawer reloads and the table and stat cards refresh.
- Closed visits show "Closed / Closed by / Close note" in place of the check-out row, with a `Closed by supervisor` / `Ditutup supervisor` tag and stat card.

**Verified**
- **BE tests:** domain, use case and DB integration tests.
- **Live curl:** 403 without the permission, 422 note, 409 today, 404 other branch, 200 close, 409 second close, 200 phone check-out, then the salesman's next check-in 201.
- **Playwright:** the close flow, the closed drawer, the card and filter, id-ID.
- **FE suites:** 1169 unit tests, type-check and lint green.
