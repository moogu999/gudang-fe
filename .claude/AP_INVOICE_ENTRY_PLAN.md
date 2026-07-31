# AP Invoice Entry — Frontend Plan

> Sub-plan. All business rationale and locked decisions live in the master:
> [`../../.claude/AP_INVOICE_ENTRY_PLAN.md`](../../.claude/AP_INVOICE_ENTRY_PLAN.md).
> This document is file-level implementation detail only.

## Summary of what changes

1. **New view folder `src/views/ap-invoices/`** — list, three thin create/edit/detail wrappers, and
   one shared `ApInvoiceForm.vue` carrying the header fields, the receipt picker and the totals.
2. **New types + services** — `src/types/apInvoice.type.ts`, `src/services/apInvoices.service.ts`,
   `src/services/apInvoiceConfig.service.ts`, all barrel-exported.
3. **New config tab** on the unified `/configs` page (`?tab=ap`), a fourth beside Sales Order,
   Purchase Order and Goods Receipt.
4. **Wiring** — endpoint constants, four routes, two new permissions, a Purchasing menu entry, an
   `apInvoices` i18n block in both locales, and one new option in `NumberSeriesDialog.vue`.

Two reference implementations, and the split between them matters:

- `src/views/goods-receipts/GoodsReceiptForm.vue` is the model for the **document shell** — the
  `Form`/`zodResolver` wiring, the status `Tag`, the collapsible approval `Panel`, the number-series
  toggle, the two-step submit, and the VIEW-mode totals rule.
- `src/views/delivery-notes/DeliveryNoteCreateView.vue` is the model for the **picker** — a paginated
  multi-select `DataTable` of source documents feeding a second "added" table. AP Invoice Entry is
  structurally the same problem: pick N whole source documents, submit an array of ids.

---

## F1. Endpoint constants

`src/constants/api.ts`, a new `// AP Invoice endpoints` block placed after the Goods Receipt block:

```ts
AP_INVOICES: '/v1/ap-invoices',
AP_INVOICE_BY_ID: (id: number) => `/v1/ap-invoices/${id}`,
GEN_AP_INVOICE_HEADERS: '/gen/v1/ap-invoice-headers',
AP_INVOICE_AVAILABLE_GRS: '/v1/goods-receipts/available-for-invoicing',
AP_INVOICE_CONFIGS: '/v1/ap-invoice-configs',
AP_INVOICE_CONFIG_MY_BRANCH: '/v1/ap-invoice-configs/my-branch',
AP_INVOICE_CONFIG_BY_BRANCH: (branchId: number) => `/v1/ap-invoice-configs/${branchId}`,
```

`GEN_*` for the list page, bare `/v1/` for writes and rich reads — the same split Goods Receipt and
Purchase Order already use. `AP_INVOICE_AVAILABLE_GRS` mirrors `DELIVERY_NOTE_AVAILABLE_DOS` and
`PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT`.

## F2. Types

`src/types/apInvoice.type.ts`, re-exported from `src/types/index.ts`. **Hand-written, no codegen —
cross-check field-by-field against `gudang-be/api/ap_invoices.yaml`, since a missed field fails
silently as `undefined` at runtime rather than as a compile error.**

```ts
export type ApInvoiceStatus = 'draft' | 'need_approval' | 'approved'

export interface ApInvoiceHeader {          // /gen/v1 list row
  id: number; no: string; supplierId: number; supplierName: string
  companyName: string; supplierInvoiceNo: string; taxInvoiceNo: string | null
  invoiceDate: string; dueDate: string
  taxBaseAmount: string; taxAmount: string; totalAmount: string
  status: ApInvoiceStatus; createdAt: string
}

export interface ApInvoiceDetailResponse {
  id: number; goodsReceiptHeaderId: number; goodsReceiptNo: string
  receiptDate: string; warehouseName: string; purchaseOrderNo: string
  taxBaseAmount: string
}

export interface ApInvoiceResponse extends ApInvoiceHeader {
  branchId: number; companyId: number; companyTaxId: string | null
  paymentTermId: number; paymentTermName: string
  remark: string | null
  details: ApInvoiceDetailResponse[]
}

export interface InvoiceableGoodsReceipt {  // picker row
  id: number; no: string; receiptDate: string
  warehouseId: number; warehouseName: string
  purchaseOrderHeaderId: number; purchaseOrderNo: string
  subtotalAmount: string
}

export interface CreateApInvoiceRequest {
  no?: string | null                        // omitted in auto mode
  supplierId: number
  supplierInvoiceNo: string
  taxInvoiceNo?: string | null
  invoiceDate: string                       // 'YYYY-MM-DD'
  goodsReceiptIds: number[]
  taxAmount?: string | null                 // omitted → server computes
  remark?: string | null
  branchId?: number | null
  status: ApInvoiceStatus
}
export type UpdateApInvoiceRequest = Omit<CreateApInvoiceRequest, 'no'>
```

