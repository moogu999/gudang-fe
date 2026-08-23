# AP Payment (BKK) — Frontend Plan

> Sub-plan. All business rationale and locked decisions live in the master:
> [`../../.claude/AP_PAYMENT_PLAN.md`](../../.claude/AP_PAYMENT_PLAN.md). This document is file-level
> implementation detail only.

## Summary of what changes

1. **`src/views/ap-payments/`** — list, three thin route wrappers, `ApPaymentForm.vue`, and two
   components (the open-item picker and the summary panel).
2. **Two master-data view pairs** — `src/views/payment-methods/` and `src/views/branch-bank-accounts/`.
3. **`src/views/ap-payment-configs/`** — the flow + threshold config, surfaced as a sixth tab in
   `ConfigsView.vue`.
4. **Four new type files and four new services**, plus one field added to `apOutstanding.type.ts`.
5. **Registration touches** — `constants/api.ts`, `constants/permissions.ts`, `router/index.ts`,
   `menu.ts`, `NumberSeriesDialog.vue`, and both locale files.
6. **Two specs** — the summary panel and the picker's amount rules.

The reference folder is `src/views/ap-invoices/`; copy its form shell, its list recipe, its route
wrappers and its approval panel. **What is new and must not be copied from it:**

- **the picker has a per-row editable amount** — AP Invoice's picker adds whole goods receipts and has
  no amount column at all;
- **the primary button changes meaning with the running total** — below the branch threshold it posts,
  at or above it submits for approval, and with no flow configured it is disabled.

---

## F1. Endpoint constants — `src/constants/api.ts`

Appended after the Credit/Debit Note block:

```ts
// AP Payment endpoints
AP_PAYMENTS: '/v1/ap-payments',
AP_PAYMENT_BY_ID: (id: number) => `/v1/ap-payments/${id}`,
GEN_AP_PAYMENTS: '/gen/v1/ap-payments',
AP_PAYMENT_CONFIGS: '/v1/ap-payment-configs',
AP_PAYMENT_CONFIG_MY_BRANCH: '/v1/ap-payment-configs/my-branch',
AP_PAYMENT_CONFIG_BY_BRANCH: (branchId: number) => `/v1/ap-payment-configs/${branchId}`,
PAYMENT_METHODS: '/gen/v1/payment-methods',
BRANCH_BANK_ACCOUNTS: '/gen/v1/branch-bank-accounts',
```

There is **no new picker endpoint**: the picker reuses the existing `AP_OUTSTANDING` with an
`excludeSettled=true` parameter (backend plan B8).

## F2. Types

New: `apPayment.type.ts`, `apPaymentConfig.type.ts`, `paymentMethod.type.ts`,
`branchBankAccount.type.ts`. Modified: `apOutstanding.type.ts` gains `excludeSettled?: boolean` on its
list params. All re-exported from `src/types/index.ts`.

Each file opens with the standard header — these are hand-written mirrors of `gudang-be/api/*.yaml`
plus the genericcrud schema, with **no codegen safety net**, so a field missed here fails silently as
`undefined` rather than as a compile error.

**Every monetary field is `string`.** The one shape worth writing out, because it is the contract the
picker and the form both build against:

```ts
export type ApPaymentDocumentType = 'ap_invoice' | 'credit_note' | 'debit_note'
export type ApPaymentStatus = 'draft' | 'need_approval' | 'approved'

export interface ApPaymentApplication {
  id: number
  documentType: ApPaymentDocumentType
  documentId: number
  documentNo: string
  documentDate: string
  dueDate: string
  outstandingAmount: string   // display only, as at read time
  appliedAmount: string       // always a positive magnitude
}

export interface CreateApPaymentRequest {
  no: string | null
  branchId: number | null
  supplierId: number
  paymentDate: string          // 'YYYY-MM-DD'
  paymentMethodId: number
  branchBankAccountId: number | null
  referenceNo: string | null
  remark: string | null
  status: Exclude<ApPaymentStatus, 'need_approval'>
  applications: {
    documentType: ApPaymentDocumentType
    documentId: number
    /** Required for ap_invoice. IGNORED for notes — the server applies them in full. */
    appliedAmount?: string
  }[]
}

export type UpdateApPaymentRequest = Omit<CreateApPaymentRequest, 'no' | 'branchId'>
```

`ApPaymentConfig` carries `approvalFlowId: number | null` and `approvalThreshold: string | null`, and
**`null` is meaningful on the threshold** — it means every payment is reviewed, not zero.

## F3. Services

