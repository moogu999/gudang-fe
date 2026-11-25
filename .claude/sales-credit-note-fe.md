# Sales Credit Note (Nota Retur) — Frontend Plan

**Status:** IMPLEMENTED 2026-10-15, uncommitted. Unit (1004), type-check and lint green. Live E2E not run until the user gives the go-ahead.

Master plan: `../../.claude/sales-credit-note-master-plan.md`. Decisions **C1–C11** are defined there.
Backend companion: `../../gudang-be/.claude/sales-credit-note-be.md`. Its §5 is the wire contract.

All paths are under `gudang-fe/src/`.

---

## 1. Files

| File | Change |
|---|---|
| `types/salesCreditNote.type.ts` (**new**) | `SalesCreditNoteListRow`, `SalesCreditNoteDetail`, `SalesCreditNoteLine`, `UpdateTaxReferenceDto` |
| `services/salesCreditNotes.service.ts` (**new**) | `list` (generic `/gen/v1/sales-credit-notes`), `get`, `updateTaxReference`, `findBySalesOrder(soId)` |
| `constants/api.ts` | `SALES_CREDIT_NOTES`, `SALES_CREDIT_NOTE_BY_ID(id)`, `SALES_CREDIT_NOTE_TAX_REFERENCE(id)`, `GEN_SALES_CREDIT_NOTES` |
| `constants/permissions.ts` | `SALES_CREDIT_NOTE_READ: 168`, `SALES_CREDIT_NOTE_WRITE: 169` |
| `types/index.ts`, `services/index.ts` | Re-exports |
| `views/sales-credit-notes/SalesCreditNotesView.vue` (**new**) | List |
| `views/sales-credit-notes/SalesCreditNoteDetailView.vue` (**new**) | Detail + tax-ref edit |
| `router/index.ts`, `components/menu/menu.ts` | Routes + menu |
| `views/number-series/NumberSeriesDialog.vue` | Entity type `sales_credit_notes` |
| `types/returnDeliveryOrder.type.ts`, `views/return-delivery-orders/ReturnDeliveryOrderCreateView.vue` | Result carries the note |
| `types/deliveryOrder.type.ts`, `views/delivery-orders/DeliveryOrderDetailView.vue` | Note link; no cancel on return DOs |
| `views/sales-orders/SalesOrderForm.vue` | Return SO view mode links to its note |
| `types/arClearing.type.ts`, `views/ar-clearings/components/ArClearingSourceTable.vue`, `views/ar-clearings/arClearingLines.ts` | New source type |
| `i18n/locales/en-US.ts`, `i18n/locales/id-ID.ts` | §7 |

---

## 2. Reuse: do not rebuild any of these

- **Layout** from `views/credit-debit-notes/CreditDebitNotesView.vue` (list) and `CreditDebitNoteForm.vue` in view mode (header card, lines table, summary). The note is never created or edited from the FE, so there is **no form and no create/edit route**.
- **`ResponsiveCard`, `ConfirmationDialog`, `commonSuccessToast`**, and the toast-group pattern used by `DeliveryOrderDetailView.vue`.
- **Amount formatting** from `InvoiceDetailView.vue` (`Intl` id-ID). Amounts are strings; convert only at display.
- **Pinned UOM** qty display from `InvoiceDetailView.vue` lines.
- **`usePermissions`** for gating, and the route `meta.requiredPermission` for menu visibility.

### Conventions that have caused bugs before

- Optional keys (`sourceInvoice`, `taxReturnNoteNo`, `creditNoteId`) are **absent**, not `null`. Test with `== null` or `!x`, never `!== null`.
- Generic CRUD sort/filter is strict (400 on unknown keys). Only sort or filter on `no`, `note_date`, `branch_id`, `customer_id`, `total_amount`, `posted_at`, `sales_order_header_id`, `delivery_order_id`, all snake_case.
- The admin holds two branches, so the list passes the selected `branch_id` like other branch-owned lists.
- Every string ships in both locales in the same change. The UI says **Customer**.
- No plan references in code comments.

---

## 3. Types and service

```ts
export interface SalesCreditNoteListRow {
  id: number; no: string; noteDate: string; postedAt: string
  deliveryOrderId: number; deliveryOrderNo: string
  salesOrderHeaderId: number; salesOrderNo: string
  sourceInvoiceId?: number; sourceInvoiceNo?: string
  customerId: number; customerCode: string; customerName: string
  branchId: number; branchName: string; salesmanName: string
  totalAmount: string; appliedAmount: string; taxReturnNoteNo?: string
}

export interface SalesCreditNoteDetail { /* exactly BE §5 SalesCreditNoteDetail */ }
export interface UpdateTaxReferenceDto { taxReturnNoteNo?: string }   // omit to clear
```

Match the list row's field names to what the genericcrud read model really returns. Check with one curl before writing the type.

