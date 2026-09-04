# Accounting Period — Frontend Plan

See also: [`gudang/.claude/ACCOUNTING_PERIOD_PLAN.md`](../../.claude/ACCOUNTING_PERIOD_PLAN.md) (master plan, decision log, state machine) and [`gudang-be/.claude/ACCOUNTING_PERIOD_PLAN.md`](../../gudang-be/.claude/ACCOUNTING_PERIOD_PLAN.md) (backend plan).

---

## 1. What is new about this screen

Three things this codebase has not done before:

1. **A schedule editor.** The custom-period mode is a repeating-row form whose rows are validated *against each other* — gaps, overlaps, coverage of the fiscal year — not field by field. That logic goes into a plain `.ts` module with its own spec, following the `treeFilter.ts` / `treeFilter.spec.ts` precedent from Chart of Accounts; the `.vue` only renders it.
2. **A state machine, not CRUD.** Each row offers a different action depending on where it sits in the timeline, and at most one row is reopenable at any moment. Which action a row offers is a pure function of the timeline — so it too lives in a `.ts` module with a spec, as a direct translation of the backend's `transitions.go`.
3. **An approval-gated action.** Requesting a reopen creates an approval request and changes **nothing** immediately; the row stays `Closed` with a pending indicator until an approver acts. The UI must not optimistically flip it.

Everything else — the company picker, the view/dialog pair, the overlay group, permission gating, the responsive rules — reuses the `ChartOfAccountsView.vue` pattern verbatim.

---

## 2. Constants

`src/constants/api.ts`, appended as a new commented block after the Chart of Accounts one:

```ts
// Accounting Period (Finance) endpoints
FISCAL_YEARS: '/v1/fiscal-years',
FISCAL_YEAR_BY_ID: (id: number) => `/v1/fiscal-years/${id}`,
ACCOUNTING_PERIODS: '/v1/accounting-periods',
ACCOUNTING_PERIODS_CURRENT: '/v1/accounting-periods/current',
ACCOUNTING_PERIOD_OPEN: (id: number) => `/v1/accounting-periods/${id}/open`,
ACCOUNTING_PERIOD_CLOSE: (id: number) => `/v1/accounting-periods/${id}/close`,
ACCOUNTING_PERIOD_REQUEST_REOPEN: (id: number) => `/v1/accounting-periods/${id}/request-reopen`,
ACCOUNTING_PERIOD_PERMANENT_CLOSE: (id: number) => `/v1/accounting-periods/${id}/permanent-close`,
ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE: (id: number) =>
  `/v1/accounting-periods/${id}/revert-permanent-close`,
ACCOUNTING_PERIOD_CONFIG: (companyId: number) => `/v1/accounting-period-configs/${companyId}`,
```

No `GEN_` prefix anywhere — this module has no generic-CRUD surface (master-plan decision 19).

`src/constants/permissions.ts`:

```ts
// PERMISSIONS
ACCOUNTING_PERIOD_READ: 113,
ACCOUNTING_PERIOD_WRITE: 114,
ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE: 115,
// ROUTE_PERMISSIONS
'/accounting-periods': PERMISSIONS.ACCOUNTING_PERIOD_READ,
// ROUTE_WRITE_PERMISSIONS
'/accounting-periods': PERMISSIONS.ACCOUNTING_PERIOD_WRITE,
```

115 is **not** a route permission — it gates a single action inside the screen, read with `hasPermission(PERMISSIONS.ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE)` from `usePermissions`.

---

## 3. Types — `src/types/accountingPeriod.type.ts`

Exported through the barrel in `src/types/index.ts`.

