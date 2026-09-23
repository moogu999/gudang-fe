# Giro Receipt — Frontend Plan

Companion to `.claude/giro-receipt-master-plan.md` (decisions D1–D13 referenced by number) and `gudang-be/.claude/giro-receipt-be.md`.

Three new modules plus a small AR Clearing change:

| Module | Screens | Template |
|---|---|---|
| `src/views/giro-receipts/` | list / create / edit / detail | `src/views/cash-deposits/` for the header, custody strip and received-by. `src/views/bank-settlements/` for the no-approval form. **No** manifest picker, approval timeline, config tab or category master |
| `src/views/giro-register/` | one read-only screen | `ArClearingInvoiceTable` for the table; the bucket tabs are new |
| `src/views/giro-clearings/` | list / create / edit (draft) / detail (+ results) | `BankSettlementForm.vue` (bank account picker) + `ArClearingForm.vue` (picker + detail actions) |
| `src/views/ar-clearings/` | existing | add the `giro` source type (D10) |
| `src/views/bank-settlements/` | existing | tag a mutation to a giro clearing batch + same-amount warning (D13), §8a |

---

## 1. Files

```
src/views/giro-receipts/
├── GiroReceiptsView.vue                 list — TableComponent over /gen/v1/giro-receipts
├── GiroReceiptCreateView.vue            thin wrapper → Form mode=ADD
├── GiroReceiptEditView.vue              thin wrapper → Form mode=EDIT
├── GiroReceiptDetailView.vue            thin wrapper → Form mode=VIEW (+ Void action)
├── GiroReceiptForm.vue
├── giroReceiptLines.ts                  pure helpers, no Vue
├── giroReceiptLines.spec.ts
└── components/
    ├── GiroLinesTable.vue               always-editable DataTable, one row per giro
    ├── GiroLinesTable.spec.ts
    ├── GiroReceiptSummary.vue           custody strip: declared / verified / variance
    ├── GiroReceiptSummary.spec.ts
    └── GiroStatusTag.vue                shared status pill (used by all three modules)

src/views/giro-register/
├── GiroRegisterView.vue                 bucket tabs + table
├── giroRegister.ts                      dueLabel(daysToDue,status) → {key, params, severity}
└── giroRegister.spec.ts

src/views/giro-clearings/
├── GiroClearingsView.vue                list — TableComponent over /gen/v1/giro-clearings
├── GiroClearingCreateView.vue / GiroClearingEditView.vue / GiroClearingDetailView.vue
├── GiroClearingForm.vue                 header + picker (draft) / read-only lines (deposited+)
├── giroClearingLines.ts                 selection totals, early-deposit check, results payload
├── giroClearingLines.spec.ts
└── components/
    ├── GiroClearingPicker.vue           held giros, Map-keyed selection
    ├── GiroClearingPicker.spec.ts
    ├── GiroClearingResultsTable.vue     per-line result Select + note
    └── GiroClearingResultsTable.spec.ts

src/services/giroReceipts.service.ts
src/services/giros.service.ts            the register endpoint
src/services/giroClearings.service.ts
src/types/giroReceipt.type.ts
src/types/giroClearing.type.ts
```

`GiroStatusTag.vue` is the one shared piece. Giro status appears in the receipt detail, the register and the clearing detail, so one component there avoids three copies of `statusSeverity`. Document-level status pills stay local, per house style.

---

## 2. Reuse: do not rebuild any of these

