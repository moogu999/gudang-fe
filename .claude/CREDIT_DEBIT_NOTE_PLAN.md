# Credit / Debit Note (Manual) — Frontend Plan

> Sub-plan. All business rationale and locked decisions live in the master:
> [`../../.claude/CREDIT_DEBIT_NOTE_PLAN.md`](../../.claude/CREDIT_DEBIT_NOTE_PLAN.md).
> This document is file-level implementation detail only.

## Summary of what changes

1. **New view folder `src/views/credit-debit-notes/`** — list, three thin create/edit/detail
   wrappers, and one shared `CreditDebitNoteForm.vue` carrying the type toggle, the header fields,
   the correction block and the amounts panel.
2. **New master-data view `src/views/correction-categories/`** — the `payment-terms` pair
   (`CorrectionCategoriesView.vue` + `CorrectionCategoryDialog.vue`) copied and renamed.
3. **New types + services** — `src/types/creditDebitNote.type.ts`,
   `src/types/correctionCategory.type.ts`, `src/services/creditDebitNotes.service.ts`,
   `src/services/creditDebitNoteConfig.service.ts`, `src/services/correctionCategories.service.ts`,
   all barrel-exported.
4. **New config tab** on the unified `/configs` page (`?tab=cdn`), a fifth beside Sales Order,
   Booking Order, Purchase Order, Goods Receipt and AP Invoice.
5. **Wiring** — endpoint constants, six routes, six permissions, two Purchasing menu entries, a
   `creditDebitNotes` + `correctionCategories` i18n block in both locales, and one new option in
   `NumberSeriesDialog.vue`.
6. *(Droppable, pairs with backend stage 6)* a read-only **AP Outstanding** list.

The reference implementation is `src/views/ap-invoices/` end to end — same document shell, same
number-series toggle, same approval `Panel`, same status `Tag`, same three-wrapper routing. **What is
new and must not be copied from it:** the credit/debit type toggle, an *entered* rather than derived
DPP, signed amount rendering, and the pre-flight approval-config check that decides whether *Submit
for Approval* is even clickable.

---

## F1. Endpoint constants

`src/constants/api.ts`, a new `// Credit/Debit Note endpoints` block placed after the AP Invoice
block:

```ts
CREDIT_DEBIT_NOTES: '/v1/credit-debit-notes',
CREDIT_DEBIT_NOTE_BY_ID: (id: number) => `/v1/credit-debit-notes/${id}`,
GEN_CREDIT_DEBIT_NOTES: '/gen/v1/credit-debit-notes',
CREDIT_DEBIT_NOTE_CONFIGS: '/v1/credit-debit-note-configs',
CREDIT_DEBIT_NOTE_CONFIG_MY_BRANCH: '/v1/credit-debit-note-configs/my-branch',
CREDIT_DEBIT_NOTE_CONFIG_BY_BRANCH: (branchId: number) => `/v1/credit-debit-note-configs/${branchId}`,
CORRECTION_CATEGORIES: '/gen/v1/correction-categories',
AP_OUTSTANDING: '/v1/ap-outstanding',        // stage 6 only
```

`GEN_*` for the list page, bare `/v1/` for writes and rich reads — the same split every document
module uses. `CORRECTION_CATEGORIES` is generic CRUD only, exactly like `PAYMENT_TERMS`.

## F2. Types

`src/types/creditDebitNote.type.ts` and `src/types/correctionCategory.type.ts`, re-exported from
`src/types/index.ts`. **Hand-written, no codegen — cross-check field-by-field against
`gudang-be/api/credit_debit_notes.yaml`, since a missed field fails silently as `undefined` at
runtime rather than as a compile error.**

