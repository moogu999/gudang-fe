# Display Program (Planogram) — Frontend Plan

**Status:** FE IMPLEMENTED 2026-10-11, uncommitted. Unit tests (563), type-check and lint are green. Live E2E (master plan §9) NOT run; it waits for the user's go-ahead.

**Master plan:** `../../.claude/display-program-master-plan.md`, with decisions D1–D18 and the E2E checklist in §9. The backend contract is `../../gudang-be/.claude/display-program-be.md` §3–§6. This doc covers phases 3–5.

**Forms:**
- **Display Type** is a **dialog**, the same pattern as Competitor Brands and Reasons.
- **Display Program** is a **page**, with create/edit routes and `usePostSaveNavigation`. It has three tabs: **Settings**, **Customers** and **History**.

**Wording:** use **Customer**, never Outlet. The mockup's "Peserta" tab is **"Customers"** (id-ID "Pelanggan"), and "Tipe outlet" is the existing **Customer Type** (`customers.outletType` i18n key).

**Not built (D1):**
- the Recap tab
- the Penilaian (review) screen and its button
- the "Comply" list column
- the "photos waiting" counter
- Import Excel
- the Salesman (PJP) column

---

## 1. Files

```
src/types/displayType.type.ts, displayProgram.type.ts              (+ src/types barrel)
src/services/displayTypes.service.ts, displayPrograms.service.ts   (+ src/services barrel)
src/views/display-types/
  DisplayTypesView.vue                                             (mockup UI 1, copy of CompetitorBrandsView)
  DisplayTypeDialog.vue (+ .spec.ts)                               (copy of CompetitorBrandDialog)
  displayTypeErrors.ts (+ .spec.ts)
src/views/display-programs/
  DisplayProgramsView.vue                                          (mockup UI 2)
  DisplayProgramCreateView.vue  DisplayProgramEditView.vue
  DisplayProgramForm.vue                                           (Settings tab; mode add|edit, readonly, field locks)
  displayProgramHelpers.ts (+ .spec.ts)                            pure: status severity, field locks, frequency label, rent display, payload builder, publish blockers
  displayProgramErrors.ts (+ .spec.ts)                             BE code → i18n key / form field
  components/
    DisplayProgramStatusTag.vue                                    (copy of MslStatusTag)
    DisplayCriteriaList.vue                                        ordered checklist, drag reorder, add/edit/remove inline
    DisplayCompensationCard.vue
    DisplayCustomersTab.vue                                        paged participants table + actions
    DisplayCustomerPickerDialog.vue (+ .spec.ts)                   multi-select, paged, search, customer-type filter, join date
    DisplayParticipantDialog.vue                                   edit join date / rent override
    DisplayParticipantExitDialog.vue
    DisplayProgramHistoryTab.vue                                   (copy of MslHistoryTab)
```

---

## 2. Reuse: do not rebuild any of these

| Need | Use |
|---|---|
| Simple master list + dialog, delete → "in use, deactivate instead" | `views/competitor-brands/CompetitorBrandsView.vue` + `CompetitorBrandDialog.vue` + `competitorBrandErrors.ts` |
| Create → land on edit, stay on edit after save, re-read + `:key` remount | `usePostSaveNavigation('/display-programs')`, as in `MustSellListCreateView` / `MustSellListEditView` |
| Stale-version 409 dialog | `MustSellListEditView.vue` (`MSL_STALE` ConfirmDialog → reload) |
| Code Auto/Manual toggle + preview | The `codeMode` pattern in `MustSellListForm.vue` + `NumberSeriesService.preview('display_programs')` |
| Branch picker limited to the user's branches | `InfiniteSelect` + `userBranchesFetcher(authStore.branchIds)` + `branchLabel` |
| Principal options | `loadLabelFilterOptions('principal', …)` (`views/sales-teams/salesTeamHelpers.ts`), dropping `NO_LABEL`. The select is **clearable** (internal program, D3) |
| Display type options | `DisplayTypesService.options({ includeId })`. Show `code · name`; an inactive current type shows "(inactive)" |
| `/v1` list paging/search | `createListQueryAdapter` + `static toListQuery`. It drops sort, so **no sortable columns** |
| List filter → table refresh | The `MustSellListsView` pattern: a computed `url`, `watch(url)` → `nextTick` → `table.clearSearch()` |
| Header counts (Active / Scheduled / Draft / Ended) | `MustSellListsView` with `meta.counts` |
| Reference photos | `components/upload/PhotoGallery.vue`: `owner-type="display_program"`, `category="reference"`, `:max="5"`, `:owner-id` set only in edit mode, `ref` + `flushPending(newId)` after create, the same as `CompetitorProductForm.vue` |
| Drag reorder | `MslProductsTable.vue` / `views/reasons/ReasonsView.vue` (`<Column row-reorder>`, `@row-reorder`) |
| Multi-select across pages | `views/competitor-products/components/ComparisonProductPickerDialog.vue` (selection `Map`, `excludeIds`) + the paged table of `MslCustomersDialog.vue` |
| Date ↔ API | `toApiDate` / `fromApiDate` (`salesTeamHelpers.ts`) |
| Start / end pickers | Two `DatePicker`s like `MustSellListForm.vue` |
| Money input/display | The existing `InputNumber` currency usage, e.g. the AP Payment / Cash Deposit forms (`mode="decimal"`, `locale="id-ID"`, `:min-fraction-digits="0"`, `:max-fraction-digits="2"`). Values go to the wire as strings |
| History tab | `MslHistoryTab.vue` + `constants/auditReferenceTypes.ts` |
| Delete confirm | `useConfirmDelete` |
| Permissions | `usePermissions('/display-programs')` → `canRead`, `canWrite`; publish via `hasPermission(PERMISSIONS.DISPLAY_PROGRAM_PUBLISH)`; `usePermissions('/display-types')` for the types page |

