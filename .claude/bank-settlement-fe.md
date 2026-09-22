# Bank Settlement — Frontend Plan

Companion to `.claude/bank-settlement-master-plan.md` (decisions D1–D10 referenced by number) and `gudang-be/.claude/bank-settlement-be.md`.

The template is `src/views/cash-deposits/`, one iteration earlier. This module is **simpler** than that one: no manifest picker, no variance, no approval timeline, no config screen, no category master.

---

## 1. Files

```
src/views/bank-settlements/
├── BankSettlementsView.vue                 list — TableComponent over /gen/v1/bank-settlements
├── BankSettlementCreateView.vue            thin wrapper → Form mode=ADD
├── BankSettlementEditView.vue              thin wrapper → Form mode=EDIT
├── BankSettlementDetailView.vue            thin wrapper → Form mode=VIEW
├── BankSettlementForm.vue                  the one true form
├── bankSettlementLines.ts                  pure helpers, no Vue
├── bankSettlementLines.spec.ts
└── components/
    ├── BankSettlementMutationTable.vue      always-editable DataTable of credit lines
    ├── BankSettlementMutationTable.spec.ts
    ├── BankSettlementSummary.vue            the calc strip
    └── BankSettlementSummary.spec.ts

src/services/bankSettlements.service.ts
src/types/bankSettlement.type.ts
```

**No** `bank-settlement-configs/`, **no** `bank-settlement-categories/`, **no** `ConfigsView` tab — D6 removes the config resource entirely, and there is no ad-hoc category concept here (master §4 assumption 5).

The three wrapper views are near-identical: resolve an id from the route, render `<BankSettlementForm :mode :bank-settlement-id @submitted @cancel>`. All logic lives in the form.

---

## 2. Reuse — do not rebuild any of these

| What | Path | Use here |
|---|---|---|
| `InfiniteSelect` | `src/components/select/InfiniteSelect.vue` | bank account picker, branch picker, and the per-row outlet picker. Pass `initial-option` or edit mode shows a bare id |
| `useNumberSeries('bank_settlements')` | `src/composables/useNumberSeries.ts` | the Auto / Manual document-number toggle |
| `TableComponent` | `src/components/table/TableComponent.vue` | the list page |
| `GenericQueryBuilder` | `src/services/genericQueryBuilder.ts` | every `/gen/v1` query |
| `usePermissions('/bank-settlements')` | `src/composables/usePermissions.ts` | `canRead` / `canWrite` |
| `useConfirmDelete`, `useDialog` | `src/composables/` | delete confirmation, dialog state |
| `ResponsiveCard`, `ResponsiveButton` | `src/components/card/`, `src/components/button/` | standard page chrome |
| `CustomersService.list` | `src/services/` | the outlet picker's `fetch-fn` |

**Not** `ApprovalTimeline` / `ApprovalActionBar` / `useApproval` — D6.

There is no shared status-pill component in this codebase; every view defines a small local `statusSeverity(status)` and feeds a PrimeVue `Tag`. Do the same.

### Three conventions that have caused bugs before

1. **The mutation table is a custom always-editable `DataTable`, not `InlineEditableTable`.** The latter's row-edit mode silently drops an unsaved row when the document is submitted — this cost a bug in Cash Deposit.
2. **Emit from a `latest` ref.** `InfiniteSelect` emits `update:model-value` and `select-option` back to back; a handler that reads `props.modelValue` for the second emit sees pre-first-emit state and loses one of them. Copy the `latest` ref + `commit()` pattern from `CashDepositAdhocTable.vue:180-210`.
3. **`PrimeVue SelectButton` does not react to a programmatic form-state write.** Not used here today, but if a cross-field cascade ever writes into one, drive it from a local ref.

---

## 3. Types — `src/types/bankSettlement.type.ts`

Hand-written mirror of `gudang-be/api/bank_settlements.yaml` and the generic-CRUD schema. **There is no codegen**: a field missing from these interfaces fails silently as `undefined` at runtime rather than as a compile error, so keep them in step with the backend.

