# AR Clearing — Frontend Plan

**Read `.claude/ar-clearing-master-plan.md` first**, then `gudang-be/.claude/ar-clearing-be.md` for the contract. Decision references (D1–D16) point at the master plan.

The screen: pick an outlet, see its pooled unapplied cash (tickable), see its outstanding invoices (per-row editable allocation), an Auto-allocate button, a three-cell totals strip, Save Draft / Submit Clearing. A completed clearing is read-only with a Void action.

---

## 1. Files

```
src/views/ar-clearings/
  ArClearingsView.vue                        list
  ArClearingCreateView.vue                   route shell -> Form mode=ADD
  ArClearingEditView.vue                     route shell -> Form mode=EDIT
  ArClearingDetailView.vue                   route shell -> Form mode=VIEW + Void
  ArClearingForm.vue                         the whole screen
  arClearingLines.ts                         pure logic — types, totals, autoAllocate
  arClearingLines.spec.ts
  components/ArClearingSourceTable.vue       tickable cash sources
  components/ArClearingSourceTable.spec.ts
  components/ArClearingInvoiceTable.vue      invoices + editable allocation
  components/ArClearingInvoiceTable.spec.ts
  components/ArClearingSummary.vue           the calc strip
  components/ArClearingSummary.spec.ts

src/services/arClearings.service.ts
src/services/arOutstanding.service.ts        both read endpoints
src/types/arClearing.type.ts                 hand-written mirror of the OpenAPI specs
```

Three wrapper views plus one mode-driven form is the `ap-payments` / `bank-settlements` shape; do not invent a fourth arrangement.

---

## 2. Reuse — do not rebuild any of these

| Need | Use | Why |
|---|---|---|
| Tickable table with a per-row editable amount | **Pattern from `ApPaymentOpenItemPicker.vue`** | Raw PrimeVue `DataTable`, **not** `TableComponent` — the latter hardcodes `selection-mode="single"`. Selection lives in a local `Map`, not in PrimeVue's own selection model |
| Outlet picker | `InfiniteSelect.vue` + `CustomersService.list` | Exactly what `BankSettlementMutationTable.vue:88-93` does |
| Totals strip | Clone `ApPaymentSummary.vue` | Same card, same `round2`, same readonly/live dual mode |
| Number series | `useNumberSeries('ar_clearings')` | Auto/manual SelectButton pair; in auto mode `no` is generated at submit via `await generateCode()` |
| Permission gating | `usePermissions()` | Drives Add/Edit/Delete buttons and the menu entry |
| Void confirmation | `ConfirmationDialog.vue` | With a required reason field |
| List table | `TableComponent` + `TableActionButtons` | The list screen is an ordinary CRUD list |
| Page shell | `ResponsiveCard` | Every finance form uses it |
| `round2` | `@/views/bank-settlements/bankSettlementLines` | The only exported copy in the codebase. Import it rather than writing a fourth private one |

### Three conventions that have caused bugs before

1. **PrimeVue range/date pickers bound via `Form name=` crash their overlay.** Bind `clearing_date` with explicit `:model-value` + `@update:model-value` and validate it in `onFormSubmit`, not in the zod schema. This is the Bank Settlement bug, fixed 2026-09-20.
2. **A view reused across two ids keeps stale state.** `ArClearingEditView` and `ArClearingDetailView` must `watch(() => route.params.id)` and `:key` the form. Bank Settlement shipped this bug and it was found live.
3. **`InfiniteSelect` emits `update:model-value` and `select-option` back to back.** If the outlet handler needs both the id and the row, read from a `latest` ref rather than assuming the order.

---

## 3. Types — `src/types/arClearing.type.ts`

Hand-written mirror of `api/ar_clearings.yaml` + `api/ar_outstanding.yaml`. **There is no codegen on this side** — carry the same header comment `apPayment.type.ts` and `bankSettlement.type.ts` carry.

