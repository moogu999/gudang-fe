# Reusable Approval Module — Frontend Plan

See the master plan at [`../../.claude/approval-module-master-plan.md`](../../.claude/approval-module-master-plan.md) for context, business rationale, and locked-in decisions, and [`../../gudang-be/.claude/approval-module-be-plan.md`](../../gudang-be/.claude/approval-module-be-plan.md) for the backend contract this depends on. This document is the frontend-specific implementation plan.

Backend endpoints must land first — frontend types are hand-written with no codegen safety net.

## 1. Types

`src/types/approval.type.ts` — `ApprovalFlow`, `ApprovalFlowTier`, `ApprovalFlowTierApprover`, `ApprovalRequest`, `ApprovalRequestTier`, `ApprovalStatus`, plus `CreateApprovalFlowDto` / `UpdateApprovalFlowDto`. Plain `type` aliases with separate Create/Update DTOs, matching `src/types/department.type.ts`.

`src/types/salesOrder.type.ts` — `SalesOrderConfig` gains `approvalFlowId: number | null`.

Every backend field must be mirrored manually here or it silently reads `undefined` rather than failing to compile.

## 2. Service and endpoints

`src/constants/api.ts` — add to the frozen object, following the existing split between `GEN_*` generic-CRUD reads and unprefixed `/v1/` business endpoints, using the function form for parameterized paths:
```ts
GEN_APPROVAL_FLOWS: '/gen/v1/approval-flows',
APPROVAL_FLOWS: '/v1/approval-flows',
APPROVAL_MODULES: '/v1/approval-modules',
APPROVAL_REQUESTS: '/v1/approval-requests',
APPROVAL_REQUESTS_PENDING_ME: '/v1/approval-requests/pending-me',
APPROVAL_REQUEST_APPROVE: (id: number) => `/v1/approval-requests/${id}/approve`,
APPROVAL_REQUEST_REJECT:  (id: number) => `/v1/approval-requests/${id}/reject`,
APPROVAL_REQUEST_CANCEL:  (id: number) => `/v1/approval-requests/${id}/cancel`,
APPROVAL_REQUEST_BY_REFERENCE: (moduleKey: string, referenceId: number) =>
  `/v1/approval-requests/by-reference/${moduleKey}/${referenceId}`,
```

`src/services/approvals.service.ts` — static class over the `ApiService` singleton, matching `src/services/departments.service.ts`. Export from the services barrel.

## 3. Admin UI — `src/views/approval-flows/`

Page-based rather than dialog-based, because the flow is a nested aggregate; follow the goods-return-notes / sales-orders shape.