```ts
export type PeriodStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'PERMANENTLY_CLOSED'
export type GenerationMode = 'MONTHLY' | 'CUSTOM'

export interface AccountingPeriod {
  id: number
  companyId: number
  fiscalYearId: number
  name: string
  sequence: number
  startDate: string        // YYYY-MM-DD
  endDate: string          // YYYY-MM-DD
  status: PeriodStatus
  openedAt: string | null;              openedBy: number | null
  closedAt: string | null;              closedBy: number | null
  permanentlyClosedAt: string | null;   permanentlyClosedBy: number | null
  revertedAt: string | null;            revertedBy: number | null
  revertReason: string | null
  /** Present only on the single reopenable period; null otherwise. */
  reopenRequestStatus: string | null
  createdAt: string; createdBy: number
  updatedAt: string | null; updatedBy: number | null
}

export interface FiscalYear { /* id, companyId, name, startDate, endDate, generationMode, audit */ }
export interface FiscalYearDetail extends FiscalYear { periods: AccountingPeriod[] }

/** An unsaved period row in the schedule editor. Dates are Date objects
 *  because they bind to DatePicker; they become YYYY-MM-DD on submit. */
export interface PeriodDraft { name: string; startDate: Date | null; endDate: Date | null }

export interface CreateFiscalYearDto {
  companyId: number
  name: string
  startDate: string
  endDate: string
  generationMode: GenerationMode
  periods?: Array<{ name: string; startDate: string; endDate: string }>
}
/** No companyId — it is immutable server-side. */
export type UpdateFiscalYearDto = Omit<CreateFiscalYearDto, 'companyId'>

export interface AccountingPeriodConfig { companyId: number; reopenFlowId: number | null }
```

> ⚠️ `periods` on a `FiscalYearDetail` arrives as JSON `null` when the year has none, because Go serializes a nil slice as `null`, not `[]`. Normalize at the fetch boundary (`periods: detail.periods ?? []`) — this is the exact bug that produced `normalizeTree()` in the Chart of Accounts work. Do not scatter `!== null` guards through the template.

---

## 4. Services

Static-class pattern, `private static readonly BASE_URL = API_ENDPOINTS.…`, both added to the `src/services/index.ts` barrel.

`src/services/fiscalYears.service.ts` — `list`, `get`, `create`, `update`, `delete`.

`src/services/accountingPeriods.service.ts`:

```ts
export class AccountingPeriodsService {
  static async list(queryString?: string): Promise<Base<AccountingPeriod>>
  static async current(companyId: number): Promise<AccountingPeriod>
  static async open(id: number): Promise<AccountingPeriod>
  static async close(id: number): Promise<AccountingPeriod>
  static async requestReopen(id: number): Promise<AccountingPeriod>
  static async permanentClose(id: number): Promise<AccountingPeriod>
  static async revertPermanentClose(id: number, reason: string): Promise<AccountingPeriod>
  static async getConfig(companyId: number): Promise<AccountingPeriodConfig>
  static async upsertConfig(companyId: number, reopenFlowId: number | null): Promise<AccountingPeriodConfig>
}
```

Update is **PUT**, not PATCH — these are custom `/v1` endpoints (PATCH is only for `/gen/v1`).

`current()` 404s when nothing is open. That is an expected outcome, not a failure: the caller catches it and sets `hasOpenPeriod = false` rather than raising an error toast.

---

## 5. Pure logic modules (+ co-located specs)

The `treeFilter.ts` precedent. Spec files **co-located**, not under `__tests__/` — this repo's actual convention.

### 5.1 `src/views/accounting-periods/periodSchedule.ts`

```ts
export interface ScheduleIssue {
  kind: 'gap' | 'overlap' | 'uncovered-start' | 'uncovered-end' | 'invalid-range'
  index: number            // -1 for whole-schedule issues
  messageKey: string       // i18n key, not a rendered string
  params?: Record<string, string>
}

/** Client mirror of the backend's GenerateMonthlyPeriods, so the dialog can
 *  preview the rows before anything is saved. Must stay in step with
 *  gudang-be internal/accounting_period/usecase/schedule.go. */
export function generateMonthlyDrafts(start: Date, end: Date): PeriodDraft[]

/** Every reason the drafts do not exactly tile [start, end]. Empty = valid. */
export function validateDrafts(drafts: PeriodDraft[], start: Date, end: Date): ScheduleIssue[]

/** The mockup's "01–30 Jun 2026" sub-line. */
export function formatRange(startDate: string, endDate: string): string
```

`validateDrafts` returns i18n **keys**, not rendered strings, so the module stays free of `t()` and the spec asserts on stable identifiers. Date comparisons use `YYYY-MM-DD` strings built with `dayjs(d).format('YYYY-MM-DD')`, never raw `Date` millisecond values — comparing `Date` objects across a DST boundary is how the "one day off" bug gets in.

### 5.2 `src/views/accounting-periods/periodActions.ts`

A direct translation of the backend's `usecase/transitions.go`. Given the company's periods sorted by date, decide what each row offers — so the view never hand-rolls index arithmetic in a template.