```ts
export type ArClearingStatus = 'draft' | 'completed' | 'voided'
export type ArCashSourceType = 'cash_deposit' | 'bank_settlement'

/** One poolable cash line. `sourceLineId` is unique only within a
 *  `sourceType` — always key on the pair. */
export interface ArUnappliedCashItem {
  sourceType: ArCashSourceType
  sourceLineId: number
  sourceDocumentId: number
  sourceDocumentNo: string
  customerId: number
  sourceDate: string
  amount: string
  appliedAmount: string
  unappliedAmount: string
  hintInvoiceId: number | null   // cash_deposit invoice lines only (D12)
  description: string
}

export interface ArOpenItem {
  documentType: 'invoice'
  documentId: number
  documentNo: string
  customerId: number
  documentDate: string
  ageDays: number
  totalAmount: string
  settledAmount: string
  outstandingAmount: string
}
```

Plus `ArClearingListRow`, `ArClearingResponse` (header + `sources[]` + `allocations[]`), `ArClearingSourceRequest` (`{sourceType, sourceLineId}` only — the server derives consumption, D7), `ArClearingAllocationRequest` (`{invoiceId, appliedAmount}`), `CreateArClearingRequest`, `UpdateArClearingRequest = Omit<CreateArClearingRequest, 'no' | 'branchId'>`, `VoidArClearingRequest` (`{reason}`).

**Every money field is `string`.** Parse with `parseFloat(x) || 0` at the boundary; write back with `.toFixed(2)`.

> Go omits nil slices and pointers as **absent** keys, not `null`. Never compare a possibly-omitted field with `!== null`.

### `arClearingLines.ts` — the pure half

```ts
export interface SourceRow extends ArUnappliedCashItem { _key: string }
export interface AllocationRow extends ArOpenItem { allocated: number }

export const keyOf = (t: ArCashSourceType, id: number) => `${t}:${id}`

export function totals(picked: SourceRow[], rows: AllocationRow[]): {
  available: number; allocated: number; unallocated: number
}

/** D12 — source hints first, then FIFO.
 *
 *  Pass 1: every picked cash-deposit source whose `hintInvoiceId` is present in
 *  `rows` pays that invoice first, up to the smaller of the source remainder and
 *  the invoice's outstanding. This respects what the collector actually reported.
 *  Pass 2: whatever pool is left spreads over the remaining rows sorted by
 *  `documentDate` ascending, then `documentId`, filling each to its outstanding.
 *
 *  Returns a fresh array; never mutates its inputs. Advisory only — the server
 *  re-snapshots and re-clamps everything on submit (D9).
 */
export function autoAllocate(picked: SourceRow[], rows: AllocationRow[]): AllocationRow[]

export function agingSeverity(ageDays: number): 'ok' | 'warn' | 'danger'
export function allocationState(row: AllocationRow): 'none' | 'partial' | 'full'
```

`agingSeverity` implements master §4 assumption 2: ok ≤ 14, warn 15–59, danger ≥ 60.

This is where the money math lives and where it is unit-tested without mounting a component — the `bankSettlementLines.ts` precedent.

---

## 4. Service — `src/services/arClearings.service.ts`

Static-class pattern with JSDoc, exported from `src/services/index.ts`. The list hits the generic-CRUD read model; everything else hits the module routes — the split every finance service uses.

```ts
static list(qs?: string)                  // GEN_AR_CLEARINGS
static get(id: number)                    // AR_CLEARING_BY_ID
static create(data: CreateArClearingRequest)
static update(id: number, data: UpdateArClearingRequest)   // PUT, not PATCH
static remove(id: number)
static void(id: number, data: VoidArClearingRequest)       // POST .../void
```

`src/services/arOutstanding.service.ts`:

```ts
static openItems(params: { customerId: number; page?: number; limit?: number })
static unappliedCash(params: { customerId: number; excludeClearingId?: number; page?: number; limit?: number })
```

Both take bespoke query params, **not** `GenericQueryBuilder` — the same call shape as `ApOutstandingService.list`. `unappliedCash` returns an ordinary `meta.total`. There is no "hidden rows" count — D14 removes the free-text outlet from Cash Deposit outright, so every pooled source is outlet-bearing by construction.

`excludeClearingId` is passed **only in EDIT mode**, and only for a draft.

---

## 5. Form behaviour

### Header

Outlet (`InfiniteSelect` over customers, **required**, and the whole screen is empty until it is set), clearing date, document number (auto/manual SelectButton), branch picker only when `authStore.branchIds.length > 1`, remark.