`findBySalesOrder(soId)` is `list({ filterBy: 'sales_order_header_id', … , limit: 1 })` and returns the row or `undefined`.

---

## 4. List (`SalesCreditNotesView.vue`)

- **Columns:** No. (link to detail), Date (`noteDate`), Customer (code — name), Salesman, Return DO (link to `DeliveryOrderDetail`), Source Invoice (link to `InvoiceDetail` when present, else "—"), Total, Applied, Applied status, Nota Retur No. ("—" when absent).
- **Applied status tag:** "Unapplied" (warn), "Partly applied" (info) or "Fully applied" (success), derived from applied vs total. Display only. Notes have no status of their own; they are never voided.
- **Filters:** search (no / customer / DO no), date range on `note_date`, branch.
  - The date range uses the established Form-name workaround. A range DatePicker inside a PrimeVue `Form` broke before, so copy how `BankSettlementsView` does it.
- **Default sort:** `posted_at` desc.
- **No create button.** Add an info line explaining that credit notes are issued by return delivery orders (`salesCreditNotes.list.hint`).

---

## 5. Detail (`SalesCreditNoteDetailView.vue`)

Route `/sales-credit-notes/:id`, read permission 168.

- **Header card:**
  - No., applied status tag, date, customer, branch, company, salesman.
  - Return SO (link), return DO (link), source invoice (link when present).
  - Posted by and posted at.
- **Lines:** product code and name, qty in the pinned UOM, price, discount, sub amount, DPP, PPN.
- **Summary:** subtotal, discount, DPP, PPN, total. Below it, Applied and **Outstanding** (`outstandingAmount`).
- **Nota Retur No.:**
  - Shown read-only. A pencil button appears if the user holds 169.
  - The pencil turns the field into an `InputText` with Save / Cancel. Saving with an empty value clears the field: the DTO omits the key.
  - `409 DUPLICATE_TAX_RETURN_NOTE_NO` → a field error (`salesCreditNotes.validation.duplicateTaxReturnNoteNo`).
  - On success, replace the detail with the response.
- 404 shows the standard not-found state (the note is out of branch scope).

---

## 6. Changes to existing screens

### Router and menu

- Routes `sales-credit-notes` (name `SalesCreditNotes`) and `sales-credit-notes/:id` (`SalesCreditNoteDetail`).
  - `meta.requiredPermission: PERMISSIONS.SALES_CREDIT_NOTE_READ`.
  - `titleKey: 'navigation.salesCreditNotes'`; the detail also gets `titleAction: 'view'`.
- **Menu:** in the Sales group, directly after Invoices (`components/menu/menu.ts:~266`): `{ label: 'Sales Credit Notes', labelKey: 'navigation.salesCreditNotes', route: '/sales-credit-notes' }`.

### Number series

`NumberSeriesDialog.vue`: add `sales_credit_notes` to the entity-type options, with label key `numberSeries.entityTypes.sales_credit_notes` or whatever key family the dialog uses.

### Return DO create

`ReturnDeliveryOrderCreateView.vue`:

- `ReturnDeliveryOrderResult` gains `creditNoteId` and `creditNoteNo`.
- The success toast becomes `returnDeliveryOrders.messages.createdWithCreditNote` ("Return DO {do} created; credit note {note} issued").
- It still navigates to the DO detail.

### DO detail

`DeliveryOrderDetailView.vue:90-98`:

- `DeliveryOrderDetail` gains `creditNoteId?` and `creditNoteNo?`.
- When `creditNoteId` is present, show a **Credit Note** field linking to `SalesCreditNoteDetail` in place of the invoice field. Show it only if the user holds 168; otherwise show plain text.
- **Hide the Cancel button** when `creditNoteId` is present (a return DO; the BE answers 409 `RETURN_DO_NOT_CANCELLABLE`). Also map that code to a toast, in case of stale state.

### Return SO

`SalesOrderForm.vue`, view mode, `type === return`, status `applied`:

- Call `SalesCreditNotesService.findBySalesOrder(id)` once, only if the user holds 168.
- If found, show a "Credit Note" RouterLink next to the source-invoice link (around lines 266–315).
- The totals' red colour for returns stays; the SO's sign convention is unchanged.

### AR Clearing

1. `types/arClearing.type.ts:13`: `ArCashSourceType = 'cash_deposit' | 'bank_settlement' | 'giro' | 'sales_credit_note'`. Update the doc comments on `sourceDetail` (`'credit_note'`) and `hintInvoiceId` (also set for credit notes with a source invoice).
2. `ArClearingSourceTable.vue:88-95`: add a `SOURCE_TAG.sales_credit_note` entry, e.g. `{ severity: 'contrast', icon: 'pi pi-replay' }`. The exhaustive `Record` makes this a compile error until it is added.
3. `arClearingLines.ts`, `autoAllocate`: honour the hint for both types.
   ```ts
   const HINTED: ReadonlySet<ArCashSourceType> = new Set(['cash_deposit', 'sales_credit_note'])
   if (!HINTED.has(source.sourceType) || source.hintInvoiceId == null) continue
   ```
