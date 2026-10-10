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
| F1 | Approver's "Tinjau" link bounces to Home | access design (with BE) | **yes** |
| F2 | A denied route silently redirects to Home | UX bug | no |
| F5 | Bonus items are not a separate zero-priced line | requirement mismatch | **yes** |
| F7 | "Konfigurasi PO" means the Sales Order config | label | no |
| F8 | GR form ignores the PO's branch | bug (with BE) | **yes** |

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

**Depends on the BE F1 decision:**

- **Permissions only (BE option 1):** no FE change, beyond F2 explaining the denial.
- **Approver-scoped read (BE option 2):** the route guard must also let through a user who is
  an approver of that document. For example, Persetujuan Saya passes `?approval=<requestId>`,
  and the guard (or the page) checks the request instead of the module permission. The page must
  then tolerate lookups it cannot load (show the lite supplier from the header instead of
  failing when `GET /v1/suppliers/{id}` is refused).

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

**Decision needed:**

1. **Current UI is acceptable:** update the SIT expectation. No code.
2. **Render bonuses as rows:** after their parent line, read-only, price 0, marked "Bonus" with
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
Once BE F8 is decided: either set the receipt's branch from the chosen PO (and lock it), or
filter the PO picker to the receipt's branch. Coordinate with Item 1 of
`goods-receipt-branch-warehouse-fe.md`, since the branch also filters the warehouse list.

---

## Delivery

Each item in its own `gudang-fe` branch/PR to `main`, after its decision is recorded here.
None goes inside the open `dev-rian → main` PR (gudang-fe#13).