**Changing the outlet clears both tables.** Everything below the header is scoped to one customer (D5), so a switch invalidates every ticked source and every allocation. Reset the source table's `Map`, clear allocations, then refetch — and call the child's exposed `reset()` after `await nextTick()`, never before, or it fires against the stale `customerId`. That ordering is load-bearing and is documented at `ApPaymentForm.vue:693-699`.

### Source table — `ArClearingSourceTable.vue`

Raw `DataTable`, `:lazy`, paginator, `selection-mode="multiple"`, `data-key="_key"`.

- Selection in `const pickedMap = ref(new Map<string, SourceRow>())`, keyed by `keyOf(sourceType, sourceLineId)`. It survives page changes because the map is ours, not PrimeVue's.
- `:select-all` must be a real boolean, not null — PrimeVue only emits `select-all-change` when it is non-null, and otherwise silently emits `row-select-all`/`update:selection` instead.
- Columns: checkbox · date · source (a tag showing `sourceDocumentNo`, icon by `sourceType`) · description · original amount · **remaining** (`unappliedAmount`).
- The mockup's row-3 note becomes a live hint: when any row has `unappliedAmount < amount`, show *"partially allocated in an earlier clearing"* under the table.
- Emits `update:picked` with `Array.from(map.values())`. `defineExpose({ reset })`.
- Default order is the server's — `sourceDate` ascending — which is the order the server will actually consume in (D7). Do not re-sort client-side.

### Invoice table — `ArClearingInvoiceTable.vue`

Raw `DataTable`, `:lazy`, paginator.

- Columns: invoice no · date · **age** (a `Tag` coloured by `agingSeverity`) · total · outstanding · **allocation** (`InputNumber`) · status pill.
- The `InputNumber` is `:max="parseFloat(row.outstandingAmount)"`, `:locale="locale"`, `min-fraction-digits="0"`, `max-fraction-digits="2"`, `input-class="w-full min-w-0 text-right"`. Clamp to `[0, outstanding]` in the handler as well — `:max` alone does not stop a paste.
- Status pill from `allocationState`: none (hidden) / Partial (info) / Full (success).
- A row with `allocated = 0` is simply not sent.

### Auto-allocate

One button above the invoice table, labelled per the mockup (`Auto-alokasi FIFO` / `Auto-allocate FIFO`), calling `autoAllocate(picked, rows)` and replacing the allocation column wholesale. Disabled when nothing is ticked.

It is **advisory** (D12) — it overwrites hand-typed values, so confirm before running it if any row already has a non-zero allocation.

### Calc strip — `ArClearingSummary.vue`

Three cells, cloned from `ApPaymentSummary.vue`: **Total cash available** · **Total allocated** · **Unallocated**.

- Third cell green when the remainder is exactly 0, amber when positive.
- When positive, render the mockup's Contoh-2 reassurance underneath: *"This does not have to be fully allocated. The remainder stays available for this outlet's next clearing."* (D8).
- Dual-mode like its sibling: VIEW mode renders the server's saved `availableAmount`/`allocatedAmount`/`unallocatedAmount` verbatim rather than recomputing, so an old clearing does not shift when balances move.
- Purely derived — **emits nothing**, and the spec asserts that.

### Submit

Two buttons, both `type="submit"` inside one `<Form>`, differentiated by `@click="chosenStatus = 'draft' | 'completed'"` — the `ApPaymentForm.vue:357-374` pattern.

`onFormSubmit` validates in order, each failure a `commonErrorToast` rather than a field error:

1. `event.valid`
2. an outlet is selected
3. at least one source is ticked
4. at least one allocation is `> 0`
5. `allocated <= available` — otherwise the local `insufficientCash` message

Then build the request: sources as `{sourceType, sourceLineId}` **only** (no amounts — the server derives consumption, D7), allocations as `{invoiceId, appliedAmount: allocated.toFixed(2)}`. Dates via `dayjs(d).format('YYYY-MM-DD')`, **never** `toISOString().split('T')[0]` — UTC+7 lands a day early.

Submitting as `completed` goes through a `confirm.require({ group: 'arClearingConfirm', ... })` naming the outlet and the total; draft submits directly.

### Void

Detail view only, and only when `status === 'completed'`. A `ConfirmationDialog` with a **required** reason textarea, then `ArClearingsService.void(id, { reason })`. On success, reload the document — it now reads `Voided` with the reason and the voiding user shown in a muted banner. Nothing on the page becomes editable.

