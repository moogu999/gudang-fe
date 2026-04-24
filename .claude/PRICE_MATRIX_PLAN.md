# Price Matrix — Frontend Plan

## Context

Implements the Vue 3 UI for the Price Matrix feature described in the repo-root `PRICE_MATRIX_PLAN.md`. Users create a matrix (code + description), pick up to 5 criteria out of a master list (initially `company`, `branch`, `sales_organization`), then maintain many rule rows — each row is a specific combination of values + a selected price list. Blank values are wildcards.

Template to mirror: `src/views/price-lists/` — same list/create/edit/detail wrapper pattern, same reusable `Form` component, same dynamic-rows approach used for price-list items/tiers.

## File Tree

```
src/
├── views/price-matrices/
│   ├── PriceMatricesView.vue        # List page (TableComponent)
│   ├── PriceMatrixCreateView.vue    # Wrapper → PriceMatrixForm (mode=create)
│   ├── PriceMatrixEditView.vue      # Wrapper → fetch + PriceMatrixForm (mode=edit)
│   ├── PriceMatrixDetailView.vue    # Wrapper → fetch + PriceMatrixForm (mode=view)
│   └── PriceMatrixForm.vue          # Reusable form (create/edit/view)
├── services/price-matrices.service.ts
├── services/criteria-types.service.ts
├── types/price-matrix.type.ts
└── types/criteria-type.type.ts
```

## Types (`src/types/price-matrix.type.ts`)

```ts
export type CriteriaType = {
  id: number
  code: 'company' | 'branch' | 'sales_organization' | string
  label: string
  sourceTable: string
}

export type PriceMatrixCriterion = {
  criteriaTypeId: number
  code?: string        // from server on read
  position: number     // 1..5
}

export type PriceMatrixRuleValue = {
  criteriaTypeId: number
  valueId: number | null   // null = wildcard
  // optional display-only fields populated on read / when user picks
  valueLabel?: string
}

export type PriceMatrixRule = {
  id?: number
  priceListId: number
  priceListLabel?: string
  values: PriceMatrixRuleValue[]
}

export type PriceMatrix = {
  id: number
  code: string
  description: string | null
  criteria: PriceMatrixCriterion[]
  rules: PriceMatrixRule[]
  createdAt: string
  updatedAt: string | null
}

export type PriceMatrixSummary = Pick<PriceMatrix, 'id' | 'code' | 'description' | 'createdAt'>

export type CreatePriceMatrixDto = {
  code: string
  description?: string | null
  criteria: { criteriaTypeId: number; position: number }[]
  rules: {
    priceListId: number
    values: { criteriaTypeId: number; valueId: number | null }[]
  }[]
}

export type UpdatePriceMatrixDto = CreatePriceMatrixDto
```

### Zod schemas (same file or `src/schemas/price-matrix.schema.ts`)

```ts
export const PriceMatrixCriterionSchema = z.object({
  criteriaTypeId: z.number().int().positive(),
  position: z.number().int().min(1).max(5),
})

export const PriceMatrixRuleValueSchema = z.object({
  criteriaTypeId: z.number().int().positive(),
  valueId: z.number().int().positive().nullable(),
})

export const PriceMatrixRuleSchema = z.object({
  priceListId: z.number().int().positive(),
  values: z.array(PriceMatrixRuleValueSchema),
})

export const PriceMatrixFormSchema = z.object({
  code: z.string().min(1).max(64),
  description: z.string().max(255).nullable().optional(),
  criteria: z.array(PriceMatrixCriterionSchema).min(1).max(5),
  rules: z.array(PriceMatrixRuleSchema).min(1),
})
```

Cross-field validation (duplicate combinations, wildcard semantics) is enforced in the form via a `refine()` or a dedicated composable so the user sees inline toasts before submit.

## Services

`src/services/price-matrices.service.ts` — static class mirroring `PriceListsService`:

```ts
static list(qs?: string): Promise<Base<PriceMatrixSummary>>
static getById(id: number): Promise<PriceMatrix>
static create(dto: CreatePriceMatrixDto): Promise<PriceMatrix>
static update(id: number, dto: UpdatePriceMatrixDto): Promise<PriceMatrix>
static delete(id: number): Promise<void>
```

`src/services/criteria-types.service.ts` — `list()` only (reads from `/gen/v1/criteria-types`).

## API Constants (`src/constants/api.ts`)

```ts
GEN_CRITERIA_TYPES: '/gen/v1/criteria-types',
GEN_PRICE_MATRICES: '/gen/v1/price-matrices',
PRICE_MATRICES:     '/v1/price-matrices',
```

## Router Entries (`src/router/index.ts`)

```ts
{ path: 'price-matrices',            component: () => import('@/views/price-matrices/PriceMatricesView.vue'),      meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_READ } },
{ path: 'price-matrices/create',     component: () => import('@/views/price-matrices/PriceMatrixCreateView.vue'),  meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_WRITE } },
{ path: 'price-matrices/:id',        component: () => import('@/views/price-matrices/PriceMatrixDetailView.vue'),  meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_READ } },
{ path: 'price-matrices/:id/edit',   component: () => import('@/views/price-matrices/PriceMatrixEditView.vue'),    meta: { requiredPermission: PERMISSIONS.PRICE_MATRIX_WRITE } },
```

Add `PRICE_MATRIX_READ` / `PRICE_MATRIX_WRITE` to `src/constants/permissions.ts` matching the BE codes (`price_matrix.read`, `price_matrix.write`). Add sidebar entry following `price-lists`.

