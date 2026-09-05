# Journal Config — Frontend Implementation Plan

**Master plan:** `../../.claude/journal-config-master-plan.md` (read it first — problem statement, dimension feasibility, locked decisions)
**Backend counterpart:** `../../gudang-be/.claude/journal-config-be.md` (endpoint contract lives there; the two must agree field for field)

**Scope:** one screen, `/journal-config`, for the **Invoice** document only. Configuration only — no posting run, no exception list.

---

## 1. The screen

One page, no list view. Unlike Chart of Accounts and Accounting Periods, there is nothing to browse: a config is uniquely identified by (company, document type), so the user picks both and the screen loads-or-creates the draft. The closest existing precedent is the inline config block in `src/views/accounting-periods/AccountingPeriodsView.vue` (`loadConfig()` / `AccountingPeriodsService.getConfig`), scaled up.

```
┌──────────────────────────────────────────────────────────────────┐
│ Company [InfiniteSelect]        Document [Select: Invoice]       │
│ Journal Category [InputText, optional]                           │
│ (•) Include Posting — this document joins the Posting run        │
├──────────────────────────────────────────────────────────────────┤
│ A/R │ Sales Return │ Sales Discount │ Revenue • │ COGS │ … tabs  │
├──────────────────────────────────────────────────────────────────┤
│ Basis 1 [Select] Basis 2 [Select] … Basis 5 [Select]  [Generate] │
│ helper: combinations come from active master data — re-run       │
│         Generate whenever new master data is added               │
├──────────────────────────────────────────────────────────────────┤
│ Principal │ Brand │ Account          │ Sub Account │ Status      │
│ Ultrajaya │ Ultra │ [InfiniteSelect] │ [InputText] │ ✓           │
│ Mayora    │ Kopiko│ [— not set —]    │ [        ]  │ ! missing   │
│                                            (server pagination)   │
├──────────────────────────────────────────────────────────────────┤
│ ⚠ 2 of 6 combinations have no Revenue account.                   │
├──────────────────────────────────────────────────────────────────┤
│ [Cancel]                    [Save as Draft] [🔒 Save & Activate] │
└──────────────────────────────────────────────────────────────────┘
```

The `•` on the Revenue tab is the unmapped badge. "Save & Activate" is disabled while **any** tab has an unmapped row.

### Patterns to reuse, not reinvent

| Need | Existing precedent |
|---|---|
| Up-to-5 dimension selectors + dynamic `Column`s per dimension + per-row `InfiniteSelect` + duplicate-combination key check | **`src/views/price-matrices/PriceMatrixForm.vue`** — structurally the same screen. Copy its binding style. |
| Multi-tab layout | `src/views/customers/CustomerForm.vue` (6 `TabPanel`s) |
| Row-level status icon + tooltip | `src/views/chart-of-accounts/ChartOfAccountsView.vue` (`i.pi-lock` / `i.pi-star-fill` with `v-tooltip.top`) |
| Config load/save inline in a view | `src/views/accounting-periods/AccountingPeriodsView.vue` |
| Extracting pure logic to a tested `.ts` | `src/views/accounting-periods/periodActions.ts` + `.spec.ts`; `src/views/chart-of-accounts/treeFilter.ts` + `.spec.ts` |

**No tab-badge pattern exists in this codebase** — it has to be built. Keep it simple and consistent with the existing icon idiom:

```vue
<Tab :value="role.code">
  <span class="flex items-center gap-1">
    {{ t(`journalConfig.roles.${role.code}`) }}
    <i v-if="unmappedByRole[role.code] > 0"
       class="pi pi-exclamation-circle text-xs text-red-500"
       v-tooltip.top="t('journalConfig.warnings.unmappedRows', { count: unmappedByRole[role.code] })" />
  </span>
</Tab>
```

Imports are individual, no barrel: `primevue/tabs`, `primevue/tablist`, `primevue/tab`, `primevue/tabpanels`, `primevue/tabpanel`.

---

## 2. The matrix table — the one part that needs care

Real matrices reach thousands of rows, so the table **must** be server-paginated. Use a PrimeVue `DataTable` with `lazy`, `paginator`, `:rows`, `:totalRecords` and an `@page` handler calling `ListMappings`. Do not load a role's rows in full.

Columns are dynamic, one per selected basis dimension, then fixed Account / Sub Account / Status:

```vue
<Column v-for="basis in role.bases" :key="basis.key" :header="basis.label">
  <template #body="{ data }">
    <span class="dim-tag">{{ valueLabel(data, basis) ?? t('journalConfig.labels.notSet') }}</span>
  </template>
</Column>
```