### Status pill and gating

The status label is resolved as ``t(`arClearings.status.${status}`)`` — keyed by the enum value, so the locale files carry `draft`, `completed`, `voided`. Draft = info, Completed = success, Voided = danger.

Edit and Delete are offered for `draft` only; Void for `completed` only; `voided` offers nothing. `/ar-clearings/:id/edit` on a non-draft renders the shared `notEditable` message rather than a broken form.

---

## 6. Wiring

### `src/constants/api.ts`

```ts
AR_OUTSTANDING: '/v1/ar-outstanding',
AR_UNAPPLIED_CASH: '/v1/ar-unapplied-cash',
AR_CLEARINGS: '/v1/ar-clearings',
AR_CLEARING_BY_ID: (id: number) => `/v1/ar-clearings/${id}`,
AR_CLEARING_VOID: (id: number) => `/v1/ar-clearings/${id}/void`,
GEN_AR_CLEARINGS: '/gen/v1/ar-clearings',
```

### `src/constants/permissions.ts`

```ts
AR_CLEARING_READ: 126,
AR_CLEARING_WRITE: 127,
```

plus an entry in **both** route maps — missing either silently breaks gating:

```ts
ROUTE_PERMISSIONS:       '/ar-clearings': PERMISSIONS.AR_CLEARING_READ,
ROUTE_WRITE_PERMISSIONS: '/ar-clearings': PERMISSIONS.AR_CLEARING_WRITE,
```

Both maps are keyed by the **base list path only** — no `/create`, no `/:id`.

### `src/router/index.ts`

Four routes, lazy-loaded, each with `meta.requiredPermission` + `meta.titleKey` + `meta.titleAction`:

```
'ar-clearings'           ArClearings        AR_CLEARING_READ
'ar-clearings/create'    ArClearingCreate   AR_CLEARING_WRITE   titleAction: 'create'
'ar-clearings/:id/edit'  ArClearingEdit     AR_CLEARING_WRITE   titleAction: 'edit'
'ar-clearings/:id'       ArClearingDetail   AR_CLEARING_READ    titleAction: 'view'
```

**`:id/edit` must be declared before `:id`** or the detail route swallows it.

### `src/components/menu/menu.ts`

One item in the **Finance** group, appended after Bank Settlements:

```ts
{ label: 'AR Clearing', labelKey: 'navigation.arClearings', route: '/ar-clearings' }
```

Visibility is derived from `ROUTE_PERMISSIONS`, so no per-item permission field is needed.

### `NumberSeriesDialog`

One entry in `entityTypeOptions`:

```ts
{ label: t('numberSeries.entityTypes.arClearings'), value: 'ar_clearings',
  disabled: takenEntityTypes.value.has('ar_clearings') }
```

### Cash Deposit cleanup (D14)

Two dead references go in the same change as the backend's `000260`:

- `src/types/cashDeposit.type.ts:66` and `:98` — drop both `outletName` fields. They are already unused: `AdhocRow` never had one and `CashDepositForm.vue` never sends one.
- `src/views/cash-deposits/components/CashDepositManifestPicker.spec.ts:210` — drop the `outletName: null` fixture key.

No component, validator or request builder changes — the Cash Deposit UI already required a real customer.

### i18n

Both `en-US.ts` and `id-ID.ts`, same keys, same order, in the same change. No hardcode-then-translate.

- `navigation.arClearings`
- `numberSeries.entityTypes.arClearings`
- a top-level `arClearings` block: `title`, `addArClearing`, `viewArClearing`, `codeMode.{auto,manual,assignedOnSave}`, `fields.*`, `sections.{header,sources,invoices,summary}`, `sources.*` (incl. `partiallyAllocatedHint`), `invoices.*` (incl. `autoAllocate`, `aging.{ok,warn,danger}`), `allocation.{none,partial,full}`, `summary.{available,allocated,unallocated,remainderHint}`, `status.{draft,completed,voided}`, `actions.{saveDraft,submit,void}`, `confirm.{submit,void}`, `void.{title,reason,reasonRequired,voidedBanner}`, `validation.*`, `messages.*`
- if phase 7 ships: `journalConfig.roles.cash_suspense`

---

## 7. Tests

