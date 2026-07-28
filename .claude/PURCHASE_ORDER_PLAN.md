# Purchase Order — Frontend Plan

Sub-plan of [`../../.claude/PURCHASE_ORDER_PLAN.md`](../../.claude/PURCHASE_ORDER_PLAN.md), which holds the business rationale and the locked-in decisions. This document is file-level implementation detail only. Backend contract: [`../../gudang-be/.claude/PURCHASE_ORDER_PLAN.md`](../../gudang-be/.claude/PURCHASE_ORDER_PLAN.md).

**Primary precedent:** `src/views/sales-orders/`. The PO form is structurally the same document form but **substantially smaller** — there is no `/resolve` debounce, no promotion/bonus/customer-choice expansion rows, and no price-list chip. **Secondary precedent:** `src/views/goods-receipts/GoodsReceiptForm.vue`, the repo's existing example of a lightweight document form without a resolve round-trip.

---

## 1. Types — `src/types/purchaseOrder.type.ts`

Hand-written. There is **no OpenAPI codegen on the frontend** — a field missed here fails silently as `undefined` at runtime rather than at build time, so cross-check every name against `api/purchase_orders.yaml`.

```ts
export type PurchaseOrderStatus = 'draft' | 'need_approval' | 'approved' | 'applied'

export interface ManualDiscount {
  discountType: 'flat' | 'percentage'
  value: number
  reason: string
  amount?: number
  taxBaseAmount?: number
  taxAmount?: number
}

export interface PurchaseOrderHeader {
  id: number
  no: string
  supplierId: number
  supplier?: SupplierLite
  paymentTermId: number
  paymentTerm?: PaymentTermRef
  branchId: number
  orderDate: string
  expectedDeliveryDate?: string | null
  reference?: string | null
  remark?: string | null
  status: PurchaseOrderStatus
  subtotalAmount: string // Decimal as string from backend
  discountAmount: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  createdAt: string
  updatedAt?: string | null
}
```

Plus `PurchaseOrderDetail`, `ManualDiscountDto`, `CreatePurchaseOrderRequest`, `UpdatePurchaseOrderRequest = CreatePurchaseOrderRequest`, `CreatePurchaseOrderDetailDto`, and the local edit-state row type. Follow `salesOrder.type.ts`'s convention that **`_`-prefixed fields are frontend-only and never sent to the API**:

```ts
export interface PurchaseOrderDetailRow {
  _localId: string // crypto.randomUUID(), the DataTable dataKey
  productId?: number
  product?: ProductLiteWithUom
  quantity?: number
  _quantityTiers?: number[]
  price?: number      // editable, unlike Sales Order
  discount?: number   // derived from _manualDiscounts
  subAmount?: number
  _manualDiscounts?: ManualDiscount[]
  _taxBaseAmount?: number
  _taxAmount?: number
  pinnedUom?: PinnedUom | null
  [key: string]: unknown
}
```

Reuse `ProductLiteWithUom` and `PinnedUom` from `salesOrder.type.ts` / `product.type.ts` rather than redeclaring them, and `PaymentTermRef` from `supplier.type.ts`. Export everything through the `src/types/index.ts` barrel.

Add `PurchaseOrderConfig` to a `src/types/purchaseOrderConfig.type.ts` (`id`, `branchId`, `branch?`, `approvalFlowId`, `approvalFlow?`), modelled on `salesOrderConfig.type.ts`.

---

## 2. Services + endpoint constants

New files under `src/services/`, all static-class style with JSDoc, exported through `src/services/index.ts`:

| File | Responsibility |
|---|---|
| `purchaseOrders.service.ts` | `create(dto)` → POST `/v1/purchase-orders`; `update(id, dto)` → PUT `/v1/purchase-orders/{id}` |
| `purchaseOrderHeaders.service.ts` | `list(query)` / `getById(id)` → `/gen/v1/purchase-order-headers` |
| `purchaseOrderDetails.service.ts` | `list(query)` → `/gen/v1/purchase-order-details`, filtered by `purchaseOrderHeaderId` |
| `purchaseOrderConfig.service.ts` | the `/v1/purchase-order-configs` family |

Add to `src/constants/api.ts`, in a `// Purchase Orders` block beside the existing Sales Order block:

