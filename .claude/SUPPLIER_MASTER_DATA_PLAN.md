# Supplier Master Data — Frontend Plan

See also: [`gudang/.claude/SUPPLIER_MASTER_DATA_PLAN.md`](../../.claude/SUPPLIER_MASTER_DATA_PLAN.md) (master plan, decision log) and [`gudang-be/.claude/SUPPLIER_MASTER_DATA_PLAN.md`](../../gudang-be/.claude/SUPPLIER_MASTER_DATA_PLAN.md) (backend plan).

Source mockup: `n_command_supplier_master_v1.html`.

**Reminder: the UI must never say "TOP"** — every label, placeholder, column header, and validation message reads "Term of Payment" (or its Indonesian equivalent). This was an explicit correction from the user mid-planning — don't regress it.

## 1. Term of Payment management page (new, simple generic-CRUD master data — mirror `uom-groups` exactly)

```
src/types/paymentTerm.type.ts        # PaymentTerm{id, code?, name, days?, isActive}, CreatePaymentTermDto, UpdatePaymentTermDto
src/services/paymentTerms.service.ts # mirrors src/services/uomGroups.service.ts exactly (list/getById/create/update/delete over ApiService)
src/views/payment-terms/PaymentTermsView.vue   # mirrors src/views/uom-groups/UomGroupsView.vue
src/views/payment-terms/PaymentTermDialog.vue  # mirrors src/views/uom-groups/UomGroupDialog.vue — fields: name, days (number input), isActive (ToggleSwitch/Checkbox per UomGroup's existing pattern)
```

`src/constants/api.ts`: `GEN_PAYMENT_TERMS: '/gen/v1/payment-terms'` (grouped near other `GEN_` lookups).

`src/constants/permissions.ts`: `PAYMENT_TERM_READ: 85, PAYMENT_TERM_WRITE: 86` (must numerically match backend migration `000196`), plus `ROUTE_PERMISSIONS['/payment-terms']` and `ROUTE_WRITE_PERMISSIONS['/payment-terms']` entries.

Route (`src/router/index.ts`), near the `uom-groups` block:
```ts
{
  path: 'payment-terms',
  name: 'PaymentTerms',
  component: () => import('@/views/payment-terms/PaymentTermsView.vue'),
  meta: { requiredPermission: PERMISSIONS.PAYMENT_TERM_READ, titleKey: 'navigation.paymentTerms' },
},
```

i18n (`en-US.ts` / `id-ID.ts`) — new top-level `paymentTerms` key mirroring `uomGroups`' shape: `title, addPaymentTerm, editPaymentTerm, fields{name, days, isActive}, messages{paymentTermCreated, paymentTermUpdated}`. Label is always **"Term of Payment"** (title/nav) — `navigation.paymentTerms`: `'Term of Payment'` (EN) / `'Termin Pembayaran'` (ID — flagged as a translation choice; confirm with the user if they'd rather keep "Term of Payment" untranslated in Indonesian too, which is common in ERP contexts).

## 2. Supplier module

```
src/types/supplier.type.ts
src/services/suppliers.service.ts
src/views/suppliers/SuppliersView.vue
src/views/suppliers/SupplierDialog.vue
```

**Types (`supplier.type.ts`)**: `Supplier` (full entity incl. `id, code, name, npwp, address, picName, picPhone, paymentTermId: number, paymentTerm?: {id, name}, bankName/bankAccountNumber/bankAccountHolderName: string|null, isActive, createdAt/By, updatedAt/By`), `CreateSupplierDto`, `UpdateSupplierDto` — mirror `src/types/employee.type.ts` shape.

**Service (`suppliers.service.ts`)**: mirror `src/services/employees.service.ts` exactly — plain `/v1` CRUD static class using `ApiService`, `Base<Supplier>` for `list()`.

**`src/constants/api.ts`**: `SUPPLIERS: '/v1/suppliers'` (non-`GEN_`-prefixed, hand-written `/v1` module like Employee — Supplier has business logic, unlike generic-CRUD Warehouse/UOM Group).

**`SuppliersView.vue`**: mirror `src/views/employees/EmployeesView.vue` (correct precedent for a hand-written `/v1` list endpoint — not Warehouse/UomGroup, which are generic-CRUD). `Toolbar` + `ResponsiveButton` (Add, gated by `usePermissions('/suppliers').canWrite`), `TableComponent` bound to `API_ENDPOINTS.SUPPLIERS`. Columns: code (mono styling), name, npwp, picName, **Term of Payment** (display `paymentTerm.name`, e.g. "NET 45" — never a "TOP" header/label), isActive (as a `Tag` badge, mirroring `ApprovalFlowsView.vue`), createdAt, actions (view/edit/delete via `TableActionButtons` + `useConfirmDelete`).