4. Wording: `arClearings.sections.sources` changes from "Cash Available" to **"Available Credit"** (id-ID: "Dana & Kredit Tersedia"). Review `sources.method` ("Received Via") and `sources.empty`, and make them neutral.
5. `ArClearingForm.vue` needs no logic change. `sourceType` passes through on submit. Re-check the `showSaved` rebuild (~770–790) for any hardcoded type.
6. `services/arClearings.service.ts`: update the doc comment.

### Salesman target achievement

- Update `salesmanTargets.achievement.basis` in both locales to: "Counted from applied invoices by the date they were applied, minus posted sales credit notes by the date they were posted."
- `AchievementSkuDialog.vue`: a product that was only returned shows a **negative** qty and value. Render negatives in red (`text-red-600`) and leave the totals as plain sums.
- `salesmanTargetAchievement.ts`: no clamp. A negative achieved value gives a negative % and the red band; that is acceptable. Add a unit test that pins this behaviour.

---

## 7. i18n (both `en-US.ts` and `id-ID.ts`)

```
navigation.salesCreditNotes                    Sales Credit Notes / Nota Retur Penjualan
salesCreditNotes.title / list.hint             … / "Credit notes are issued by return delivery orders."
salesCreditNotes.columns.*                     no, date, customer, salesman, returnDo, sourceInvoice,
                                               total, applied, appliedStatus, taxReturnNoteNo
salesCreditNotes.applied.none|partial|full     Unapplied / Partly applied / Fully applied
salesCreditNotes.fields.*                      returnSo, returnDo, sourceInvoice, postedBy, postedAt,
                                               outstanding, appliedAmount, company, branch
salesCreditNotes.summary.*                     subtotal, discount, taxBase, tax, total
salesCreditNotes.taxRef.edit|save|cancel|saved
salesCreditNotes.validation.duplicateTaxReturnNoteNo
returnDeliveryOrders.messages.createdWithCreditNote
deliveryOrders.fields.creditNote
deliveryOrders.messages.returnNotCancellable
salesOrders.fields.creditNote
arClearings.sources.type.sales_credit_note     Credit Note / Nota Retur
arClearings.sections.sources                   Available Credit (reworded)
numberSeries entity label for sales_credit_notes
salesmanTargets.achievement.basis              (reworded)
```

Walk every new view in id-ID during E2E; raw keys have shipped before (`salesmanTargets.tabs.achievement`).

---

## 8. Tests (vitest)

| Spec | Cases |
|---|---|
| `SalesCreditNoteDetailView.spec.ts` | The tax-ref pencil needs 169. Saving empty omits the key. A duplicate 409 → field error. Outstanding = total − applied. |
| `SalesCreditNotesView.spec.ts` | Applied status thresholds and severities. No create button. |
| `arClearingLines.spec.ts` | A credit note's hint goes to its source invoice before FIFO. A hint on an invoice not in rows is ignored. |
| `ArClearingSourceTable.spec.ts` | Renders the `sales_credit_note` tag and label |
| `salesmanTargetAchievement.spec.ts` | Negative achieved → negative %, bad band |
| `DeliveryOrderDetailView` (existing spec, if any) | Credit-note link shown and cancel hidden when `creditNoteId` is present |

Then run `npm run test:unit`, `npm run type-check` and `npm run lint`. Use the exact script names from `package.json`.

---

## 9. Verification

1. Unit, type-check and lint green.
2. Live E2E only on the user's go-ahead: master §7 scenarios 1, 3, 4, 5, 7, 9, 10, 11 through Playwright, in en-US and id-ID.
3. `graphify update .` from the repo root, and stop the dev servers by port PID.

---

## 10. Deviations

- **List filters.** No date-range or branch filter: `TableComponent` search plus a filter on No. only, because the strict generic-CRUD maps allow just `no` for filtering. The BE already scopes the list to the caller's branches.
- **List sort.** Only No., Date, Total sort; Customer, Salesman, DO and invoice columns are not in the BE `SortMap`.
- **Detail route** has no `requiredWritePermission` (the router spec allows that only on list routes). The tax-reference pencil checks 169 through `hasPermission`.
- **Tests.** No `SalesCreditNotesView.spec.ts`: the applied-status logic lives in `salesCreditNoteStatus.ts` and is tested there. The detail view's spec imports `PERMISSIONS` from `@/constants/permissions`, since the `@/constants` barrel pulls in the real i18n.
- **Return DO cancel.** The button is hidden when `creditNoteId` is present, and `RETURN_DO_NOT_CANCELLABLE` maps to a toast.
- **AR Clearing wording.** `sources.method` became "Type" / "Jenis"; `sources.empty` mentions credit.