```ts
PURCHASE_ORDERS: '/v1/purchase-orders',
PURCHASE_ORDER_BY_ID: (id: number) => `/v1/purchase-orders/${id}`,
GEN_PURCHASE_ORDER_HEADERS: '/gen/v1/purchase-order-headers',
GEN_PURCHASE_ORDER_DETAILS: '/gen/v1/purchase-order-details',
PURCHASE_ORDER_CONFIGS: '/v1/purchase-order-configs',
PURCHASE_ORDER_CONFIG_MY_BRANCH: '/v1/purchase-order-configs/my-branch',
PURCHASE_ORDER_CONFIG_BY_BRANCH: (branchId: number) => `/v1/purchase-order-configs/${branchId}`,
```

The `GEN_` prefix marks generic-CRUD endpoints that speak the `GenericQueryBuilder` filter/sort/search/pagination protocol; unprefixed constants are hand-written business endpoints. Keep that convention.

**Decimals**: the backend sends and expects money/quantity as strings. Parse with `parseFloat` on load, send with `String(...)` on submit, and display via `new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Use the reactive `locale` (as `SalesOrderDetailsTable.vue:828` does), **not** a hardcoded `'en-US'` — `SalesOrdersView.vue` hardcodes it and that is the inconsistency, not the pattern.

---

## 3. Views — `src/views/purchase-orders/`

```
PurchaseOrdersView.vue          # list: Toolbar + TableComponent + status Tag + row actions
PurchaseOrderCreateView.vue     # thin wrapper → PurchaseOrderForm mode=ADD
PurchaseOrderEditView.vue       # thin wrapper, route.params.id, mode=EDIT
PurchaseOrderDetailView.vue     # thin wrapper, mode=VIEW
PurchaseOrderForm.vue           # header fields + totals + approval panel + submit
PurchaseOrderDetailsTable.vue   # line-item grid
```

The three page wrappers are ~40 lines each and exist only to set `mode` and pass the id, exactly as the SO ones do.

### `PurchaseOrdersView.vue`

`TableComponent` with `:url="API_ENDPOINTS.GEN_PURCHASE_ORDER_HEADERS"` and columns: `no`, `orderDate`, `supplier.name`, `paymentTerm.name`, `totalAmount`, `status`. Render `status` as a PrimeVue `Tag` via a local `statusSeverity()` — `approved → success`, `applied → info`, `need_approval → warn`, else `secondary` — mirroring `SalesOrdersView.vue:127`. Mark the less important columns `hideOnMobile`.

### `PurchaseOrderForm.vue`

One component, three modes via `props.mode: DialogMode.ADD | EDIT | VIEW`. PrimeVue `Form` + `zodResolver`, `:resolver` wrapped in `computed()` so validation messages stay reactive to locale. Two-column grid (`grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6`), then `Divider`, details table, `Divider`, remark + totals panel, actions.

| Mockup field | Implementation |
|---|---|
| Nomor PO | `InputText name="no"` + the auto/manual `Button` pair — see §3.1 |
| Principal / Supplier **(required)** | `InfiniteSelect name="supplierId"` `option-label="name"` `option-value="id"` `:fetch-fn="(q) => SuppliersService.list(q)"` `:initial-option="initialSupplier"`, `@select-option` → §3.2 |
| Supplier info line | Plain `<div class="text-xs text-stone-500">` rendering `address · NPWP {npwp} · PIC: {picName}` from the selected supplier |
| Termin pembayaran (card) | Read-only display of the currently selected Term of Payment |
| Tanggal PO **(required)** | `DatePicker name="orderDate" date-format="dd/mm/yy"` |
| Tanggal kirim diharapkan | `DatePicker name="expectedDeliveryDate"`, optional |
| Term of Payment | `InfiniteSelect name="paymentTermId"` `:fetch-fn="(q) => PaymentTermsService.list(q)"`, auto-filled from the supplier but editable. **Label reads "Term of Payment" / "Termin Pembayaran" — never "TOP"** (locked in the Supplier plan). |
| Referensi / kesepakatan | `InputText name="reference"`, full width |
| Catatan internal | `Textarea name="remark" rows="4"` |
| Branch | `InfiniteSelect name="branchId"`, rendered **only** when the auth store reports more than one branch — see the master plan's Branch resolution |

**Not built** (master decision 10): the "Hutang berjalan (AP)" card, the "PO terakhir" card, and the "Sebelum submit" checklist panel.

#### 3.1 Number series toggle

```ts
const { codeMode, previewCode, seriesId, loading, hasDefaultSeries, generateCode }
  = useNumberSeries('purchase_orders')
