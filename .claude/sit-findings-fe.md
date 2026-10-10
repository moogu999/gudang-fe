# SIT Findings — Frontend Backlog

Status: **planned, not started.** SIT findings (2026-10-10) that are not covered by a
dedicated plan. Each item is independent; implement and ship them separately.
Backend counterparts are in `gudang-be/.claude/sit-findings-be.md`.

Related plans already written, not repeated here:

- `goods-receipt-branch-warehouse-fe.md`: GR warehouse vs branch (Item 1), inactive suppliers
  on a new PO (Item 2).
- `promotion-post-save-redirect-fe.md`: back to `/promotions` after saving.

| # | Finding | Kind | Needs a decision first? |
|---|---|---|---|
| F1 | Approver's "Tinjau" link bounces to Home | access design (with BE) | **decided**: automatic approver access |
| F2 | A denied route silently redirects to Home | UX bug | no |
| F5 | Bonus items are not a separate zero-priced line | requirement mismatch | **decided**: render as rows |
| F7 | "Konfigurasi PO" means the Sales Order config | label | no |
| F8 | GR form ignores the PO's branch | bug (with BE) | **decided**: receipt must be on the PO's branch |
| F10 | A failed save still burns a document number | bug (FE) | no |

F3, F4, F6 and F9 are backend-only; see the BE plan.

---

## F1 — The approver's "Tinjau" link bounces to Home

**Found in:** SIT-02-A03, after gudang-fe#14 added links in Persetujuan Saya
(`src/constants/approvalModules.ts`).

**Today:** each document page declares its module's read permission
(`/purchase-orders/:id` → `PURCHASE_ORDER_READ`, `/sales-orders/:id` → `SALES_ORDER_READ`, …).
The guard sends a user without it to Home **before any request**, so an approver role with only
`APPROVAL_REQUEST_READ` + `APPROVAL_ACT` cannot open what it reviews. Once inside, the page's own
lookups need more (the PO page needs `SUPPLIER_READ`, see BE plan F1).

**Decision (2026-10-10): approvers get read access automatically** (BE plan F1, option 2).
The backend is the authority: it serves a document to its approvers. The frontend only has to
stop blocking the page and cope with what the approver cannot see.

### Design

1. **Links carry the request.** `ApprovalModuleEntry.link` becomes
   `(referenceId, requestId) => string` and appends `?approval=<requestId>`
   (e.g. `/purchase-orders/1?approval=12`). `MyApprovalsView` passes `data.id`. Update
   `approvalModules.spec.ts`.
2. **Route guard** (`src/router/index.ts`, the `requiredPermission` check at `:1434`): let the
   route through when it lacks the permission **but** `to.query.approval` is set and the user holds
   `APPROVAL_REQUEST_READ` or `APPROVAL_ACT`. This is safe because the guard is not the security
   boundary: the backend still answers 404 for a document the user does not approve. Only
   **detail** routes (`/:id`, not `/:id/edit`, not lists) qualify. Mark them with
   `meta.approverReadable: true` instead of matching paths.
3. **Detail pages tolerate refused lookups.** On a page opened with `?approval=`:
   - the main document load (header + details) must succeed;
   - secondary lookups (`SuppliersService.get`, employee, branch, config, …) that fail with 403
     fall back to the lite data embedded in the header (e.g. supplier code/name) instead of
     failing the whole load. `PurchaseOrderForm.vue:709` is the first case.
   - the page is read-only (it already is in VIEW mode), and Edit/back-to-list actions that would
     lead to a list the approver cannot read are hidden.
4. **Phasing follows the BE plan:** purchase order and sales order first, then the other five
   modules, one page each.

### Tests

- Guard spec: an approver-readable route opens without the module permission when `?approval=` is
  set and the user has an approval permission. It still redirects without `?approval=`, and for
  `/:id/edit`.
- `approvalModules.spec.ts`: every link carries the request id.
- PO detail view spec: a 403 from `SuppliersService.get` still renders the PO with the header's
  supplier name.

---

## F2 — A denied route silently redirects to Home

**Today:** `src/router/index.ts:1435`: `next({ name: 'Home' })` when the user lacks the route's
`requiredPermission`. No message, so the user thinks the link is broken (as in F1).