```ts
export type BankSettlementStatus = 'draft' | 'completed'
export type BankSettlementSource = 'manual' | 'import'

// flat row from /gen/v1/bank-settlements
export interface BankSettlementListRow {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  branchBankAccountId: number
  bankAccountLabel: string | null
  periodStart: string            // YYYY-MM-DD
  periodEnd: string
  source: BankSettlementSource
  totalCreditAmount: string      // decimal as string
  taggedAmount: string
  untaggedAmount: string
  status: BankSettlementStatus
  splitFromId: number | null
  createdByEmail: string | null
  createdAt: string
}

export interface BankSettlementLineRequest {
  mutationDate: string
  description: string
  amount: string                 // decimal as string
  customerId: number | null      // null = untagged
  note: string | null
}

export interface BankSettlementLineResponse extends BankSettlementLineRequest {
  id: number
  lineNo: number
  customerName: string | null
  customerCode: string | null
}

export interface CreateBankSettlementRequest {
  no?: string | null
  branchId?: number | null
  branchBankAccountId: number
  periodStart: string
  periodEnd: string
  status: BankSettlementStatus
  remark?: string | null
  lines: BankSettlementLineRequest[]
}

export type UpdateBankSettlementRequest = Omit<CreateBankSettlementRequest, 'no' | 'branchId'>

export interface BankSettlementResponse {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  branchBankAccountId: number
  branchBankAccountLabel: string | null
  periodStart: string
  periodEnd: string
  source: BankSettlementSource
  totalCreditAmount: string
  taggedAmount: string
  untaggedAmount: string
  remark: string | null
  status: BankSettlementStatus
  splitFromId: number | null
  splitFromNo: string | null
  // populated ONLY on the create/update response that performed a split (D4)
  remainderSettlementId: number | null
  remainderSettlementNo: string | null
  lines: BankSettlementLineResponse[]
  createdAt: string
  updatedAt: string | null
}
```

### `bankSettlementLines.ts` — the pure half

Framework-free, so the bulk of the tests need no mounting:

```ts
export interface MutationRow {
  mutationDate: Date | null
  description: string
  amount: number | null
  customerId: number | null
  customer?: { id: number; name: string; code?: string } | null
  note: string | null
}

export function newMutationRow(): MutationRow
export function round2(v: number): number
export function rowErrors(row: MutationRow, period: [Date, Date] | null): { date?: true; description?: true; amount?: true }
export function isRowValid(row: MutationRow, period: [Date, Date] | null): boolean
export function isTagged(row: MutationRow): boolean
export function partition(rows: MutationRow[]): { tagged: MutationRow[]; untagged: MutationRow[] }
export function totals(rows: MutationRow[]): { total: number; tagged: number; untagged: number }
```

`rowErrors` enforces D9 client-side (`mutationDate` inside the header period) and D3 (`amount > 0`).

---

## 4. Service — `src/services/bankSettlements.service.ts`

The house split: **reads through generic CRUD, writes through the module.**