```ts
export type CreditDebitNoteStatus = 'draft' | 'need_approval' | 'approved'
export type CreditDebitNoteType = 'credit' | 'debit'

export interface CreditDebitNoteListRow {        // /gen/v1 list row
  id: number; no: string; noteType: CreditDebitNoteType
  supplierId: number; supplierName: string; companyName: string
  supplierNoteNo: string; taxReturnNoteNo: string | null
  noteDate: string
  correctionCategoryId: number; correctionCategoryName: string
  apInvoiceHeaderId: number | null; apInvoiceNo: string | null
  taxBaseAmount: string; taxAmount: string; totalAmount: string
  signedTotalAmount: string                       // server-computed; see F6
  settledAmount: string
  status: CreditDebitNoteStatus; createdAt: string
}

export interface CreditDebitNoteResponse extends CreditDebitNoteListRow {
  branchId: number; companyId: number; companyTaxId: string | null
  description: string; remark: string | null
}

export interface CreateCreditDebitNoteRequest {
  no?: string | null                              // omitted in auto mode
  noteType: CreditDebitNoteType
  supplierId: number
  supplierNoteNo: string
  noteDate: string                                // 'YYYY-MM-DD'
  taxReturnNoteNo?: string | null
  correctionCategoryId: number
  apInvoiceHeaderId?: number | null
  description: string
  taxBaseAmount: string                           // required — entered, not derived
  taxAmount?: string | null                       // omitted → server computes
  remark?: string | null
  branchId?: number | null
  status: CreditDebitNoteStatus
}
export type UpdateCreditDebitNoteRequest = Omit<CreateCreditDebitNoteRequest, 'no'>

export interface CorrectionCategory {
  id: number; code: string | null; name: string; isActive: boolean
  createdAt: string; updatedAt: string
}
```

Every decimal is a `string` on the wire, `parseFloat`d on read and `String()`d on write. Note the
request carries **`taxBaseAmount` but not `totalAmount`** — the mirror image of AP Invoice, where DPP
is derived and never sent.

## F3. Services

`src/services/creditDebitNotes.service.ts` — a static class per house style, JSDoc on every method:

```ts
export class CreditDebitNotesService {
  private static readonly BASE_URL = API_ENDPOINTS.CREDIT_DEBIT_NOTES
  static async list(queryString: string): Promise<Base<CreditDebitNoteListRow>>
  static async get(id: number): Promise<CreditDebitNoteResponse>
  static async create(payload: CreateCreditDebitNoteRequest): Promise<CreditDebitNoteResponse>
  static async update(id: number, payload: UpdateCreditDebitNoteRequest): Promise<CreditDebitNoteResponse>
  static async remove(id: number): Promise<void>
}
```

**`update` is a `PUT`**, matching the backend spec — copy `apInvoices.service.ts`, which already does
this correctly, not the AP Invoice *plan*, which says PATCH.

`src/services/creditDebitNoteConfig.service.ts` is a copy of `apInvoiceConfig.service.ts`.
`src/services/correctionCategories.service.ts` is a copy of `paymentTerms.service.ts`. All
barrel-exported from `src/services/index.ts`.

## F4. `CreditDebitNoteForm.vue` — the document shell

Props `{ mode: DialogMode.ADD | VIEW | EDIT, noteId?: number }`, emits `cancel` / `submitted`.
`const toastGroup = 'creditDebitNoteForm'`. Structure follows `ApInvoiceForm.vue` top to bottom:
Toast + ConfirmDialog → loading spinner → `<Form v-slot="$form" :initial-values :resolver @submit>` →
status `Tag` when `mode !== ADD` → approval `Panel` → type toggle → header grid → `Divider` →
correction block → `Divider` → amounts panel → informational messages → footer.

Approval panel, `module-key="credit_debit_note"`, identical wiring to AP Invoice's including
`:show-status-header="false"` and the narrow `onApprovalChanged()` that refreshes the timeline and
re-fetches just the header to update `currentStatus` — **do not** call the full loader, which toggles
`isLoading` and unmounts the approval widgets behind a spinner.

### F4a. The type toggle

The mockup's two-button toggle. Use PrimeVue `SelectButton`, form-bound:

```vue
<SelectButton
  v-model="noteType" name="noteType" :options="noteTypeOptions"
  option-label="label" option-value="value" :allow-empty="false"
  :disabled="mode === DialogMode.VIEW"
  :pt="{ root: 'w-full', button: 'flex-1 justify-center' }"
/>
```

with `noteTypeOptions` a computed pair carrying `t('creditDebitNotes.type.creditLong')`
("Credit Note — reduces payable") and `t('creditDebitNotes.type.debitLong')`
("Debit Note — increases payable"). The mockup's green/red treatment goes on the *selected* state via
a conditional class on the root (`credit` → emerald, `debit` → rose), not on both buttons at once.