```

Copy the markup block from `SalesOrderForm.vue:79–119` verbatim: two `Button`s (`t('purchaseOrders.codeMode.auto' | '.manual')`) with `:severity="codeMode === 'auto' ? 'primary' : 'secondary'"`, auto disabled while `!hasDefaultSeries || loading`; auto mode shows a read-only `InputText` bound to `previewCode` with a `<small>` "Assigned on save"; manual mode shows the editable `InputText name="no"`. The zod schema branches — `no` is `z.string().optional()` in ADD+auto, required otherwise. At submit, `if (ADD && auto && seriesId) no = await generateCode()`.

This block is copy-pasted in five places already (`SalesOrderForm`, `GoodsReceiptForm`, `SupplierDialog`, `ProductDialog`, `CustomerForm`). Copying it a sixth time is acceptable and in keeping with the codebase; extracting a shared component is explicitly **not** in scope here.

#### 3.2 Supplier → Term of Payment default

On `@select-option`, set `paymentTermId` to the supplier's `paymentTermId` and stash the nested `paymentTerm` object as the picker's `:initial-option` so the label renders without waiting for a fetch. Only overwrite in ADD mode, and only when the user has not already changed it manually — an edited PO must keep the term that was actually agreed (master plan, Assumptions).

#### 3.3 Totals panel

Computed client-side from the rows, mirroring the backend formula in the master plan. Because PO is always tax-exclusive and always taxable, this is far simpler than `SalesOrderForm.vue:781–906` — no `taxIncluded` branching and no proportional header-discount split:

```
Subtotal item (gross)   = Σ (quantity × price)
  ↳ Diskon manual       = Σ line discount            (amber, prefixed −)
DPP                     = Subtotal − Diskon
PPN Masukan {rate}%     = DPP × rate / 100           (amber, prefixed +)
Total PO                = DPP + PPN
```

Fetch the rate once via the existing `TAX_CONFIGURATION` endpoint, as `SalesOrderForm` does. In VIEW mode read the **persisted** header amounts instead of recomputing — the server is authoritative.

#### 3.4 Approval panel

In VIEW/EDIT modes, a collapsible `Panel :header="t('approvals.sectionTitle')"` containing `ApprovalTimeline` + `Divider` + `ApprovalActionBar`, both with `module-key="purchase_order"` and `:reference-id="purchaseOrderId"`. Do **not** pass `submitFlowId` — like SO, submission happens server-side on save, so the action bar only needs to render Approve/Reject/Cancel. Handle `@changed` by refreshing the timeline and re-fetching just the header status, avoiding a full-form spinner flash (`SalesOrderForm.onApprovalChanged`).

`canAct` comes from the backend and must never be re-derived client-side.

#### 3.5 Actions

Two submit buttons setting `chosenStatus` before submitting, matching the mockup's footer and SO's pattern:
- **Simpan draft** → `status: 'draft'`
- **Submit untuk approval** → `status: 'approved'`, behind a `confirm.require({ group: 'poApproveConfirm' })` dialog

Both hidden unless `CanEdit` (status `draft`) and the user has `PURCHASE_ORDER_WRITE`.

### `PurchaseOrderDetailsTable.vue`

PrimeVue `DataTable`, `edit-mode="row"`, `data-key="_localId"`, `v-model:editing-rows`, `v-model:expanded-rows`. Adapt `SalesOrderDetailsTable.vue`, deleting the promotion-discount breakdown, bonus items, and customer-choice pickers from the expansion row and the footer slot entirely.

Columns: `#`, SKU, UOM, Qty, **Harga beli**, **Disc manual**, Subtotal.