```ts
export class BankSettlementsService {
  private static readonly BASE_URL = API_ENDPOINTS.BANK_SETTLEMENTS

  static async list(queryString?: string) {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_BANK_SETTLEMENTS}?${queryString}`
      : API_ENDPOINTS.GEN_BANK_SETTLEMENTS
    return ApiService.get<Base<BankSettlementListRow>>(url)
  }
  static async get(id: number)   { return ApiService.get<BankSettlementResponse>(API_ENDPOINTS.BANK_SETTLEMENT_BY_ID(id)) }
  static async create(data: CreateBankSettlementRequest) { return ApiService.post<BankSettlementResponse>(this.BASE_URL, data) }
  static async update(id: number, data: UpdateBankSettlementRequest) { return ApiService.put<BankSettlementResponse>(API_ENDPOINTS.BANK_SETTLEMENT_BY_ID(id), data) }
  static async remove(id: number) { return ApiService.delete(API_ENDPOINTS.BANK_SETTLEMENT_BY_ID(id)) }
}
```

Note `update` is **PUT**, not PATCH — the same trap AP Invoice Entry hit.

---

## 5. Form behaviour

`BankSettlementForm.vue` uses `@primevue/forms` `<Form>` + `zodResolver` with a **computed** schema, so messages stay locale-reactive and the branch field's requirement can depend on how many branches the user holds.

```ts
interface Props { mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT; bankSettlementId?: number }
const emit = defineEmits<{ cancel: []; submitted: [settlement: BankSettlementResponse] }>()
```

### Header

| Field | Control | Notes |
|---|---|---|
| `no` | `InputText` + Auto/Manual toggle | `useNumberSeries('bank_settlements')`; in Auto mode shows `codeMode.assignedOnSave` and sends no `no` |
| `branchId` | `InfiniteSelect` | Rendered **only** when the user holds more than one branch, matching `CashDepositForm` |
| `branchBankAccountId` | `InfiniteSelect` over `/gen/v1/branch-bank-accounts` | Filtered to `isActive = true` **and** to the selected branch (D8). Clearing the branch clears this. Option label is `bankName - accountNumber` |
| `period` | `DatePicker` `selection-mode="range"` | Bound to a local `Date[]`, split into `periodStart` / `periodEnd` on submit. Narrowing the range after lines exist re-validates every row (D9) |
| `remark` | `Textarea` | Optional |

Company is derived from the branch and shown read-only, the way `CashDepositForm` does it.

### Mutation table — `BankSettlementMutationTable.vue`

`v-model="MutationRow[]"`, prop `readonly?`, prop `period: [Date, Date] | null`, `defineExpose({ validate })`.

| Column | Control (edit mode) | View mode |
|---|---|---|
| Tanggal | `DatePicker`, `min-date`/`max-date` clamped to the header period (D9) | formatted date |
| Keterangan Bank | `InputText` — the raw bank narrative | text, `whitespace-pre-line` |
| Nominal | `InputNumber`, right-aligned, `:locale`, `min-fraction-digits=0`, `max-fraction-digits=2` | `formatNumber()` |
| Outlet | `InfiniteSelect` over `CustomersService.list`, `show-clear`, `sort-by="name"`, `:initial-option="data.customer"` | `data.customer?.name` |
| Status | `Tag` — green `ter-tag` when `customerId != null`, amber `belum-di-tag` otherwise | same |
| — | row delete button | hidden |

Footer: an "+ Tambah baris" button appending `newMutationRow()`. Empty state shows `bankSettlements.table.empty`.

Clearing the outlet picker sets `customerId = null` and the row flips back to untagged — that is the whole tagging interaction (D-S: no suggestion chips, no search-by-amount).

Below the table, the mockup's hint line: `bankSettlements.table.nameMismatchHint` ("Nama di rekening sering beda dari nama outlet terdaftar…").

### Calc strip — `BankSettlementSummary.vue`

Props `total`, `tagged`, `untagged`, `readonly?`, `savedTotal?/savedTagged?/savedUntagged?`. Three cells, exactly the mockup:

| Cell | Style |
|---|---|
| Total mutasi kredit | neutral |
| Sudah ter-tag | green (`--color-background-success`) |
| Belum ter-tag | amber (`--color-background-warning`) |

In readonly mode it renders the **server's saved figures** rather than recomputing — the same rule `CashDepositSummary` follows, so a detail page never disagrees with what was committed.

Beneath it, an info box carrying `bankSettlements.labels.splitHint`: untagged rows can be left for later; submitting moves them to a new draft.

### Submit

Two buttons, both `type="submit"`, each setting `chosenStatus` (`'draft'` | `'completed'`) before the native submit fires — the Cash Deposit pattern.

- **Simpan Draft** → `status: 'draft'`, saves whatever is there. Zero tagged lines is fine.
- **Submit** → opens a `useConfirm()` dialog. When some rows are untagged the message names the split (D4):
  `t('bankSettlements.confirm.messageSplit', { count: untagged.length })` → *"N baris belum ter-tag akan dipindahkan ke draft baru."*
  When every row is tagged, the plain `messageComplete`.
  The button is **disabled when nothing is tagged**, with a tooltip explaining why (D5 — the API returns 400, but the UI should not let the user get there).

On success: emit `submitted`, then, if `response.remainderSettlementNo` is non-null, raise a toast with `messages.splitCreated` naming the new draft and offering navigation to it.

`status` and the three amounts are **never** sent by the client — the backend computes them.

### Status pill

```ts
const statusSeverity = (s: BankSettlementStatus) => (s === 'completed' ? 'success' : 'secondary')
```

Labels come from `bankSettlements.status.*` — `draft: 'Draft'`, `completed: 'Completed' / 'Selesai'`.

### Money

Decimal **strings** on the wire; `parseFloat` at the UI boundary; `.toFixed(2)` on submit; local `round2()` for arithmetic. Display uses the repeated `formatNumber()` helper (`Intl.NumberFormat` with 2 fraction digits).

### Edit / delete gating

A `completed` settlement (D7) shows no Edit button and no Delete button; the detail view is terminal. `BankSettlementsView` applies the same rule to its row actions.

---

## 6. Wiring

### `src/constants/api.ts`

```ts
BANK_SETTLEMENTS: '/v1/bank-settlements',
BANK_SETTLEMENT_BY_ID: (id: number) => `/v1/bank-settlements/${id}`,
GEN_BANK_SETTLEMENTS: '/gen/v1/bank-settlements',
```

### `src/constants/permissions.ts`

```ts
BANK_SETTLEMENT_READ: 124,
BANK_SETTLEMENT_WRITE: 125,
```

Plus `/bank-settlements` in **both** `ROUTE_PERMISSIONS` (→ `BANK_SETTLEMENT_READ`) and `ROUTE_WRITE_PERMISSIONS` (→ `BANK_SETTLEMENT_WRITE`). Missing the second silently makes everything read-only.

### `src/router/index.ts`

Four routes under the authenticated layout. **Declare `:id/edit` before `:id`** or the detail route swallows it:

```ts
{ path: 'bank-settlements', name: 'BankSettlements',
  component: () => import('@/views/bank-settlements/BankSettlementsView.vue'),
  meta: { requiredPermission: PERMISSIONS.BANK_SETTLEMENT_READ, titleKey: 'navigation.bankSettlements' } },
{ path: 'bank-settlements/create', name: 'BankSettlementCreate',
  component: () => import('@/views/bank-settlements/BankSettlementCreateView.vue'),
  meta: { requiredPermission: PERMISSIONS.BANK_SETTLEMENT_WRITE, titleKey: 'navigation.bankSettlements', titleAction: 'create' } },
{ path: 'bank-settlements/:id/edit', name: 'BankSettlementEdit',
  component: () => import('@/views/bank-settlements/BankSettlementEditView.vue'),
  meta: { requiredPermission: PERMISSIONS.BANK_SETTLEMENT_WRITE, titleKey: 'navigation.bankSettlements', titleAction: 'edit' } },
{ path: 'bank-settlements/:id', name: 'BankSettlementDetail',
  component: () => import('@/views/bank-settlements/BankSettlementDetailView.vue'),
  meta: { requiredPermission: PERMISSIONS.BANK_SETTLEMENT_READ, titleKey: 'navigation.bankSettlements', titleAction: 'view' } },
