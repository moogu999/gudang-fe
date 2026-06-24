# Frontend Plan — Per-Branch Price Matrix Priority

> Master plan: `../../.claude/BRANCH_PRICE_MATRIX_PRIORITY_PLAN.md`

## Goal

Let each **branch** have its own price-matrix priority ordering. Add a branch selector to the
existing Price Matrix Priorities page; all priority operations are scoped to the selected
branch via a `branchId` parameter on the API.

### Confirmed decisions
- Branch selector on the **existing** page (not a separate per-branch screen).
- Reuse the established branch-selection pattern (`InfiniteSelect` + `BranchesService`) from
  `views/sales-order-configs/SalesOrderConfigDialog.vue`.

## Changes

### 1. API constants — `src/constants/api.ts`
Priority endpoints now carry `branchId`. Keep the base paths; append `?branchId=` in the
service (or convert the GET/DELETE constants to functions taking `branchId`). Affected:
`PRICE_MATRIX_PRIORITIES`, `PRICE_MATRIX_PRIORITY_LIST`, `PRICE_MATRIX_PRIORITY_LIST_ITEM`,
`PRICE_MATRIX_PRIORITY`.

### 2. Service — `src/services/price-matrices.service.ts`
Add a `branchId: number` parameter to:
- `getPriorities(branchId)` — query param.
- `addToPriorityList(priceMatrixId, branchId)` — `branchId` in POST body.
- `removeFromPriorityList(priceMatrixId, branchId)` — query param.
- `movePriority(id, direction, branchId)` — `branchId` in PATCH body.

### 3. View — `src/views/price-matrices/PriceMatrixPrioritiesView.vue`
- Add a branch `InfiniteSelect` at the top (`fetch-fn` = `BranchesService.list`,
  `option-value="id"`, `option-label="name"`), mirroring `SalesOrderConfigDialog.vue`.
- Hold `selectedBranchId`. On change, call `fetchPriorities(selectedBranchId)`.
- Disable the add-matrix control and all add/move/remove actions until a branch is selected.
- Pass `selectedBranchId` into every service call (`onAdd`, `onMove`, `onRemove`).
- `fetchAllMatrices` is unchanged — matrices are global; only the ordering is per-branch.

### 4. i18n — `src/i18n/locales/en-US.ts` & `id-ID.ts`
Add a branch-selector label + placeholder (and a "select a branch first" hint) under the
`priceMatrixPriority` key in both locales.

### 5. Checks
`npm run type-check`, `npm run lint`, `npm run test:unit`.