### Conventions that have caused bugs before

- **Locales:** both files in the same commit, with the same keys in the same order.
- **Dates:** `YYYY-MM-DD` via `toApiDate`, never `toISOString()`.
- **Omitted keys = empty:** `principal`, `minPerMonth`, `rentPerMonth`, `minComplyPct`, `rentOverride`, `effectiveRent`, `exitDate`, `photos` and `criteria` may be absent. Test with `=== undefined` / `?? []`, never `!== null`, and never default rent to 0. "No rent" and "rent 0" are different.
- **Decimals are strings** on the wire. Send `String(value)` and parse with `Number()` only for display.
- **SelectButton:** programmatic writes don't repaint it. Use a local ref for **frequency mode** and **code mode**.
- **Picker prop timing:** `DisplayCustomerPickerDialog` depends on `programId`, so use `watch` + `nextTick` (the AP Payment picker bug).
- **Remount:** `@primevue/forms` reads `initialValues` only on mount, so remount with `:key` after the re-read.
- **Toast groups:** every view hosts its own Toast group and passes it down.
- **Version tracking:** every participant write returns the new `version`. Store it into the loaded document's `version`, or the next header save gets a false 409.

---

## 3. Types

```ts
export interface DisplayType {
  id: number; code: string; name: string; minPhotos: number
  description?: string; isActive: boolean; programCount: number
}
export interface DisplayTypeOption { id: number; code: string; name: string; minPhotos: number; isActive?: boolean }
export interface DisplayTypePayload { code: string; name: string; minPhotos: number; description?: string; isActive: boolean }

export type DisplayProgramStatus = 'draft' | 'published'
export type DisplayProgramDisplayStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type DisplayProgramStatusFilter = 'current' | DisplayProgramDisplayStatus | 'all'
export type DisplayFrequencyMode = 'every_visit' | 'min_per_month'

export interface LabelRef { id: number; name: string }

export interface DisplayProgramListItem {
  id: number; code: string; name: string
  branch: LabelRef; principal?: LabelRef                    // omitted = Internal
  displayType: { id: number; code: string; name: string }
  startDate: string; endDate: string
  frequencyMode: DisplayFrequencyMode; minPerMonth?: number
  rentPerMonth?: string
  participantCount: number
  status: DisplayProgramStatus; displayStatus: DisplayProgramDisplayStatus; version: number
}

export interface DisplayCriterion { id?: number; text: string; sortOrder?: number }
export interface DisplayPhoto { id: number; url: string; fileName?: string; size?: number }

export interface DisplayProgram extends DisplayProgramListItem {
  notes?: string; minPhotos: number; minComplyPct?: string
  criteria?: DisplayCriterion[]; photos?: DisplayPhoto[]
  createdAt: string; createdByName: string
  updatedAt?: string; updatedByName?: string
  publishedAt?: string; publishedByName?: string
}

export interface DisplayProgramPayload {
  code?: string; branchId?: number                          // create only
  version?: number                                          // update only
  name: string; principalOptionId?: number; displayTypeId: number
  startDate: string; endDate: string; notes?: string
  frequencyMode: DisplayFrequencyMode; minPerMonth?: number; minPhotos?: number
  rentPerMonth?: string; minComplyPct?: string
  criteria: { id?: number; text: string }[]                 // array order = sort order
}

export interface DisplayParticipant {
  id: number
  customer: { id: number; code: string; name: string; city?: string; outletType?: string }
  joinDate: string; exitDate?: string
  rentOverride?: string; effectiveRent?: string
}
export type DisplayParticipantState = 'open' | 'exited' | 'all'
export interface DisplayCustomerOption { id: number; code: string; name: string; city?: string; outletType?: string }
```

