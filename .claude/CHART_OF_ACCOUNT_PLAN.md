# Chart of Accounts (CoA) Master — Frontend Plan

See also: [`gudang/.claude/CHART_OF_ACCOUNT_PLAN.md`](../../.claude/CHART_OF_ACCOUNT_PLAN.md) (master plan, decision log) and [`gudang-be/.claude/CHART_OF_ACCOUNT_PLAN.md`](../../gudang-be/.claude/CHART_OF_ACCOUNT_PLAN.md) (backend plan).

Source mockup: `n_command_coa_master_v1.html` — a tree list plus an add/edit slide panel.

---

## 1. What is new about this screen

Every CRUD view in this app so far is `TableComponent.vue` — a flat, server-paginated PrimeVue `DataTable` wrapper. A chart of accounts is a tree: rows nest, parents collapse, and search has to reveal matches buried under collapsed ancestors. Paginating that is meaningless.

So this is the **first `TreeTable` in the codebase** (`primevue/treetable`, available in the installed primevue `^4.2.5`, currently unreferenced anywhere in `src/`). The whole chart loads in one `GET /v1/chart-of-accounts/tree` call and search / type-filter / expand-collapse all run client-side. A CoA is hundreds of rows, not thousands — this is the right trade, and it is why the backend exposes an unpaginated tree endpoint alongside the ordinary paginated list.

Everything *else* on the screen stays on the established rails: `usePermissions`, `useDialog`, `useConfirmDelete`, `ResponsiveCard`, `ResponsiveButton`, `Toast` + `ConfirmationDialog` with a per-view `overlayGroup`, PrimeVue `Form` + `zodResolver`, `InfiniteSelect` for every FK picker.

---

## 2. Constants

**`src/constants/api.ts`** — new block:

```ts
// Chart of Accounts (Finance)
CHART_OF_ACCOUNTS: '/v1/chart-of-accounts',
CHART_OF_ACCOUNT_BY_ID: (id: number) => `/v1/chart-of-accounts/${id}`,
CHART_OF_ACCOUNTS_TREE: '/v1/chart-of-accounts/tree',
GEN_ACCOUNT_TYPES: '/gen/v1/account-types',
GEN_CONTROL_ACCOUNT_TYPES: '/gen/v1/control-account-types',
```

**`src/constants/permissions.ts`** — IDs matching the backend migration (last existing is 110):

```ts
CHART_OF_ACCOUNT_READ: 111,
CHART_OF_ACCOUNT_WRITE: 112,
```

plus `'/chart-of-accounts': PERMISSIONS.CHART_OF_ACCOUNT_READ` in `ROUTE_PERMISSIONS` and `…_WRITE` in `ROUTE_WRITE_PERMISSIONS`.

---

## 3. Types — `src/types/chartOfAccount.type.ts`

```ts
export type NormalBalance = 'DEBIT' | 'CREDIT'

export interface AccountType {
  id: number
  code: string
  name: string
  defaultNormalBalance: NormalBalance
  sortOrder: number
  isActive: boolean
}

export interface ControlAccountType {
  id: number
  code: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface ChartOfAccount {
  id: number
  companyId: number
  parentId: number | null
  code: string
  name: string
  accountTypeId: number
  accountType?: AccountType
  normalBalance: NormalBalance
  isHeader: boolean
  controlAccountTypeId: number | null
  controlAccountType?: ControlAccountType
  isRetainedEarnings: boolean
  depth: number
  isActive: boolean
  /** True once the account has been used in a posted journal entry. Always
   *  false until the GL module exists; freezes code / type / normal balance. */
  inUse: boolean
  createdAt: string
  updatedAt: string | null
}

export interface ChartOfAccountNode extends ChartOfAccount {
  children: ChartOfAccountNode[]
}

export interface CreateChartOfAccountDto { /* companyId, parentId?, code, name, accountTypeId,
  normalBalance?, isHeader, controlAccountTypeId?, isRetainedEarnings, isActive, createdBy */ }

export interface UpdateChartOfAccountDto { /* same minus companyId/createdBy, plus updatedBy */ }
```