```

No config redirect route — there is no config (D6).

### `src/components/menu/menu.ts`

One entry in the **Finance** section, beside Cash Deposits:

```ts
{ label: 'Bank Settlements', labelKey: 'navigation.bankSettlements', route: '/bank-settlements' },
```

### `NumberSeriesDialog`

Its entity-type option list needs a `bank_settlements` entry. The Cash Deposit plan missed the equivalent and it had to be patched during implementation — do not repeat that.

### i18n

`src/i18n/locales/en-US.ts` and `id-ID.ts`, **same keys, same order, same change**. One `navigation.bankSettlements` line, plus a full `bankSettlements` block:

```
bankSettlements: {
  title, addBankSettlement, viewBankSettlement,
  codeMode:   { auto, manual, assignedOnSave },
  fields:     { no, branch, company, bankAccount, period, periodStart, periodEnd, remark },
  sections:   { header, mutations, summary },
  table:      { mutationDate, description, amount, outlet, status, note,
                addRow, removeRow, selectOutlet, empty, nameMismatchHint },
  summary:    { total, tagged, untagged },
  labels:     { sourceManual, sourceImport, companyUnresolved, splitHint, splitFrom },
  status:     { draft, completed },
  actions:    { saveAsDraft, submit, editBankSettlement, openRemainder },
  confirm:    { header, messageComplete, messageSplit },
  validation: { noRequired, bankAccountRequired, periodRequired, branchRequired,
                noLines, noTaggedLines, lineDateRequired, lineDateOutOfPeriod,
                lineDescriptionRequired, lineAmountRequired },
  messages:   { created, updated, deleted, notFound, splitCreated },
},
```

`messages.splitCreated` is interpolated with the new draft's number. Watch the `@` escaping rule — vue-i18n treats a bare `@` as a linked-message marker.

---

## 7. Tests

Vitest, co-located `*.spec.ts` next to the file under test (this feature family co-locates rather than using `__tests__/`).

Conventions to replicate from `CashDepositSummary.spec.ts`:

- mock `vue-i18n` so `t` passes keys through unchanged;
- stub `InputNumber`, `DatePicker` and `InfiniteSelect` with minimal native inputs that still emit the right events;
- select by `data-testid`;
- keep the arithmetic in `bankSettlementLines.ts` so most assertions need no mounting.

Coverage:

**`bankSettlementLines.spec.ts`** — `totals` over mixed rows; `partition` preserves order; `rowErrors` flags a date outside the period (D9), a zero/negative amount (D3) and a blank description; boundary dates accepted; `round2` on a float-drift case.

**`BankSettlementSummary.spec.ts`** — the three cells render; untagged is amber and non-zero when rows are untagged; all-tagged renders untagged as 0 with neutral styling; readonly renders the saved figures instead of recomputing.

**`BankSettlementMutationTable.spec.ts`** — adding a row appends `newMutationRow()`; deleting removes the right index; picking an outlet flips the status pill to tagged and clearing it flips back; readonly renders text instead of inputs; the `latest`-ref pattern survives `update:model-value` followed immediately by `select-option`.

---

## 8. Verification

The frontend half of master §8. Run `pnpm dev` against a running backend and drive with Playwright MCP.

Beyond the master checklist, confirm: the Submit button is disabled with nothing tagged; the split toast names the new draft and its link opens it; narrowing the period after entering lines surfaces the out-of-period error on the offending rows; and the whole form reads cleanly in `id-ID` with no raw keys.

`pnpm type-check`, `pnpm lint` and the full `pnpm test` must be green before the feature is called done.

**Playwright gotchas:** PrimeVue `InputNumber` and `DatePicker` both ignore `fill()` — use real keystrokes (click, Ctrl+A, slow type, Tab). `JWT_TOKEN_TTL` may be 1 minute; expect to re-authenticate mid-run.