Switching type changes nothing else on the form (master plan assumption) — but it **does** change
every amount's rendered sign, so the amounts panel and the totals must read `noteType` reactively.

### F4b. Header grid

`grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6`, each field in `<div class="flex flex-col gap-1">` with a
`text-sm font-semibold` label and a `<Message v-if="$form.X?.invalid">`:

| Field | Control | Notes |
|---|---|---|
| Document no | Auto/Manual `Button` pair + readonly preview, else `InputText name="no"` | `useNumberSeries('credit_debit_notes')`, ADD only |
| Supplier | `InfiniteSelect name="supplierId" option-value="id"` | form-bound; `:fetch-fn="(q) => SuppliersService.list(q)"` |
| Legal Entity | disabled `InputText` | `{{ companyName }} — NPWP {{ companyTaxId }}`; VIEW/EDIT from the response, ADD from the branch→company lookup |
| Supplier note no | `InputText name="supplierNoteNo"` | required; the principal's own number, e.g. `NK/NTF/07/00089` |
| Note date | `DatePicker name="noteDate" date-format="dd/mm/yy"` | `:max-date="maxNoteDate"` |
| Coretax Nota Retur no | `InputText name="taxReturnNoteNo"` full-width (`lg:col-span-2`) | optional to draft, **required to submit when PPN > 0** — see F4d |

The supplier is form-bound (`name="supplierId"`) per the CLAUDE.md InfiniteSelect rules, but
`@select-option` is used alongside to **clear the reference AP invoice**, which is supplier-scoped.

Number series, identical to `ApInvoiceForm.vue`:

```ts
const { codeMode: noMode, previewCode, seriesId: numberSeriesId,
        loading: numberSeriesLoading, hasDefaultSeries, generateCode } =
  useNumberSeries('credit_debit_notes')
```
with the mode-aware zod (`no` optional only in ADD + auto) and the code generated **at submit time**,
not at mount.

**Dates.** Serialize with `dayjs(v).format('YYYY-MM-DD')` — never `.toISOString().split('T')[0]`,
which converts to UTC and lands a day early at UTC+7. Deserialize with `new Date(res.noteDate)`.
Display with `dayjs(v).format(DateFormat.DATE)`. The future-date guard uses **both** `:max-date` and a
zod `.refine()` that re-reads the clock at validation time.

### F4c. The approval pre-flight — the one genuinely new behaviour

Master decision 4 makes a configured flow mandatory to post. Discovering that as a 400 after filling
in a whole form is the worst possible UX, so the form finds out first:

```ts
const branchApprovalFlowId = ref<number | null>(null)
const approvalConfigLoaded = ref(false)

onBeforeMount(async () => {
  try {
    const cfg = await CreditDebitNoteConfigService.getMyBranch()
    branchApprovalFlowId.value = cfg?.approvalFlowId ?? null
  } catch {
    branchApprovalFlowId.value = null      // treat any failure as "not configured"
  } finally {
    approvalConfigLoaded.value = true
  }
})

const canSubmitForApproval = computed(
  () => approvalConfigLoaded.value && branchApprovalFlowId.value !== null,
)
```

The footer's *Submit for Approval* is `:disabled="!canSubmitForApproval"`, and when it is disabled a
`<Message severity="warn" variant="simple">` above the footer reads
`creditDebitNotes.messages.approvalFlowRequired` — "This branch has no approval flow configured for
credit/debit notes. Save as draft, or ask an administrator to configure one under Settings → Config
→ Credit/Debit Note." *Save as Draft* is never affected.

This is a **guard, not a substitute**: the server still refuses (`ErrApprovalFlowRequired`), and the
`catch` on submit must surface that message too, because the config can change between page load and
submit.

### F4d. Submit-time Coretax validation

Master decision 7 is status-dependent, which zod alone cannot express from a static schema. Do it in
`onFormSubmit`, after `chosenStatus` is known and before `doSubmit()`:

```ts
if (chosenStatus.value !== 'draft' && ppnAmount.value > 0 && !taxReturnNoteNo.value?.trim()) {
  taxReturnNoteNoError.value = t('creditDebitNotes.validation.taxReturnNoteNoRequired')
  toast.add(commonErrorToast(new Error(t('creditDebitNotes.validation.taxReturnNoteNoRequired')), toastGroup))
  return
}
```