---

## 4. Services, display types and list (phase 3)

### `displayTypes.service.ts`
- `list(query)`, `get(id)`, `create`, `update`, `delete`
- `options({ includeId? })`

### `displayPrograms.service.ts`
- `list(query)` with the `toListQuery` adapter; params `branchId`, `principalOptionId` / `principal=internal`, `displayTypeId`, `status`, `q`
- `get`, `create`, `update`, `delete`, `publish(id, version)`, `unpublish`, `endEarly`, `duplicate`
- `participants(id, query)`, `addParticipants(id, body)`, `updateParticipant(id, pid, body)`, `exitParticipant(id, pid, body)`, `removeParticipant(id, pid, version)`
- `customerOptions(query)`

### `api.ts`
Add the `DISPLAY_TYPES` and `DISPLAY_PROGRAMS` URL groups.

### `DisplayTypesView.vue` (mockup UI 1)
- A copy of `CompetitorBrandsView`: search, active filter, and the columns Code, Name, Min photos, Description, Programs, Status.
- New / Edit open `DisplayTypeDialog` (Code is uppercased as you type, Name, Min photos `InputNumber` 1–10, Description, Active toggle).
- Delete is disabled with a tooltip when `programCount > 0`; the API 409 maps to the same message.
- Without `DISPLAY_TYPE_WRITE`, the view is read-only.

### `DisplayProgramsView.vue` (mockup UI 2)

**Toolbar:**
- Branch, defaulting to the user's primary branch.
- Principal (options + "Internal").
- Display type.
- Status: `SelectButton` with a local ref. Current (default) / Draft / Scheduled / Active / Ended / All.
- Search.
- "New program", shown with WRITE only.

**Header line:** "3 active · 2 scheduled · 1 draft", from `meta.counts`.

**Columns:**

| Column | Content |
|---|---|
| Program | **Name**; sub-line `PDS-0021 · every visit` / `· min 2× / month` (mono) |
| Principal | Name, or "Internal" (muted) |
| Display type | `name` |
| Period | `01 Oct – 31 Dec 2026` |
| Customers | `participantCount`, right-aligned |
| Rent / month | Formatted rent, or muted "No rent" |
| Status | `DisplayProgramStatusTag` |
| ⋯ | Menu |

**⋯ menu:**
- Open
- Duplicate (WRITE)
- End early (PUBLISH, Active only, with confirm)
- Delete (WRITE, Draft only, with confirm)

Clicking a row opens `/display-programs/:id/edit`.

---

## 5. Create / edit page (phase 4)

### `DisplayProgramCreateView.vue` / `DisplayProgramEditView.vue`

Copy the MSL views.

**Create:**
- Shows only the **Settings** tab.
- The Customers and History tabs appear after the first save. They show as disabled with the hint "Save first to add customers".
- On save: `create` → `gallery.flushPending(newId)` → navigate to edit.
- If photo flush fails, it shows a warning toast. The program is still created.

**Edit:**
- The header shows `PDS-0021 — <name>`, the status tag, and "Created by X · date".
- Action buttons, by state:
  - **Save**: WRITE, not Ended.
  - **Publish**: PUBLISH + Draft. Disabled with a tooltip listing the blockers from `publishBlockers(doc, photos, participantCount)`: no criteria / no reference photo / no customers / end date passed.
  - **Unpublish**: PUBLISH + Scheduled.
  - **End early**: PUBLISH + Active, with a confirm that says open customers will exit today.
  - **Duplicate**: WRITE.
  - **Delete**: WRITE + Draft.
- Unsaved Settings changes block transitions. The FE asks "Save first?" before publishing a dirty form.
- A 409 `DISPLAY_PROGRAM_STALE` opens the reload dialog.

### `DisplayProgramForm.vue` (Settings tab, mockup UI 3)

**Row 1:**
- Code (Auto/Manual, create only)
- Branch (create only, then shown as text)
- Name
- Principal (clearable; "Internal" placeholder)
- Display type
- Start
- End