Static-class services in the house style, re-exported from `src/services/index.ts`:
`ApPaymentsService` (`list` / `get` / `create` / `update` / `remove`), `ApPaymentConfigService`
(`list` / `getMyBranch` / `getByBranch` / `upsert` / `remove`), and thin generic-CRUD wrappers
`PaymentMethodsService` and `BranchBankAccountsService`. `ApOutstandingService.list` gains the
`excludeSettled` parameter.

## F4. `ApPaymentForm.vue` — the document shell

One component for ADD / EDIT / VIEW, `@primevue/forms` `<Form>` + `zodResolver` wrapped in a
`computed()` so i18n messages stay reactive and mode-dependent rules work. Fields bound by `name=`,
never `v-model`; submit reads `event.states.<field>.value`.

The approval panel is the block copied verbatim from `ApInvoiceForm.vue:26-45`, with
`module-key="ap_payment"`, rendered in EDIT/VIEW only.

### F4a. Number series

`useNumberSeries('ap_payments')` and the two-button Auto/Manual toggle, ADD mode only — the exact block
at `CreditDebitNoteForm.vue:81-125`. The Auto button is `:disabled="!hasDefaultSeries || numberSeriesLoading"`.
On submit, `no` is generated only when ADD + auto + `seriesId !== null`.

### F4b. Header grid

Supplier `InfiniteSelect` over `SuppliersService.list`. Legal entity a disabled read-only `InputText`
fed by the server's `companyName` (`"{name} — NPWP {taxId}"`), never editable. Branch `InfiniteSelect`
only when `authStore.branchIds.length > 1`; otherwise the form sends `branchId: null` and lets the
server resolve it. Payment date via `DatePicker`, submitted as `dayjs(d).format('YYYY-MM-DD')` —
**never** `toISOString().split('T')[0]`, which converts to UTC and lands a day early at UTC+7.

Changing the supplier **or** the branch clears every picked row and refetches the picker.

### F4c. Payment method block

`SelectButton` over active `payment_methods` (`filterBy=is_active`), rendering the mockup's toggle.
**Branch on `method.code`, never on the id or the label** — the id is environment-specific and the
label is operator-editable.

```
TRANSFER  →  show the branch bank account InfiniteSelect (customFilters: branch_id = resolved branch,
             is_active = true) and the reference-number InputText; both required by the resolver
CASH      →  hide both; clear branchBankAccountId so a method switch cannot leave a stale id behind
other     →  hide both, require neither (an operator-added method)
```

The zod resolver reads `selectedMethodCode` so the two conditional fields are required only under
`TRANSFER`.

### F4d. The threshold pre-flight — the one genuinely new behaviour

CN/DN has a static version of this (a flow is configured, or it is not). Here it is **reactive on the
running net**, and it is what renders the mockup's checklist warning as live state instead of prose.

On mount, `ApPaymentConfigService.getMyBranch()` → `{ approvalFlowId, approvalThreshold }`. Then:

```ts
const needsApproval = computed(() =>
  approvalThreshold.value === null || netAmount.value >= Number(approvalThreshold.value))

const canSubmit = computed(() => !needsApproval.value || approvalFlowId.value !== null)
```

Driving the primary button:

| State | Button | Extra |
|---|---|---|
| `!needsApproval` | **Post Payment** | — |
| `needsApproval && approvalFlowId !== null` | **Submit for Approval** | a `severity="info"` Message naming the threshold, mirroring the mockup's "melebihi threshold approval Rp …" line |
| `needsApproval && approvalFlowId === null` | **Submit for Approval**, `disabled` | a `severity="warn"` Message naming the branch and pointing at Settings → Config → AP Payment |

*Save as Draft* is **always** enabled — a clerk must be able to park a BKK on an unconfigured branch.
On a failed submit, re-load the config before showing the error: the likeliest cause is that someone
configured the flow in another tab.

Both buttons are `type="submit"` and set `chosenStatus` on click, as in AP Invoice. The `approved`
path opens `confirm.require({ group: 'apPaymentConfirm', ... })` against a
`<ConfirmDialog group="apPaymentConfirm" />`; drafts submit directly.

### F4e. Cross-field validation zod cannot express

Done imperatively in `onFormSubmit` before building the request, surfaced via `commonErrorToast`:
zero picked rows, any invoice row with a blank or zero amount, and a negative net. The negative-net
case should never reach submit because the picker disables the button, but the check stays — the server
enforces it too and a mismatch between the two is worth catching in development.

## F5. `components/ApPaymentOpenItemPicker.vue`

The mockup's central table, and the biggest single piece of work here.

A **raw PrimeVue `DataTable`**, not `TableComponent` — the latter hardcodes `selection-mode="single"`,
which is why `ApInvoiceForm.vue` carries the same comment. Source is
`ApOutstandingService.list({ supplierId, excludeSettled: true, page, limit })`, lazy-paginated.