| What | Path | Use here |
|---|---|---|
| `InfiniteSelect` | `src/components/select/InfiniteSelect.vue` | employee, branch, bank account and per-row customer pickers. Pass `initial-option` in edit/view |
| `EmployeesService` | `src/services/employees.service.ts` | the employee picker (any type, active) |
| `CustomersService.list` | `src/services/customers.service.ts` | per-row customer picker, **filtered to `paysWithGiro = true`** (D12): `filterBy=paysWithGiro&filterOperator=0&filterValue=true`. `/gen/v1/customers` has no `FilterMap`, so the column filter passes through as-is |
| `BranchBankAccountsService` | `src/services/branchBankAccounts.service.ts` | the clearing batch's bank account, filtered by branch |
| `useNumberSeries('giro_receipts' / 'giro_clearings')` | `src/composables/useNumberSeries.ts` | the Auto / Manual number toggle |
| `TableComponent`, `GenericQueryBuilder` | `src/components/table/`, `src/services/genericQueryBuilder.ts` | both list pages |
| `usePermissions(route)` | `src/composables/usePermissions.ts` | `canRead` / `canWrite` |
| `useConfirmDelete`, `useDialog` | `src/composables/` | delete / void confirmation |
| `ResponsiveCard`, `ResponsiveButton` | `src/components/card/`, `src/components/button/` | page chrome |
| `CashDepositAdhocTable.vue` | `src/views/cash-deposits/components/` | **the pattern** for `GiroLinesTable`: `latest` ref + `commit()` |
| `CashDepositSummary.vue` | same | **the pattern** for `GiroReceiptSummary` |
| `ApPaymentOpenItemPicker.vue` | `src/views/ap-payments/components/` | **the pattern** for `GiroClearingPicker` (Map-keyed selection) |

### Conventions that have caused bugs before