Every decimal is a `string` on the wire, `parseFloat`d on read and `String()`d on write. Note there
is **no** `taxBaseAmount` on the request — DPP is server-derived (master decision 5).

## F3. Services

`src/services/apInvoices.service.ts` — a static class per house style, JSDoc on every method:

```ts
export class ApInvoicesService {
  private static readonly BASE_URL = API_ENDPOINTS.AP_INVOICES
  static async list(queryString: string): Promise<Base<ApInvoiceHeader>>
  static async get(id: number): Promise<ApInvoiceResponse>
  static async create(payload: CreateApInvoiceRequest): Promise<ApInvoiceResponse>
  static async update(id: number, payload: UpdateApInvoiceRequest): Promise<ApInvoiceResponse>
  static async remove(id: number): Promise<void>
  static async listInvoiceableGoodsReceipts(queryString: string): Promise<Base<InvoiceableGoodsReceipt>>
}
```

`src/services/apInvoiceConfig.service.ts` is a copy of `goodsReceiptConfig.service.ts`. Both are
barrel-exported from `src/services/index.ts`.

## F4. `ApInvoiceForm.vue` — the document shell

Props `{ mode: DialogMode.ADD | VIEW | EDIT, apInvoiceId?: number }`, emits `cancel` / `submitted`.
`const toastGroup = 'apInvoiceForm'`. Structure follows `GoodsReceiptForm.vue` top to bottom: Toast +
ConfirmDialog → loading spinner → `<Form v-slot="$form" :initial-values :resolver @submit>` → status
`Tag` when `mode !== ADD` → approval `Panel` → header grid → `Divider` → picker → `Divider` → remark +
summary → footer.

Approval panel, `module-key="ap_invoice"`:

```vue
<Panel v-if="mode !== DialogMode.ADD && apInvoiceId"
       v-model:collapsed="isApprovalCollapsed" toggleable :header="t('approvals.sectionTitle')" class="mb-4">
  <ApprovalTimeline ref="approvalTimelineRef" module-key="ap_invoice"
                    :reference-id="apInvoiceId" :show-status-header="false" />
  <Divider />
  <ApprovalActionBar module-key="ap_invoice" :reference-id="apInvoiceId" @changed="onApprovalChanged" />
</Panel>
```

Header grid (`grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6`), each field in
`<div class="flex flex-col gap-1">` with a `text-sm font-semibold` label and a `<Message v-if="$form.X?.invalid">`:

| Field | Control | Notes |
|---|---|---|
| Document no | Auto/Manual `Button` pair + readonly preview, else `InputText name="no"` | `useNumberSeries('ap_invoices')`, ADD only |
| Supplier | `InfiniteSelect name="supplierId" option-value="id"` | form-bound; `:fetch-fn="(q) => SuppliersService.list(q)"` |
| Legal Entity | disabled `InputText` | `{{ companyName }} — NPWP {{ companyTaxId }}`; VIEW/EDIT from the response, ADD from the branch config lookup |
| Supplier Invoice No | `InputText name="supplierInvoiceNo"` | required |
| Faktur Pajak No | `InputText name="taxInvoiceNo"` | optional |
| Invoice date | `DatePicker name="invoiceDate" date-format="dd/mm/yy"` | `:max-date="maxInvoiceDate"` |
| Term of Payment | disabled `InputText` | driven by the supplier pick — **never labelled "TOP"** |
| Due date | disabled `InputText` | `invoiceDate + termDays`, recomputed on either change |

The supplier is form-bound (`name="supplierId"`) per the CLAUDE.md InfiniteSelect rules, but it also
**drives** three read-only fields, so `@select-option` is used alongside to capture the full object
and cascade: set `paymentTermName` / `termDays`, recompute the due date, **clear `addedReceipts`**,
and refetch the picker (master plan assumption: changing supplier clears the selection).