Columns, matching the mockup:

| Column | Content |
|---|---|
| selection | `<Column selection-mode="multiple" header-style="width: 3rem" />` |
| No. Dokumen | document no, with date beneath in small tertiary text |
| Tipe | `Tag` — Invoice (info), Nota Kredit (success), Nota Debit (danger) |
| Jatuh tempo | due date + an aging badge computed client-side from `dueDate` vs today: `Overdue {n} hari` (danger) or `{n} hari lagi` (secondary); credit notes show `—` |
| Outstanding | `outstandingAmount`, right-aligned, tabular numerals; negative and green for a credit note |
| **Jumlah dibayar** | `InputNumber` — see below |

**The amount column is the rule that differs by row type** (master decision 3):

- `ap_invoice` → editable `InputNumber`, `:min="0"`, `:max="outstanding"`, seeded with the full
  outstanding on tick, clamped on `@update:model-value`.
- `credit_note` / `debit_note` → `disabled`, showing the full outstanding with its sign. **The form
  does not send an amount for these rows** (the server overwrites anything sent), which keeps the
  client from implying a control it does not have.

Unticking a row clears its amount. Below the table, the mockup's running bar: `"{n} dokumen dipilih
({i} invoice + {c} nota kredit)"` and the live net.

Emits `update:applications` with the picked rows. The whole block is hidden in VIEW mode, where a
read-only table of the saved applications takes its place.

**On extraction:** the inline multi-select `DataTable` now exists four times (`ApInvoiceForm`,
`DeliveryNoteCreateView`, `BookingOrdersView`, and this). A shared `DocumentPicker.vue` is worth doing
— but this is the first instance with an editable amount column, so extracting *during* this work would
be generalising from one example. Recorded as future work in the master plan.

## F6. `components/ApPaymentSummary.vue`

The mockup's totals block: total invoices + debit notes, the credit applied as a green negative line,
and the grand net. Uses the local `formatNumber()` = `Intl.NumberFormat('en-US', { minimumFractionDigits: 2,
maximumFractionDigits: 2 })` that every other view duplicates.

In VIEW mode it renders the **server's saved** `grossAmount` / `creditAmount` / `netAmount` verbatim, so
an approved BKK never moves — the same rule `ApInvoiceSummary` and `CreditDebitNoteAmounts` follow.

## F7. Views and routing

`ApPaymentsView.vue` bound to `API_ENDPOINTS.GEN_AP_PAYMENTS`, with columns for no, date, supplier,
method, net amount and status; row actions gated on `data.status === 'draft' && canWrite`;
`useConfirmDelete({ overlayGroup, entityName: 'AP payment', onSuccess: () => table.value.clearSearch() })`.
Plus the three thin wrappers (`ApPaymentCreateView` / `EditView` / `DetailView`) in the AP Invoice
shape.

Routes as children of `'/'`, **`:id/edit` declared before `:id`** or the detail route swallows it:

```ts
{ path: 'ap-payments',          component: ApPaymentsView,      meta: { requiredPermission: PERMISSIONS.AP_PAYMENT_READ, titleKey: 'navigation.apPayments' } },
{ path: 'ap-payments/create',   component: ApPaymentCreateView, meta: { ..., titleAction: 'create' } },
{ path: 'ap-payments/:id/edit', component: ApPaymentEditView,   meta: { ..., titleAction: 'edit' } },
{ path: 'ap-payments/:id',      component: ApPaymentDetailView, meta: { ..., titleAction: 'view' } },
{ path: 'ap-payment-configs',   redirect: { path: '/configs', query: { tab: 'bkk' } } },
```

`src/constants/permissions.ts` — add all eight IDs (103–110, matching the DB seed exactly), plus
`ROUTE_PERMISSIONS` and `ROUTE_WRITE_PERMISSIONS` entries for `/ap-payments`, `/payment-methods`,
`/branch-bank-accounts` and `/ap-payment-configs`.

## F8. Master-data views

`src/views/payment-methods/` (`PaymentMethodsView.vue` + `PaymentMethodDialog.vue`) and
`src/views/branch-bank-accounts/` (same pair), both modelled on `views/correction-categories/`.

Payment Methods: `code` should be **read-only on edit**. The server branches on it, so letting an
operator rename `TRANSFER` to something else would silently change validation behaviour for every
future payment.

Branch Bank Accounts: a branch `InfiniteSelect`, the three bank fields, `isActive` and `isDefault`
`ToggleSwitch`es. Setting a second default returns a 409 from the partial unique index — catch it and
show a message telling the user to clear the existing default first, rather than letting the raw error
surface.