Add to the `src/types/index.ts` barrel. No `any` anywhere — the PrimeVue `TreeNode` shape is wrapped in a typed adapter (§5.2) rather than typed loosely.

---

## 4. Services

**`src/services/chartOfAccounts.service.ts`** — static-class pattern per `suppliers.service.ts`:

```ts
export class ChartOfAccountsService {
  private static readonly BASE_URL = API_ENDPOINTS.CHART_OF_ACCOUNTS

  static async list(queryString?: string): Promise<Base<ChartOfAccount>>
  static async tree(companyId: number): Promise<ChartOfAccountNode[]>
  static async get(id: number): Promise<ChartOfAccount>
  static async create(data: CreateChartOfAccountDto): Promise<ChartOfAccount>
  static async update(id: number, data: UpdateChartOfAccountDto): Promise<ChartOfAccount>   // PUT
  static async delete(id: number): Promise<void>
}
```

`update` uses **PUT**, matching the backend and the AP Invoice convention (a `PATCH` here would 405).

**`src/services/accountTypes.service.ts`** and **`src/services/controlAccountTypes.service.ts`** — `list(queryString?)` only, hitting the `/gen/v1/…` endpoints; both return `Base<T>` so they drop straight into `InfiniteSelect`'s `fetch-fn`. Add all three to the `src/services/index.ts` barrel.

---

## 5. `src/views/chart-of-accounts/`

### 5.1 `ChartOfAccountsView.vue`