- **`ApprovalFlowsView.vue`** — list via `TableComponent`, passing the bare `GEN_APPROVAL_FLOWS` url (the table fetches itself). Actions column via the `#content` scoped slot with `TableActionButtons`.
- **`ApprovalFlowCreateView.vue`** / **`ApprovalFlowDetailView.vue`** → shared **`ApprovalFlowForm.vue`**, using `@primevue/forms` `<Form>` with `zodResolver` wrapped in `computed()` so i18n messages stay reactive. Submit reads `event.states.<field>.value` — do not introduce separate refs.
- **`components/TiersTable.vue`** — the ordered tier list. Model closely on `src/views/promotions/components/DiscountTiersTable.vue`: `defineModel<TierForm[]>('tiers', { required: true })`, `addTier()` / `removeTier(index)`, and the per-row error convention where the parent passes `errors: string[]` indexed by row and the child renders `<small v-if="errors[index]">`. Reordering uses **up/down arrow buttons**, not drag — there is no drag-and-drop anywhere in this codebase, and `src/views/price-matrices/PriceMatrixPrioritiesView.vue` is the established precedent for button-based ordering.
- **`components/TierApproverPicker.vue`** — one primary slot plus up to four alternate slots (master decision #2), each an `InfiniteSelect` (`src/components/select/InfiniteSelect.vue`):
  ```vue
  <InfiniteSelect option-label="name" option-value="id"
    :fetch-fn="(q) => EmployeesService.list(q)"
    :initial-option="initialEmployee" sort-by="name" sort-operator="asc" />
  ```
  `:initial-option` is required or edit mode renders a blank select. Employees already chosen elsewhere in the same tier are disabled.

There is deliberately **no conditions UI** — flow selection belongs to the consuming module (master decision #3). The form's module dropdown is fed by `APPROVAL_MODULES` and only tags the flow.

## 4. User↔employee linking UI

Master decision #5 adds `users.employee_id`. It is populated in the **existing user management dialog** — no new view is needed, and the pattern already exists in that file.

**`src/views/users/UserDialog.vue`** gains an "Employee" field directly beside the existing Department field, which is already an `InfiniteSelect` and is the exact template to copy (`UserDialog.vue`, the `departmentId` block):
```vue
<InfiniteSelect
  id="employeeId" name="employeeId"
  option-label="name" option-value="id"
  :fetch-fn="(query) => EmployeesService.list(query)"
  :initial-option="initialEmployee"
  sort-by="name" sort-operator="asc"
  show-clear
  :disabled="mode === DialogMode.VIEW" />
```
`show-clear` matters — unlinking must be possible. The zod resolver treats it as optional/nullable. `initialEmployee` is required or edit mode renders blank. `User`, `CreateUserDto`, and `UpdateUserDto` in `src/types/user.type.ts` gain `employeeId: number | null`.

**`src/views/users/UsersView.vue`** gains an `employee.name` column (with `underlyingField: 'employeeId'`, matching how the existing `createdByUser.email` column is declared) so an admin can see at a glance which users are unlinked. This list is the practical tool for the one-time backfill of existing users.

**`src/stores/auth.ts`** stores `employeeId` from the extended `MeResponse`. Used only to show a persistent notice on the My Approvals view when the signed-in user has no linked employee — otherwise that screen is an unexplained permanent empty state.

**Eligibility is not computed here.** Whether the current user may act on a request comes from the backend as `canAct` on the request payload. `ApprovalActionBar` renders from that flag and never re-derives the pool check client-side — duplicating authorization logic in the frontend is how the two drift.

**Warn at pick time, not at deadlock time.** `TierApproverPicker` shows a warning icon next to any employee with `hasUserAccount === false`, since naming such an employee as the sole approver of a tier makes that tier unapprovable. The backend also refuses the submit outright, but catching it while configuring the flow is far kinder than at submit.

## 5. Consumer-side selection UI

The Sales Order config view (route `/configs`, backed by `SALES_ORDER_CONFIG_BY_BRANCH`) gains an "Approval flow" `InfiniteSelect` scoped to `moduleKey=sales_order` via `customFilters`, with an explicit empty option meaning "no approval required". This is the only place Sales Order's routing rule is expressed, and it lives entirely in Sales Order's own view — the pattern any future module copies.

## 6. Approver queue

`src/views/my-approvals/MyApprovalsView.vue` — `TableComponent` over `APPROVAL_REQUESTS_PENDING_ME`, with inline Approve / Reject actions. Reject requires a comment, collected via a `ConfirmationDialog` under this view's own unique `overlayGroup`. A pending count badge is surfaced on the sidebar entry in `src/components/menu/menu.ts`.

## 7. Drop-in components — `src/components/approval/`

The reusable surface any document detail view mounts:

- **`ApprovalTimeline.vue`** — props `moduleKey`, `referenceId`. Fetches `APPROVAL_REQUEST_BY_REFERENCE` and renders tiers as a PrimeVue `Timeline` showing per-tier status, actor, timestamp, and comment.
- **`ApprovalActionBar.vue`** — same props. Shows Submit / Approve / Reject / Cancel driven by the request state plus the backend-supplied `canAct` flag (see §4 — eligibility is never re-derived here).
- **`src/composables/useApproval.ts`** — shared fetch/act/refresh logic behind both; export from the composables barrel.

Mounting these two into `src/views/sales-orders/SalesOrderDetailView.vue` is the proof the abstraction holds.

## 8. Registration triple

Adding these routes means touching **three uncoupled files**, with nothing enforcing they stay in sync:
1. `src/router/index.ts` — route entries with `meta.requiredPermission` and `meta.titleKey`.
2. `src/components/menu/menu.ts` — sidebar entries (My Approvals, Approval Flows).
3. `src/constants/permissions.ts` — `ROUTE_PERMISSIONS` / `ROUTE_WRITE_PERMISSIONS` maps, which is what `usePermissions().canAccessRoute()` actually reads to filter the menu.

Plus i18n keys in **both** `src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts`.

## 9. Testing

`npm run test:unit` (vitest + jsdom). Existing tests cover only small presentational sub-components, co-located as `*.spec.ts` next to the component. Follow `src/views/audit-trails/components/AuditTrailFilters.spec.ts`: mount with `@vue/test-utils`, `vi.mock('vue-i18n')` returning an identity `t`, mock the service layer, stub `InfiniteSelect` and PrimeVue components inline under `global.stubs`.

Worth covering: `TiersTable` add/remove/reorder emissions, and `ApprovalActionBar` showing the correct action set for each request state.

## Verification

`npm run type-check`, `npm run lint`, `npm run build`, then `npm run dev` against a backend running `make run`.

The full cross-project scenario is in the master plan's **End-to-end verification** section — it exercises opt-in per branch, tier sequencing, alternate-approver equivalence, terminal rejection, and snapshot immutability across both sides.

## Critical files

- `src/types/approval.type.ts` — hand-written contract mirror; silent `undefined` if it drifts from the backend.
- `src/views/approval-flows/components/TiersTable.vue` — the nested-aggregate editor; `DiscountTiersTable.vue` is the template to copy.
- `src/components/select/InfiniteSelect.vue` — reused as-is for every employee picker; note the `initial-option` requirement.
- `src/components/approval/` — the drop-in surface; its reusability is the whole point of the initiative.
- `src/views/users/UserDialog.vue` — the only place `users.employee_id` gets populated; without it nobody can approve anything.
- `src/constants/permissions.ts` — menu visibility silently fails if the route maps are missed.
