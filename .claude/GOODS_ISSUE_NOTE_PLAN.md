# Goods Issue Note (Bukti Keluar Barang) — Frontend Plan

> Master plan: [`../../.claude/GOODS_ISSUE_NOTE_PLAN.md`](../../.claude/GOODS_ISSUE_NOTE_PLAN.md)

## Context

Add a **Goods Issue Note (GIN)** feature: list, create (single-step submit), and read-only detail.
A GIN is created from an `open` Picking List; submitting it moves stock and locks the upstream chain
on the backend. There is no draft/edit/delete. Mirror the existing `delivery-notes` feature (PrimeVue
+ static service classes + i18n + permission-guarded routes).

## Backend contract

- `GET /v1/goods-issue-notes` → `Base<GoodsIssueNoteListItem>`
- `GET /v1/goods-issue-notes/{id}` → `GoodsIssueNoteDetail`
- `POST /v1/goods-issue-notes` body `{ pickingListId, issueDate?, notes? }` → created GIN
- `GET /v1/goods-issue-notes/available-picking-lists` → `Base<AvailablePickingList>`
- Permissions: `GOODS_ISSUE_NOTE_READ = 71`, `GOODS_ISSUE_NOTE_WRITE = 72`
- Quantities are JSON strings (decimal).

## Files

### Types — `src/types/goodsIssueNote.type.ts` (+ export in `src/types/index.ts`)
```ts
export type GoodsIssueNoteStatus = 'issued' | 'cancelled'

export interface GoodsIssueNoteListItem {
  id: number; no: string
  pickingListNo: string; deliveryNoteNo: string
  status: GoodsIssueNoteStatus; createdAt: string
}
export interface GoodsIssueNoteItem {
  productId: number; productCode: string; productName: string
  warehouseName: string; quantity: string
  pinnedUom: PinnedUom | null; labelName: string | null; labelValue: string | null
}
export interface GoodsIssueNoteDetail {
  id: number; no: string; status: GoodsIssueNoteStatus; issueDate: string; notes: string | null
  pickingListId: number; pickingListNo: string
  deliveryNoteId: number; deliveryNoteNo: string
  createdAt: string; createdBy: number; items: GoodsIssueNoteItem[]
}
export interface CreateGoodsIssueNoteRequest { pickingListId: number; issueDate?: string; notes?: string | null }
export interface AvailablePickingList { id: number; no: string; deliveryNoteNo: string; itemCount: number; totalQty: string }
```

### API constants — `src/constants/api.ts`
```ts
GOODS_ISSUE_NOTES: '/v1/goods-issue-notes',
GOODS_ISSUE_NOTE_BY_ID: (id: number) => `/v1/goods-issue-notes/${id}`,
GOODS_ISSUE_NOTE_AVAILABLE_PLS: '/v1/goods-issue-notes/available-picking-lists',
```

### Service — `src/services/goodsIssueNotes.service.ts` (+ export in `src/services/index.ts`)
Static class mirroring `deliveryNotes.service.ts`: `list(queryString?)`, `get(id)`,
`create(payload)`, `listAvailablePickingLists(queryString?)`.

### Views — `src/views/goods-issue-notes/`
- **`GoodsIssueNotesView.vue`** — list (DataTable: `no`, `pickingListNo`, `deliveryNoteNo`, `createdAt`,
  status `Tag`), server pagination, "Create" toolbar button, view action → detail.
- **`GoodsIssueNoteCreateView.vue`** — select an available Picking List (`InfiniteSelect` backed by
  `available-picking-lists`); on select, fetch the PL detail and render the item table with the
  **On Hand → In Transit** movement chips from the mockup, plus an issue-date `DatePicker` and notes
  `Textarea`. Single **Submit** button → `ConfirmationDialog` ("stock will move into In Transit, cannot
  be undone") → `GoodsIssueNotesService.create({ pickingListId, issueDate, notes })` → success toast →
  `router.push` to the detail view.
- **`GoodsIssueNoteDetailView.vue`** — read-only header (`no`, status tag, `issueDate`, linked
  `pickingListNo` + `deliveryNoteNo`) + items table + a "stock issued" success banner. No cancel/edit.

### Router — `src/router/index.ts`
```ts
{ path: 'goods-issue-notes', name: 'GoodsIssueNotes', component: () => import('@/views/goods-issue-notes/GoodsIssueNotesView.vue'), meta: { requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_READ } },
{ path: 'goods-issue-notes/create', name: 'GoodsIssueNoteCreate', component: () => import('@/views/goods-issue-notes/GoodsIssueNoteCreateView.vue'), meta: { requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_WRITE } },
{ path: 'goods-issue-notes/:id', name: 'GoodsIssueNoteDetail', component: () => import('@/views/goods-issue-notes/GoodsIssueNoteDetailView.vue'), meta: { requiredPermission: PERMISSIONS.GOODS_ISSUE_NOTE_READ } },
```

### Menu — `src/components/menu/menu.ts`
Add `{ label: 'Goods Issue Notes', labelKey: 'navigation.goodsIssueNotes', route: '/goods-issue-notes' }`
near Delivery Notes & Picking Lists.

### Permissions — `src/constants/permissions.ts`
`GOODS_ISSUE_NOTE_READ: 71`, `GOODS_ISSUE_NOTE_WRITE: 72`.

### i18n — `src/i18n/locales/en-US.ts` + `id-ID.ts`
`goodsIssueNotes.*` (title, fields, `status.{issued,cancelled}`, actions, confirm/submit/success
messages) and `navigation.goodsIssueNotes`.

## Reuse
`ResponsiveCard`, `Tag` status-severity helper (`issued → success`, `cancelled → danger`),
`ConfirmationDialog`, toast helpers (`commonSuccessToast`/`commonErrorToast`), `InfiniteSelect`,
the UOM/quantity formatting helpers used by the Picking List detail view.

## Test (Vitest)
Small spec for the status-severity / movement-chip helper, mirroring existing `*.spec.ts` patterns.

## Verification
`npm run type-check && npm run test:unit && npm run lint`, then `npm run dev`: Goods Issue Notes →
Create → pick an `open` PL → see movement chips → Submit → confirm → success → detail. Confirm the PL
shows `closed` and the DN shows `applied` with its Cancel action hidden/disabled.