**Left column:**
- **Photo frequency.** A `SelectButton` "Every visit / Min N× per month" (local ref). The N `InputNumber` (1–31) appears only for the min mode, with the mockup's help note.
- **Min photos.** An `InputNumber` (1–10). It is prefilled from the display type on create. When the type changes and the current value still equals the old type's default, it is replaced with the new type's default; otherwise the user's value is kept (D5).
- **Reference photos (planogram).** `PhotoGallery`, max 5, with the help note "Shown on the phone before the salesman takes a photo, and next to field photos during review."

**Right column:**
- **Criteria / checklist.** `DisplayCriteriaList`:
  - a numbered list with drag handles and inline-editable text (max 200)
  - remove buttons and an "Add criterion" dashed button (max 20)
  - inline errors for duplicate or empty items
  - the help note "Answered Yes/No by the salesman, re-judged by the supervisor"
- **Compensation (optional).** `DisplayCompensationCard`:
  - "Rent per customer / month (default)" (currency) and "Paid when comply ≥ __ % of visits in a month"
  - the pct field is required when rent is filled, and is cleared and disabled when rent is empty
  - the note "Stored for display rent and claims; not integrated yet."

**Notes:** a textarea at the bottom.

**Field locks** come from `fieldLocks(displayStatus)` in `displayProgramHelpers.ts` and mirror D8:

| Status | Locked |
|---|---|
| Draft | Branch |
| Scheduled | + Principal |
| Active | + Start, Display type, Frequency, Min photos, Criteria (no drag/add/remove/edit), Compensation. The End date picker gets `min-date = today` |
| Ended | Everything, including the gallery (`readonly`) |

Locked fields render disabled with a lock tooltip "Locked while the program is active". A 409 `FIELD_LOCKED` maps to that field.

---

## 6. Customers tab (phase 4)

### `DisplayCustomersTab.vue` (mockup UI 3, Participants)

**Toolbar:**
- Search (customer code/name).
- A state `SelectButton`: Open (default) / Exited / All.
- "Add customers" (WRITE, not Ended).

**Columns:**

| Column | Content |
|---|---|
| Customer | **Name**; sub-line `code · city` |
| Customer type | `outletType` |
| Joined | Date |
| Rent / month | `effectiveRent`, with a muted "override" tag when `rentOverride` is present; "—" when absent |
| Status | Tag: "Active" (open, or exit date in the future) or "Exited <date>" (muted) |
| ⋯ | Menu |

**⋯ menu:**
- Edit (join date, rent override): `DisplayParticipantDialog`.
- Exit (Active programs, open rows): `DisplayParticipantExitDialog`, with the date defaulting to today and bounded to `[joinDate, endDate]`.
- Remove (Draft/Scheduled only, with confirm).

Remove is not shown on Active programs. The hint there is "Use Exit for customers leaving an active program".

The tab badge shows the open count, taken from the document's `participantCount` and refreshed after each action.

Every action:
1. Sends the current `version`.
2. On success, updates the stored version (§2), toasts, and reloads the table.
3. On 409 STALE, opens the shared reload dialog.

### `DisplayCustomerPickerDialog.vue`

- A paged table from `customerOptions({ programId, q, outletTypeId })`, with checkbox selection kept in a `Map` across pages and a "N selected" footer.
- Filters: search and Customer Type (`CustomerOutletTypesService`).
- A footer **Join date** `DatePicker`, defaulting to `max(startDate, today)` and bounded to the program period. An optional **Rent override** field applies to every selected customer.
- Confirm calls `addParticipants`. If `skippedCustomerIds` is non-empty, it toasts "N customers were already in the program and were skipped".
- Selection is capped at 500, with an inline warning.

---

## 7. Status and read-only behaviour

- `DisplayProgramStatusTag` uses these severities: Draft = warn, Scheduled = info, Active = success, Ended = secondary.
- **Read-only form** when any of these hold:
  - the user lacks WRITE
  - the program is Ended
  - the program has been deleted under the user, in which case a 404 redirects to the list with a toast
- An Ended program shows only Duplicate (WRITE).
- Without PUBLISH, the transition buttons are hidden, not disabled.

---

## 8. History tab: `DisplayProgramHistoryTab.vue`

Copy `MslHistoryTab.vue` with `reference_type = 'display_program'`. Add `display_program` and `display_type` to `constants/auditReferenceTypes.ts` with `auditTrails.references.*` labels in both locales.

---

## 9. Wiring

### `src/constants/permissions.ts`
- Add `DISPLAY_TYPE_READ: 156`, `DISPLAY_TYPE_WRITE: 157`, `DISPLAY_PROGRAM_READ: 158`, `DISPLAY_PROGRAM_WRITE: 159` and `DISPLAY_PROGRAM_PUBLISH: 160`.
- Add route map entries for `/display-types` (read 156 / write 157) and `/display-programs` (read 158 / write 159).

