# Frontend Plan: Integrate Salesman with Sales Orders

See `../../.claude/SALESMAN_SALES_ORDER_PLAN.md` (repo root) for full context. Summary: the
sales order create form gains a **required** salesman dropdown, scoped to the logged-in
user's branches and to "Salesman"-type employees. The chosen `employeeId` is sent on both
the pricing-preview (`/resolve`) and create calls; the backend snapshots and validates it.

## 1. API + types
- `src/constants/api.ts`: salesmen reuse the existing `EMPLOYEES` endpoint with
  `employeeTypeId` + branch filters. Add a `SALESMEN` constant **only if** the dedicated
  backend endpoint is chosen (see §2 branch-scoping note).
- `src/types/sales-order.type.ts` (+ the create/resolve DTOs): add `employeeId: number` to
  the create payload and the resolve payload; add `employeeId`, `branchId`,
  `salesOrganizationId`, `companyId` to the SalesOrder response type.
- `MeResponse` type: add `branchIds: number[]`. Surface it via the auth store
  (`src/stores/auth.ts` already stores `userId`/`permissions` — add `branchIds`, populated
  from the `/me` fetch in sign-in and init).

## 2. Salesman dropdown — `src/views/sales-orders/SalesOrderForm.vue`
Add an `InfiniteSelect` bound to `employeeId`, mirroring the existing `customerId` control:
```vue
<InfiniteSelect id="employeeId" name="employeeId"
  option-label="name" option-value="id"
  :fetch-fn="(q) => EmployeesService.list(buildSalesmanQuery(q))"
  :initial-option="initialSalesman"
  :disabled="mode === DialogMode.VIEW" sort-by="name" sort-operator="asc" />
```
- `buildSalesmanQuery` injects `employeeTypeId = <Salesman type id>` plus branch scoping.
  - **Salesman type id**: fetch employee types once (existing `EMPLOYEE_TYPES` endpoint /
    `employeeTypes.service.ts`) and find `name === 'Salesman'`.
  - **Branch scoping**: the employee list filter takes a single `branchId`, but a user may
    have multiple branches (auth store `branchIds`). Options:
    - (a) extend the employee search to accept multiple branch IDs, or
    - (b) **recommended** — add a dedicated backend salesmen endpoint scoped to the current
      user, so the rule lives server-side and the dropdown stays trivial. Decide jointly
      with backend §6.
- Add `employeeId` to the Zod resolver as **required**.
- Optionally render read-only branch / sales-org text from the selected salesman row
  (employee list rows already include `branch` and `salesOrganization` objects).

## 3. Submit + resolve wiring
- Include `employeeId` in **both** the resolve preview request and the create request (the
  form already calls `/resolve` for pricing — add the field to both bodies).
- In VIEW mode, display the stored salesman via `initialSalesman`, fetched by
  `response.employeeId`.

## 4. i18n
- Add `salesman` / `salesOrganization` labels to the sales-order locale files used by the form.

## Verification
1. `npm run dev`, open the sales order create form.
2. Salesman dropdown lists only Salesman-type employees within the logged-in user's
   branches; selecting one updates the pricing preview.
3. Submitting persists the salesman; reopening the order in VIEW mode shows it.
4. `npm run type-check` and `npm run lint`.