1. **`GiroLinesTable` is a custom always-editable `DataTable`, not `InlineEditableTable`.** The latter silently drops an unsaved row on submit (a Cash Deposit bug).
2. **Emit from a `latest` ref.** `InfiniteSelect` emits `update:model-value` and `select-option` back to back. Copy `CashDepositAdhocTable.vue`'s `latest` ref + `commit()`.
3. **No `SelectButton` for the clearing result.** A programmatic write doesn't visually update it (see the SelectButton memory). Use a PrimeVue `Select` with options Cleared / Rejected.
4. **Dates on the wire:** `dayjs(d).format('YYYY-MM-DD')`, never `toISOString()`, because UTC+7 lands a day early.
5. **A field Go omits is absent, not `null`.** Test `clearedDate`, `clearingNo` etc. with `!= null` / optional chaining, never `!== null`.
6. **The UI says Customer / Pelanggan**, never Outlet (the mockup's column header).

---

## 3. Types

### `src/types/giroReceipt.type.ts`

```ts
export type GiroReceiptStatus = 'draft' | 'completed' | 'voided'
export type GiroStatus = 'draft' | 'held' | 'clearing' | 'cleared' | 'rejected' | 'voided'
export type GiroReceiptSource = 'manual' | 'nforce'

export interface Giro {
  id: number
  lineNo: number
  giroNo: string
  issuingBank: string
  customerId: number
  customerName?: string
  customerCode?: string
  giroDate: string
  dueDate: string
  amount: string
  status: GiroStatus
  appliedAmount: string
  clearedDate?: string
  rejectedDate?: string
  rejectionNote?: string
}

export interface GiroReceipt {
  id: number
  no: string
  branchId: number
  branchName?: string
  employeeId: number
  employeeName?: string
  employeeTypeName?: string
  receiptDate: string
  receivedByUserId: number
  receivedByEmail?: string
  source: GiroReceiptSource
  recordedCount: number
  recordedAmount: string
  actualCount: number
  actualAmount: string
  varianceCount: number
  varianceAmount: string
  varianceReason?: string
  remark?: string
  status: GiroReceiptStatus
  voidedAt?: string
  voidReason?: string
  giros: Giro[]
}

export interface GiroLinePayload {
  giroNo: string; issuingBank: string; customerId: number
  giroDate: string; dueDate: string; amount: string
}
export interface GiroReceiptPayload {
  branchId?: number; no?: string; receiptDate: string; employeeId: number
  actualCount: number; actualAmount: string; varianceReason?: string; remark?: string
  status: 'draft' | 'completed'; giros: GiroLinePayload[]
}

export type GiroBucket = 'custody' | 'held' | 'due_soon' | 'overdue' | 'clearing' | 'history'
export interface GiroRegisterRow { /* per BE §5 row, amounts as strings, daysToDue: number */ }
export interface GiroRegisterMeta { total: number; limit: number; offset: number
  counts: Record<'custody'|'held'|'dueSoon'|'overdue'|'clearing'|'history', number> }
```

### `src/types/giroClearing.type.ts`

`GiroClearingStatus = 'draft' | 'deposited' | 'completed'`, `GiroClearingResult = 'pending' | 'cleared' | 'rejected'`, `GiroClearing`, `GiroClearingLine`, `GiroClearingPayload {branchId?, no?, depositDate, branchBankAccountId, remark?, status: 'draft'|'deposited', giroIds: number[]}`, `GiroClearingResultsPayload {resultDate, lines: {lineId, result, note?}[]}`.

Export all from `src/types/index.ts`.

---

## 4. Services

| Service | Methods |
|---|---|
| `giroReceipts.service.ts` | `list(query)` → `GEN_GIRO_RECEIPTS`; `get(id)`, `create(p)`, `update(id,p)`, `remove(id)`, `void(id, reason)` |
| `giros.service.ts` | `register({bucket, branchId, customerId, search, dueOnOrBefore, limit, offset})` → `{data, meta}` |
| `giroClearings.service.ts` | `list(query)` → `GEN_GIRO_CLEARINGS`; `get`, `create`, `update`, `remove`, `recordResults(id, payload)` |

`src/constants/api.ts` (next to `BANK_SETTLEMENTS`, ~l.217):

```ts
GIRO_RECEIPTS: '/v1/giro-receipts',
GIRO_RECEIPT_BY_ID: (id: number) => `/v1/giro-receipts/${id}`,
GIRO_RECEIPT_VOID: (id: number) => `/v1/giro-receipts/${id}/void`,
GEN_GIRO_RECEIPTS: '/gen/v1/giro-receipts',
GIROS: '/v1/giros',
GIRO_CLEARINGS: '/v1/giro-clearings',
GIRO_CLEARING_BY_ID: (id: number) => `/v1/giro-clearings/${id}`,
GIRO_CLEARING_RESULTS: (id: number) => `/v1/giro-clearings/${id}/results`,
GEN_GIRO_CLEARINGS: '/gen/v1/giro-clearings',
```

Register all three in `src/services/index.ts`.

---

## 5. Giro Receipt form (mockup screen 1)

### Header

Number (Auto/Manual via `useNumberSeries('giro_receipts')`), branch (only when the user holds more than one, as in the siblings), receipt date (default today), employee (`InfiniteSelect` over employees; show the type as a read-only tag after pick), **Received by**: the logged-in user's email, read-only (D5). Source banner: `source = 'manual'` shows *"No upload: manual entry by {user}"*. The N-Force variant is not reachable this iteration, but render the banner from `source` so it works later.

### `GiroLinesTable`

Columns: Giro No, Issuing Bank, Customer (`InfiniteSelect`, giro-enabled customers only; an empty-state hint says *"Only customers with Pays with Giro enabled are listed"*), Giro Date, Due Date, Amount, delete. "Add giro" row button. A subtotal footer reads *"Subtotal ({n} giros)"*.

Pure helpers in `giroReceiptLines.ts`:

- `emptyGiroRow()`
- `giroRowErrors(row)`: required fields, `dueDate >= giroDate`, `amount > 0`
- `duplicateGiroKeys(rows)`: `lower(bank)|giroNo` pairs appearing twice, used to flag both rows red before submit (the server 400 is the backstop)
- `recordedTotals(rows)` → `{count, amount}`
- `toPayload(rows)`

Show a warning (not a block) when a `dueDate` is already past on entry: *"This giro is already overdue."*

### `GiroReceiptSummary` (the custody strip)

Declared (from lines: count + amount) | Physically verified (two `InputNumber`s: count, amount) | Variance (count, amount). The variance shows 0 until a verified value is entered (a Cash Deposit lesson). When either variance ≠ 0, show a required **Variance reason** textarea. It is UI-required on Submit only; a draft saves without it (D4). There is no approval badge: a non-zero variance is informational only.

Status note under the strip, from the mockup: *"Not yet applied to AR: giros enter custody and wait for their due date."*

### Submit

Buttons: **Save Draft** (`status: 'draft'`) and **Submit Receipt** (`status: 'completed'`, requires ≥ 1 valid giro, no duplicates, and a variance reason if needed). On success, go to the detail page. On 400 `ErrCustomerNotGiroEnabled` (the flag was turned off after the draft was saved), toast the server message and mark the row's customer cell invalid. On 409 `ErrDuplicateGiro`, toast the server message and highlight nothing further (the server doesn't say which row; keep it simple).

### Detail view