Vitest + `@vue/test-utils`, co-located `.spec.ts`. `vi.mock('vue-i18n')` returning an identity `t`, so assertions are on raw key strings. `vi.mock('@/services')` returning only the methods under test.

**`arClearingLines.spec.ts` — the most valuable file here.**

- `autoAllocate`: hint honoured when the hinted invoice is in the list; hint ignored when it is not; remainder spreads oldest-first; the last invoice goes partial; pool larger than total outstanding leaves a remainder and over-allocates nothing; pool of zero allocates nothing; inputs are not mutated.
- `totals`: available/allocated/unallocated, including exact zero.
- `agingSeverity` at the 14/15/59/60 boundaries.
- `allocationState`: none / partial / full, and full at exactly `outstandingAmount`.

**`ArClearingSourceTable.spec.ts`** — uses the hand-written `DataTableStub` from `ApPaymentOpenItemPicker.spec.ts` (a template stub cannot forward a `#body` scoped slot; the stub reads the `body` slot function off each Column vnode and invokes it per row). Asserts: ticking emits the row; unticking removes it; selection survives a page change; the partially-allocated hint renders only when some row has `unappliedAmount < amount`.

**`ArClearingInvoiceTable.spec.ts`** — clamps an over-typed allocation to outstanding; emits nothing for a zero row; renders the right aging severity.

**`ArClearingSummary.spec.ts`** — amber when unallocated is positive, green at zero; VIEW mode renders the saved figures rather than recomputing; `expect(wrapper.emitted()).toEqual({})`.

`npm run type-check`, `npm run lint` and the full `npm run test:unit` must all be green before the E2E.

---

## 8. Verification

The end-to-end script lives in the master plan §9 and is the authority. Before starting it:

- Run the backend with `JWT_TOKEN_TTL=120m go run ./cmd/` — the default TTL can be 1 minute.
- Fixtures must be SQL-inserted: an outlet with several applied invoices of differing ages, one approved cash deposit with both an invoice line and an ad-hoc line, one completed bank settlement line. The dev DB has none of this.
- `InputNumber` needs real keystrokes (click, Ctrl+A, slow type, Tab) — `fill()` does not update the model. `DatePicker` is the same; click days in the panel.
- Every seeded user is SUPER_ADMIN, so the permission checks need a temporary role + user (copy an existing password hash), deleted afterwards.
- `/gen/v1/*` still returns 200 to a user with no READ permission — the known systemic gap, not this module's bug.
- Clean up every fixture, reset the `ar_clearings` number series to 0, and shut both dev servers down when finished.

---

## 9. Implementation notes (2026-09-20)

Implemented and live-verified. Deviations from the text above, all deliberate:

- **The form loads the outlet's whole pool, not one page.** `ArOutstandingService.allOpenItems` / `allUnappliedCash` drain the paginated endpoints, and both tables paginate client-side. Auto-allocate is FIFO across the entire balance and a source's hinted invoice can sit on any page, so a per-page fetch would give wrong answers. Consequence: the tables are presentational (`items`/`rows` props, `update:picked`/`update:rows` emits), the parent owns all state, and there is no exposed `reset()` or `nextTick` ordering to get wrong.
- **No `excludeClearingId`** — the backend dropped it (drafts reserve nothing, D9). Both read endpoints take `branchId`, which the form passes only when the user holds more than one branch.
- **VIEW mode reuses the same two tables read-only**, fed from the saved response (`showSaved`), never the live pool. Saved allocation rows carry no invoice age, so `AllocationRow.ageDays` is `number | null`.
- **EDIT of a draft** reloads the live pool, re-ticks the saved sources and refills saved allocations; anything no longer in the pool is dropped and reported by a warning (`messages.staleDropped`).
- **Void uses a PrimeVue `Dialog`, not `ConfirmationDialog`** — the latter has no slot for the required reason textarea.
- **Auto mode sends no `no`**, like Bank Settlement; the server draws the number. (Not `generateCode()` at submit.)
- `clearingDate` is bound with explicit `:model-value` and validated in `onFormSubmit`, per §2.
- Test-only `components/dataTableStub.ts` holds the shared DataTable stub for the two table specs.
- D14 cleanup done: `outletName` removed from `cashDeposit.type.ts` and the manifest-picker spec.