- **Add rows** — the always-present placeholder row (`_isPlaceholder: true`) kept in edit mode by `ensurePlaceholder()`, promoted to a real row on `@row-edit-save` once it has a `productId`. The mockup's ghost row ("Ketik kode SKU atau nama produk…") is exactly this.
- **SKU search** — `InfiniteSelect` in the `#editor` slot, `:fetch-fn="(q) => ProductsService.list(q)"`, `option-label="code"`, `#option` slot rendering `code — name`.
- **Qty "50/0"** — reuse verbatim: `handleTierInput()` parsing slash-separated tiers, `computeBaseQty` / `decomposeBaseQty` / `pinnedToLevels` from `src/utils/uomHelper.ts`. `placeholder` is the level symbols joined by `/` (e.g. `CTN/PCS`); the sub-line shows the derived base qty (`= 1.200 PCS`). Single-level products fall back to `InputNumber`. `pinnedUom` takes precedence over the live `product.uomGroup.levels`.
- **Harga beli — editable.** `InputNumber :locale="locale" :min-fraction-digits="0" :max-fraction-digits="2"` in the `#editor` slot. **This is the single biggest divergence from `SalesOrderDetailsTable.vue`, where price is read-only and backend-resolved.** No price list, no price-list code chip, no "tax included" chip.
- **Disc manual** — displays the rolled-up percentage/amount and the per-unit reduction, amber-toned as in the mockup. The row expansion holds the `ManualDiscountEditor` (§4). When a line has discounts, render the mockup's yellow note row beneath it showing `DISKON MANUAL · {reason}`.
- **Remove** — trash `Button` per row → `localRows.splice(index, 1)` → `emitRows()`.

Parent↔child sync: keep SO's careful watcher discipline — never replace the rows array while `editingRows.length > 0` (it steals focus); merge field-wise instead, with a `skipNextWatch` guard.

---

## 4. Shared-component extraction: `ManualDiscountEditor`

`src/views/sales-orders/ManualDiscountEditor.vue` is already generic in behaviour — props `modelValue: ManualDiscount[]`, `disabled`, `gross`; emits `update:modelValue` — but its i18n keys are hardcoded to `salesOrders.manualDiscount.*` and `salesOrders.validation.*`.

Move it to **`src/components/discount/ManualDiscountEditor.vue`** and add a key-prefix prop:

```ts
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  gross: 0,
  i18nPrefix: 'salesOrders', // keeps existing SO call sites working untouched
})
// then: t(`${props.i18nPrefix}.manualDiscount.title`)
```

PO passes `i18n-prefix="purchaseOrders"`. Its `discountType` vocabulary is `'flat' | 'percentage'` — the backend PO contract reuses the same enum precisely so this component needs no per-module branching.

**Do this as its own verifiable step** (rollout stage 5): move the file, update the SO import, confirm Sales Order still behaves identically, *then* build PO on top of it.

---

## 5. Config page + menu move

### `ConfigsView.vue`

Add a third option. All four touch points:

```ts
const { canRead: canReadPO, canWrite: canWritePO } = usePermissions('/purchase-order-configs')

const configOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  if (canReadSO.value) options.push({ label: t('navigation.salesOrderConfigs'), value: 'so' })
  if (canReadBO.value) options.push({ label: t('navigation.bookingOrderConfigs'), value: 'bo' })
  if (canReadPO.value) options.push({ label: t('navigation.purchaseOrderConfigs'), value: 'po' })
  return options
})
```
plus a `po` branch in `canWriteActive`, in `onAddClick` (`poRef.value?.openAddDialog()`), a `poRef`, and `<PurchaseOrderConfigsView v-if="activeConfig === 'po'" ref="poRef" :embedded="true" />`.

### New views