## `PriceMatrixForm.vue` — Component Spec

### Props

```ts
defineProps<{
  mode: 'create' | 'edit' | 'view'
  initial?: PriceMatrix       // required for edit/view
}>()
```

### Reactive state (shape)

```ts
const criteriaTypes = ref<CriteriaType[]>([])   // loaded once at mount via CriteriaTypesService
const form = reactive({
  code: '',
  description: '',
  criteria: [] as PriceMatrixCriterion[],       // user picks here
  rules: [] as PriceMatrixRule[],
})
```

### UI structure

1. **Header card**
   - `InputText` for `code` (disabled in edit mode? — follow price-list behavior: editable on edit, not on view)
   - `Textarea` for `description`

2. **Criteria picker card**
   - `MultiSelect` (PrimeVue) bound to `criteriaTypes` labelling, value = `criteriaTypeId`.
   - Max 5 enforced via `:selectionLimit="5"`.
   - On change: reconcile `form.criteria` (preserve position ordering) AND reconcile every row in `form.rules` → each row's `values` must have exactly one entry per selected criterion; missing entries added with `valueId: null`, removed criterion values pruned.
   - Optional: drag-to-reorder the chosen criteria (updates `position`). Use PrimeVue `OrderList` or keep simple up/down arrow buttons.

3. **Rules table card** (the meat)
   - Render a `DataTable` whose columns are **dynamically derived from** `form.criteria`:
     - One column per selected criterion. Header = criterion label. Cell = an `InfiniteSelect` pre-configured per `criteriaType.code`:
       - `company`              → `CompaniesService.list`
       - `branch`               → `BranchesService.list`
       - `sales_organization`   → `SalesOrganizationsService.list`
       - Unknown code → fall back to a generic lookup that queries `/gen/v1/{sourceTable}` (future-proof for new criteria types).
     - Value `null` = wildcard; the `InfiniteSelect` shows a "— Any —" option at the top that sets `valueId` to `null`.
     - Final column: `InfiniteSelect` bound to `PriceListsService.list` for `priceListId`.
     - Trailing action column: remove button (disabled in view mode).
   - Toolbar: "Add rule" button appends a new `PriceMatrixRule` with `valueId: null` for every selected criterion and `priceListId` unset.
   - Pre-populate display labels (`valueLabel`, `priceListLabel`) from `initial` data when loading edit/view so the `InfiniteSelect` shows the saved value immediately (pattern used in `PriceListForm.vue` via `_initial*` refs).

4. **Footer**
   - Save / Cancel buttons (Save hidden in view mode).
   - On Save:
     - Client-side validation (Zod).
     - Duplicate-combination check: compute a stable string key `crits.map(c => \`${c.criteriaTypeId}:${v.valueId ?? ''}\`).sort().join('|')` per rule; if Set size < rules.length, toast error and highlight offenders.
     - Call `create`/`update`, toast on success, router.push to list.

### Mode Behavior

- `create`: empty form.
- `edit`: fetch initial data in the wrapper view, pass as `initial`, hydrate `form` + `_initial*` display labels.
- `view`: same as edit but all inputs `:disabled="true"`, action buttons hidden.

## List View (`PriceMatricesView.vue`)

- `TableComponent` against `PriceMatricesService.list`.
- Columns: `code`, `description`, `createdAt`, actions (view / edit / delete).
- Follow `PriceListsView.vue` verbatim for toolbar, filters, `useConfirmDelete`, and refresh-after-delete pattern.

## i18n

Add keys under `priceMatrix.*` in both `src/i18n/en-US.ts` and `src/i18n/id-ID.ts`:

```
priceMatrix.title, priceMatrix.code, priceMatrix.description,
priceMatrix.criteria, priceMatrix.addCriterion, priceMatrix.rules,
priceMatrix.addRule, priceMatrix.wildcard, priceMatrix.priceList,
priceMatrix.errors.duplicateCombination,
priceMatrix.errors.tooManyCriteria,
priceMatrix.errors.missingValue
```

## Verification

- `npm run type-check` — clean.
- `npm run lint` — clean.
- `npm run test:unit` — add a small test for the combination-dedup helper (pure function).
- Browser smoke test (BE running on `:8080`):
  1. Log in, navigate to `/price-matrices`.
  2. Create: enter code + description, pick company + branch, add two rules (one fully specified, one with branch wildcard), assign price lists, save → redirect to list, row visible.
  3. Edit: remove a criterion → confirm existing rows prune their value for that criterion automatically; add a new rule that duplicates an existing combination → expect inline error toast.
  4. View: all controls disabled, data renders exactly as saved.
  5. Delete from list with confirmation.
- Responsive check: criteria picker + rules table usable at 640px width (the rules table will need horizontal scroll — that's acceptable).

## Files to Read First (templates)

- `src/views/price-lists/PriceListForm.vue` — the dynamic-rows / nested-table / mode-switching reference. **Read this first.**
- `src/views/price-lists/PriceListsView.vue`, `PriceListCreateView.vue`, `PriceListEditView.vue`, `PriceListDetailView.vue`
- `src/services/price-lists.service.ts`
- `src/types/price-list.ts`
- `src/constants/api.ts`, `src/constants/permissions.ts`
- `src/router/index.ts`
- `src/components/InfiniteSelect.vue` (the dropdown used for FK fields)
- `.claude/CLAUDE.md` — frontend conventions
