# Absen Masuk Depo: web frontend

> Status: web FE F1–F3 IMPLEMENTED 2026-11-19, uncommitted; unit/type/lint green; live Playwright E2E not run. Mockup: N-Force visit flow v1.3, section B (screens 7–10).

Full cross-project plan: `/.claude/attendance-master-plan.md`.

## Context

The N-Force visit-flow mockup v1.3 (`n_force_visit_flow_v1_3 (1).html` in Downloads; section B, screens 7–10) specifies a daily depot clock-in for salesmen:
- GPS check against the depot radius. Outside the radius gives a warning plus a required reason; it never blocks.
- Fake GPS is blocked.
- A front-camera selfie with a watermark.
- Saved offline at once. One clock-in per day.

The mobile app has none of this today, and its home screen is still the template screen. Supervisors also have no web page to review attendance.

Groundwork that already exists and must be reused, not duplicated:
- **The rule.** Visit Rules `depot_check_in` (required / recommended / off, default radius 150 m, overridable per company and team). `GET /v1/visit-rules/effective` resolves it.
- **The "Absen depo wajib" flag.** This already exists, inverted, as `employees.exempt_depot_check_in`. It is on the BE, in the FE employee form and in both locales. No new flag is needed.
- **Building blocks:**
  - BE: `workingdays` calendar, branch holidays, `journey_plans`, file upload (`internal/file`), idempotency guard, device gate (`CheckCanTransact`).
  - Mobile: SQLite outbox, the N-Force UI kit, the permissions screen, `detectMockLocation()`.

**Decisions taken with the user (2026-11-19):**
- Build the Beranda shell plus attendance. Muatan and Pengumuman steps are hidden. The tab bar has only the Beranda tab for now.
- The depot point is a new branch latitude/longitude.
- The web page shows recorded attendance and also who is missing.
- Clock-in only, no clock-out.

**Decisions inherited from the mockup (v1.3 "keputusan"):**
- A 7th Reason Code type, Absen Luar Depo.
- The exempt flag means no radius check, but a selfie and the location are still recorded.

**Documentation (first implementation step).** Follow the repo convention and copy this plan into:
- `/.claude/attendance-master-plan.md`
- `gudang-be/.claude/attendance-be.md`
- `gudang-fe/.claude/attendance-fe.md`
- `gudang-mobile/.claude/attendance-mobile.md`

Code comments must not cite plan files or section numbers.

## Behaviour rules (shared by all three projects)

**Day.** The attendance date is the date in the business timezone (`BUSINESS_TIMEZONE`, WIB), never a UTC date. The current mobile `todayIso` bug must not be copied.

**Effective depot rule per salesman.** Resolve it with the existing visit-rule resolver:

| Resolved | Beranda step | Radius check | Locks "Mulai Kunjungan" |
|---|---|---|---|
| `required` | shown | yes | yes |
| `recommended` | shown | yes | no |
| `off`, source = employee (exempt) | shown | no, straight to selfie, location still recorded | no |
| `off`, from company or team | hidden | — | no |

**No schedule.** The step is not asked, and the card reads "Tidak ada jadwal kunjungan", when the day is not a working day for the depot branch (weekend flags or `branch_holidays`) or the salesman has 0 `journey_plans` rows that day.

**Depot.** The depot is the salesman's effective branch: the open team's branch, else the employee's branch. This is the same logic as `get_effective_rules.go`.
- Depot coordinates come from the new `branches.latitude/longitude` columns.
- Radius comes from the resolved rule (`radiusM`).
- If the branch has no coordinates, skip the radius check and record `within_radius = NULL`. Mobile shows an info line ("Titik depo belum diatur"). Web shows "Depot point not set".

**Outside the radius.**
- A reason from Reason Code type `depot_outside_radius` is required.
- A note is required when that reason has `requires_note`. The mockup's "Lainnya" is a reason with `requires_note = true`.
- A GPS fix that doesn't arrive within 30 s may continue with coordinates left empty, which is treated as outside and needs a reason. This mirrors the outlet rule on mockup screen 18.

**Fake GPS.** Blocked on the device, using `position.mocked` on Android. The server also rejects `mocked = true` with 422.

**Selfie.** Always required for the depot. Live camera only. The watermark is burned in, compressed to under ~150 KB, and uploaded after the data record.

**Once per day.**
- Server: UNIQUE `(employee_id, attendance_date)`. A repeat with the same `clientId` returns the existing row through the idempotency guard. A different `clientId` gets 409.
- Mobile: no Absen button once a local record exists for today.

**Time.** The device records `capturedAt = Date.now() + serverOffset`, where the offset comes from the last `serverTime` the server returned. The server stores that time and its own `received_at`.

## Web frontend (`gudang-fe`): phases F1–F3

### F1. Masters
- **Branch dialog (`views/branches/BranchDialog.vue`):** add latitude/longitude inputs plus `LocationPickerDialog`. Copy this from `views/customers/CustomerForm.vue`. Update `types/branch.type.ts`.
- **Reason type:** add `depot_outside_radius` to the `ReasonType` union and to `REASON_TYPES` (prefix `ADP`) in `types/reason.type.ts`, and fix the "six fixed types" header comment. Add `reasons.types.depot_outside_radius.{label,trigger,impact}` in en-US and id-ID. Update `ReasonsView.spec.ts` if it counts tabs.
- **Employee form:** no change. `exemptDepotCheckIn` already exists. Check that its hint text still reads correctly ("no radius check; selfie still taken").
- **Visit Rules:** the `depot_check_in` `setIn` text reads "Depot point: Branch / Warehouse". Change it to "Branch" in both locales.

