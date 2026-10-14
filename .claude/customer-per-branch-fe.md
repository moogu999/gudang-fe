# Customer per Branch — Frontend Plan

**Status:** IMPLEMENTED 2026-10-14, uncommitted. Unit (967), type-check and lint green; live E2E (master plan §7 web items) NOT run.
Companion to `.claude/customer-per-branch-master-plan.md` (decisions D1–D11). Backend: `gudang-be/.claude/customer-per-branch-be.md`. Ships together with BE phase 2: once `/gen/v1/customers` is branch-scoped, every unfiltered picker changes behaviour.

---

## 1. Files

| File | Change |
|---|---|
| `src/types/customer.type.ts` | `branchId`, `branch` on `Customer` (`:154`) and `CreateCustomerV1Dto` (`:303`); `UpdateCustomerV1Dto` (`:342`) omits `branchId` |
| `src/services/customers.service.ts` | `branchId` in the `toListQuery` whitelist (`:15-22`); remove legacy gen `create`/`update`/`delete` if unused (BE D10) |
| `src/views/customers/CustomerForm.vue` | Branch field; partner pickers branch-filtered |
| `src/views/customers/CustomersView.vue` | Branch filter + column |
| `src/views/sales-orders/SalesOrderForm.vue` | Customer picker follows the salesman's branch |
| `src/views/ar-clearings/ArClearingForm.vue` | Customer picker filtered + cleared on branch change |
| `src/views/cash-deposits/components/CashDepositAdhocTable.vue` (+ `CashDepositForm.vue:256`) | New `branchId` prop |
| `src/views/bank-settlements/components/BankSettlementMutationTable.vue` (+ `BankSettlementForm.vue:205`) | New `branchId` prop |
| `src/views/giro-receipts/components/GiroLinesTable.vue` (+ `GiroReceiptForm.vue:209`) | New `branchId` prop, appended filter |
| `src/views/giro-register/GiroRegisterTab.vue` | Filter customers by the branch filter when set |
| Error mapping sites (customer form, the five document forms) | New codes (§5) |
| `src/i18n/locales/en-US.ts`, `id-ID.ts` | New keys, both files, same change |

