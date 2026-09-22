# Cash Deposit (Setoran Kas) — Frontend Plan

Companion to `../../.claude/cash-deposit-master-plan.md` (the why, the locked decisions D1–D9, the stated assumptions) and `../../gudang-be/.claude/cash-deposit-be.md`.

**Template module: `src/views/ap-payments/`.** Cash Deposit is a workflow document, so it uses the full-page view pattern (list + create + edit + detail around one shared form), not the `[Entity]View.vue` + `[Entity]Dialog.vue` pattern used for simple masters. When this document is ambiguous, read `src/views/ap-payments/` and copy it.

---

## 1. Files

```
src/views/cash-deposits/
  CashDepositsView.vue              list page
  CashDepositCreateView.vue         thin wrapper → CashDepositForm (DialogMode.ADD)
  CashDepositEditView.vue           thin wrapper → CashDepositForm (DialogMode.EDIT)
  CashDepositDetailView.vue         thin wrapper → CashDepositForm (readonly)
  CashDepositForm.vue               the document
  components/
    CashDepositEmployeeStep.vue     mockup "Step 1 — Pilih Employee"
    CashDepositManifestPicker.vue   mockup manifest table
    CashDepositAdhocTable.vue       mockup ad-hoc table
    CashDepositSummary.vue          the calc strip

src/views/cash-deposit-configs/     copy of src/views/ap-payment-configs/
src/views/cash-deposit-categories/  copy of src/views/payment-methods/ (simple master, dialog pattern)

src/services/cashDeposits.service.ts
src/types/cashDeposit.type.ts
```

Every module in this repo lives flat under `src/views/<kebab-case>/` — there is no nested `finance/` folder, and Cash Deposit does not introduce one.

---

## 2. Reuse — do not rebuild any of these

| Need | Existing piece | Notes |
|---|---|---|
| Employee picker with type badge | `src/components/select/InfiniteSelect.vue` + `EmployeesService.listForSelect` (`src/services/employees.service.ts`) | `genericcrud/schema/employee.go` already `Preload("EmployeeType")`, so `option.employeeType.name` renders the badge with **zero backend work**. Same component is used by `TierApproverPicker.vue` and `SalesOrderForm.vue` |
| Manifest picker | Copy `src/views/ap-payments/components/ApPaymentOpenItemPicker.vue` | Server-paginated `DataTable`, `selection-mode="multiple"`, per-row `InputNumber`, selection held in a `Map` so it survives pagination, `defineExpose({ reset })` for cascading resets |
| Ad-hoc line table | Custom `CashDepositAdhocTable.vue` (always-editable rows) | Not `InlineEditableTable`: its row-edit mode silently drops a row that hasn't been saved when the document is submitted. Columns: Customer / Kategori / Catatan / Nominal |
| Calc strip | Copy `src/views/ap-payments/components/ApPaymentSummary.vue` | Three cells instead of three rows; `readonly` prop switches between live-computed and server-saved figures |
| Auto/manual document number | `src/composables/useNumberSeries.ts` + the two-button toggle in `ApPaymentForm.vue` (~lines 53–93) | `entityType: 'cash_deposits'`. Returns `codeMode`, `previewCode`, `hasDefaultSeries`, `loadPreview`, `generateCode` |
| Approval UI | `src/components/approval/ApprovalTimeline.vue`, `ApprovalActionBar.vue` | Pass `moduleKey: 'cash_deposit'`; both are driven by `src/composables/useApproval.ts` |
| Permission gating | `src/composables/usePermissions.ts` → `usePermissions('/cash-deposits')` | Gives `canRead` / `canWrite` |
| List table | `src/components/table/TableComponent.vue` | `url` = `API_ENDPOINTS.GEN_CASH_DEPOSITS`, `Column[]` wrapped in `computed()` so headers react to locale |
| Delete confirm | `src/composables/useConfirmDelete.ts` | |
| Query string building | `src/services/genericQueryBuilder.ts` | `withFilter` / `withSort` / `withSearch` / `withPagination` |