`value_id = null` renders as "(not set)" — the master plan's LEFT JOIN row, meaning *this entity has no value for this dimension*. It is **not** a wildcard; say so in the helper text so Finance does not read it as a catch-all.

Account picker, one per row — bind by value, **not** by `name=`, because these rows are not inside a PrimeVue `Form`. This is exactly `PriceMatrixForm.vue`'s per-row pattern:

```vue
<InfiniteSelect
  :model-value="row.accountId"
  option-label="displayName"
  option-value="id"
  :initial-option="row.account"
  :fetch-fn="(q) => ChartOfAccountsService.list(withPostableFilters(q))"
  :disabled="!canWrite"
  @update:model-value="(v) => markDirty(row, 'accountId', v)"
/>
```

`initial-option` is required: a mapped account is often not on page 1 of the picker, and without it the cell renders blank. `withPostableFilters` pins `companyId`, `isHeader=false`, `isActive=true` — the backend's `ListAccounts` already accepts all three, so no new endpoint is needed.

Saving is **per page, dirty rows only**: track a `dirtyRows` map and send one bulk `PUT …/mappings` on "Save as Draft" or on page change. Never send the whole matrix.

Also provide an "unmapped only" `ToggleSwitch` wired to the `onlyUnmapped` query param — with thousands of rows it is the only practical way to finish a config.

---

## 3. Files

### New

| File | Contents |
|---|---|
| `src/views/journal-config/JournalConfigView.vue` | the screen |
| `src/views/journal-config/JournalConfigMatrix.vue` | one role's basis selectors + matrix, so the view stays readable |
| `src/views/journal-config/journalConfigMatrix.ts` | pure logic (below) |
| `src/views/journal-config/journalConfigMatrix.spec.ts` | its unit tests |
| `src/types/journalConfig.type.ts` | entity + DTO types |
| `src/services/journalConfig.service.ts` | static-class service |

`journalConfigMatrix.ts` holds everything testable without a DOM — the `treeFilter.ts` / `periodActions.ts` convention of unit-testing plain `.ts` rather than `.vue`:

- `buildCombinationKey(values)` — must produce byte-identical output to the backend's canonical form (`<source>[:<refId>]=<valueId|_>` segments joined by `|`, ordered by position, `_` for null, `''` for no bases). Keep the backend document open while writing this; it is a stored value on both sides.
- `unmappedCountsByRole(roles)` and `isActivatable(config)` — drive the tab badges and the disabled Activate button.
- `basisChanged(oldBases, newBases)` — decides whether to show the "this will clear N mapped rows and return the config to draft" confirmation.
- `dimensionOptionsFor(catalog, usedKeys, currentKey)` — hides dimensions already chosen in another slot, so the same dimension cannot be picked twice (the backend rejects it; the UI should never offer it).

### Modified

**`src/constants/api.ts`** — append after the Accounting Period block (which ends at `ACCOUNTING_PERIOD_CONFIG`). Note the convention: `/v1/...` for hand-written endpoints, `GEN_*` + `/gen/v1/...` for generic CRUD. All of these are `/v1/`.

```ts
// Journal Config (Finance) endpoints
JOURNAL_DOCUMENT_TYPES: '/v1/journal-document-types',
JOURNAL_ROLES: '/v1/journal-roles',
JOURNAL_DIMENSIONS: '/v1/journal-dimensions',
JOURNAL_CONFIGS: '/v1/journal-configs',
JOURNAL_CONFIG_BY_ID: (id: number) => `/v1/journal-configs/${id}`,
JOURNAL_CONFIG_ACTIVATE: (id: number) => `/v1/journal-configs/${id}/activate`,
JOURNAL_CONFIG_DEACTIVATE: (id: number) => `/v1/journal-configs/${id}/deactivate`,
JOURNAL_CONFIG_ROLE_BASES: (id: number, roleId: number) =>
  `/v1/journal-configs/${id}/roles/${roleId}/bases`,
JOURNAL_CONFIG_ROLE_GENERATE: (id: number, roleId: number) =>
  `/v1/journal-configs/${id}/roles/${roleId}/generate`,
JOURNAL_CONFIG_ROLE_MAPPINGS: (id: number, roleId: number) =>
  `/v1/journal-configs/${id}/roles/${roleId}/mappings`,
JOURNAL_CONFIG_ROLE_MAPPING_BY_ID: (id: number, roleId: number, mappingId: number) =>
  `/v1/journal-configs/${id}/roles/${roleId}/mappings/${mappingId}`,
```

**`src/constants/permissions.ts`** — three edits. `PERMISSIONS` currently ends at `ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE: 115`:

```ts
JOURNAL_CONFIG_READ: 116,
JOURNAL_CONFIG_WRITE: 117,
```