No change: `DisplayCustomerPickerDialog.vue` (passes `programId`; BE scopes), `MslCustomersDialog.vue` and `SurveyScopeCard.vue` (already send `branchId`), invoice/DO/delivery note/booking views (display only), `auditReferenceTypes.ts` picker (BE scopes to the user's branches).

---

## 2. Reuse: do not rebuild

| Need | Use |
|---|---|
| Branch select limited to the user's branches | `userBranchesFetcher(authStore.branchIds)` (`views/sales-teams/salesTeamHelpers.ts:41`) |
| Branch label "B01 - Name" | `branchLabel` (`utils/branchHelper.ts`) |
| Default branch | `authStore.primaryBranchId ?? authStore.branchIds[0]` |
| Branch-filtered picker, disabled without a branch, cleared on change | Bank account picker: `BankSettlementForm.vue:143-155`, filters `:454-461`, clear `:437-443` |
| Branch field: editable on create, read-only text on edit | `DisplayProgramForm.vue:57-72` |
| List branch filter | `MustSellListsView.vue:44-48,247-250,276` |
| Picker re-fetch on filter change | `InfiniteSelect` `customFilters` prop (`components/select/InfiniteSelect.vue:79`, watch `:253-256`) |

Filter shape for generic customers: `{ filterBy: 'branch_id', filterOperator: EQUAL, filterValue: branchId }` (snake_case key; unknown keys are a 400 since 2026-10-04).

---

## 3. Customer module

### `CustomerForm.vue`
- **Branch** field at the top of the Identity section (`:26-175`):
  - Create: `InfiniteSelect` with `userBranchesFetcher`, required, default branch preselected. If the user has one branch, still show it (disabled) so the user knows where the customer lands.
  - Edit / detail: read-only `InputText` with `branchLabel(customer.branch)` (D3).
- **Partner pickers** (`sellTo`, `deliverTo`, `invoiceTo`, `collectTo`, `:291-379`):
  - `:custom-filters` = `branch_id EQUAL selectedBranchId` (+ existing none).
  - Disabled until a branch is set.
  - On branch change (create only) clear all four and their initial options (`:774-777`).
- Payload: `branchId` on create only.

### `CustomersView.vue`
- Branch filter (`InfiniteSelect` with `userBranchesFetcher`, "All my branches" allowed), default primary branch; sent as `branch_id` filter on the gen path and `branchId` on the `/v1` label-filter path (`:181-196`).
- New **Branch** column after Name, `branchLabel(row.branch)`.

---

## 4. Pickers elsewhere

| Site | Branch source | Change |
|---|---|---|
| `SalesOrderForm.vue:240-251` | Salesman's branch | Keep `opt.branch.id` in `onSalesmanSelect` (`:1113-1116`) and the edit hydration (`:1356-1359`) as `salesmanBranchId`; customer picker filters on it and is disabled until a salesman is picked; when the salesman's branch changes, clear the customer (and its taxable state) |
| `ArClearingForm.vue:146-160` | `selectedBranchId` (`:423`) | Filter; `onBranchIdUpdate` (`:559`) clears the customer and the pool |
| `CashDepositAdhocTable.vue:24-37` | `CashDepositForm.vue` `selectedBranchId` (`:513`) | New `branchId` prop; filter; host's `onBranchIdUpdate` (`:565`) clears adhoc rows' customers |
| `BankSettlementMutationTable.vue:125-138` | `BankSettlementForm.vue` `selectedBranchId` | New prop; filter; clear on `onBranchIdUpdate` (`:435`) |
| `GiroLinesTable.vue:65-78` | `GiroReceiptForm.vue` `selectedBranchId` (`:478`) | New prop; append `branch_id` to the existing `paysWithGiro` filters (`:240-244`); clear on `onBranchIdUpdate` (`:530`) |
| `GiroRegisterTab.vue:44-55` | Register's branch filter (`:32-43`) | Add `branch_id` filter only when a branch is set; clear the customer filter when the branch changes |

**Risk — SO taxable lookup.** `SalesOrderForm.vue:1044` calls `CustomersService.getById` for the taxable flag. A cross-branch approver (SO approver visibility) now gets 404 there. Prefer reading taxable from the SO detail payload; at minimum tolerate the 404 without a toast in read-only/approval mode.

---

## 5. Errors

Map in the customer form and the five document forms (the codes come from BE doc §3/§5):

| Code | Where | Message key |
|---|---|---|
| `CUSTOMER_BRANCH_REQUIRED` | Customer form | `customers.validation.branchRequired` |
| `CUSTOMER_BRANCH_NOT_ALLOWED` | Customer form | `customers.messages.branchNotAllowed` |
| `CUSTOMER_BRANCH_CHANGE` | Customer form | `customers.messages.branchChange` |
| `CUSTOMER_PARTNER_BRANCH_MISMATCH` | Customer form | `customers.messages.partnerBranchMismatch` |
| `CUSTOMER_CODE_DUPLICATE` | Customer form (409) | `customers.messages.codeDuplicate` |
| `CUSTOMER_BRANCH_MISMATCH` | SO, AR clearing, cash deposit, bank settlement, giro receipt, display program participants | `common.errors.customerBranchMismatch` (or each module's own key if that's its convention) |

---

## 6. i18n (both files, same change, same key order)

| Key | en-US | id-ID |
|---|---|---|
| `customers.fields.branch` | Branch | Cabang |
| `customers.labels.selectBranch` | Select branch | Pilih cabang |
| `customers.labels.allBranches` | All my branches | Semua cabang saya |
| `customers.labels.selectBranchFirst` | Select a branch first | Pilih cabang terlebih dahulu |
| `customers.validation.branchRequired` | Branch is required | Cabang wajib diisi |
| `customers.messages.branchNotAllowed` | You are not assigned to this branch | Anda tidak terdaftar di cabang ini |
| `customers.messages.branchChange` | A customer's branch can't be changed | Cabang customer tidak dapat diubah |
| `customers.messages.partnerBranchMismatch` | Sell-to, deliver-to, invoice-to and collect-to must be customers of the same branch | Sell-to, deliver-to, invoice-to dan collect-to harus customer dari cabang yang sama |
| `customers.messages.codeDuplicate` | This code is already used | Kode ini sudah digunakan |
| `common.errors.customerBranchMismatch` | The customer belongs to another branch | Customer berasal dari cabang lain |
| `salesOrders.labels.selectSalesmanFirst` (if not present) | Select a salesman first | Pilih salesman terlebih dahulu |

Also update the MSL/survey reach help text that says the count is global (search both locales for the "global"/"semua cabang" wording) to say it's the branch's customers.

---

## 7. Tests (vitest)

- `customers.service` `toListQuery` passes `branchId`.
- `CustomerForm`: partner pickers disabled without a branch, cleared on branch change; branch read-only in edit.
- `SalesOrderForm`: customer cleared when the salesman's branch changes.
- `cacheKeys.spec.ts` untouched unless the customers group changes shape.
- `npm run test:unit`, type-check, lint.

---

## 8. Verification

Playwright, master plan §7 items 2–7 (web side). Gotchas from earlier E2Es: PrimeVue `InputNumber`/`DatePicker` `.fill()` doesn't stick; small viewports hide the menu; 60 s cross-tab cache lag.

---

## 9. Deviations

- **Error mapping** is one shared helper, `src/utils/customerBranchErrors.ts` (`translateCustomerBranchError`), used by the customer create/edit views and the five document forms. `translateDisplayProgramError` falls back to it, which covers the display program participants tab.
- **Legacy generic writes** (`create`/`update`/`delete`) were removed from `CustomersService`; nothing called them.
- **Form clearing** follows each form's existing convention (`formRef.value.states.x.value = undefined`); on the sales order form that needed a new `ref="formRef"` on `<Form>`.
- **Cash deposit / bank settlement / giro receipt** clear the rows' customers only in ADD mode when the branch picker changes.
- **Giro register**: with no branch chosen the customer filter is unfiltered (BE scopes to the user's branches); changing the branch clears the customer.
- **MSL/survey help text** (`en-US` ~4420, ~4739 and the id-ID twins) now says the count covers this branch only.
- **SO taxable lookup**: left as is. It runs only in ADD/EDIT and already swallows a 404 silently; VIEW uses the saved amounts.
- **Not done**: Playwright E2E, a `CustomerForm` component spec.