**Fix:** keep the redirect, and tell the user why: show a toast ("Anda tidak memiliki akses ke
halaman ini.", new key in `en-US.ts` and `id-ID.ts`), e.g. by passing `query: { denied: to.path }`
to Home and toasting there, or by a router-level notice. Alternatively, a dedicated 403 page.

**Tests:** guard spec: a route without the permission resolves to Home **and** carries the denial
marker. A permitted route is unaffected.

---

## F5 — Bonus items are not a separate zero-priced line

**Found in:** SIT-01-C04, which expects "Barang bonus muncul sebagai baris terpisah berharga nol".

**Today:** a promotion bonus is stored in `sales_order_detail_bonuses` / `…_header_bonuses`
(its own rows, no price), and shown inside the parent line's expansion, under "Item Bonus"
(`src/views/sales-orders/SalesOrderDetailsTable.vue:293`). It is not a line of the table.

**Decision (2026-10-10): option 2, render bonuses as rows.**

1. ~~**Current UI is acceptable:** update the SIT expectation. No code.~~ Rejected.
2. **Render bonuses as rows (chosen):** after their parent line, read-only, price 0, marked "Bonus" with
   the promotion code. Display only: they stay bonus records, not order lines, so totals and
   the payload do not change.

---

## F7 — "Konfigurasi PO" means the Sales Order config

**Found in:** SIT-02 preparation. The approver flow was looked for in the wrong dialog.

**Today:** `src/i18n/locales/id-ID.ts:129`: `salesOrderConfigs: 'Konfigurasi PO'`, next to
`purchaseOrderConfigs: 'Konfigurasi PO Pembelian'` (`:88`). In this codebase "PO" means a
purchase order. en-US already says "SO Config" / "PO Config".

**Fix:** rename `navigation.salesOrderConfigs` (id-ID) to "Konfigurasi Pesanan Penjualan", and
`purchaseOrderConfigs` to "Konfigurasi Purchase Order", to match the menu names. Check the other
id-ID strings that say "PO" for a sales order (`salesOrderConfigs: {` section, `:2583`).

---

## F8 — Goods receipt form ignores the PO's branch

FE half of BE plan F8. `AvailablePurchaseOrder.branchId` (`src/types/goodsReceipt.type.ts:78`)
arrives but `onPoSelect` (`src/views/goods-receipts/GoodsReceiptForm.vue:537`) does not use it.
**Decision (2026-10-10): a receipt must be on its PO's branch** (BE plan F8).

**Seen in SIT-02-B01 (2026-10-10):** with Branch = BT 001, the PO picker offered
PO-202610-00003 (BT 001) **and** PO-202610-00002 (BT 002). It correctly left out
PO-202610-00001 (`applied`), so only the branch filter is missing.

**FE design:** the receipt's branch is the one input that drives the rest. It reuses the
`effectiveBranchId` from Item 1 of `goods-receipt-branch-warehouse-fe.md`, so build both together.

1. The PO picker (`GoodsReceiptsService.listAvailablePurchaseOrders`) passes
   `branchId=effectiveBranchId`, so only that branch's POs are offered. It is disabled until a
   branch is known, like the warehouse select.
2. Changing the branch clears the selected PO (and its seeded lines), as it clears the warehouse.
3. `onPoSelect` keeps working as today. A PO from another branch can no longer be picked, and
   the backend rejects one anyway (`ErrPurchaseOrderBranchMismatch`).

**Tests:** the PO fetch carries the effective branch. A branch change clears the PO and its lines.

---

## F10 — A failed save still burns a document number

**Found in:** SIT-02-B01 (2026-10-10 13:53). Two attempts to save a goods receipt in **auto**
numbering mode failed (warehouse/branch mismatch, 400), and each still consumed a GR number:
`POST /v1/number-series/37/next` → 200, then `POST /v1/goods-receipts` → 400, twice.

**Over the whole SIT-02-B run (2026-10-10), five GR numbers were burned this way:**

| Burned | Failed save (400) | Next successful receipt |
|---|---|---|
| GR-202610-00023, -00024 | 13:53:51, 13:53:55 | GR-202610-00025 (B02–B04) |
| GR-202610-00026 | 14:21:29 | GR-202610-00027 (B07) |
| GR-202610-00028, -00029 | 14:25:51, 14:25:56 | GR-202610-00030 (B06) |

The 13:53 failures were the warehouse/branch mismatch (P1). The causes of the 14:21 and 14:25
ones were not captured: the API logs the status, not the body. Whatever the cause, no number
should have been spent on them.

**Not the same as** "a draft consumes a number" (memory `draft-consumes-number-series`, decided
2026-07-26): a **saved** draft keeps its number on purpose. The problem is a save that **never
happened** leaving a gap.

**Today:** `src/composables/useNumberSeries.ts` `generateCode()` calls
`NumberSeriesService.generateNext` (which increments the series) **before** the form sends its
create request. 15 forms use it: AP invoice, AP payment, AR clearing, bank settlement, cash
deposit, credit/debit note, customer, giro clearing, giro receipt, goods receipt, product,
purchase order, sales order, sales team, supplier.

**The backend already numbers itself:** for goods receipt, purchase order, sales order, AP
invoice, AP payment, credit/debit note and cash deposit, `create_<module>.go` generates the number
when `no` is empty. For the goods receipt this happens **after** branch and warehouse validation
(`create_goods_receipt.go:52`), so today's failure would not have consumed anything.

**Fix:**

1. In **auto** mode, send `no` empty and let the backend assign it. Keep showing the
   `preview(...)` value ("assigned on save") as now, and read the real number from the create
   response.
2. Forms whose backend does **not** number by itself yet (customer, product, supplier, sales
   team, AR clearing, bank settlement, giro, …): either add the same server-side step (BE), or,
   until then, keep `generateNext` but only call it right before a create request that has
   passed client validation. That narrows the gap without closing it.
3. Manual mode is unchanged (the user types the number).

**Open point (BE):** server-side numbering runs before the create transaction in some modules
(goods receipt: after validation, outside `WithTransaction`), so a failure *inside* the
transaction can still leave a gap. Moving the series increment into the same transaction would
make it gap-free. Decide whether gap-free numbering is a requirement (tax invoices often are).

**Tests:** for a form in auto mode, a failed create makes no `generateNext` call, and the
payload carries an empty `no`. A successful create shows the number from the response.

---

## Delivery

Each item in its own `gudang-fe` branch/PR to `main`, after its decision is recorded here.
None goes inside the open `dev-rian → main` PR (gudang-fe#13).