### Two conventions that have caused bugs before

- **Money input.** PrimeVue `InputNumber` with `:locale="locale"` (from `useI18n()`), `:min-fraction-digits="0"`, `:max-fraction-digits="2"`. **Clamp in the `@update:model-value` handler** — the `:min`/`:max` props alone do not clamp. See `onAmountUpdate` in `ApPaymentOpenItemPicker.vue`. Backend amounts arrive as decimal **strings**; `parseFloat` at the UI boundary only.
- **Dates.** `DatePicker` with `date-format="dd/mm/yy"`, submitted as `dayjs(d).format('YYYY-MM-DD')`. **Never `toISOString()`** — it shifts the date by the UTC offset. The convention is called out in a comment in `ApPaymentForm.vue` (~line 844). Display with `dayjs(v).format(DateFormat.DATE)`.

---

## 3. Types — `src/types/cashDeposit.type.ts`

```ts
export type CashDepositStatus = 'draft' | 'need_approval' | 'approved'
export type CashDepositSource = 'manual' | 'nforce'
export type CashDepositLineType = 'invoice' | 'adhoc'
export type ManifestMode = 'driver' | 'collector' | 'adhoc'

export interface ManifestCandidate {
  invoiceId: number
  invoiceNo: string
  deliveryOrderNo: string
  customerId: number
  customerName: string
  invoiceDate: string
  ageDays: number
  totalAmount: string             // decimal-as-string
  alreadyDepositedAmount: string
  remainingAmount: string
}

export interface ManifestCandidateResponse {
  mode: ManifestMode
  data: ManifestCandidate[]
  meta: { total: number; limit: number; offset: number }
}

export interface CashDepositLineRequest {
  lineType: CashDepositLineType
  invoiceId?: number
  customerId?: number
  categoryId?: number
  note?: string
  amount: string
}

export interface CreateCashDepositRequest {
  no?: string                     // omit to auto-generate
  branchId?: number
  employeeId: number
  depositDate: string             // YYYY-MM-DD
  actualAmount: string
  varianceReason?: string
  remark?: string
  status: 'draft' | 'approved'    // never need_approval — server-assigned
  lines: CashDepositLineRequest[]
}

export type UpdateCashDepositRequest = Omit<CreateCashDepositRequest, 'no' | 'branchId'>
```

`CashDepositResponse` mirrors the create request plus `id`, `no`, `source`, `recordedAmount`, `varianceAmount`, `status`, the resolved lookups (`employeeName`, `employeeTypeName`, `branchName`, `companyName`, `receivedByUserName`) and line-level `referenceAmount` / `invoiceNo` / `customerName` / `categoryName`.

`CashDepositListRow` is the flatter shape returned by `/gen/v1/cash-deposits`.

---

## 4. Form behaviour

### Step 1 — Employee

`InfiniteSelect` over employees (`EmployeesService.listForSelect`, filtered to `is_active = true`). On select, read `employeeType.name` and render a badge.

The mockup's N-Force sync indicator has no data behind it this iteration. It becomes a **mode hint derived from the type**:

| Type | Hint | Manifest section |
|---|---|---|
| Driver, Collector | *Manifest available* | rendered |
| Canvass, Salesman | *Ad-hoc only* | hidden |

Changing the employee must call `manifestPicker.reset()` and clear the manifest lines — the same cascading-reset problem `ApPaymentForm.vue` solves for supplier changes.

### Header

Four fields, matching the mockup's `hdr-grid`:

1. **No. Setoran** — auto/manual toggle via `useNumberSeries('cash_deposits')`. Auto shows a readonly preview with an "assigned on save" hint and calls `generateCode()` at submit time; manual shows an editable `InputText` bound to the form's `no`. The Zod schema makes `no` required only in manual mode.
2. **Tanggal setor** — `DatePicker`.
3. **Employee** — readonly after step 1, with the type badge.
4. **Diterima oleh (cashier)** — **readonly**, not a dropdown (D3). Before save, show `authStore.email` (the store exposes `userId`, `email`, `permissions`, `branchIds`, `employeeId` — there is no `name`). After save, show `receivedByUserName` from the response.