**`SupplierDialog.vue`** combines:
- **Code (auto/manual toggle)**: exact `ProductDialog.vue` pattern — two `Button`s (only visible in `DialogMode.ADD`), `useNumberSeries('suppliers')` composable for `{codeMode, previewCode, seriesId, hasDefaultSeries}`, read-only mono `InputText` in auto mode with "assigned on save" hint, editable `InputText` in manual/EDIT/VIEW mode. Zod schema makes `code` optional only when `mode===ADD && codeMode==='auto'`. On submit: if auto, call `NumberSeriesService.generateNext(seriesId.value)` to claim the real code immediately before `SuppliersService.create(...)`.
- **Status (Aktif/Nonaktif)**: exact `ApprovalFlowForm.vue` pattern — `<ToggleSwitch id="isActive" name="isActive" :disabled="isView" />` from `primevue/toggleswitch`, default `true`, submitted as part of the regular Simpan payload (no dedicated toggle endpoint, per locked decision).
- **Alamat**: `Textarea`, mirroring `ProductDialog.vue`'s multi-line description field.
- **Bank fields**: three plain optional `InputText` fields (`bankName`, `bankAccountNumber`, `bankAccountHolderName`) — new simple pattern, no existing precedent to mirror.
- **Term of Payment (FK picker)**: `InfiniteSelect` bound to `paymentTermId`, copied from the exact currency-picker pattern in `src/views/companies/CompanyDialog.vue:89-100`:
  ```vue
  <InfiniteSelect
    id="paymentTermId"
    name="paymentTermId"
    option-label="name"
    option-value="id"
    :fetch-fn="(query) => PaymentTermsService.list(query)"
    :disabled="mode === DialogMode.VIEW"
    :placeholder="t('suppliers.labels.selectPaymentTerm')"
    :initial-option="initialPaymentTerm"
    sort-by="name"
    sort-operator="asc"
  />
  ```
  with `initialPaymentTerm` populated on edit from `props.entity.paymentTerm` (mirroring `CompanyDialog.vue`'s `initialCurrency` population), `paymentTermId` added to reactive `initialValues`, Zod `paymentTermId: z.number(...)`, and submit reading `event.states.paymentTermId.value`. **Label is `t('suppliers.fields.paymentTerm')` = "Term of Payment"** — the field's `id`/`name` attribute can stay `paymentTermId` internally, but every user-visible string (label, placeholder, validation message) must read "Term of Payment", never "TOP".
- Buttons: `Batal`/`Simpan` using existing `common.actions.cancel`/`common.actions.save` i18n keys.

## 3. Routing (`src/router/index.ts`)

Add after the Term of Payment route block:
```ts
{
  path: 'suppliers',
  name: 'Suppliers',
  component: () => import('@/views/suppliers/SuppliersView.vue'),
  meta: { requiredPermission: PERMISSIONS.SUPPLIER_READ, titleKey: 'navigation.suppliers' },
},
```

## 4. `src/constants/permissions.ts`

Add `SUPPLIER_READ: 83, SUPPLIER_WRITE: 84` (must numerically match backend `internal/user/domain/permission.go`), plus `ROUTE_PERMISSIONS['/suppliers']` and `ROUTE_WRITE_PERMISSIONS['/suppliers']`.

## 5. `src/components/menu/menu.ts`

New top-level "Purchasing" group, containing **both** Term of Payment and Suppliers, anticipating future PO/AP entries:
```ts
{
  label: 'Purchasing',
  labelKey: 'navigation.purchasing',
  icon: 'pi pi-truck',
  items: [
    { label: 'Term of Payment', labelKey: 'navigation.paymentTerms', route: '/payment-terms' },
    { label: 'Suppliers', labelKey: 'navigation.suppliers', route: '/suppliers' },
  ],
},
```

## 6. i18n (`src/i18n/locales/en-US.ts` and `id-ID.ts`)

Add `navigation.suppliers` / `navigation.purchasing` / `navigation.paymentTerms`, and a new top-level `suppliers` key mirroring `warehouses`'/`products`' shape: `title, addSupplier, editSupplier, viewSupplier, fields{code, name, npwp, address, picName, picPhone, paymentTerm, bankName, bankAccountNumber, bankAccountHolderName, isActive}, labels{selectPaymentTerm}, codeMode{auto, manual, assignedOnSave}, validation{...Required}, messages{supplierCreated, supplierUpdated}`. **Every occurrence of the payment-term label/key must read "Term of Payment"** in English (e.g. `fields.paymentTerm: 'Term of Payment'`), not "TOP" or "TOP Default". Indonesian equivalents in `id-ID.ts` (e.g. "Pemasok", "Kode Pemasok", "No. HP", "Bank Penerima").

## Verification

1. `npm run type-check` and `npm run lint` pass.
2. `npm run dev` — manually walk the golden path in browser: manage Term of Payment entries first (add NET 30/45/60/COD if not already seeded, verify list/edit/delete), then open Suppliers page (new Purchasing menu group), add supplier with auto code (verify preview + assigned code match) and pick a Term of Payment via the dropdown, add with manual code, edit, toggle Aktif/Nonaktif and save, delete, confirm list pagination/search work, confirm the Term of Payment column/label never displays the word "TOP" anywhere in the UI.
3. Confirm a user/role without `SUPPLIER_READ` cannot see the Suppliers menu item or navigate to `/suppliers`; without `SUPPLIER_WRITE` cannot see the Add button. Same check for `PAYMENT_TERM_READ`/`WRITE` on the Term of Payment page.
4. If a `SupplierDialog.spec.ts` test is added, follow the closest existing precedent style (`ApprovalActionBar.spec.ts`) since no full dialog-CRUD spec exists yet in this codebase to mirror directly.