## F9. Config tab

`src/views/ap-payment-configs/{ApPaymentConfigsView.vue,ApPaymentConfigDialog.vue}`, a rename-only copy
of `credit-debit-note-configs/` with the `embedded` prop and `defineExpose({ openAddDialog })`, plus a
threshold `InputNumber` beside the flow `Select`.

The dialog must make the threshold's `null` legible: a `showClear`ed `InputNumber` with the hint *"Leave
blank to require approval for every payment."* Blank must submit as `null`, not `0` — they mean opposite
things (`0` would also require approval for everything, but only by accident, and a later reading of
`>= 0` would be indistinguishable from a deliberate "never review").

Then the seven-edit `ConfigsView.vue` recipe for `?tab=bkk`: import, `usePermissions('/ap-payment-configs')`,
`configOptions.push`, a branch in `canWriteActive`, a `bkkRef`, a branch in `onAddClick`, and the
component with `v-if="activeConfig === 'bkk'"`.

## F10. i18n

New blocks `apPayments`, `apPaymentConfigs`, `paymentMethods`, `branchBankAccounts` in **both**
`src/i18n/locales/en-US.ts` and `id-ID.ts`, with the house categories (`title`, `fields`, `sections`,
`labels`, `picker`, `status`, `actions`, `confirm`, `validation`, `messages`) plus `codeMode`,
`method` and `summary`. `status.*` keys use the raw backend literals (`draft`, `need_approval`,
`approved`) so templates can do `` t(`apPayments.status.${data.status}`) ``.

Also: `navigation.apPayments`, `navigation.paymentMethods`, `navigation.branchBankAccounts`;
`numberSeries.entityTypes.apPayments`; and `ap_payments` added to the **hardcoded** `entityTypeOptions`
array in `views/number-series/NumberSeriesDialog.vue:255-276` — without it the series can never be
created or edited from the UI.

`missingWarn` is `false`, so a key present in one locale and missing from the other renders as a raw
key string with no console warning. Escape any literal `@` as `{'@'}` — vue-i18n reads it as
linked-message syntax.

## F11. Menu

`src/components/menu/menu.ts` — **AP Payments** in the Purchasing group directly after AP Outstanding,
so the group reads in chain order (Purchase Orders → AP Invoices → Credit/Debit Notes → AP Outstanding
→ AP Payments). **Payment Methods** beside Correction Categories in the same group. **Branch Bank
Accounts** beside the Branches master in whichever group holds it.

## Build order

Cross-referencing the master plan's rollout stages; the backend lands first throughout.

1. F1 endpoint constants, F2 types, F3 services *(master stage 9)*.
2. F8 master-data views — verifiable against backend stages 1–2 alone *(stage 10)*.
3. F4a–F4b form shell: number series, header grid *(stage 11)*.
4. F4c payment-method block, F4d threshold pre-flight *(stage 11)*.
5. F5 picker, F6 summary *(stage 12)*.
6. F7 views and routing, F9 config tab, F10 i18n, F11 menu *(stage 13)*.

## Testing

`npm run test:unit`. Only leaf presentational components are tested, following
`CreditDebitNoteAmounts.spec.ts`: `vi.mock('vue-i18n')` with an identity `t`, a shared `globalStubs`
with a minimal `InputNumber`, a `baseProps(overrides)` factory and a `mountX(overrides)` helper.

- **`ApPaymentSummary.spec.ts`** — gross/credit/net arithmetic over mixed rows; VIEW mode renders the
  saved figures and emits nothing.
- **`ApPaymentOpenItemPicker.spec.ts`** — an invoice row's amount is editable and clamps at its
  outstanding; a credit-note row renders **no** `input`; ticking seeds the full outstanding; unticking
  clears it; the running net matches the summary for the same rows.

## Verification

Walk the master plan's [End-to-end verification](../../.claude/AP_PAYMENT_PLAN.md#end-to-end-verification).
The frontend-specific things to watch while doing it:

- The primary button label flips the moment the running net crosses the configured threshold, without a
  reload, and flips back when a row is unticked.
- With no flow configured, the button is disabled and the warning names the branch — the user never
  fills a whole form and then eats a 400.
- Switching the method from Transfer to Cash clears the bank account rather than leaving a stale id in
  the request.
- Changing the supplier clears the picker.
- A saved approved BKK renders the server's totals, not recomputed ones.
- **Playwright note:** PrimeVue `InputNumber` does not accept `.fill()` — use keyboard input, the
  gotcha recorded during the Credit/Debit Note E2E on 2026-08-01. The picker is full of them.
- `npm run type-check`, `npm run lint` and `npm run test:unit` all green.