Branch picker appears only when the user holds more than one branch; company/legal entity is resolved read-only from branch. Same logic as `ApPaymentForm.vue`.

### Source badge

Always renders the **Manual** variant this iteration. Read `source` from the response rather than hardcoding, so the `nforce` badge lights up for free when sync lands.

### Manifest section

Rendered only when `mode !== 'adhoc'`. Calls `CASH_DEPOSIT_MANIFEST_CANDIDATES` with `employeeId` + `depositDate` (+ `search` in collector mode).

- **Driver mode** — every returned row is **pre-checked**, amount defaulted to `remainingAmount`. The admin unchecks rows that were not actually paid in cash. This is the mockup's pre-filled manifest.
- **Collector mode** — rows start unchecked, with a search box over invoice no / customer name. Columns: No. Invoice, Customer (Pelanggan), Umur (`ageDays`), Piutang (`totalAmount`), Diterima (editable), Status.
- **Status pill per row** is derived **inside the document**, not from any AR state: `amount === remainingAmount` → *Lunas*, `0 < amount < remainingAmount` → *Partial*. There is no AR ledger behind it (D2).

Per-row `InputNumber` clamped to `[0, remainingAmount]` in `@update:model-value`.

### Ad-hoc section

**Always present, in every mode** — the mockup is explicit about this. `InlineEditableTable` with columns:

| field | type | source |
|---|---|---|
| `customerId` | `select` | `fetchFn` over customers. Picker only — there is no free-text outlet input |
| `categoryId` | `select` | `fetchFn` over `/gen/v1/cash-deposit-categories?is_active=true` |
| `note` | `text` | |
| `amount` | `number` | |