with `taxReturnNoteNoError` cleared on every edit of the field and rendered as a `Message` beneath it.
Mirror the same conditional in the zod resolver only if the resolver is already rebuilt per submit —
otherwise keep it here, in one place, and let the server be the backstop.

### F4e. Two-step submit

As in `ApInvoiceForm`: `onFormSubmit` builds `pendingRequest.value` and sets `chosenStatus` from which
footer button was pressed; *Save as Draft* calls `doSubmit()` directly, *Submit for Approval* routes
through `confirm.require({ group: 'creditDebitNoteConfirm', ... })`. The confirm message should state
the consequence in the mockup's terms: after approval this becomes an open credit (or debit) balance
against the supplier and can no longer be edited.

## F5. Correction block

A second card, `grid-cols-1 gap-4 lg:grid-cols-2`:

| Field | Control | Notes |
|---|---|---|
| Correction category | `InfiniteSelect name="correctionCategoryId" option-label="name" option-value="id"` | `:fetch-fn` calls `CorrectionCategoriesService.list(q)` with `is_active = true` appended via `GenericQueryBuilder`; `:initial-option` set from the response in VIEW/EDIT so a since-deactivated category still displays |
| Reference AP Invoice (optional) | `InfiniteSelect name="apInvoiceHeaderId" option-label="no" option-value="id"` | `:fetch-fn` hits `API_ENDPOINTS.GEN_AP_INVOICE_HEADERS` filtered on `supplier_id = <selected supplier>`; disabled until a supplier is chosen; clearable |
| Correction description | `Textarea name="description" rows="3"` full-width | **required** (master decision 11) — this is what the approver reads |

The reference-invoice picker needs no new endpoint: `ApInvoiceHeader.FilterMap()` already carries
`supplier_id`, `company_id` and `status`, so `GenericQueryBuilder` triples are enough. Filter on
`supplier_id` only — the company fence is enforced server-side and adding a client filter on a
`companyId` the form may not know yet in ADD mode just produces an empty dropdown.

Beneath the block, an informational `Message severity="info"`:
`creditDebitNotes.messages.referenceIsAuditTrailOnly` — referencing an invoice is audit trail only
and does not change that invoice's amount or status (master decision 8, the mockup's third checklist
item).

## F6. Amounts panel

A bordered panel (`rounded-lg border border-stone-200 p-4`). Unlike AP Invoice, **DPP is an input**:

| Row | Control | Source |
|---|---|---|
| Correction value (DPP) | editable `InputNumber name="taxBaseAmount"` | required, `> 0` |
| PPN | editable `InputNumber` | seeded from `TaxConfigurationService.get()`, overridable |
| Total | read-only | DPP + PPN |

Both `InputNumber`s take `:locale="locale"` `:min-fraction-digits="0"` `:max-fraction-digits="2"`
`:min="0"`.

PPN seeding follows `ApInvoiceSummary.vue` exactly, including the two details that were only
discovered by building it:

- The tax percentage load is `.catch(() => ({ percentage: '0' }))` so a missing tax configuration
  degrades to zero rather than breaking the form.
- **A saved PPN override must not be re-seeded when a draft is reopened.** Initialise
  `ppnTouched = true` when the loaded `taxAmount` differs from `taxBase × rate`; the heuristic is
  sound because a value that *matches* can only have been auto-computed.

When touched and deviating from the computed figure by more than 1 000, show a non-blocking
`<Message severity="warn" variant="simple">` with `creditDebitNotes.validation.ppnDeviation`.

**Signed rendering.** Every displayed money figure in this panel and in the list carries the sign and
the colour of `noteType`: credit → a leading `−` and `text-emerald-700`, debit → a leading `+` and
`text-rose-700`, matching the mockup's green credit / red debit. Extract it once:

```ts
// src/views/credit-debit-notes/components/signedAmount.ts
export function signedAmount(value: number, noteType: CreditDebitNoteType): number {
  return noteType === 'credit' ? -value : value
}
```