**Toolbar** (mirrors the mockup's toolbar row):

- **Company picker** — `InfiniteSelect` over `CompaniesService`, required. There is no "current company" in the session: `useAuthStore` tracks `branchIds` only, and transaction modules derive the company from the document's branch via `company_branches`, which does not apply to a master screen. So the user picks explicitly; default to the first company returned and load its tree on mount. Changing the company reloads the tree.
- **Search box** — filters on `code` or `name`, client-side, and auto-expands every ancestor of a match so hits are never hidden inside a collapsed branch. Debounced; no Enter required (unlike `TableComponent`, this is not a server round-trip).
- **Type filter chips** — `Semua` plus one chip per row from `AccountTypesService.list()`, ordered by `sortOrder`. Selecting a chip keeps ancestors of matching accounts visible so the tree does not fragment.
- **Show inactive** toggle — the tree endpoint returns inactive accounts by default (hiding an inactive parent would visually orphan its active children); this toggle filters them out client-side.
- **Collapse all / Expand all** button.
- **`+ Tambah akun`** primary `ResponsiveButton`, gated on `canWrite`.

**Table** — PrimeVue `TreeTable`, columns per the mockup:

| Column | Rendering |
|---|---|
| Kode & Nama Akun | the tree/expander column; `code` in `font-mono`, then `name`; header rows get the muted/grey treatment and a bolder weight |
| Tipe | `Tag` with the account-type code |
| Saldo normal | `DEBIT` / `CREDIT` in `font-mono` |
| Flag | `pi pi-lock` when `controlAccountTypeId` is set (tooltip = control type name), `pi pi-star` when `isRetainedEarnings` |
| Status | `Tag`, `success` / `secondary`, using the existing `common.labels.active` / `inactive` keys |
| Actions | `TableActionButtons` (view / edit / delete) plus an extra `+` add-child button |

The `+` add-child button shows on every **header** row. It is deliberately *not* also gated on depth: `COA_MAX_DEPTH` is a backend environment variable the frontend has no way to read, and the server already rejects an over-deep create with a 409 whose message names the limit — which `commonErrorToast` surfaces verbatim. Do not hardcode `3` in the frontend, and do not add an endpoint just to expose it; the server stays the single authority on depth.

Delete goes through `useConfirmDelete` with `overlayGroup: 'chartOfAccountsView'`; the backend's 409 for "has children" / "in use" surfaces through `commonErrorToast`.

**Responsive** — `TreeTable` has no card mode, so under `md` the Tipe and Saldo-normal columns are hidden (`useResponsiveSize().isMobile`) and the table scrolls horizontally inside its own container. Indentation stays, since it is the whole point of the screen.

### 5.2 `treeFilter.ts` — the one piece of real logic, extracted and tested

Pure functions, no Vue imports:

```ts
/** Map the API's ChartOfAccountNode[] onto PrimeVue's TreeNode shape
 *  ({ key, data, children }), preserving order. */
export function toTreeNodes(nodes: ChartOfAccountNode[]): TreeNode[]

/** Keep any node matching the predicate, plus every ancestor of a match
 *  (so matches are reachable) — but not non-matching descendants. */
export function filterTree(
  nodes: ChartOfAccountNode[],
  predicate: (n: ChartOfAccountNode) => boolean,
): ChartOfAccountNode[]

/** Expansion map ({ [key]: true }) covering every ancestor of a match. */
export function expandedKeysFor(nodes: ChartOfAccountNode[]): Record<string, boolean>
```

Unit-tested in `src/views/chart-of-accounts/__tests__/treeFilter.spec.ts` (Vitest): a deep-match keeps its ancestors; a non-matching sibling subtree is dropped; an empty result is an empty array, not `undefined`; combining the search predicate with the type-chip predicate ANDs correctly.

### 5.3 `ChartOfAccountDialog.vue`

PrimeVue `Form` + `zodResolver` (resolver wrapped in `computed()` so validation messages follow the locale), structured like `SupplierDialog.vue`, supporting `DialogMode.ADD` / `EDIT` / `VIEW`. Sections follow the mockup's slide panel top to bottom:

1. **Akun induk (parent)** — a read-only preview card showing `code · name` with a "Ganti" button opening a parent picker restricted to **header accounts of the selected company**. Pre-filled when the dialog was opened from a row's `+` button. Below it, the read-only hint `Level akun baru: N` computed as `parent.depth + 1` (or 1 for top-level).
2. **Kode akun** (`InputText`, `font-mono`, helper "Harus unik di seluruh CoA") and **Tipe akun** (`InfiniteSelect` over `AccountTypesService`, `option-label="code"`, `option-value="id"`, with `initial-option` set when editing so the current type shows even if it is off the first page).
3. **Nama akun** (`InputText`).
4. **Saldo normal** — `SelectButton` Debit / Credit. Auto-set from the chosen account type's `defaultNormalBalance` **until the user touches the control**; after that the manual choice sticks (a `hasTouchedNormalBalance` ref). Helper text mirrors the mockup: "Auto-set dari tipe akun, override manual bila ada kasus khusus".
5. **Sifat akun** — `SelectButton` Header (grouping only) / Detail (postable).
6. **Control account** — `SelectButton` Ya / Bukan plus an `InfiniteSelect` over `ControlAccountTypesService`, shown only when Ya. **Disabled and cleared whenever Sifat akun is Header** — mockup rule 4, enforced in the UI so the user never hits the server's 409.
7. **Retained earnings account** — `ToggleSwitch` with the mockup's helper text.
8. **Status akun** — `ToggleSwitch` Aktif / Non-aktif.

**Client-side warning banner** (mockup rule 3): when the selected parent has `isHeader === false`, show a `warn`-styled banner — "akun baru sebaiknya di bawah Header agar hierarchy tetap bersih". Advisory only; it never blocks submit. This lives entirely in the frontend by design (see the backend plan §4.3) — the backend has no warnings channel.

**Frozen fields in EDIT mode**: when the loaded account has `inUse === true`, disable `code`, `Tipe akun`, and `Saldo normal`, and show an info banner explaining that the account already has journal entries. `name` and `Status akun` stay editable. This is mockup rule 5; `inUse` is always `false` until the GL module ships, so today the fields are simply never disabled — the UI is built correct-by-construction for when it flips.

Form submission reads values via `event.states.<field>.value` (the established `InfiniteSelect` + Forms integration), stamps `createdBy` / `updatedBy` from `useAuthStore().userId`, and on success emits `close` so the view reloads the tree.

---

## 6. Routing, menu, i18n

**`src/router/index.ts`** — lazy route inside the main layout:

```ts
{
  path: 'chart-of-accounts',
  name: 'chartOfAccounts',
  component: () => import('@/views/chart-of-accounts/ChartOfAccountsView.vue'),
  meta: { titleKey: 'navigation.chartOfAccounts' },
}
```

**`src/components/menu/menu.ts`** — a new **Finance** group (`icon: 'pi pi-wallet'`) with Chart of Accounts as its first item. New group rather than an entry under Purchasing (which holds AP documents) or Settings, so the coming GL / journal-entry / closing screens have an obvious home.

**i18n** — `src/i18n/locales/en-US.ts` **and** `id-ID.ts` in the same change (no hardcoded strings, no translate-later):

- `navigation.finance`, `navigation.chartOfAccounts`
- a `chartOfAccounts` block: `title`, `addAccount` / `editAccount` / `viewAccount` / `deleteAccount`, a `fields` group (`code`, `name`, `accountType`, `normalBalance`, `parent`, `nature`, `controlAccount`, `retainedEarnings`, `status`, `flags`), a `labels` group (`header`, `detail`, `debit`, `credit`, `level`, `changeParent`, `collapseAll`, `expandAll`, `showInactive`, `all`), a `helpers` group (unique-code, inherited-type, auto-normal-balance, control-account, retained-earnings), a `warnings` group (`detailParent`, `accountInUse`), and a `validation` group.

Indonesian strings come from the mockup itself: Kode & Nama Akun, Tipe, Saldo normal, Flag, Status, Tambah akun, Akun induk (parent), Sifat akun, Header (grouping only), Detail (postable), Control account, Aktif, Non-aktif, Simpan akun, Batal. Settle `Bagan Akun` vs. keeping "Chart of Accounts" once and use it everywhere.

---

## 7. Verification

```bash
cd gudang-fe
npm run type-check
npm run lint
npm run test:unit     # includes treeFilter.spec.ts
npm run dev
```

With the backend running and a `SUPER_ADMIN` login, walk the screen (Playwright or by hand):

1. `/chart-of-accounts` renders, company picker defaults to the first company, tree is empty (no seed data by design).
2. Create a top-level header `1-1000 / AKTIVA LANCAR / ASSET / Header` → appears at level 1; normal balance pre-filled DEBIT from the type without being touched.
3. From its row's `+`, create `1-1100 Kas & Bank` (Header) → nests one level in; the dialog's "Level akun baru" reads 2.
4. From `1-1100`'s `+`, create `1-1101 Kas Kecil` (Detail) → level 3.
5. From `1-1101`'s row, attempt a child → server 409, and the toast shows the max-depth message naming the limit.
6. Create six more accounts under `1-1100` → all succeed (no sibling cap).
7. On a Header account, switch Control account to "Ya" → the control-type picker is disabled/cleared by the Sifat toggle; the invalid combination is unreachable from the UI.
8. Create `3-1901 Laba Ditahan` with Retained earnings on → star icon in the Flag column; creating a second RE account → 409 toast.
9. Search `Kas` → only the matching branch remains, with `1-1000` retained as its ancestor and auto-expanded. Clear the search → the full tree returns collapsed as before.
10. Click the ASSET chip → non-ASSET branches drop out; `Semua` restores.
11. Delete `1-1000` while it has children → 409 toast; delete leaves upward → succeeds.
12. Switch the language to Bahasa Indonesia → every label, helper, and validation message on the view and the dialog translates; nothing falls back to a raw key.
13. Log in as a user without permission 111 → the Finance menu group and the route are both hidden.
14. Resize to 375px → the tree still indents, Tipe / Saldo normal are hidden, the table scrolls horizontally, and the page body does not.