Read-only form plus a per-giro `GiroStatusTag` column (and `clearingNo` / `clearedDate` where present, from GET). A **Void** button when `status === 'completed'` and `canWrite` and every giro is `held`. It is hidden otherwise, with a tooltip explaining why when some giro has moved on. Void opens a dialog with a required reason. Voided documents show a red banner with the reason and date.

### Edit / delete gating

Edit and Delete only when `status === 'draft'`. Edit on a non-draft shows the `notEditable` message, as the siblings do.

---

## 6. Giro Register (mockup screen 2)

`GiroRegisterView.vue`, route `/giro-register`, read permission `GIRO_RECEIPT_READ`.

- **Tabs** (a PrimeVue `Tabs`, or a button group, **not** `SelectButton`): All in custody · Held · Due < 7 days · Overdue · In clearing · History, each with its count from `meta.counts`. The default tab is All in custody.
- Filters: branch (multi-branch users), customer picker, search box (debounced).
- Columns: Giro No, Bank, Customer, Received (receipt date, linking to the receipt), Due Date, Amount, Status.
- **Status column** via `dueLabel(daysToDue, status)` in `giroRegister.ts`:
  - `clearing` → info "In clearing" (+ clearing no, linking to the batch)
  - `held` and `daysToDue < 0` → danger "Overdue {n} days"
  - `held` and `0 ≤ daysToDue ≤ 7` → warn "Due in {n} days" (`n = 0` → "Due today")
  - `held` otherwise → secondary "Held"
  - `cleared` / `rejected` → success / danger, with the date; the rejection note as a tooltip