### `src/router/index.ts`

Add these routes next to the MSL routes, with `requiredPermission` and `titleKey`:
- `/display-types`
- `/display-programs`
- `/display-programs/create` (WRITE)
- `/display-programs/:id/edit` (READ)

### `src/components/menu/menu.ts`
- **Display Types** goes right after Competitor Brands, in the group that holds Reasons and Competitor Products.
- **Display Programs** goes in **Sales**, right after Must Sell List.

### i18n: both files, same change, same key order
- `navigation.displayTypes`, `navigation.displayPrograms`
- `displayTypes.*`: title, fields, dialog, errors (`codeDuplicate`, `inUse`, `invalidCode`, …), `programCount` tooltip.
- `displayPrograms.*`:
  - list (filters, counts, columns, "Internal", "No rent")
  - status labels
  - form fields and help notes
  - frequency labels (`everyVisit`, `minPerMonth` = "Min {n}× / month")
  - criteria, compensation
  - tabs (`settings`, `customers`, `history`)
  - customers tab (columns, actions, picker, exit dialog, skipped toast, "Exited {date}")
  - publish blockers
  - actions and confirms
  - every BE error code in `displayProgramErrors.ts`
- **`PhotoGallery.vue` hardcodes `competitorProducts.photos.*` / `competitorProducts.errors.*` keys.** Move those strings to a neutral `common.photos.*` namespace in both locales (keep the old keys only if something else reads them) so the gallery doesn't say "competitor" anywhere. Record this in Deviations if it's done differently.
- id-ID wording:
  - "Tipe Display", "Program Display", "Pelanggan", "Foto acuan", "Kriteria", "Kompensasi"
  - "Sewa / bulan", "Tanpa sewa", "Setiap kunjungan", "Minimal {n}× / bulan"
  - "Keluar {date}", "Akhiri lebih awal"

---

## 10. Tests (vitest)

| File | What |
|---|---|
| `displayProgramHelpers.spec.ts` | `fieldLocks` per status; `publishBlockers` order; `frequencyLabel`; `rentDisplay` (absent → "No rent", "0" → "Rp 0", override tag); `buildPayload` (omitted principal, rent/pct pair, criteria order, dates via `toApiDate`); min-photos default swap on type change |
| `displayProgramErrors.spec.ts` | Every BE code → key/field, including `FIELD_LOCKED` + `field` |
| `displayTypeErrors.spec.ts` | Duplicate code → `code` field; in use → toast |
| `DisplayTypeDialog.spec.ts` | Code uppercase, min photos bounds, submit payload |
| `DisplayCustomerPickerDialog.spec.ts` | Selection persists across pages, cap 500, join-date default and bounds, skipped toast |

Run `npm run test:unit`, `npm run type-check` and `npm run lint`.

---

## 11. Verification

1. Unit tests, type-check and lint are green.
2. Run the master plan §9 E2E **only once the user gives the go-ahead**: items 1–15, focusing on the UI items (2, 4, 5, 6, 7, 8, 10, 13, 14, 15).
3. Run `graphify update .` from the repo root (never inside `gudang-fe/`), then stop the dev servers by port PID.

---

## 12. Deviations

- **`PhotoGallery` is neutral now.** Its strings moved to `common.photos.*` (hint, add, remove, main, tooLarge, limitReached, uploadFailed) and the unused `competitorProducts.photos` block was removed. `competitorProducts.errors.fileLimitReached` stays, since `competitorProductErrors.ts` still maps to it.
- **`FIELD_LOCKED` is a toast, not a field error.** `ApiError` doesn't carry the response's `field`, and locked fields are disabled anyway.
- **Display type dialog uses plain refs**, not `@primevue/forms` + zod, so the code can be uppercased as it is typed. The type list is a `TableComponent` against `/v1/display-types` (paged, `isActive` via the URL), not the client-side filter the brands view uses.
- **Picker and participant dialogs emit; the Customers tab calls the API.** `DisplayCustomerPickerDialog` emits `confirm` with the ids, join date and rent override, and `DisplayCustomersTab` does the write, the version handling and the skipped toast.
- **Edit view keeps unsaved Settings changes across customer writes.** `changed(version)` only updates the version and the open-customer count (re-read via `GET /{id}`) and does not bump `formKey`.
- **Create view** shows the Customers and History tabs disabled with a tooltip rather than hidden.
- **Row-menu Open** was added to the list's ⋯ menu; the pencil/eye button also opens the program.
