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

**Phase 1 done (2026-10-10, branch `dev-rian-approver-read`):** links carry `?approval=<requestId>`
(`approvalModules.ts`), `canEnterRoute` (`src/router/routeAccess.ts`) lets an approver onto
`approverReadable` routes, `/sales-orders/:id` and `/purchase-orders/:id` are marked, and the PO
page falls back to the header's lite supplier through `unlessForbidden`. The SO page needed no
fallback: its lookups are open or already tolerate failure. No backend change was needed (BE plan
F1, "Phase 1 outcome").

**Phase 2 done (2026-10-10, same branch, with gudang-be#28):** `/goods-receipts/:id`,
`/ap-invoices/:id`, `/ap-payments/:id`, `/credit-debit-notes/:id`, `/cash-deposits/:id` are
marked. Lookups checked: only the supplier master is enforced. The GR page now names the supplier
from its PO's lite supplier when the master is refused. The others only use it in a select whose
fetch failure is already silent. Known gap: a manual GR (no PO) shows no supplier name to an
approver (BE plan F1).

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

## Delivery

Each item in its own `gudang-fe` branch/PR to `main`, after its decision is recorded here.
None goes inside the open `dev-rian → main` PR (gudang-fe#13).