### F2. Attendance page `/depot-attendance`
- **Menu:** the "Sales" section next to Routes and Journey Plans. Label "Depot Attendance" / "Absensi Depo".
- **Route meta:** `requiredPermission: ATTENDANCE_READ` (178). This is read-only, so there is no write permission. Add the permission constants 178 and 179 to `constants/permissions.ts`.
- **Page:** `views/depot-attendance/DepotAttendanceView.vue`, modelled on `views/device-binding/DeviceBindingView.vue`.
  - **Filters:** date range `DatePicker` (default today; pattern from `StockMovementFilters.vue`), branch `InfiniteSelect` (`userBranchesFetcher`), team (keyed on branch), salesman (`EmployeesService.listForSelect`), and search.
  - **Stat cards:** `StatFilterCard` per status group: Present / Outside radius / Missing / Holiday-not-scheduled / Exempt. Clicking a card sets the `status` filter.
  - **`TableComponent` columns:** date, salesman (name + NIP), team, depot, clock-in time (WIB), distance / radius, a status tag (red for outside radius, amber for missing), reason, and a selfie thumbnail.
  - **Detail drawer:** `components/DepotAttendanceDrawer.vue`, deep-linked with `?attendance=`.
    - The selfie at full size, via `PhotoGallery` / `buildFileUrl`.
    - A `BaseMap` showing the depot pin and salesman pin, plus the radius circle.
    - Captured time and received time, accuracy, reason and note, and the rule level used.
- **Map circle:** add an optional `circles: {id, lat, lng, radiusM}[]` prop to `components/map/BaseMap.vue`. It draws a GeoJSON polygon (64-point approximation) with a fill and outline layer after `load`, and includes the circle in `autoFit`.
- **Wiring:** `services/depotAttendance.service.ts` (`createListQueryAdapter`, `listUrl(filters)`), API constants, types, `services/index.ts` registration, and full en-US and id-ID blocks for `depotAttendance.*` and `navigation.depotAttendance`.
- **Styling:** light-only, so no `dark:` classes (memory).

### F3. Tests
- Specs for the view, the drawer, the helpers (status → tag mapping), the service, and the BaseMap circle helper.
- Make sure `router/index.spec.ts` and `usePermissions.spec.ts` still pass.
- `npm run test:unit`, type-check and lint must all be green.

## Verification
1. **BE:** `go test ./...`. Then run against the dev DB with curl:
   - set branch coordinates;
   - call `me/today` as a salesman device token;
   - clock-in inside the radius, then outside without a reason (422), with a reason (201), the same `clientId` (200 replay), and a new `clientId` (409);
   - send `mocked = true` (422);
   - upload the selfie;
   - list and get as a supervisor, checking branch scoping and the missing / holiday / exempt statuses;
   - race-test parallel POSTs (memory: FK insert / lock races).
2. **FE:** unit, type and lint pass. Then do a Playwright E2E:
   - set the branch location in the Branch dialog;
   - add a reason under the new tab;
   - open Depot Attendance and check that filters, stat cards and the drawer (photo, map with circle) work and there is no i18n key leakage in both locales.
3. **Mobile:** run on the Android emulator. Use WSL2's LAN IP for the API (memory: WSL2 emulator setup).
   - Clock in inside and outside the radius (emulator location set via the extended controls).
   - Test mock location blocking.
   - Clock in in airplane mode, check the Beranda done state, then reconnect and check that the record and photo sync and appear on the web page with the watermark visible.
   - Check that a second clock-in is impossible.
   - Check a holiday and a no-PJP day.
   - Check exempt-employee behaviour.
   - Check that a company rule set to off hides the step.
4. Run `graphify update .` from the repo root after the code changes.
5. Shut down the dev servers by PID afterwards (memory).

## Open points (assumptions to confirm during implementation)
- Exempt salesmen still do the step (with no radius) and it does not lock "Mulai Kunjungan". The mockup only says "no radius check, straight to selfie".
- The web page's status uses the current visit-rule settings, not a history of them.
- Choosing which target to show for M5 when a salesman has several active targets.


## Implementation notes (web, 2026-11-19)

- F1: branch dialog has latitude/longitude + map picker (`views/branches/branchHelpers.ts` validates both-or-neither); `depot_outside_radius` reason type (ADP) and locale text; Visit Rules `setIn` now says "Branch".
- F2: `/depot-attendance` (`ATTENDANCE_READ`), `DepotAttendanceService`, drawer with selfie and `BaseMap` (new `circles` prop, `components/map/mapGeometry.ts`).
- Deviations: no selfie thumbnail column (the list API returns no selfie URL; the drawer shows it). Stat cards are one per API status (the `status` filter takes one value), zero-count ones hidden except Within radius / Outside radius / Missing. The summary comes from a separate `limit=1` list call because `TableComponent` does not expose the response's `summary`. Table rows get a client-side `rowKey` (salesman + date) since days with no clock-in have no id. Times are formatted in Asia/Jakarta.