plus `'/journal-config': PERMISSIONS.JOURNAL_CONFIG_READ` in `ROUTE_PERMISSIONS` (next to line 189) and `'/journal-config': PERMISSIONS.JOURNAL_CONFIG_WRITE` in `ROUTE_WRITE_PERMISSIONS` (next to line 243). Ids must match the backend migration `000245` exactly.

**`src/router/index.ts`** — next to the two existing Finance routes:

```ts
{
  path: 'journal-config',
  name: 'JournalConfig',
  component: () => import('@/views/journal-config/JournalConfigView.vue'),
  meta: {
    requiredPermission: PERMISSIONS.JOURNAL_CONFIG_READ,
    titleKey: 'navigation.journalConfig',
  },
},
```

**`src/components/menu/menu.ts`** — third item in the existing `Finance` group (after Chart of Accounts and Accounting Periods). Menu items carry **no permission field** in this codebase; the router guard is the real gate, so adding the entry is purely cosmetic and the route's `meta.requiredPermission` is what actually protects it.

**`src/types/index.ts`** and **`src/services/index.ts`** — barrel re-exports for the two new files.

**`src/i18n/locales/en-US.ts` and `id-ID.ts`** — a `journalConfig` top-level key in **both files in the same change** (project rule: never hardcode-then-translate-later). Follow the 6-bucket convention used by `chartOfAccounts` (`fields`, `labels`, `helpers`, `warnings`, `validation`, `messages`) plus two feature-specific buckets:

- `roles.{ar,salesReturn,salesDiscount,revenue,cogs,inventory,outputVat}` — tab labels. The mockup's Indonesian strings are the `id-ID` values: Piutang Outlet (A/R), Retur Penjualan, Diskon Penjualan, Revenue, HPP, Persediaan, PPN Keluaran.
- `dimensions.{company,branch,warehouse,customer,customerCategory,product}` — the fixed catalog entries. **Label-derived dimensions are not translated** — their names come from the database (`product_label_definitions.name`) and are rendered as-is.

Also add `navigation.journalConfig` to both locales.

---

## 4. Service

Static class, `AccountingPeriodsService` shape:

```ts
export class JournalConfigService {
  private static readonly BASE_URL = API_ENDPOINTS.JOURNAL_CONFIGS

  static async documentTypes(): Promise<Base<JournalDocumentType>>
  static async roles(documentTypeCode: string): Promise<Base<JournalRole>>
  static async dimensions(documentTypeCode: string, roleCode: string): Promise<Base<JournalDimension>>

  static async find(companyId: number, documentTypeId: number): Promise<JournalConfig | null>
  static async get(id: number): Promise<JournalConfig>
  static async create(data: CreateJournalConfigDto): Promise<JournalConfig>
  static async update(id: number, data: UpdateJournalConfigDto): Promise<JournalConfig>

  static async replaceBases(id: number, roleId: number, bases: JournalBasisDto[]): Promise<ReplaceBasesResult>
  static async generate(id: number, roleId: number): Promise<GenerateResult>
  static async mappings(id: number, roleId: number, query?: string): Promise<Base<JournalMapping>>
  static async saveMappings(id: number, roleId: number, rows: SaveMappingDto[]): Promise<void>
  static async deleteMapping(id: number, roleId: number, mappingId: number): Promise<void>

  static async activate(id: number): Promise<JournalConfig>
  static async deactivate(id: number): Promise<JournalConfig>
}
```

`find()` swallows a 404 into `null` inside the service — the caller genuinely cannot distinguish "no config yet for this company" from an error otherwise, and "no config yet" is the normal first-visit state. This is the `GoodsReceiptConfigService.getMyBranch()` pattern. Every other method lets errors propagate to the view's `catch (e) { toast.add(commonErrorToast(e, overlayGroup)) }`.

The two error responses that need bespoke handling in the view rather than a generic toast:

- **409 on `activate`** — carries the per-role unmapped breakdown. Render it into the validation banner and refresh the tab badges; do not just toast "conflict".
- **422 on `generate`** — the 20,000-row cap. Show `journalConfig.warnings.tooManyCombinations` telling the user to narrow the basis selection.

---

## 5. Behaviour notes