Number series, identical to `GoodsReceiptForm.vue`:

```ts
const { codeMode: noMode, previewCode, seriesId: numberSeriesId,
        loading: numberSeriesLoading, hasDefaultSeries, generateCode } = useNumberSeries('ap_invoices')
```
with the mode-aware zod (`no` optional only in ADD + auto) and the code generated **at submit time**,
not at mount.

**Dates.** Serialize with `dayjs(v).format('YYYY-MM-DD')` — never `.toISOString().split('T')[0]`,
which converts to UTC and lands a day early at UTC+7 (the bug fixed in `7af99a0`). Deserialize with
`new Date(res.invoiceDate)`. Display with `dayjs(v).format(DateFormat.DATE)`. The future-date guard
uses **both** `:max-date` and a zod `.refine()` that re-reads the clock at validation time.

Two-step submit, as in `GoodsReceiptForm`: `onFormSubmit` builds `pendingRequest.value` and sets
`chosenStatus` from which footer button was pressed; *Save as Draft* calls `doSubmit()` directly,
*Submit for Approval* routes through `confirm.require({ group: 'apInvoiceConfirm', ... })`.

## F5. Receipt picker + covered-receipts table

**Build this as a raw `DataTable`.** `TableComponent` hardcodes `selection-mode="single"` and cannot
multi-select — lift `DeliveryNoteCreateView.vue`'s picker wholesale.

Two cards. The picker:

```vue
<div class="mb-3 flex flex-wrap gap-2">
  <Button :label="t('apInvoices.picker.addSelected')" icon="pi pi-plus" size="small"
          :disabled="selectedPickerRows.length === 0" @click="addSelectedReceipts" />
  <Button :label="t('apInvoices.picker.addAll')" icon="pi pi-plus-circle" size="small"
          severity="secondary" :disabled="pickerItems.length === 0" @click="addAllVisibleReceipts" />
</div>

<DataTable v-model:selection="selectedPickerRows" :value="pickerItems" data-key="id"
           :lazy="true" :paginator="true" :rows="pickerPageSize" :total-records="pickerTotal"
           :rows-per-page-options="[10, 25, 50]" :loading="pickerLoading"
           class="text-sm" @page="onPickerPage">
  <Column selection-mode="multiple" header-style="width: 3rem" />
  <Column :header="t('apInvoices.picker.receiptNo')">
    <template #body="{ data }">
      <div class="font-medium">{{ data.no }}</div>
      <div class="text-xs text-stone-500">{{ t('apInvoices.picker.ref') }} {{ data.purchaseOrderNo }}</div>
    </template>
  </Column>
  <Column :header="t('apInvoices.picker.receiptDate')" />
  <Column :header="t('apInvoices.picker.warehouse')" />
  <Column :header="t('apInvoices.picker.value')" />
  <template #empty>…</template>
</DataTable>
```

The two-line receipt-no cell is the mockup's "GR-2026-07-00089 / Ref PO-2026-07-00045".

`fetchPickerData(page)` builds `URLSearchParams` by hand (the endpoint takes bespoke params, not
`GenericQueryBuilder` triples): `page`, `limit`, `search`, `supplierId`, and — in edit mode —
`apInvoiceId`, which is what keeps the invoice's own receipts visible. Already-added ids are filtered
out client-side against a `Set`, and **every add/remove re-fetches the current page** so rows
disappear and reappear correctly. The whole card is disabled with an explanatory message until a
supplier is chosen.

The covered-receipts card is a plain `DataTable` over `addedReceipts` with a remove `Button` per row
(hidden in VIEW mode) and the mockup's running bar underneath:

```
2 receipts selected                    Total value: Rp 43.636.500
```

## F6. Totals summary

A bordered panel (`rounded-lg border border-stone-200 p-4`) with three rows, replacing the mockup's
reconciliation block (master deviation 3 — no difference row, no reason dropdown):

| Row | Source |
|---|---|
| DPP | `sum(addedReceipts.subtotalAmount)`, **read-only** |
| PPN | editable `InputNumber` `:locale="locale"` `:min-fraction-digits="0"` `:max-fraction-digits="2"` |
| Total AP | DPP + PPN |