```ts
export type PeriodAction =
  | 'open' | 'close' | 'request-reopen' | 'permanent-close' | 'revert-permanent-close'

/** The actions this row offers, given the whole timeline. Mirrors
 *  Timeline.CanX in gudang-be usecase/transitions.go:
 *   - open:                   nothing is open, and this row is UPCOMING
 *   - close:                  this row is OPEN
 *   - request-reopen:         this row is CLOSED and is the immediate
 *                             predecessor of the OPEN row
 *   - permanent-close:        this row is CLOSED and its predecessor is
 *                             PERMANENTLY_CLOSED or does not exist
 *   - revert-permanent-close: this row is the newest PERMANENTLY_CLOSED */
export function actionsFor(period: AccountingPeriod, timeline: AccountingPeriod[]): PeriodAction[]

/** The row that would become OPEN if `period` were closed — for the
 *  confirmation copy. Null when `period` is the last one defined. */
export function successorOf(period: AccountingPeriod, timeline: AccountingPeriod[]): AccountingPeriod | null

/** The rows that would be auto-closed by opening `period` — for the
 *  confirmation copy on the initial back-dated open. */
export function periodsClosedByOpening(period: AccountingPeriod, timeline: AccountingPeriod[]): AccountingPeriod[]
```

`periodActions.spec.ts` builds one fixture timeline — `[PERM, PERM, CLOSED, CLOSED, OPEN, UPCOMING, UPCOMING]` — and asserts:
- exactly one row offers `request-reopen` (index 3, not index 2);
- exactly one row offers `permanent-close` (index 2, not index 3);
- exactly one row offers `revert-permanent-close` (index 1, not index 0);
- no row offers `open` while a row is `OPEN`;
- on an all-`UPCOMING` timeline, every row offers `open` and none offers anything else;
- `successorOf` the last row is `null`.

`periodSchedule.spec.ts` — plain Vitest, no component mounting, with a `draft(overrides)` factory: monthly generation for a calendar year (12 rows), Apr–Mar (12 rows crossing the year), a leap February (29 days), a mid-month start (short first row); `validateDrafts` returning `[]` on an exact tiling and exactly one issue of the right `kind` and `index` for a deleted middle row, an extended row, a late first row, an early last row, and an inverted row.

---

## 6. `AccountingPeriodsView.vue`

Structure copies `ChartOfAccountsView.vue` section for section, including the `// ---------------------------------------------------------------------------` script banners (Company / Config / Fiscal years / Periods / Dialogs / Actions / Mount).

**Template order**

1. `<Toast :group="overlayGroup" />` and `<ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />`
2. `<h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">`
3. `<Toolbar>` — `#start`: the company `InfiniteSelect`; `#end`: `<ResponsiveButton v-if="canWrite">` "New Fiscal Year"
4. The fiscal-year selector
5. `<ResponsiveCard><template #content>` → `<div class="w-full overflow-x-auto">` → the periods `DataTable` → the legend row
6. `<Dialog>` hosting `FiscalYearDialog`, and `<Dialog>` hosting `PeriodActionDialog`

**Script**

```ts
const overlayGroup = 'accountingPeriodsView'
const { canWrite, hasPermission } = usePermissions('/accounting-periods')
const canRevert = computed(() => hasPermission(PERMISSIONS.ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE))
const { isMobile } = useResponsiveSize()
const { isVisible: isDialogShown, open, close } = useDialog({ onClose: async () => { await loadYear() } })
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup, entityName: 'fiscal year', onSuccess: async () => { await loadYears() },
})
```

- **Company picker** — `InfiniteSelect` fed by `CompaniesService.list(query)`, defaulted with `list('sortBy=name&sortOperator=asc&limit=1')`. Copied from `ChartOfAccountsView.vue`. Changing the company reloads config, years, then periods.
- **Fiscal-year selector** — the mockup's `.entity-tabs` row becomes a PrimeVue `SelectButton` on desktop and a `Select` on mobile (`v-if="isMobile"`), over the company's years, defaulting to the year containing the open period and falling back to the latest. The years are few and bounded, so a plain list is right — no `InfiniteSelect`.
- **Periods table** — `DataTable` over the selected year's periods, ordered by `sequence`:

  | Column | Content |
  |---|---|
  | Period | `name` in `font-medium`, plus `formatRange(startDate, endDate)` in `text-xs font-mono text-surface-500` — the mockup's two-line cell |
  | Status | a `<Tag>` per §6.1 |
  | History | up to four `text-xs` lines: opened, closed, permanently closed, reverted (with the reason). "No activity yet" when all are null |
  | Actions | `TableActionButtons`-style row, driven entirely by `actionsFor(period, timeline)` |

  Status and History are `v-if="!isMobile"`. The open row gets the mockup's tint via `:row-class="p => p.status === 'OPEN' ? 'bg-surface-50' : ''"`.