- Footer hint when `counts.overdue > 0`: *"{n} giros are overdue and should be deposited for clearing soon."* (the mockup's footer)
- An action button **Deposit for clearing** (`canWrite` on `/giro-clearings`) navigates to `/giro-clearings/create`.
- Server-side paging (`limit/offset`), sorted by the server.

---

## 7. Giro Clearing (mockup screens 3 + 4)

### Form: draft / create (screen 3)

Header: number (`useNumberSeries('giro_clearings')`), branch, deposit date (default today), **Deposit to bank account** (`InfiniteSelect` over branch bank accounts for the chosen branch; clear it when the branch changes), remark.

`GiroClearingPicker`: rows from `GirosService.register({bucket: 'held', branchId, dueOnOrBefore: depositDate + 1 day})`. A **"Show all held giros"** toggle drops `dueOnOrBefore`. Map-keyed checkbox selection by giro id. A row due more than 1 day after the deposit date gets a warning tag, *"Not yet due"* (D8, UI-only). Footer: *"Total to deposit: {amount}"* (the sum of the selected giros). In edit mode, pre-select the draft's giros. They are still `held`, so they come back from the register.

Buttons: **Save Draft** and **Deposit {n} Giros to Bank** (`status: 'deposited'`, ≥ 1 selected, bank account required). Hint text from the mockup: *"After depositing, the giros move to In clearing. Results (Cleared/Rejected) are entered once the bank confirms (usually H+1 to H+3)."* On 409 `ErrGiroNotHeld` (someone else deposited one), toast and reload the picker.

### Detail: deposited / completed (screen 4)

Read-only header + lines. If `status === 'deposited'` and `canWrite`, show `GiroClearingResultsTable`:

- Columns: Giro No, Customer, Amount, **Result** (`Select`: Cleared / Rejected, empty = leave pending), **Note** (input, required when Rejected).
- Lines already resolved render read-only with their result tag and date.
- **Result date** `DatePicker` above the table (default today, min = deposit date).
- Live totals: *"Cleared: Rp X · Rejected: Rp Y"*.
- Per rejected line, an inline callout adapted from the mockup: *"{giroNo} ({customer}, {amount}) was rejected. This customer's receivables are unchanged; follow up on the physical giro separately."*
- If any line is set to Cleared, one callout: *"{n} cleared giros ({amount}) become unapplied cash for their customers, ready to allocate in AR Clearing."* Link to `/ar-clearings/create`.
- **Submit Results** first opens a confirmation dialog repeating the cleared/rejected counts and totals, because results are final with no undo (D9, as with Bank Settlement). It then sends only the lines with a chosen result (partial allowed). `giroClearingLines.ts` has `buildResultsPayload(rows, date)` and `resultRowErrors(row)`.

`completed` batches are fully read-only. A batch status pill is local: draft = secondary, deposited = info, completed = success.

### Edit / delete gating

Edit/Delete only on `draft`.

---

## 8. AR Clearing: the giro source (D10)

| File | Change |
|---|---|
| `src/types/arClearing.type.ts:13` | `ArCashSourceType = 'cash_deposit' \| 'bank_settlement' \| 'giro'` |
| `src/views/ar-clearings/components/ArClearingSourceTable.vue` | tag label + severity for `giro`. The note column already shows `note` (giro no · bank) |
| `src/views/ar-clearings/arClearingLines.ts` | grep for `bank_settlement` branches; add `giro` wherever a switch exists (no hint invoice, so it joins FIFO like bank lines) |
| both locales, `arClearings.sources.type` (~en-US l.2769) | `giro: 'Giro'` / `giro: 'Giro'` |
| `ArClearingSourceTable.spec.ts`, `arClearingLines.spec.ts` | one giro fixture row each |

Link the source document no to `/giro-receipts/{id}` for `giro` rows, mirroring however the other two types link.

---

## 8a. Bank Settlement: tag to a giro clearing batch (D13)

| File | Change |
|---|---|
| `src/types/bankSettlement.type.ts` | line gets `giroClearingId?: number`, `giroClearingNo?: string`; new `GiroClearingCandidate` + `CandidateClearedGiro` types |
| `src/services/bankSettlements.service.ts` | `giroClearingCandidates({branchBankAccountId, from, to})` → `API_ENDPOINTS.BANK_SETTLEMENT_GIRO_CANDIDATES` (`'/v1/bank-settlements/giro-clearing-candidates'`) |
| `src/views/bank-settlements/bankSettlementLines.ts` | `isTagged(row)` (~l.61) becomes `row.customerId != null \|\| row.giroClearingId != null`. New `tagMode(row)`: `'customer' \| 'giro' \| 'none'`. New pure `giroLookalike(row, candidates)`: returns the cleared giro whose `customerId` equals the row's customer and `amount` equals the row's amount, with `clearedDate` within ±7 days of `mutationDate`, else `undefined`. New `batchOverMatch(rows, candidates)`: the per-batch Σ linked vs `unmatchedAmount`, so the UI can flag it before submit |
| `components/BankSettlementMutationTable.vue` | the tag cell gets a small **`Select`** (not SelectButton) with *Customer* / *Giro clearing*. Customer mode keeps the existing `InfiniteSelect`. Giro mode shows a `Select` over the candidates, labelled `{no} · {depositDate} · unmatched {amount}`. Switching mode clears the other id. Keep the `latest`-ref commit pattern for both pickers. A row with `giroLookalike` set shows a warn icon + tooltip: *"{customer} has a cleared giro {giroNo} for this amount on {date}. If this credit is that giro, tag it to clearing {no} instead."* The row still saves |
| `BankSettlementForm.vue` | load candidates when the bank account or period changes, and pass them to the table. Block Submit (not Save Draft) when `batchOverMatch` reports any batch over its unmatched amount |
| `BankSettlementSummary.vue` | no change: tagged already includes batch-linked lines via `isTagged` |
| detail/view mode | a batch-linked row shows its `giroClearingNo`, linking to `/giro-clearings/{id}` |
| `src/views/giro-clearings/` detail | shows *"Matched to bank: {bankMatchedAmount} of {clearedAmount}"* under the totals |

Tests: `bankSettlementLines.spec.ts` (`isTagged` with a batch; `giroLookalike` hit/miss on customer, amount, and ±7 days; `batchOverMatch`). `BankSettlementMutationTable.spec.ts` (switching mode clears the other id; the warn icon renders on a lookalike).

## 9. Wiring

### `src/constants/permissions.ts`

```ts
GIRO_RECEIPT_READ: 128, GIRO_RECEIPT_WRITE: 129,
GIRO_CLEARING_READ: 130, GIRO_CLEARING_WRITE: 131,
```

Read map (~l.206): `'/giro-receipts': GIRO_RECEIPT_READ`, `'/giro-register': GIRO_RECEIPT_READ`, `'/giro-clearings': GIRO_CLEARING_READ`. Write map (~l.266): `'/giro-receipts': GIRO_RECEIPT_WRITE`, `'/giro-clearings': GIRO_CLEARING_WRITE`.

### `src/router/index.ts`

`/giro-receipts`, `/giro-receipts/create`, `/giro-receipts/:id/edit`, `/giro-receipts/:id`. `/giro-register`. `/giro-clearings`, `/giro-clearings/create`, `/giro-clearings/:id/edit`, `/giro-clearings/:id`. Lazy-loaded, with `meta` matching the sibling routes.

### `src/components/menu/menu.ts` (Finance group, after Bank Settlements ~l.307, before AR Clearing)

```ts
{ label: 'Giro Receipts',  labelKey: 'navigation.giroReceipts',  route: '/giro-receipts' },
{ label: 'Giro Register',  labelKey: 'navigation.giroRegister',  route: '/giro-register' },
{ label: 'Giro Clearings', labelKey: 'navigation.giroClearings', route: '/giro-clearings' },
```

### `NumberSeriesDialog` (`src/views/number-series/NumberSeriesDialog.vue` ~l.283)

Two entity-type options, `giro_receipts` and `giro_clearings`, each with `disabled: takenEntityTypes.value.has(…)`, plus their locale labels. The Cash Deposit plan missed this; don't repeat that.

### i18n: both files, same change, same key order

- `navigation.giroReceipts / giroRegister / giroClearings`
- `giroReceipts.*`: title, fields (no, receiptDate, employee, employeeType, receivedBy, giroNo, issuingBank, customer, giroDate, dueDate, amount, recordedCount/Amount, actualCount/Amount, varianceCount/Amount, varianceReason, remark), sourceBanner.manual / nforce, subtotal (`{n}` giros), statusNote, actions (addGiro, saveDraft, submit, void), void dialog (title, reason, confirm), validation (required fields, customerNotGiroEnabled, customerPickerHint, dueBeforeGiroDate, duplicateInDocument, varianceReasonRequired, noGiros), warnings.alreadyOverdue, status labels (document + giro), notEditable, voidBlockedHint.
- `giroRegister.*`: title, tabs (custody, held, dueSoon, overdue, clearing, history), columns, due labels (`overdueDays`, `dueInDays`, `dueToday`, held, inClearing, cleared, rejected), overdueHint, actions.depositForClearing.
- `giroClearings.*`: title, fields (no, depositDate, bankAccount, total, resultDate, result, note), picker (showAllHeld, notYetDue, empty, totalToDeposit), actions (saveDraft, deposit `{n}`, submitResults), hints (afterDeposit, rejectedCallout, clearedCallout, confirmResults), results (cleared, rejected, pending), validation (noneSelected, bankAccountRequired, rejectionNoteRequired, resultDateBeforeDeposit), status labels, errors.giroNotHeld.
- `numberSeries.entityTypes.giro_receipts / giro_clearings`
- `arClearings.sources.type.giro`
- `bankSettlements.*` (D13): tagMode.customer / giro, giroClearingPlaceholder, giroCandidateLabel, giroLookalikeWarning, overMatched, errors (lineDoubleTagged, giroClearingOverMatched, giroClearingAccountMismatch, giroClearingNotCleared)
- `giroClearings.fields.bankMatched`

id-ID wording: Penerimaan Giro, Register Giro, Setor Kliring (screen + menu), Hasil Kliring, Cair / Ditolak, Jatuh tempo, Pelanggan (not Outlet), Bank Penerbit.

---

## 10. Tests (vitest)

- `giroReceiptLines.spec.ts`: row errors (each field, date order), duplicate detection (case-insensitive bank, trimmed), totals, payload shape (amounts as strings, dates `YYYY-MM-DD`).
- `GiroLinesTable.spec.ts`: add/remove rows, the customer pick commits via the `latest` ref (both emits land), overdue warning.
- `GiroReceiptSummary.spec.ts`: variance 0 until verified is entered, the reason field toggles on a non-zero variance in either unit.
- `giroRegister.spec.ts`: the `dueLabel` table (−6, −1, 0, 3, 7, 8, clearing, cleared, rejected).
- `giroClearingLines.spec.ts`: selection total, not-yet-due check, results payload includes only chosen lines, rejected without note fails.
- `GiroClearingPicker.spec.ts`: default `dueOnOrBefore` param, the toggle drops it, pre-selection in edit.
- `GiroClearingResultsTable.spec.ts`: resolved rows read-only, the note is required on Rejected, live totals.
- `GiroLinesTable.spec.ts` (addition): the customer `fetch-fn` query includes the `paysWithGiro` filter.
- AR Clearing specs: a giro fixture renders the Giro tag and joins FIFO.

`npm run type-check`, `npm run lint`, and the full `npx vitest run` must be green.

---

## 11. Verification

1. Run the backend with the BE plan's phases done (`JWT_TOKEN_TTL=120m go run ./cmd/`) and `npm run dev`.
2. Walk master §9 with Playwright MCP, in both en-US and id-ID. Remember: `InputNumber` needs real keystrokes (click, Ctrl+A, slow type, Tab); `DatePicker` needs day clicks; a synthetic `.click()` on a `.p-checkbox` wrapper doesn't tick a PrimeVue row, so use a real locator click.
3. Confirm no raw i18n keys, no console errors, no "Outlet" anywhere.
4. Delete the screenshots that land in the repo root, clean up the fixtures, stop both dev servers, and run `graphify update .`.

---

## 12. As built (2026-09-23): deviations from this plan

- **Receipt header** also shows the read-only Legal Entity (resolved from the branch), as the siblings do. The receipt date is capped at today (backdating is allowed).
- **Custody check on drafts.** Verified count and amount are required only on Submit. A draft saved before counting sends `0`/`0.00`, and reopening a draft with `0`/`0` shows it as "not counted yet" instead of a full variance.
- **Server errors with no row.** `ErrCustomerNotGiroEnabled` and `ErrDuplicateGiro` name no row, so the form shows the server message in a toast and marks no cell.
- **Void** is shown but disabled, with a tooltip, when some giro has left `held`. The plan said hidden plus tooltip; a hidden button can't carry a tooltip.
- **Register.** The tabs are a button group with count badges. Pagination is server-side through `page`/`limit` (the BE deviation), not `offset`.
- **Clearing picker** loads up to 500 held giros for the branch and pages them client-side. Picked giros outside the current window stay listed, so a draft's giros are always visible. On a 409 during deposit, the picker drops picks that are no longer held and toasts how many (`giroClearings.errors.giroNotHeld`). Depositing asks for confirmation first. Changing the branch clears the picks.
- **Clearing detail** is one form: draft = picker; deposited + write = results table; otherwise read-only lines with the giro's status. The results date defaults to today (or the deposit date if later).
- **Bank Settlement D13.** The tag-mode Select remembers each untagged row's mode by row key. A saved batch link whose batch is no longer a candidate still labels itself. Candidates load only outside VIEW mode (the endpoint needs WRITE). Over-match disables Submit and is re-checked on submit. The server's D13 errors are shown as the server's message, so there are no `bankSettlements.errors.*` keys.
- **AR Clearing** source tags are driven by a per-type map. Source documents are not linked (the other two types aren't either).
- **Test stub.** `ar-clearings/components/dataTableStub.ts` now honours `dataKey` (the default is still `_key`).

**Live smoke test 2026-09-23 (id-ID + en-US, 0 raw keys, 0 console errors):** receipt with variance (reason required on submit, saved figures verbatim); only giro-enabled customers in the picker; duplicate giro → 409 toast; draft absent from the register, then edit → submit; void (empty reason blocked, banner, giros voided); register buckets, counts, due labels, overdue hint; clearing picker window + show-all + not-yet-due warning, deposit; partial result (batch stays deposited); rejected needs a note, then completed; cleared giro in the AR Clearing pool (cleared date, "giro no · bank" note); Bank Settlement giro tag (candidate label, over-match blocks submit, same-amount warning, completion raises `bank_matched_amount`, no pool double count, detail links to the batch); edit on a non-draft shows notEditable. **Not exercised live:** permission gating (needs a temp role and user). The race and AR Clearing items are covered by the follow-up below. Fixtures were removed, number series 27/33/34 rewound, customers 5/6 `pays_with_giro` restored to false, and the servers stopped.

**Follow-up test 2026-09-23 (race + AR Clearing giro source):**
- *Races, via parallel curl.* Two batches depositing one giro: exactly one wins every time. Before the fix below, the loser got a **500 (Postgres deadlock) in 3 of 5 runs**. After it: 20/20 PUT and POST races end with one winner and a 409. Two settlements linking one cleared batch: 6/6 give one 201 and one 400 over-match. Two AR clearings applying one giro: before the fix, draft → completed PUT races **deadlocked 5 of 8**; after it, 15/15 PUT and POST races end with one winner and a 400.
- *Cause and fix (backend, uncommitted).* Each transaction inserted child rows before taking `FOR UPDATE` on their parent rows. The insert's FK check takes `FOR KEY SHARE` on the parent, so two racers each held a share lock the other's `FOR UPDATE` waited on. The fix takes the locks first: `giro_clearing` create/update call `deposit()` before `InsertGiroClearingLines`; `bank_settlement` create/update call `matchGiroClearings` before `InsertBankSettlementLines`; `ar_clearing` create/update call a new `lockBeforeChildren` (the same `lockRows`, run first) before `SaveArClearing`/`UpdateArClearing`. The AR Clearing half is a **pre-existing bug in committed code**, not giro-specific (it hits cash and bank sources the same way).
- *UI 409 path.* Opening a losing draft and clicking Deposit shows "1 selected giro(s) were deposited in another batch and have been removed…", empties the selection and disables Deposit.
- *AR Clearing post + void of a giro source, in the UI.* Tick the 3,000,000 giro, auto-allocate FIFO, submit: `giros.applied_amount` is 3,000,000, the oldest invoice's `settled_amount` goes 0 → 3,000,000, and the giro leaves the pool. Void with a reason: applied is back to 0, the giro is back in the pool, and all 14 invoices' `settled_amount` match the pre-test snapshot exactly.
- Cleanup: all AR clearings / giro rows / test bank settlements (25-30) were deleted, number series 27/30/33/34 rewound, customer 1 `pays_with_giro` restored to false, and the servers stopped.

## 13. Giro hub (2026-09-23): one page instead of three

User request: merge the three giro list pages. Built as **`/giro` (`src/views/giro/GiroView.vue`)**, a single Finance menu entry ("Giro"), with tabs **Register** (default) · **Receipts** · **Clearings**:

- The tab lives in `?tab=`, so Back from a document returns to its tab. The tabs are kept alive, so filters, the page and the Register selection survive tab switches. Tabs show per permission: Register + Receipts need `GIRO_RECEIPT_READ`, Clearings needs `GIRO_CLEARING_READ`. The route's `beforeEnter` needs either one, and the menu uses `permissionsAny`, like Configs.
- The header holds the create actions for every tab: **Receive Giros** (receipt WRITE) and **Deposit for Clearing** (clearing WRITE). The list components became `GiroReceiptsTab.vue`, `GiroRegisterTab.vue` and `GiroClearingsTab.vue`, without their own title or toolbar.
- Old list URLs redirect: `/giro-receipts` → `/giro?tab=receipts`, `/giro-register` → `?tab=register`, `/giro-clearings` → `?tab=clearings`. Create, edit and detail stay full pages at their old URLs.
- **Deposit selected.** In the Held / Due < 7 days / Overdue buckets (clearing WRITE only), rows have checkboxes. The selection is keyed by giro id and kept across pages and buckets. A bar shows the count and total, and **Deposit {n} Selected** opens `/giro-clearings/create?branchId=&giroIds=`. A pick spanning branches is blocked with a hint (a batch is single-branch). The create form takes that branch, pre-picks the giros from the branch's held list, and warns (a toast) about any giro that's no longer held. Ids travel in the URL, so a refresh keeps the pick. Helpers: `depositSelection` / `depositQuery` / `parseDepositQuery` in `giroRegister.ts`.
- id-ID: tabs Register / Penerimaan / Setor Kliring; actions Terima Giro / Setor Giro.
- Tests: `giroRegister.spec.ts` (selection + hand-off round trip), `GiroView.spec.ts` (tabs per permission, `?tab=` fallback, actions per write permission). 325 vitest green. Live-checked with the fixtures: old-URL redirect, tab counts, a cross-bucket selection (3 giros, 7,450,000) surviving a tab switch, Deposit selected → pre-filled batch → deposited, the stale-giro warning, Back → the same tab, a single menu entry, id-ID with no raw keys.