and format through the existing currency helper. **The stored values are always positive** (master
decision 2) — the sign is presentation only, and `taxBaseAmount` must be sent unsigned. Getting this
backwards produces a `CHECK` violation from the server, which is the intended safety net.

**In VIEW mode the totals come from the server**, not from recomputation — the rule stated at
`GoodsReceiptForm.vue:470` and repeated in the AP Invoice plan. Keep `savedTaxBaseAmount` /
`savedTaxAmount` / `savedTotalAmount` refs and short-circuit the `totals` computed when
`mode === DialogMode.VIEW`. It matters more here than anywhere else: PPN can be an override *and* the
tax rate can have moved since approval.

Below the panel, one informational `Message`: the Coretax number must match a real Nota Retur /
Faktur Pajak Pengganti before the tax adjustment is creditable, and the system does not verify it
(the mockup's blue info box, stated honestly).

Extract the whole panel as `src/views/credit-debit-notes/components/CreditDebitNoteAmounts.vue` with
its own spec — this is exactly the leaf logic the existing six spec files cover.

## F7. Views and routing

`src/views/credit-debit-notes/`:

- `CreditDebitNotesView.vue` — `TableComponent` on `API_ENDPOINTS.GEN_CREDIT_DEBIT_NOTES`, columns
  `no`, `noteType`, `supplierName`, `supplierNoteNo`, `noteDate`, `correctionCategoryName`,
  `signedTotalAmount`, `status`, actions. `noteType` renders as a `Tag`
  (`severity="success"` credit / `severity="danger"` debit); `signedTotalAmount` comes **from the
  server** — the schema computes it — so the list never re-derives the sign.
  `usePermissions('/credit-debit-notes')` gates the Add button and the row actions;
  `useConfirmDelete` for the draft-only delete. Status renders with the same three-branch
  `statusSeverity` helper every other document has.
- `CreditDebitNoteCreateView.vue` / `EditView.vue` / `DetailView.vue` — the ~37-line wrappers copied
  from `ap-invoices/`, including the `setTimeout(..., 1000)` before
  `router.push('/credit-debit-notes')` so the success toast lands.

`src/views/correction-categories/CorrectionCategoriesView.vue` + `CorrectionCategoryDialog.vue` — a
rename-only copy of `src/views/payment-terms/`, minus the `days` field, plus nothing. Same
`TableComponent` + dialog shape, same `isActive` toggle.

`src/router/index.ts` — six routes, **`:id/edit` declared before `:id`** or the detail route swallows
it:

```ts
{ path: 'credit-debit-notes',          name: 'CreditDebitNotes',       /* … */
  meta: { requiredPermission: PERMISSIONS.CREDIT_DEBIT_NOTE_READ, titleKey: 'navigation.creditDebitNotes' } },
{ path: 'credit-debit-notes/create',   name: 'CreditDebitNoteCreate',  /* … */ titleAction: 'create' },
{ path: 'credit-debit-notes/:id/edit', name: 'CreditDebitNoteEdit',    /* … */ titleAction: 'edit'   },
{ path: 'credit-debit-notes/:id',      name: 'CreditDebitNoteDetail',  /* … */ titleAction: 'view'   },
{ path: 'correction-categories',       name: 'CorrectionCategories',   /* … */
  meta: { requiredPermission: PERMISSIONS.CORRECTION_CATEGORY_READ, titleKey: 'navigation.correctionCategories' } },
{ path: 'credit-debit-note-configs',   redirect: { path: '/configs', query: { tab: 'cdn' } } },
```

`src/constants/permissions.ts` — `CORRECTION_CATEGORY_READ: 97`, `CORRECTION_CATEGORY_WRITE: 98`,
`CREDIT_DEBIT_NOTE_READ: 99`, `CREDIT_DEBIT_NOTE_WRITE: 100`, `CREDIT_DEBIT_NOTE_CONFIG_READ: 101`,
`CREDIT_DEBIT_NOTE_CONFIG_WRITE: 102`, plus `/credit-debit-notes`, `/correction-categories` and
`/credit-debit-note-configs` entries in **both** `ROUTE_PERMISSIONS` and `ROUTE_WRITE_PERMISSIONS`.

`src/components/menu/menu.ts` — two new items in the existing **Purchasing** group: *Credit/Debit
Notes* after *AP Invoices*, and *Correction Categories* after *Term of Payment* (the master-data end
of that group).

## F8. Config tab

A fifth tab on the unified `/configs` page, `?tab=cdn`, gated on `CREDIT_DEBIT_NOTE_CONFIG_READ`.
`src/views/configs/ConfigsView.vue` needs the same five-line pattern the other four already follow:
an import, a `usePermissions('/credit-debit-note-configs')` destructure, a `configOptions.push`, a
branch in `canWriteActive`, a `cdnRef`, a branch in `onAddClick`, and the component in the template.

`src/views/credit-debit-note-configs/` is a rename-only copy of `src/views/ap-invoice-configs/`
(`CreditDebitNoteConfigsView.vue` + `CreditDebitNoteConfigDialog.vue`), including the `embedded` prop
and the exposed `openAddDialog()`.

**This tab is not optional polish.** Master decision 4 means the feature is unusable until a branch
has a flow, so shipping the form without the config tab ships a dead end. Build F8 before F4 is
demoed, not after.

## F9. i18n

A `creditDebitNotes` block and a `correctionCategories` block in **both**
`src/i18n/locales/en-US.ts` and `id-ID.ts` — the files are structurally identical today and a key
present in one but not the other renders as a raw key string.

```
creditDebitNotes: {
  title, addCreditDebitNote, viewCreditDebitNote,
  codeMode: { auto, manual, assignedOnSave },
  type: { credit, debit, creditLong, debitLong },
  fields: { no, noteType, supplier, legalEntity, supplierNoteNo, noteDate,
            taxReturnNoteNo, correctionCategory, referenceApInvoice,
            description, taxBase, tax, total, remark },
  sections: { header, correction, amounts },
  status: { draft, need_approval, approved },
  actions: { saveAsDraft, submitForApproval, editCreditDebitNote },
  confirm: { header, message },
  validation: { noteTypeRequired, supplierRequired, supplierNoteNoRequired,
                noteDateRequired, noteDateFuture, correctionCategoryRequired,
                descriptionRequired, taxBaseRequired, taxBasePositive,
                taxReturnNoteNoRequired, ppnNegative, ppnDeviation },
  messages: { created, updated, deleted, notFound,
              approvalFlowRequired, coretaxReminder, referenceIsAuditTrailOnly,
              supplierNoteNoDuplicate, taxReturnNoteNoDuplicate,
              apInvoiceNotReferenceable },
}
correctionCategories: { title, addCorrectionCategory, fields: { code, name, isActive },
                        validation: { nameRequired }, messages: { created, updated, deleted } }
```

`status.*` keys use the **raw backend literals** so templates can interpolate
`` t(`creditDebitNotes.status.${data.status}`) `` — hence `need_approval` in snake_case beside
camelCase siblings. `type.credit` / `type.debit` do the same for `noteType`. Add
`navigation.creditDebitNotes`, `navigation.correctionCategories` and
`navigation.creditDebitNoteConfigs` too.

Indonesian wording should follow the mockup, which is the user's own vocabulary: "Nota Kredit",
"Nota Debit", "Nota Retur / Faktur Pajak Pengganti", "Uraian koreksi", "Kategori koreksi",
"mengurangi hutang" / "menambah hutang".

Also add `credit_debit_notes` to `entityTypeOptions` in
`src/views/number-series/NumberSeriesDialog.vue` — without it the new series cannot be managed from
the UI at all. (`ap_invoices`, `purchase_orders`, `goods_receipts` and `delivery_notes` may still be
missing there too; adding them is out of scope but worth flagging.)

## F10. AP Outstanding list — *droppable stage 12*

Pairs with backend stage 6 and can be cut without affecting anything above.

`src/views/ap-outstanding/ApOutstandingView.vue` — a read-only `TableComponent` on
`API_ENDPOINTS.AP_OUTSTANDING` with columns `documentType` (a `Tag`: Invoice / Credit Note / Debit
Note), `documentNo`, `supplierName`, `documentDate`, `dueDate`, `signedTotalAmount`,
`outstandingAmount`. No Add button, no row actions — every row is produced by another module. Route
`/ap-outstanding` gated on `PERMISSIONS.AP_INVOICE_READ` (93), menu entry in **Purchasing** after
*Credit/Debit Notes*.

`signedTotalAmount` and `outstandingAmount` are negative for credit notes; render negatives in
emerald and positives in the default colour, so a supplier's page reads at a glance.

## Build order

1. F1 endpoint constants, F2 types, F3 services — nothing renders yet, but `npm run type-check`
   proves the contract compiles against the live OpenAPI spec.
2. F7's `correction-categories` pair + its route, permission and menu entry. Fully shippable alone
   and it is what the note form's picker needs.
3. F8 config tab. Before the form, per the note in F8.
4. F7 list view + note routes + permissions + menu, with an empty form. Confirm the list, the
   permission gates and the page title all work before touching the form.
5. F4 form shell — type toggle, header fields, number series, approval panel, the F4c pre-flight.
   Verify create/edit/detail round-trip.
6. F5 correction block.
7. F6 amounts panel (extract `CreditDebitNoteAmounts.vue` + spec).
8. F9 i18n sweep — last, in one pass, diffing the two locale files key-by-key.
9. F10 AP Outstanding, if backend stage 6 shipped.

## Testing

Six spec files exist today (now seven with `ApInvoiceSummary.spec.ts`), all co-located beside their
component and all covering **leaf** logic components — no spec covers a full form or list view, and
this plan does not change that.

Add `src/views/credit-debit-notes/components/CreditDebitNoteAmounts.spec.ts`, following
`ApInvoiceSummary.spec.ts` house style: mock `vue-i18n` so `t` is identity, mock the toast, stub every
PrimeVue component with a minimal inline template in a shared `globalStubs` object, and drive it from
a `baseProps(overrides)` factory. Cases worth having:

- PPN auto-computes at 11 % of an entered DPP, and re-computes when DPP changes.
- Once PPN is touched, changing DPP does **not** overwrite it.
- Reopening with a saved override (`taxAmount` ≠ `taxBase × rate`) starts `ppnTouched = true` and
  leaves the value alone.
- The deviation warning appears past 1 000 and not at 999.
- `signedAmount` negates for `credit` and not for `debit`, and the *emitted* `taxBaseAmount` is
  positive in both cases.
- VIEW mode renders the passed-in server totals and ignores the tax rate entirely.

`npm run test:unit`, `npm run type-check` and `npm run lint` must all be green.

## Verification

See the master plan's *End-to-end verification* for the full walkthrough. The frontend-specific checks
are:

- With **no** flow configured for the branch, *Submit for Approval* is disabled with the warning
  message and *Save as Draft* still works. Configure a flow, reload, and submit becomes available.
  (F4c is the single most important thing to verify — it is the only truly new interaction.)
- The Auto/Manual number toggle: Auto shows a non-editable `CDN-202607-000nn` preview plus the
  "assigned on save" hint; Manual reveals an editable field; the saved document keeps whichever was
  used. Both modes must work — this is a standing requirement for every number-series-backed entity.
- Flipping the type toggle flips every rendered sign and colour on the amounts panel and leaves every
  entered value untouched.
- Submitting with PPN > 0 and a blank Coretax number is refused **client-side** with the field
  highlighted; saving the same form as a draft succeeds. Setting PPN to 0 lets it submit with the
  field blank.
- The reference-invoice dropdown is disabled until a supplier is picked, lists only that supplier's
  invoices, and clears when the supplier changes.
- A deactivated correction category disappears from the picker but still renders on an existing note
  that used it (proves `:initial-option`).
- Save a draft on 1 Jan and confirm the stored `noteDate` is `2026-01-01`, not `2025-12-31` — the
  UTC-offset regression.
- Override PPN, save, approve, then change the tax configuration percentage: the approved note's
  totals do **not** move (proves VIEW mode reads server figures).
- Switch locale to Indonesian on every new screen — form, list, detail, config tab, correction
  categories — and confirm no raw key strings.
- A user without `CREDIT_DEBIT_NOTE_WRITE` sees no New button and no row actions; without
  `CREDIT_DEBIT_NOTE_CONFIG_READ`, no Credit/Debit Note tab on `/configs`; without
  `CORRECTION_CATEGORY_READ`, no Correction Categories menu entry.