### 6.1 Status tags

| Status | Severity | Icon | en-US | id-ID |
|---|---|---|---|---|
| `UPCOMING` | `info` | `pi-clock` | Upcoming | Akan Datang |
| `OPEN` | `success` | `pi-circle-fill` | Open | Terbuka |
| `CLOSED` | `warn` | `pi-lock-open` | Closed | Ditutup |
| `PERMANENTLY_CLOSED` | `danger` | `pi-lock` | Permanently Closed | Ditutup Permanen |

The warn/danger split preserves the mockup's own visual language (amber for the reversible close, red for the final one) while carrying the correct terminology — see master-plan decision 2 for why "soft/hard close" was rejected.

A `CLOSED` row whose `reopenRequestStatus` is pending shows a second, muted tag: *"Reopen pending approval"*. **The row's status tag stays `Closed`** — nothing about the period has changed yet, and optimistically flipping it would misrepresent the approval state.

### 6.2 Row actions

Rendered from `actionsFor(period, timeline)`, never from an inline status check:

| Action | Shown when | Extra gate |
|---|---|---|
| Open period | `actionsFor` includes `open` | `canWrite` |
| Close period | `… 'close'` | `canWrite` |
| Request reopen | `… 'request-reopen'` and no request is pending | `canWrite` |
| Close permanently | `… 'permanent-close'` | `canWrite` |
| Revert permanent close | `… 'revert-permanent-close'` | `canWrite && canRevert` |