Per row, `customerId`, `categoryId` and an amount above zero are all required (the backend's `outlet_name` fallback is deliberately not exposed in the UI).

### Calc strip

`CashDepositSummary.vue`, three cells:

- **Total tercatat** — `Σ checked manifest amounts + Σ ad-hoc amounts`, live-computed, readonly.
- **Actual cash dihitung** — the only editable cell, an `InputNumber`.
- **Selisih** — `actual − recorded`, derived. Success styling at zero, warning otherwise, negative rendered with a leading minus.

In readonly/detail mode all three read the server-saved figures instead of recomputing.

### Variance reason

A `Textarea` that appears whenever variance ≠ 0. Not required by the schema (a half-counted draft must still save), but surfaced so the threshold approver has something to read.

### Submit

`resolver` is a `computed(() => zodResolver(...))` so validation messages react to locale switches. Read values from `event.states.<field>.value` — no parallel refs.

If the response comes back `status === 'need_approval'` (the branch's variance threshold was exceeded, D4), do **not** redirect to the list — render `ApprovalTimeline` + `ApprovalActionBar` in place so the user sees what happened.

---

## 5. Wiring

### `src/constants/api.ts`

Add one grouped block, following the AP Payment block (lines ~203–208):

```ts
CASH_DEPOSITS: '/v1/cash-deposits',
CASH_DEPOSIT_BY_ID: (id: number) => `/v1/cash-deposits/${id}`,
CASH_DEPOSIT_MANIFEST_CANDIDATES: '/v1/cash-deposits/manifest-candidates',
GEN_CASH_DEPOSITS: '/gen/v1/cash-deposits',
GEN_CASH_DEPOSIT_CATEGORIES: '/gen/v1/cash-deposit-categories',
CASH_DEPOSIT_CONFIGS: '/v1/cash-deposit-configs',
CASH_DEPOSIT_CONFIG_MY_BRANCH: '/v1/cash-deposit-configs/my-branch',
CASH_DEPOSIT_CONFIG_BY_BRANCH: (branchId: number) => `/v1/cash-deposit-configs/${branchId}`,
```

The two-URL convention holds: `/gen/v1/...` backs the list page's `TableComponent`; `/v1/...` backs create / update / get / delete in the service.

### `src/constants/permissions.ts`

```ts
CASH_DEPOSIT_READ: 118,
CASH_DEPOSIT_WRITE: 119,
CASH_DEPOSIT_CONFIG_READ: 120,
CASH_DEPOSIT_CONFIG_WRITE: 121,
CASH_DEPOSIT_CATEGORY_READ: 122,
CASH_DEPOSIT_CATEGORY_WRITE: 123,
```

plus `ROUTE_PERMISSIONS` and `ROUTE_WRITE_PERMISSIONS` entries for `/cash-deposits`, `/cash-deposit-configs`, `/cash-deposit-categories`.

### `src/router/index.ts`

Mirror the `ap-payments` block (lines ~985–1028). **Declare `/cash-deposits/:id/edit` before `/cash-deposits/:id`** or the id route swallows it. Each route carries `meta.requiredPermission`, `meta.titleKey`, `meta.titleAction`.

### `src/components/menu/menu.ts`

- **Cash Deposit** → the existing **Finance** group (currently Chart of Accounts / Accounting Periods / Journal Config).
- **Cash Deposit Config** → Finance group.
- **Cash Deposit Categories** → the Master Data group, next to Payment Methods.

### i18n

**Add `cashDeposits.*` to BOTH `src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts` in the same change, same shape, same key order.** Both files are one flat nested object; there is no per-module splitting.

Sub-keys, following house convention:

```
cashDeposits: {
  title, addCashDeposit,
  fields:   { no, depositDate, employee, employeeType, receivedBy, branch, company,
              source, recordedAmount, actualAmount, varianceAmount, varianceReason, remark },
  sections: { employeeStep, header, manifest, adhoc, summary },
  labels:   { manifestAvailable, adhocOnly, sourceManual, sourceNforce },
  codeMode: { auto, manual, assignedOnSave },
  picker:   { search, empty, mode: { driver, collector, adhoc },
              invoiceNo, deliveryOrderNo, outlet (labelled Customer / Pelanggan), age, receivable, received,
              lineStatus: { paid, partial } },
  adhoc:    { addRow, outlet (labelled Customer / Pelanggan), selectCustomer, category, note, amount, subtotal, outletRequired, categoryRequired, amountRequired, empty },
  summary:  { recorded, actual, variance },
  status:   { draft, need_approval, approved },     // approved → "Completed" / "Selesai"
  actions, confirm, validation, messages,
}
```

Plus `navigation.cashDeposits`, `navigation.cashDepositConfigs`, `navigation.cashDepositCategories`, and `pageTitle.*` entries.

Note the enum-touchpoint rule: `source` and `lineType` each need their CHECK constraint, the TS union, the frontend gate **and** both locale files. Grep siblings rather than trusting the type-check.

---

## 6. Tests

Vitest + `@vue/test-utils`, colocated `*.spec.ts` next to the component. No Playwright config exists in this repo — component tests only; the end-to-end walkthrough (master plan §8) is driven manually through Playwright MCP.

Use the `DataTableStub` pattern from `src/views/ap-payments/components/ApPaymentOpenItemPicker.spec.ts` — PrimeVue's real `DataTable` does not expose row data to a naive template stub, so the stub pulls each `Column`'s `#body` scoped slot off the vnode tree. Mock `vue-i18n` (`t: key => key`) and the service module (`vi.mock('@/services', ...)`).

Cover at minimum:

- **`CashDepositSummary.vue`** — positive variance, negative variance rendered with a minus, zero-state styling, readonly mode using server figures rather than recomputing.
- **`CashDepositManifestPicker.vue`** — amount clamps to `remainingAmount`; selection survives a page change; driver mode pre-checks every row while collector mode does not; the per-row Lunas/Partial pill flips at the boundary.
- **`CashDepositAdhocTable.vue`** — a row without a `customerId` fails validation.

```bash
npm run test:unit
npm run dev
```