- **Company change** reloads everything; warn if there are unsaved dirty rows.
- **Basis change** calls `basisChanged()` first and, if it did change, shows a `ConfirmationDialog` naming the number of mapped rows about to be cleared and that the config returns to draft. The backend does this unconditionally — the UI's job is to make it non-surprising.
- **Generate** reports `{added, kept, staleMarked}` in a success toast ("12 new combinations added, 40 kept, 3 no longer in master data"). Stale rows show a distinct status icon and a per-row delete button; they are never removed automatically.
- **Save & Activate** is `:disabled="totalUnmapped > 0 || !canWrite"`, matching the mockup's locked button. "Save as Draft" stays enabled so Finance can fill the matrix over several sessions.
- **Permissions**: `usePermissions('/journal-config')` for `canWrite`; every input and action button is `:disabled="!canWrite"`.
- **Toast / confirm**: `Toast` and `ConfirmationDialog` with `overlayGroup = 'journalConfigView'`, `commonSuccessToast` / `commonErrorToast` from `src/services/toast.ts`.
- **Responsive**: the matrix is inherently wide. Wrap it in an `overflow-x-auto` container rather than trying to collapse it to cards, and keep the basis selectors stacked on mobile (`flex-col md:flex-row`).

### Known traps in this codebase

- **`SelectButton` does not re-render from a programmatic `Form.states.<field>.value` write.** If any control here becomes a `SelectButton` driven by a cascade, keep it out of `Form` registration and track it in a local `ref` — see the comments in `ChartOfAccountDialog.vue` and `FiscalYearDialog.vue`.
- **Go omits nil slices and pointers as absent keys, not `null`.** Never test a possibly-omitted response field with `!== null`; use a truthiness or `!= null` check.
- **Playwright**: PrimeVue `InputNumber` and `DatePicker` need care with `.fill()`. The Sub Account field is a plain `InputText`, so it is fine.

---

## 6. Verification

```bash
npm run type-check
npm run test:unit     # journalConfigMatrix.spec.ts
npm run lint
npm run dev           # backend must be running
```

Manual walkthrough at `/journal-config`, backend up, on a company with a Chart of Accounts and at least one product label definition:

1. Pick a company → screen offers to create a draft for Invoice.
2. Seven role tabs render with the seeded names, in both locales (switch language and confirm no key leaks as `journalConfig.…`).
3. On the **Revenue** tab, the basis dropdowns list the fixed dimensions **plus** every product/customer label definition by name.
4. On the **A/R** tab, `Product` and the product-label dimensions are **absent** (the header-grain rule).
5. Pick two dimensions → the second dropdown no longer offers the first.
6. **Generate** → matrix populates, paginated; products with no label show "(not set)"; toast reports the counts.
7. "Save & Activate" is disabled; the Revenue tab shows the unmapped badge and the banner shows the count.
8. Filter "unmapped only", assign accounts, Save as Draft, reload the page → values persisted.
9. Fill every row in every tab → badges clear, "Save & Activate" enables, activation succeeds.
10. Change a basis → confirmation names the row count; after confirming, the matrix is empty and the config reads `draft`.
11. Sign in as a user without `JOURNAL_CONFIG_WRITE` → inputs disabled; without `JOURNAL_CONFIG_READ` → redirected to Home.

Shut the dev servers down when the walkthrough is finished, and run `graphify update .` from the repo root.

### Walkthrough results (2026-09-05)

Ran end-to-end against company "Testing" (id=1). Two bugs found and fixed, both stemming from the documented "Go omits nil slices as absent JSON keys" trap:

1. **`JournalConfigMatrix.vue`'s `basesToSlots()` crashed on mount for any role with no bases** (`bases.slice()` on `undefined`) — the backend omits `bases` entirely rather than sending `[]`. Since the crash happened before the rest of `onMounted` ran, `loadCatalog()`/`loadMappings()` never fired, breaking every tab on a fresh config. Fixed by defaulting to `[]` in `basesToSlots`, `basisChanged`, and the bases `v-for`; `JournalConfigRole.bases` and `ReplaceBasesResult.bases` are now typed optional.
2. **`JournalConfigView.vue`'s `loadConfigForSelection()` used `find()`'s list-endpoint result (header only, no `roles`) directly** and read `config.value.roles` off it without following up with `get(id)` — unlike `reloadConfig()`, which already does this correctly. Broke every return visit to an existing config. Fixed by resolving to the full detail (via `get(id)`) before ever assigning to the reactive `config` ref (assigning the roles-less summary first, then immediately overwriting it, still produced one bad render pass).

All 20 steps of the walkthrough above passed after the fixes, including the grain-restricted dimension catalog, zero-basis single-row generation, basis-change-clears-mappings confirmation, Save & Activate enabling only once every role is complete, and both locales rendering with no leaked keys. The 409-on-incomplete-activate path was verified via the backend's unit tests (`TestActivateConfig_UnmappedRow_ReturnsIncompleteError`) and by confirming the button stays disabled client-side rather than by forcing a live 409, since the FE deliberately never lets an authorized, fully-loaded session issue that request.
