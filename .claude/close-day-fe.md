# Close Day: web (`gudang-fe`)

> Status: IMPLEMENTED 2026-11-22 (uncommitted); unit/type/lint green; E2E not run. Master plan: `/.claude/close-day-master-plan.md` (decisions D1–D14). BE contract: `gudang-be/.claude/close-day-be.md` B3.

Code comments must not cite plan files. No `dark:` variants (light-only app).

## F1. Visit Rules: the new rule

The page is catalog-driven, so no component change is expected. Verify that while building.
- **i18n**, both locales, same key order:
  - `visitRules.categories.end_of_day`:
    - en-US: "End of day · locks the next day's Start Visit";
    - id-ID: "Akhir hari · mengunci Mulai Kunjungan hari berikutnya".
  - `visitRules.rules.close_day`:
    - en-US `name` "Close day", `description` "The salesman resolves every plan outlet (a reason for each one not visited), checks out, and closes the day. Required locks the next day's visits until it's closed.", `setIn` "Mobile app: Visits → Close day. Supervisors: Visits → Days."
    - id-ID `name` "Tutup hari", `description` "Salesman menyelesaikan semua outlet PJP (alasan untuk yang tidak dikunjungi), check-out, lalu menutup hari. Wajib mengunci kunjungan hari berikutnya sampai hari ditutup.", `setIn` "Aplikasi: Kunjungan → Tutup hari. Supervisor: Kunjungan → Hari."
- Grep the `visit-rules` specs and fixtures for a hardcoded rule or category count, or a category list, and add the new one.
- Check that the check-salesman drawer shows `close_day` with source `default` for a company with no row.

## F2. Visits page: the Days tab

`src/views/visits/` today is a single list. Wrap it in PrimeVue `Tabs` with **Visits** (the existing content, unchanged) and **Days**. Keep the active tab in the route query (`?tab=days`) so a deep link works.

**Types / service / API**
- `src/types/visit.type.ts`: `VisitDayRow`, `VisitDayDetail`, `VisitDayStatus = 'open' | 'closed' | 'closed_by_supervisor'`, and `skipSource` on the visit row and detail.
- `src/constants/api.ts`: `VISIT_DAYS`, `VISIT_DAY(employeeId, date)`, `VISIT_DAYS_CLOSE`.
- `src/services/visit.service.ts`: `listDays`, `getDay`, `closeDay({employeeId, date, note})`.

**`VisitDaysTab.vue`**
- **Filters:** date range (default the last 7 days, max 31), branch, team, salesman, and status. These are the same pickers as the Visits tab; extract them into a shared component if the copy would be large.
- **Stat cards** from `summary.countsByStatus`: Open, Closed, Closed by supervisor. Clicking a card filters, as on the Visits tab.
- **DataTable** (lazy paging) columns:
  - Date;
  - Salesman (name + NIP);
  - Team;
  - Status tag: `open` = warn, `closed` = success, `closed_by_supervisor` = secondary;
  - Planned;
  - Completed;
  - Skipped (with "n at close" muted);
  - Not visited;
  - First check-in to last check-out;
  - Closed at;
  - an "Active visit" warning icon when `hasActiveVisit`.
- Timestamps are shown in the business TZ.

**`VisitDayDrawer.vue`**
- Loads `getDay`. Shows:
  - a header (salesman, date, status, source);
  - the summary counts;
  - the timeline;
  - the close note (supervisor);
  - the outlet list (sequence, customer, status tag, skip reason, with the "Skipped at day close" tag).
- **Close day:** when `status = open`, the date < today and the user has `VISIT_CLOSE`, show the button.
  - The dialog asks for a required note (≤ 500), and warns when there is an active visit that it will also be closed.
  - On success: toast (the page's own `toastGroup`), reload the drawer, refresh the table and cards.
  - Map BE errors via i18n: `VISIT_DAY_CLOSED`, `VISIT_DAY_NOT_CLOSABLE`, `VISIT_NOTE_REQUIRED`, `VISIT_NOTE_TOO_LONG`.
- From an outlet row, link to the Visits-tab drawer for that visit (reuse `VisitDrawer`).

**Visits tab changes**
- The list row and `VisitDrawer` show a "Skipped at day close" / "Dilewati saat tutup hari" tag when `skipSource = 'close_day'`.
- Optional, if cheap: in the drawer of a `not_checked_out` visit, a hint linking to the Days tab ("closing the day also closes this visit").

**i18n** (`visits.days.*`, `visits.skipSource.*`), both locales:
- tab names;
- status labels: Open / Terbuka, Closed / Ditutup, Closed by supervisor / Ditutup supervisor;
- column headers, drawer labels, dialog copy, error messages.

**Specs**
- helpers (status → severity / key, query building);
- the tab (filters → query, cards);
- the drawer (open vs closed, button gating by permission / date / status, dialog validation);
- the `skipSource` tag in the list and drawer;
- the Visit Rules spec count update.

Run unit, type-check and lint.