Rows with no available action show a disabled, greyed button with a tooltip explaining why (the mockup's own treatment) rather than an empty cell — "why can't I close August?" is the question the screen must answer without a support ticket.

- A `<Message severity="warn" :closable="false">` above the table when `current()` 404s: *"No open period for this company. Open one, or create the next fiscal year."*
- A second `<Message severity="info">` when `config.reopenFlowId` is null and any period is `CLOSED`: *"No reopen approval flow configured — closed periods cannot be reopened."* with an inline link to set it.
- A legend row under the table with all four tags and their meanings, matching the mockup's legend.
- Deleting a fiscal year hangs off `useConfirmDelete`; a **409** (`ErrScheduleFrozen`) surfaces through `commonErrorToast` with the server's message, which already explains why.

---

## 7. `PeriodActionDialog.vue`

One dialog for all five transitions, parameterised by action — they share a shape (name the period, state the consequence, require an explicit confirmation) and differ only in copy and in whether a reason is required. This is the mockup's confirmation card.

| Action | Body copy | Extra input |
|---|---|---|
| Open | *"Opening {period} will close {n} earlier periods. This cannot be undone."* (listing them) | — |
| Close | *"After closing, no transaction can be dated in {period}. {successor} becomes the open period."* — or, when `successorOf` is null, *"{period} is the last period defined. Closing it leaves this company with no open period."* | — |
| Request reopen | *"This sends a reopen request for {period} for approval. {period} stays closed until it is approved; {open} will return to Upcoming when it is."* | — |
| Close permanently | *"{period} can no longer be reopened. All corrections must go as a reversal in the open period."* | — |
| Revert permanent close | *"{period} returns to Closed and becomes reopenable again."* | **required** `Textarea` reason |

Every variant carries an explicit "I confirm…" `Checkbox` that gates the accept button — the mockup's checklist reduced to the one item that is checkable today; its other three line items depend on a General Ledger that does not exist yet. The revert variant additionally keeps the accept button disabled until the reason is non-empty, mirroring the backend's `ErrReasonRequired` and the `ck_ap_revert_reason` constraint.

---

## 8. `FiscalYearDialog.vue`

`<Form ref="formRef" v-slot="$form" :initial-values="initialValues" :resolver="resolver" @submit="onFormSubmit">`, with the repeated field-row markup (`mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4`, `md:w-32` label, `Message v-if="$form.x?.invalid"`), `initialValues` as a `reactive({})` populated in `onBeforeMount` when `mode !== ADD`, and `resolver` as `computed(() => zodResolver(z.object({ … })))` so i18n messages stay reactive.

Props: `mode: DialogMode`, `companyId: number` (required), `fiscalYear?: FiscalYearDetail`. Emits `close`. Own `toastGroup = 'fiscalYearDialog'`.

| Field | Control |
|---|---|
| Name | `InputText name="name"` |
| Start date | `DatePicker name="startDate" dateFormat="dd M yy"` |
| End date | `DatePicker name="endDate" dateFormat="dd M yy"` |
| Mode | `SelectButton` — Monthly / Custom |

**Mode = MONTHLY** — a read-only preview table of `generateMonthlyDrafts(start, end)`, recomputed whenever either date changes, captioned *"{n} periods will be created"*. The user sees the 12 rows before saving; the payload omits `periods` and the backend regenerates them.

**Mode = CUSTOM** — an editable rows table: name, start date, end date per row, with **Add row** / **Remove row**, `validateDrafts` issues rendered inline beneath the offending row, and submit disabled while any issue stands. A **Prefill from monthly** button seeds the editor from `generateMonthlyDrafts`, so a 4-4-5 or 13-period calendar is an edit rather than from-scratch typing.

**Gotchas that must be honoured** — each is a bug this codebase has already paid for:

- ⚠️ **Mode is a `SelectButton`, so do not drive it through `formRef.states.mode.value`.** PrimeVue's `SelectButton` does not re-render on a programmatic write through the Form's exposed states, even though the underlying value does change. Keep it out of Form `name=` registration entirely, drive it with a plain local ref (`:model-value` + `@update:model-value`), and read that ref at submit time — exactly what `ChartOfAccountDialog.vue` does for `normalBalance`.
- ⚠️ **Optional-chain every `event.states.<field>.value` read for a control behind a `v-if`.** The custom-rows table only mounts in CUSTOM mode; a field that never mounts never registers, and `event.states.x` is `undefined`. This is the `controlAccountTypeId` bug from the Chart of Accounts work.
- ⚠️ **Serialize dates as `dayjs(value).format('YYYY-MM-DD')`.** This codebase's established date-only convention (see `ApPaymentForm.vue:845`), and what keeps a period boundary from sliding a day under a timezone offset.
- The schedule freeze (backend decision 10) means edit is unavailable once any period has left `UPCOMING`. Detect it client-side (`periods.some(p => p.status !== 'UPCOMING')`), disable the form, and show a `Message` explaining why — rather than letting the user fill in the form and meet a 409 on submit.

Submit follows the house shape: `if (!event.valid) return`, an `isLoading` guard, separate `addFiscalYear(event)` / `editFiscalYear(event)` functions, `commonSuccessToast(t('…'), toastGroup)` / `commonErrorToast(e, toastGroup)`, `finally` reset, then `emits('close')`.

Sizing copies CoA, wider for the rows table:
`:breakpoints="{ '960px': '90vw', '640px': '95vw' }" :style="{ width: '60vw' }" :pt="{ header: 'text-base sm:text-lg md:text-xl' }"`.

---

## 9. Reopen approval flow setting

A small settings control on the same screen rather than a separate page — it is one field. Put it behind a gear `Button` in the toolbar opening a compact `Dialog` with a single `InfiniteSelect` over approval flows (`ApprovalFlowsService`, as `ApPaymentConfig` does), bound to `config.reopenFlowId`, saved with `AccountingPeriodsService.upsertConfig`. Gated on `canWrite`.

---

## 10. Routing, menu, i18n

**`src/router/index.ts`** — nested under the `path: '/'` + `MainLayout` route:

```ts
{
  path: 'accounting-periods',
  name: 'AccountingPeriods',
  component: () => import('@/views/accounting-periods/AccountingPeriodsView.vue'),
  meta: {
    requiredPermission: PERMISSIONS.ACCOUNTING_PERIOD_READ,
    titleKey: 'navigation.accountingPeriods',
  },
}
```

**`src/components/menu/menu.ts`** — second item in the **existing** Finance group (added for Chart of Accounts, around line 277); no new group and no `permissionsAny` field — visibility derives from `ROUTE_PERMISSIONS` via `canAccessMenuItem`.

**i18n** — `en-US.ts` and `id-ID.ts` in the **same change**, never English-first-translate-later. `navigation.accountingPeriods` at the top, then a domain block:

```
accountingPeriods: {
  title, newFiscalYear, editFiscalYear, viewFiscalYear, deleteFiscalYear, reopenFlowSetting,
  fields:     { name, startDate, endDate, generationMode, period, status, history, actions, reason },
  modes:      { monthly, custom },
  status:     { upcoming, open, closed, permanentlyClosed },
  actions:    { open, close, requestReopen, permanentClose, revertPermanentClose },
  labels:     { addRow, removeRow, prefillMonthly, periodsWillBeCreated, noActivity,
                legend, reopenPending },
  helpers:    { monthlyPreview, customEditor, frozen, whyDisabled },
  warnings:   { noOpenPeriod, noReopenFlow, openConsequence, closeConsequence,
                closeLastPeriod, reopenConsequence, permanentCloseConsequence,
                revertConsequence, confirmCheckbox },
  validation: { nameRequired, endAfterStart, reasonRequired,
                gap, overlap, uncoveredStart, uncoveredEnd, invalidRange },
  messages:   { created, updated, deleted, opened, closed, reopenRequested,
                permanentlyClosed, reverted },
}
```

Indonesian wording is pulled from the mockup itself (`Periode`, `Riwayat`, `Periode berjalan`, `Belum ada aktivitas`), with the two closed states as **Ditutup** and **Ditutup Permanen** (master-plan decision 2). Pick one rendering of "Fiscal Year" — `Tahun Buku` or `Tahun Fiskal` — and use it consistently.

> ⚠️ Escape any literal `@` in a locale string; vue-i18n treats it as a linked-message marker. This has bitten this codebase before.

The `validation.*` keys are the `messageKey` values `validateDrafts` returns, with `{date}` / `{index}` interpolation params.

---

## 11. Verification

```bash
cd gudang-fe
npm run type-check
npm run lint
npm run test:unit
npm run dev
```

Manual walkthrough (backend running, logged in as SUPER_ADMIN):

1. Navigate to `/accounting-periods` → **Finance ▸ Accounting Periods** is in the sidebar; the company picker defaults to the first company.
2. With no fiscal year defined → the warn banner *"No open period for this company"* shows and the table is empty.
3. **New Fiscal Year** → `FY2026`, 1 Jan – 31 Dec 2026, Monthly → the preview lists 12 rows with correct month ends **before** saving. Save → 12 `Upcoming` periods.
4. **New Fiscal Year** → 1 Jan – 31 Dec 2027, Custom, **Prefill from monthly** → 12 pre-filled rows. Delete June's row → an inline gap error appears and submit is disabled. Extend May's end date to 30 June → the error clears and submit re-enables. Save.
5. **Open** on `September 2026` → the confirmation names the period and lists the 8 earlier periods that will close; accept stays disabled until the checkbox is ticked. Accept → Jan–Aug flip to `Closed` with History entries, September is `Open` and tinted, Oct–Dec stay `Upcoming`, the warn banner disappears.
6. Only `October 2026` offers **Open**-adjacent actions; earlier rows show a disabled button with a tooltip.
7. **Close** September → the confirmation names October as the next open period. Accept → September `Closed`, October `Open`.
8. **Request reopen** on September with no flow configured → the info banner is visible and the action is unavailable. Set a flow via the toolbar gear, then request → a success toast, September **stays `Closed`** with a muted *"Reopen pending approval"* tag.
9. Approve the request in the approval screen, return here → September `Open`, October back to `Upcoming`.
10. **Close permanently** on `February 2026` while January is only `Closed` → the action is unavailable on February and available on January (`periodActions` ordering). Permanently close January, then February.
11. **Revert permanent close** offered only on February, not January. Open it → accept is disabled until a reason is typed. Submit → February returns to `Closed` and the reason appears in History.
12. Log in as a user with 113+114 but **not** 115 → every action is present except **Revert permanent close**.
13. Log in with 113 only → no action buttons at all, no **New Fiscal Year**, table still readable.
14. Log in with none of the three → the Finance ▸ Accounting Periods item is hidden and `/accounting-periods` is blocked on direct navigation.
15. Switch the company picker to a second company → the table empties (periods are per-company, master-plan decision 1).
16. Resize to 375px → Status and History columns collapse, the fiscal-year selector becomes a `Select`, every touch target is ≥ 44×44px, and nothing scrolls the page body horizontally.
17. Switch to Bahasa Indonesia → every label, status tag, action, confirmation and validation message translates; no raw i18n keys anywhere, in either dialog mode.