`src/views/purchase-order-configs/PurchaseOrderConfigsView.vue` + `PurchaseOrderConfigDialog.vue`, modelled directly on `src/views/sales-order-configs/`. Same `:embedded` prop and exposed `openAddDialog()`. The dialog has two fields: Branch (`InfiniteSelect`, disabled when editing) and Approval Flow (`InfiniteSelect`, clearable — empty means this branch's POs skip approval entirely).

### Menu move (`src/components/menu/menu.ts`)

**Remove** the Config entry from the Sales group (currently ~line 214) and **add** it to the Settings group (`labelKey: 'navigation.settings'`, `pi pi-cog`, ~line 291, currently holding only Number Series), extending `permissionsAny`:

```ts
{
  label: 'Config',
  labelKey: 'navigation.configs',
  route: '/configs',
  permissionsAny: [
    PERMISSIONS.SALES_ORDER_CONFIG_READ,
    PERMISSIONS.BOOKING_ORDER_CONFIG_READ,
    PERMISSIONS.PURCHASE_ORDER_CONFIG_READ,
  ],
},
```

This is a deliberate, user-requested navigation change (master decision 5) — the page now serves three modules and no longer belongs under Sales.

---

## 6. Router + permissions

`src/router/index.ts`, four lazy routes under the `MainLayout` parent. **`:id/edit` must be declared before `:id`.**

```ts
{ path: 'purchase-orders', name: 'PurchaseOrders',
  component: () => import('@/views/purchase-orders/PurchaseOrdersView.vue'),
  meta: { requiredPermission: PERMISSIONS.PURCHASE_ORDER_READ, titleKey: 'navigation.purchaseOrders' } },
{ path: 'purchase-orders/create', name: 'PurchaseOrderCreate',
  component: () => import('@/views/purchase-orders/PurchaseOrderCreateView.vue'),
  meta: { requiredPermission: PERMISSIONS.PURCHASE_ORDER_WRITE, titleKey: 'navigation.purchaseOrders', titleAction: 'create' } },
{ path: 'purchase-orders/:id/edit', name: 'PurchaseOrderEdit', /* …WRITE, titleAction: 'edit' */ },
{ path: 'purchase-orders/:id',      name: 'PurchaseOrderDetail', /* …READ, titleAction: 'view' */ },
```

Add a `purchase-order-configs` route too, so `usePermissions('/purchase-order-configs')` resolves (mirror how `sales-order-configs` redirects into `/configs?tab=so`; PO's equivalent redirects to `/configs?tab=po`).

`src/constants/permissions.ts` — highest existing ID is 86:

```ts
PURCHASE_ORDER_READ: 87,
PURCHASE_ORDER_WRITE: 88,
PURCHASE_ORDER_CONFIG_READ: 89,
PURCHASE_ORDER_CONFIG_WRITE: 90,
```

plus entries in **both** `ROUTE_PERMISSIONS` and `ROUTE_WRITE_PERMISSIONS`, keyed by path (`'/purchase-orders'`, `'/purchase-order-configs'`).

---

## 7. Menu — Purchase Orders entry

Add to the **existing** "Purchasing" group (`menu.ts:233`, `pi pi-shopping-bag`), which the Supplier plan created for exactly this. Put the document first, master data after:

```ts
{
  label: 'Purchasing',
  labelKey: 'navigation.purchasing',
  icon: 'pi pi-shopping-bag',
  items: [
    { label: 'Purchase Orders', labelKey: 'navigation.purchaseOrders', route: '/purchase-orders' },
    { label: 'Term of Payment', labelKey: 'navigation.paymentTerms',   route: '/payment-terms' },
    { label: 'Suppliers',       labelKey: 'navigation.suppliers',      route: '/suppliers' },
  ],
},
```

---

## 8. i18n

Both `src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts` — they are currently structurally identical at 2210 lines each, and **must stay parallel**. A key present in one and missing from the other renders as a raw key string.

Add a `purchaseOrders` namespace mirroring the shape of `salesOrders` (`en-US.ts:766–905`):

```ts
purchaseOrders: {
  title, addPurchaseOrder, viewPurchaseOrder,
  codeMode: { auto, manual, assignedOnSave },
  sections: { supplier, orderDetail, items, notes },
  fields: { no, supplier, paymentTerm, orderDate, expectedDeliveryDate,
            reference, remark, branch, status, totalAmount },
  details: { title, addDetail, empty, productCode, product, uom, quantity,
             price, discount, subAmount, taxBase, tax },
  summary: { grossTotal, manualDiscount, taxBase, tax, total },
  manualDiscount: { title, reason, type, value, amount, taxBase, tax,
                    flat, percentage, add, remove },
  validation: { noRequired, supplierRequired, paymentTermRequired,
                orderDateRequired, detailsRequired, detailIncomplete /* 'Row {row}: …' */,
                branchRequired },
  status: { draft, need_approval, approved, applied },
  actions: { saveAsDraft, submitForApproval, editPurchaseOrder },
  confirm: { header, message },
  messages: { created, updated, notFound },
}
```

Also add `navigation.purchaseOrders` and `navigation.purchaseOrderConfigs`. Indonesian copy should follow the mockup's own wording where it exists ("Simpan draft", "Submit untuk approval", "Harga beli", "Disc manual", "PPN Masukan", "Catatan internal", "Referensi / kesepakatan"). **Never render "TOP"** — use "Term of Payment" / "Termin Pembayaran".

---

## 9. Tests

The repo has only six spec files and **zero Sales Order tests**, so there is no SO test to copy. Use `src/components/approval/ApprovalActionBar.spec.ts` as the mocking style guide: `vi.mock('vue-i18n')` returning an identity `t`, `vi.mock('primevue/usetoast')`, `vi.mock` on composables returning `ref`-wrapped fakes, a `globalStubs` object for PrimeVue components, and factory helpers for fixtures.

Worth covering, if tests are written at all:
- The totals computation in `PurchaseOrderForm` against the mockup's figures (pure function — extract it into a helper so it is testable without mounting).
- `ManualDiscountEditor`'s new `i18nPrefix` prop, since the extraction touches working Sales Order code.

---

## Critical files

| Path | Change |
|---|---|
| `src/types/purchaseOrder.type.ts`, `purchaseOrderConfig.type.ts` | new (+ barrel) |
| `src/services/purchaseOrder*.service.ts` | new ×4 (+ barrel) |
| `src/constants/api.ts` | +7 endpoint constants |
| `src/constants/permissions.ts` | +4 IDs, + `ROUTE_PERMISSIONS` / `ROUTE_WRITE_PERMISSIONS` entries |
| `src/views/purchase-orders/**` | new ×6 |
| `src/views/purchase-order-configs/**` | new ×2 |
| `src/components/discount/ManualDiscountEditor.vue` | **moved** from `src/views/sales-orders/`, + `i18nPrefix` prop |
| `src/views/sales-orders/SalesOrderForm.vue`, `SalesOrderDetailsTable.vue` | import path update only |
| `src/views/configs/ConfigsView.vue` | + `po` option |
| `src/components/menu/menu.ts` | Config moves Sales → Settings; + Purchase Orders under Purchasing |
| `src/router/index.ts` | +5 routes |
| `src/i18n/locales/{en-US,id-ID}.ts` | + `purchaseOrders` namespace + navigation keys |

---

## Verification

```bash
npm run type-check
npm run lint
npm run build      # includes type-check
npm run dev
```

Then, with the backend running and signed in as SUPER_ADMIN:

1. **Menu** — the Sales group no longer shows Config; **Settings** now shows Config beside Number Series; **Purchasing** shows Purchase Orders above Term of Payment and Suppliers.
2. **Config** — Settings → Config → the selector offers Purchase Order; set an approval flow for your branch and save.
3. **Create** — Purchasing → Purchase Orders → New. Number field defaults to Auto showing `PO-2026xx-000NN` with "Assigned on save"; toggling to Manual reveals an editable field.
4. **Supplier** — pick *PT Nutrifood Indonesia*; its address / NPWP / PIC line renders and Term of Payment auto-fills to NET 45 while remaining editable. No label anywhere reads "TOP".
5. **Validation** — clearing PO date or supplier blocks submit with a localized message.
6. **Lines** — add the mockup's four lines (`50/0 @ 145.000`, `30/0 @ 132.000`, `80/0 @ 58.000`, `20/0 @ 185.000`). The tiered qty input derives `= 1.200 PCS` etc. Price is directly editable — this is the visible difference from Sales Order.
7. **Discounts** — 3% with a reason on line 1, 5% on line 3. Each renders the amber `DISKON MANUAL · {reason}` note row.
8. **Totals** — the panel reads `19.550.000 / −449.500 / 19.100.500 / 2.101.055 / 21.201.555`.
9. **Persistence** — *Simpan draft*, reopen, and confirm the persisted totals match the preview exactly (server is authoritative; any mismatch is a formula bug on one side).
10. **Approval** — *Submit untuk approval* → confirm dialog → status badge reads `need_approval`, the timeline renders, and the form becomes read-only. Approve as the configured approver → `approved`. Reject another → back to `draft` and editable.
11. **Locale** — switch to Indonesian and walk the form again; no raw i18n keys appear anywhere.
12. **Permissions** — as a user without `PURCHASE_ORDER_READ`, the Purchasing group hides the entry and navigating directly to `/purchase-orders` redirects Home. With READ but not WRITE, the list renders but the New button and the submit actions are gone.
13. **Regression** — Sales Order create/edit still works, including its manual discount editor, after the component move.