PPN is seeded from `TaxConfigurationService.get()` (loaded in `onBeforeMount` with
`.catch(() => ({ percentage: '0' }))`) and re-seeded whenever the selection changes **unless** the
user has touched it — a `ppnTouched` flag, the same pattern `PurchaseOrderForm` uses for
`paymentTermTouched`. When touched and deviating by more than 1000 from the computed value, show a
non-blocking `<Message severity="warn" variant="simple">` with `apInvoices.validation.ppnDeviation`.

Rounding is `Math.round(x * 100) / 100` at each step. **In VIEW mode the totals come from the server**,
not from recomputation — the rule stated at `GoodsReceiptForm.vue:470`, and it matters more here
because PPN can be an override that no client-side formula would reproduce. Keep `savedTaxBaseAmount`
/ `savedTaxAmount` / `savedTotalAmount` refs and short-circuit the `totals` computed when
`mode === DialogMode.VIEW`.

Below the summary, one informational `Message`: cross-check the Faktur Pajak number against Coretax
before the input VAT can be credited. The mockup's other two checklist items describe dropped scope.

## F7. Views and routing

`src/views/ap-invoices/`:

- `ApInvoicesView.vue` — `TableComponent` on `API_ENDPOINTS.GEN_AP_INVOICE_HEADERS`, columns
  `no`, `supplierName`, `supplierInvoiceNo`, `invoiceDate`, `dueDate`, `totalAmount`, `status`,
  actions. `usePermissions('/ap-invoices')` gates the Add button and the row actions;
  `useConfirmDelete` for the draft-only delete. Status renders as
  `<Tag :severity="statusSeverity(data.status)" :value="t(\`apInvoices.status.${data.status}\`)" />`
  with the same three-branch `statusSeverity` helper every other document has.
- `ApInvoiceCreateView.vue` / `ApInvoiceEditView.vue` / `ApInvoiceDetailView.vue` — the ~37-line
  wrappers copied from `goods-receipts/`, including the `setTimeout(..., 1000)` before
  `router.push('/ap-invoices')` so the success toast lands.

`src/router/index.ts` — four routes, **`:id/edit` declared before `:id`** or the detail route swallows
it:

```ts
{ path: 'ap-invoices',          name: 'ApInvoices',      component: () => import('@/views/ap-invoices/ApInvoicesView.vue'),
  meta: { requiredPermission: PERMISSIONS.AP_INVOICE_READ,  titleKey: 'navigation.apInvoices' } },
{ path: 'ap-invoices/create',   name: 'ApInvoiceCreate',  /* … */ titleAction: 'create' },
{ path: 'ap-invoices/:id/edit', name: 'ApInvoiceEdit',    /* … */ titleAction: 'edit' },
{ path: 'ap-invoices/:id',      name: 'ApInvoiceDetail',  /* … */ titleAction: 'view' },
```

`src/constants/permissions.ts` — `AP_INVOICE_READ: 93`, `AP_INVOICE_WRITE: 94`,
`AP_INVOICE_CONFIG_READ: 95`, `AP_INVOICE_CONFIG_WRITE: 96`, plus `/ap-invoices` entries in
`ROUTE_PERMISSIONS` and `ROUTE_WRITE_PERMISSIONS`.

`src/components/menu/menu.ts` — a new item in the existing **Purchasing** group
(`icon: 'pi pi-shopping-bag'`), after Purchase Orders.

## F8. Config tab

A fourth tab on the unified `/configs` page, `?tab=ap`, gated on `AP_INVOICE_CONFIG_READ`. Copy
`src/views/goods-receipt-configs/` and add the redirect route
`{ path: 'ap-invoice-configs', redirect: { path: '/configs', query: { tab: 'ap' } } }`, matching how
the PO and GR config pages are folded in.

## F9. i18n

An `apInvoices` block in **both** `src/i18n/locales/en-US.ts` and `id-ID.ts` — the files are
structurally identical today and a key present in one but not the other renders as a raw key string.
Sub-keys follow the `goodsReceipts` + `deliveryNotes` conventions:

```
apInvoices: {
  title, addApInvoice, viewApInvoice,
  codeMode: { auto, manual, assignedOnSave },
  fields: { no, supplier, legalEntity, supplierInvoiceNo, taxInvoiceNo,
            invoiceDate, paymentTerm, dueDate, remark },
  sections: { header, coveredReceipts, summary },
  picker: { title, searchPlaceholder, addSelected, addAll, selectSupplierFirst,
            receiptNo, ref, receiptDate, warehouse, value, selectedCount, selectedTotal },
  coveredReceipts: { empty, remove },
  summary: { taxBase, tax, total, coretaxReminder },
  status: { draft, need_approval, approved },
  actions: { saveAsDraft, submitForApproval, editApInvoice },
  confirm: { header, message },
  validation: { supplierRequired, supplierInvoiceNoRequired, invoiceDateRequired,
                invoiceDateFuture, receiptsRequired, ppnNegative, ppnDeviation },
  messages: { created, updated, deleted, notFound, alreadyInvoiced },
}
```

`status.*` keys use the **raw backend literals** so templates can interpolate
`` t(`apInvoices.status.${data.status}`) `` — hence `need_approval` in snake_case beside camelCase
siblings. Add `navigation.apInvoices` too. Per `SUPPLIER_MASTER_DATA_PLAN.md` decision 2, the payment
label reads "Term of Payment" / "Termin Pembayaran" and **never "TOP"**.

Also add `ap_invoices` to `entityTypeOptions` in `src/views/number-series/NumberSeriesDialog.vue`,
which today lists only `products` and `customers` — without it the new series cannot be managed from
the UI at all. (`purchase_orders`, `goods_receipts` and `delivery_notes` are missing there too;
adding them is out of scope but worth flagging.)

## Build order

1. F1 endpoint constants, F2 types, F3 services — nothing renders yet, but `npm run type-check`
   proves the contract compiles against the live OpenAPI spec.
2. F7 list view + routes + permissions + menu, with an empty form. Confirm the list, the permission
   gates and the page title all work before touching the form.
3. F4 form shell — header fields, number series, approval panel. Verify create/edit/detail round-trip
   with a hand-crafted `goodsReceiptIds` array before the picker exists.
4. F5 picker + covered-receipts table.
5. F6 totals summary.
6. F8 config tab.
7. F9 i18n sweep — do this last, in one pass, diffing the two locale files key-by-key.

## Testing

Six spec files exist today, all co-located beside their component and all covering **leaf** logic
components — no spec covers a full form or list view, and this plan does not change that.

Add `src/views/ap-invoices/components/ApInvoiceSummary.spec.ts` if F6's summary is extracted into its
own component (recommended — the PPN-override, seeding and deviation-warning logic is exactly the kind
of leaf logic the existing specs cover). Follow `src/components/approval/ApprovalActionBar.spec.ts`
house style: mock `vue-i18n` so `t` is identity, mock the toast, stub every PrimeVue component with a
minimal inline template in a shared `globalStubs` object, and drive it from a
`baseProps(overrides)` factory.

`npm run test:unit`, `npm run type-check` and `npm run lint` must all be green.

## Verification

See the master plan's *End-to-end verification* for the full walkthrough. The frontend-specific checks
are:

- The Auto/Manual number toggle: Auto shows a non-editable `API-202607-000nn` preview plus the
  "assigned on save" hint; Manual reveals an editable field; the saved document keeps whichever was
  used. Both modes must work — this is a standing requirement for every number-series-backed entity.
- The picker card is disabled with an explanatory message until a supplier is chosen, and changing the
  supplier afterwards clears every selected receipt.
- Adding a receipt removes it from the picker page; removing it puts it back — both without a manual
  refresh.
- Opening an existing draft for **edit** still shows its own receipts as selected (proves the
  `apInvoiceId` parameter is being sent).
- Set the device clock forward, or pick tomorrow: the date picker refuses it via `:max-date` and the
  zod `.refine()` catches a value set programmatically.
- Save a draft on 1 Jan and confirm the stored `invoiceDate` is `2026-01-01`, not `2025-12-31` — the
  UTC-offset regression.
- Override PPN, save, approve, then change the tax configuration percentage: the approved invoice's
  totals do **not** move (proves VIEW mode reads server figures).
- Switch locale to Indonesian on every screen and confirm no raw key strings, and that no label
  anywhere reads "TOP".
- A user without `AP_INVOICE_WRITE` sees no New button and no row actions; without
  `AP_INVOICE_CONFIG_READ`, no AP tab on `/configs`.
