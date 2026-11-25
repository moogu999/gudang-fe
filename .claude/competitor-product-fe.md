# Competitor Products — Frontend Plan

**Status:** IMPLEMENTED 2026-10-11 (unit/type/lint green). Live E2E deliberately NOT run until the user gives the go.
**Master plan:** `../../.claude/competitor-product-master-plan.md` (decisions D1–D15, E2E §9). Backend contract: `../../gudang-be/.claude/competitor-product-be.md` §3–§5. This doc covers phases 4–7.

**Forms:** the competitor product form is a **page** (create/edit routes, `usePostSaveNavigation`). The brand form is a **dialog**. There is **no side panel** (user decision).
**Wording:** **Product**, never "SKU" ("Comparison Products" / "Produk Pembanding"), and **Customer**, never Outlet.

---

## 1. Wiring (phase 4)

| File | Change |
|---|---|
| `src/constants/api.ts` | `COMPETITOR_BRANDS: '/v1/competitor-brands'`, `COMPETITOR_PRODUCTS: '/v1/competitor-products'`, `COMPETITOR_PRODUCT_RECOMMENDATIONS: '/v1/competitor-product-recommendations'` |
| `src/constants/permissions.ts` | `COMPETITOR_BRAND_READ: 146`, `COMPETITOR_BRAND_WRITE: 147`, `COMPETITOR_PRODUCT_READ: 148`, `COMPETITOR_PRODUCT_WRITE: 149`, `COMPETITOR_PRODUCT_RECOMMEND: 150`. Read map: `'/competitor-brands'` → 146, `'/competitor-products'` → 148. Write map: → 147 / 149 |
| `src/router/index.ts` | `competitor-brands` (146); `competitor-products` (148); `competitor-products/create` (149, `titleAction: 'create'`); `competitor-products/:id/edit` (148, read-only without 149, `titleAction: 'edit'`). Mirror the `sales-teams` block at lines ~124–182 |
| `src/components/menu/menu.ts` | `Competitor Products` (`navigation.competitorProducts`), then `Competitor Brands` (`navigation.competitorBrands`), right after Reasons |
| `src/types/competitorBrand.type.ts`, `src/types/competitorProduct.type.ts` (+ `src/types` barrel) | See below |
| `src/services/competitorBrands.service.ts`, `competitorProducts.service.ts`, `competitorProductRecommendations.service.ts` (+ `src/services` barrel) | Static classes like `reasons.service.ts`. `CompetitorProductsService.toListQuery = createListQueryAdapter(['search','brandId','categoryOptionId','principalOptionId','isActive'])` (see `suppliers.service.ts:8,26`) |

No `_v` cache handling is needed: the interceptor in `src/services/api.ts` picks up the backend's new cache groups automatically.

### Types

```ts
export interface CompetitorBrand {
  id: number; name: string; manufacturer?: string; isActive: boolean
  productCount: number; createdAt: string; updatedAt?: string; updatedByName?: string
}
export interface CompetitorBrandPayload { name: string; manufacturer?: string; isActive?: boolean }

export interface LabelRef { id: number; name: string }
export interface CompetitorProductComparison {
  productId: number; code: string; name: string
  categoryName?: string; principalName?: string; isPrimary: boolean
}
export interface PhotoRef { id: number; url: string }

export interface CompetitorProductListItem {
  id: number; code: string; name: string; isActive: boolean
  brand: { id: number; name: string; manufacturer?: string }
  category: LabelRef; principal?: LabelRef
  uomGroup: { id: number; name: string; baseUomName: string }
  referencePrice?: string                         // decimal string, omitted when unset
  primaryComparison?: { productId: number; code: string; name: string }
  otherComparisonCount: number
  thumbnailUrl?: string
}
export interface CompetitorProduct extends Omit<CompetitorProductListItem, 'primaryComparison' | 'otherComparisonCount' | 'thumbnailUrl'> {
  comparisons?: CompetitorProductComparison[]     // omitted (not []) when empty
  photos?: PhotoRef[]
  createdAt: string; updatedAt?: string; updatedByName?: string
}
export interface CompetitorProductPayload {
  code?: string                                   // create only; omitted = Auto
  name: string; brandId: number; categoryOptionId: number; principalOptionId?: number
  uomGroupId: number; referencePrice?: string; isActive?: boolean
  comparisons: { productId: number; isPrimary: boolean }[]
}

export type RecommendationStatus = 'pending' | 'created' | 'merged' | 'rejected'
export interface CompetitorProductRecommendation {
  id: number; name: string; observedPrice?: string; observedUom?: LabelRef
  customer?: { id: number; code: string; name: string }
  submitter: { employeeId: number; name: string }
  notes?: string; status: RecommendationStatus
  competitorProduct?: { id: number; code: string; name: string }
  rejectReason?: string; resolvedByName?: string; resolvedAt?: string; createdAt: string
  photos?: PhotoRef[]
  suggestions?: { competitorProductId: number; code: string; name: string; brandName: string; score: number }[]
  siblingIds?: number[]
  similarPending?: { id: number; name: string; score: number }[]
}
```

The Go API omits empty slices and nil pointers. Always read them as `x ?? []` or with `x === undefined` checks, never `!== null`.

### Services

- `CompetitorBrandsService`: `list(params?)`, `get`, `create`, `update`, `delete`.
- `CompetitorProductsService`: `list(params)` (paged), `get`, `create`, `update`, `delete`.
- `CompetitorProductRecommendationsService`: `list({ status, search, page, limit })`, `get(id)`, `merge(competitorProductId, recommendationIds)`, `createProduct(product, recommendationIds, photoFileIds)`, `reject(id, reason?)`. There is no `submit`, because that is the mobile's job; tests and E2E seed through curl.

---

## 2. Shared components (phase 4)

### `InfiniteSelect.vue`: a `#footer` slot

Add a named `footer` slot, passed through to the underlying PrimeVue `Select`'s `#footer`. Expose `refresh()` and a way to set the selected option programmatically (`initialOption` already exists). After an inline create, the parent sets `initialOption` to the new brand and the model to its id. This is additive, so existing usages are unaffected. Add a spec case for the slot rendering.

### `src/components/upload/PhotoGallery.vue` (new)

A multi-photo sibling of `FileUpload.vue`, built on `FilesService` / `useFileUpload`.

- **Props:** `ownerType`, `category` (default `'photo'`), `ownerId?: number`, `modelValue: PhotoRef[]`, `max` (default 3), `readonly`, `accept` (default `image/jpeg,image/png,image/webp`), `maxSize` (10 MB).
- **UI:** a grid of square thumbnails, with the first one larger (the "main" photo, as in the mockup). Clicking opens the full-size `Dialog`. A remove `×` on each when not readonly. An add tile (camera icon), hidden when `photos + pending ≥ max`. A hint: "Up to 3 photos · the first is used as the thumbnail".
- **With `ownerId`:** upload immediately and emit `update:modelValue`. Delete calls `FilesService.remove(id)`.
- **Without `ownerId` (create mode):** keep the files in a local pending list with object-URL previews. `flushPending(ownerId)` (exposed) uploads them in order and returns failures. The parent calls it after create, the same way `EmployeeDetailView.vue:96` uses `FileUpload`.
- **409 `file_limit_reached` / 403:** show a toast via an `error` emit, and let the parent toast in its own group.
- **Extra prop `carryOver?: PhotoRef[]`:** used only by the create-from-recommendation mode (§5). These render as selectable tiles with a checkbox, count against `max`, and their selected ids are exposed via `v-model:carry-over-ids`.

---

## 3. Competitor Brands (phase 4)

`src/views/competitor-brands/CompetitorBrandsView.vue` + `CompetitorBrandDialog.vue`, following `src/views/payment-methods/` (View + Dialog, `useDialog`, `DialogMode`, `dialogKey++` remount, PrimeVue `Form` + `zodResolver`).

- **View:** title, a `Toolbar` with "Add brand" (`canWrite` from `usePermissions('/competitor-brands')`), and a `ResponsiveCard` containing a search `InputText` (name or manufacturer, client-side), a status `Select` (Active default / Inactive / All), and a plain `DataTable` over the unpaged list.
  - Columns: Name, Manufacturer (muted "—" when absent), Products (`productCount`), Status tag, `TableActionButtons`.
- **Delete:** `useConfirmDelete({ overlayGroup: 'competitorBrandsView', entityName: 'competitorBrand', onSuccess })`. A 409 `competitor_brand_in_use` shows `competitorBrands.errors.inUse` ("This brand still has competitor products. Deactivate it instead.").
- **Dialog fields:**
  - Name (required, max 100, counter)
  - Manufacturer (optional, max 150)
  - Active (EDIT only, `ToggleSwitch` with the hint "Inactive brands can't be picked for competitor products")
  - footer "Last changed: {updatedByName} · {updatedAt}" in EDIT
  - Server `name_duplicate` → the Name field.
- **Reuse:** the dialog emits `close(saved: boolean, brand?: CompetitorBrand)` so that the product form can host it for inline create (§5).

---

## 4. Competitor Products list (phase 5)

`src/views/competitor-products/CompetitorProductsView.vue`

- `Toast` + `ConfirmationDialog` share one overlay group (`'competitorProductsView'`). Title, plus a `Toolbar` with "Add product" (`canWrite`) → `/competitor-products/create`.
- `ResponsiveCard`, then **Tabs** (`ReasonsView.vue` pattern), with the active tab in `?tab=master|recommendations`:
  - **Master**: no badge (the table shows the total).
  - **Recommendations**: a `Badge` with the pending count. Load it on mount with `CompetitorProductRecommendationsService.list({ status: 'pending', limit: 1 })` → `meta.total`, and refresh it whenever the Recommendations tab emits `changed`.
- **Master tab:** `TableComponent` with `:query-adapter="CompetitorProductsService.toListQuery"`. All columns are `sortable: false`, because the server sorts by code.
  - **Filters:**
    - search (name or code)
    - brand: `InfiniteSelect` on `CompetitorBrandsService.list`, or a plain `Select`, since the list is unpaged
    - category / principal: `loadLabelFilterOptions('category' | 'principal', …)` from `src/views/sales-teams/salesTeamHelpers.ts:99`
    - status: Active default / Inactive / All
  - **Columns:**

    | Column | Content |
    |---|---|
    | Competitor product | Thumbnail (36 px, rounded; placeholder icon when `thumbnailUrl` is absent; relative URL prefixed with `VITE_API_BASE_URL`, same `buildUrl` as `FileUpload.vue`), name (bold) and code (mono, muted) |
    | Brand | Name + manufacturer (muted) |
    | Category | `principal ? \`${principal.name} › ${category.name}\` : category.name` |
    | Comparison products | `primaryComparison` as a chip with a ★ icon + "+N" chip when `otherComparisonCount > 0`. None → warning-colored text `competitorProducts.list.noComparison` ("No comparison product") |
    | Reference price | Right-aligned, `formatCurrency`-style without decimals, plus a muted `/ {baseUomName}`. Absent → "—" |
    | Status | Active / Inactive tag. Inactive rows get a muted `rowClass` |
    | Actions | `TableActionButtons`: view/edit → `/competitor-products/:id/edit`; delete with confirm, where 409 `competitor_product_in_use` → `competitorProducts.errors.inUse` ("Already used. Deactivate it instead.") |

  - A muted note under the table: "★ = primary comparison product, used in future price comparison reports. Competitor products without a comparison product can still be surveyed but won't appear in comparison reports."

---

## 5. Create / edit page (phase 5)

Files: `CompetitorProductCreateView.vue`, `CompetitorProductEditView.vue`, `CompetitorProductForm.vue` and `components/ComparisonProductPickerDialog.vue`, mirroring `src/views/sales-teams/`.

- **Create view:** back button, title, `<CompetitorProductForm mode="add" …>`. On submit: `create`, then `form.flushPhotos(id)` (calls `PhotoGallery.flushPending`); photo failures → a warning toast, not a hard error. Then `afterCreate({ id })` from `usePostSaveNavigation('/competitor-products')`, which replaces the route with `/:id/edit`.
- **Edit view:** loads `get(id)`. Read-only without `canWrite`. On submit: `update`, then **re-read from the server** and stay on the page (house rule: stay on edit after save).
- **Form layout:** two columns on desktop, stacked on mobile.
  - **Left column, card "Product":**
    - `PhotoGallery` (owner `competitor_product`)
    - **Code**: the Auto/Manual block from `CustomerForm.vue:35-60` with `useNumberSeries('competitor_products')`, ADD only; read-only text in EDIT
    - **Name** (required, max 150, counter, placeholder "e.g. Mie Sedaap Goreng 90g")
    - **Brand**: `InfiniteSelect` on active brands (in EDIT, the current brand is passed as `initialOption` even if inactive). The `#footer` slot holds a "+ Add new brand…" button, shown only with brand WRITE (`usePermissions('/competitor-brands').canWrite`). It opens a nested `Dialog` hosting `CompetitorBrandDialog` in ADD mode, and on save sets the new brand as `initialOption` and the model value
    - Read-only **Manufacturer** text under the brand, taken from the selected brand
    - **Category** (required) and **Principal** (optional, `showClear`): `Select`s from `loadLabelFilterOptions`
    - **UOM group** (required): `InfiniteSelect` on the UOM groups service. Check its name in `src/services`, e.g. `UomGroupsService` / the generic `/gen/v1/uom-groups`
    - **Reference price** (optional): `InputNumber` with `mode="decimal"`, `minFractionDigits=0`, `maxFractionDigits=2`, a suffix `/ {base unit of the selected group}`, and the hint "Not used in any calculation. Only flags unusual survey answers (e.g. a typo of Rp 32.000)"
    - **Active** (EDIT only, `ToggleSwitch`, hint "Inactive products can't be picked for new surveys or merges; existing data is kept")
  - **Right column, card "Comparison Products":**
    - Subtitle: "Our products compared directly with this one. One is marked ★ primary."
    - A plain `DataTable` over the local `comparisons` ref, with a ★ radio (`RadioButton` bound to `primaryProductId`), product name + code, "Principal › Category" muted, and a remove `×`. Rows can be reordered with `reorderableRows` (the order is saved).
    - A dashed "+ Add comparison product" button opens `ComparisonProductPickerDialog`.
    - **Primary rules:** the first added row becomes primary automatically. Removing the primary makes the first remaining row primary. The submit validation (zod refine) requires exactly one primary when the list is non-empty. That error can't normally happen in the UI, but keep it as a guard.
  - **Footer** (EDIT): "Last changed: {updatedByName} · {updatedAt}", plus Cancel / Save.
- **Validation:** zod + `zodResolver` (required fields, lengths, price ≥ 0).
- **Server errors by `code`:**

  | Server `code` | Shown on |
  |---|---|
  | `code_duplicate` | the Code field |
  | `name_duplicate` | the Name field |
  | `brand_inactive` | the Brand field |
  | `primary_required` | the comparison card |
  | `number_series_missing` | a toast with a link to Number Series |
  | anything else | the generic error toast |

  Put the mapping in `competitorProductErrors.ts` (like `reasonErrors.ts`).
- **SelectButton bug:** the Auto/Manual toggle uses a local ref (`useNumberSeries` already does).

### `ComparisonProductPickerDialog.vue`

Copy the layout of `src/views/sales-teams/components/SalesTeamProductPickerDialog.vue`, minus the tree:

- **Props:** `categoryOptionId?`, `principalOptionId?`, `excludeIds: number[]`.
- **Controls:** a search `InputText` and a `ToggleSwitch` "Same category only" (default **on** when `categoryOptionId` is set). When on, the list is filtered with `ProductsService.labelFilterParam` on the category option, plus the principal option when set.
- **List:** a lazy paginated multi-select `DataTable` on `ProductsService.list` with columns Code, Name, Principal, Category. Rows in `excludeIds` are disabled and show "Added".
- **Confirm:** emits `select(products[])`, and the form appends them with `isPrimary=false` (except the auto-primary rule above).
- **Wording:** the header is "Add comparison products", never "SKU".

### Create-from-recommendation mode

`/competitor-products/create?recommendationId=ID`. The create view loads `CompetitorProductRecommendationsService.get(id)`. If it isn't `pending`, show an error toast and go back to the Recommendations tab.

- A `Message severity="info"` banner: "Creating from a recommendation by {submitter} · {createdAt} · \"{name}\"".
- **Name** is prefilled from the recommendation's name (trimmed; the admin will usually tidy it). **Reference price** is prefilled from `observedPrice` only when `observedUom` is absent. Otherwise leave it empty, with the hint "Observed: Rp {price} / {uom}".
- `PhotoGallery` gets `carryOver = recommendation.photos`, all selected by default up to 3.
- If `similarPending` is non-empty: a checkbox list "Also resolve these similar recommendations", unchecked by default. The selected ids are added to `recommendationIds`.
- Submit calls `CompetitorProductRecommendationsService.createProduct(payload, [id, ...selectedSimilar], carryOverIds)`, then flushes any *newly added* local photos to the new id (the backend counts carried photos against the limit, so cap `max - carried`). Then `afterCreate({ id })`.
- A 409 `recommendation_not_pending` (someone resolved it meanwhile) → a toast and back to the tab.

---

## 6. Recommendations tab (phase 6)

`src/views/competitor-products/components/RecommendationsTab.vue`, emitting `changed` after any action.

- **Filters:** status `Select` (Pending default / Created / Merged / Rejected / All) and search (name). Data comes from `CompetitorProductRecommendationsService.list`, paged with a PrimeVue `Paginator` (20 per page). Use a `DataView`-style card list, not a table.
- **Card** (mockup 3 layout):
  - **Left:** photo thumbnails (`PhotoGallery` readonly, or a simple thumb row with the zoom dialog).
  - **Middle:**
    - the quoted name in bold
    - key-value lines: Submitted by `{submitter.name} · {createdAt}`, Customer `{customer.name}` (omitted when absent), Observed price `Rp {observedPrice} / {observedUom.name}`, Notes
    - **when pending:**
      - with `suggestions`: an info box "Similar: **{name}** ({code}) · {score×100}%". Further suggestions are listed smaller underneath, each clickable to make it the merge target. When `siblingIds.length > 0`, add "· {n} other recommendations point to this product".
      - else with `similarPending`: "Similar pending recommendations: {names}".
      - else: muted "No similar product in the master."
    - **when resolved:** a status tag + "→ {competitorProduct.code} {name}" (link to edit) or "Reason: {rejectReason}", plus "by {resolvedByName} · {resolvedAt}".
  - **Right**, pending only and with `canWrite`:
    - **Merge into {selected suggestion code}** (primary button, only when there is a suggestion): opens the merge confirm dialog with the target preset.
    - **Merge into…**: opens the merge dialog with an empty target.
    - **Create new product…** (primary button when there is no suggestion): navigates to the create-from-recommendation route.
    - **Reject** (danger): opens the reject dialog.
    - A help line: "Merge = recorded as this product. Reject = kept as history only."
- **Merge dialog** (`components/MergeRecommendationDialog.vue`):
  - target `InfiniteSelect` on `CompetitorProductsService.list({ isActive: true })`, with the label "code · name · brand"
  - when the recommendation has `siblingIds`, a checkbox "Also merge the {n} other recommendations pointing to this product" (default **on**, shown only when the chosen target equals the best suggestion)
  - Confirm → `merge(target, [id, ...siblings?])`, then a success toast "{n} recommendations merged into {code}", then refresh + `changed`
  - 409 `recommendation_not_pending` → a toast "Already resolved by someone else", then refresh. 409 `competitor_product_inactive` → a message on the target field.
- **Reject dialog:** an optional `Textarea` reason (max 255). Confirm → `reject`, then a toast + refresh + `changed`.
- **Read-only users** (148 without 149) see the cards without the action column.

---

## 7. i18n (`en-US.ts` + `id-ID.ts`, same keys, same order)

```
navigation.competitorProducts                 Competitor Products / Produk Kompetitor
navigation.competitorBrands                   Competitor Brands / Brand Kompetitor

competitorBrands.title | add | edit | view
competitorBrands.fields.{name,manufacturer,products,active,lastChanged,activeHint}
competitorBrands.filters.{search,statusActive,statusInactive,statusAll}
competitorBrands.errors.{nameDuplicate,inUse}

competitorProducts.title | add | edit | view
competitorProducts.tabs.{master,recommendations}            Master / Master; Recommendations / Rekomendasi
competitorProducts.codeMode.{auto,manual,assignedOnSave}
competitorProducts.fields.{code,name,brand,manufacturer,category,principal,uomGroup,referencePrice,active,photos,lastChanged}
competitorProducts.hints.{namePlaceholder,referencePrice,active,photos,addBrand}
competitorProducts.list.{columnProduct,columnBrand,columnCategory,columnComparisons,columnReferencePrice,noComparison,legend}
competitorProducts.filters.{search,allBrands,allCategories,allPrincipals,statusActive,statusInactive,statusAll}
competitorProducts.comparisons.{title,subtitle,add,primary,remove,pickerTitle,sameCategoryOnly,added,empty}
                                              Comparison Products / Produk Pembanding; Primary / Utama
competitorProducts.recommendations.{statusFilter,status.{pending,created,merged,rejected},submittedBy,customer,observedPrice,notes,
                                    similar,similarScore,siblings,similarPending,noSimilar,
                                    mergeInto,mergeIntoEllipsis,createNew,reject,help,
                                    mergeTitle,mergeTarget,alsoMergeSiblings,merged,rejectTitle,rejectReason,rejected,
                                    banner,carryOverPhotos,alsoResolveSimilar,observedHint,alreadyResolved}
competitorProducts.errors.{codeDuplicate,nameDuplicate,brandInactive,primaryRequired,numberSeriesMissing,inUse,
                           targetInactive,fileLimitReached,photoUploadFailed}
```

- id-ID: "Rekomendasi" for the tab, "Produk pembanding utama" for primary, "Gabungkan ke…" for merge, "Jadikan produk baru…" for create new, "Tolak" for reject.
- **Never "SKU". Customer, never Outlet.** Grep the diff for `SKU` and `Outlet` before committing.

---

## 8. Tests and checks (phase 7)

- **Service specs** for all three services: paths, query params, and payloads (`merge` body, `createProduct` body, reject body).
- `PhotoGallery.spec.ts`:
  - the add tile is hidden at `max`
  - pending mode doesn't upload until `flushPending`
  - carry-over tiles count against `max`
  - a 409 is emitted as an error
- `CompetitorProductForm.spec.ts`:
  - the first comparison becomes primary
  - removing the primary moves it to the first remaining row
  - the payload carries the order + `isPrimary`
  - Auto mode omits `code`
  - a 409 `name_duplicate` lands on the name field
  - "+ Add new brand…" is hidden without brand write
- `ComparisonProductPickerDialog.spec.ts`: the same-category toggle adds or removes the label filter param; excluded ids are disabled.
- `RecommendationsTab.spec.ts`:
  - the suggestion box shows the top suggestion and the sibling text
  - the merge dialog's "also merge" checkbox defaults on and is sent as extra ids
  - no action column without write
  - a 409 `recommendation_not_pending` refreshes the list
- `InfiniteSelect` spec: the footer slot renders.
- `npm run type-check`, `npm run lint`, `npm run test:unit`.
- Live E2E: master §9 with Playwright MCP (`InputNumber` needs real keystrokes; the file input via `browser_file_upload`). Seed recommendations by curl. Stop the dev servers by port PID afterwards, and run `graphify update .` from the repo root.

---

## 9. Deviations (filled in during implementation)

- **No `CompetitorProductForm.spec.ts`**: the form's logic (first-comparison-primary, brand-footer gating, payload shape) is covered only by the live E2E still to run. Every other spec in §8 exists.
- **`LabelRef` renamed `CompetitorLabelRef`** to avoid a barrel clash with `salesTeam.type`.
- **Picker uses `/v1/products`** via a new `ProductsService.searchWithLabels` (the only endpoint that reads `labelFilter` and returns labels). Principal/category columns come from the product's flattened `labels`.
- **`CompetitorBrandsService.listForSelect`** translates the InfiniteSelect query to `search`/`isActive`; the merge-target picker pages through `nextCursor`/`hasMore`, which the list endpoint now sends (`CompetitorProductsService.toListQuery` maps the `cursor` InfiniteSelect sends back to `offset`). The brand picker still sends no limit; check live that it gets every brand.
- **`InfiniteSelect`** gained a `#footer` slot and an exposed `refresh()`; the form remounts the brand picker (key bump) after inline create instead.
- **Create-from-recommendation** reuses `CompetitorProductForm` through a `recommendation` prop; merge/reject/create actions all gate on product WRITE (149), as the backend does.
- Shared `buildFileUrl` lives in `src/utils/fileUrl.ts`.

## 10. Change 2026-10-14: "our price" per comparison (free input)

**Status:** IMPLEMENTED 2026-10-14 (type-check, lint, unit green; live E2E not run). Decisions are in master plan §11. BE contract is in BE doc §10.

### Types
- `CompetitorProductComparison`: add `price?: string` and `baseUomName?: string`.
- Comparison input: add `price?: string`.
- `primaryComparison`: add `price?: string`.
- `survey.type.ts` grid product: add `comparisonPrice?: string`.
- Absent means empty. Never compare against `null`.

### Form (`CompetitorProductForm.vue`)
- New column in the comparison DataTable, between Name and the remove button. The header is `competitorProducts.comparisons.columnPrice`.
  - Editable: `InputNumber` per row, with the same decimal props as `referencePrice` and `min=0`.
  - Readonly: the formatted value, or `—`.
  - Suffix: `/ {baseUomName}` when present. Rows added from the picker show no suffix until saved, because the picker doesn't return the UOM.
- Keep the row's `price` when calling `setPrimary`, `onReorder` and `onPicked`.
- Store the price as `number | null` locally and convert it at the edges, as `referencePrice` does.
- Validation: a negative price on any row → `errors.comparisons = validation.priceInvalid`.
- Payload: `comparisons: [{ productId, isPrimary, ...(price != null ? { price: price.toFixed(2) } : {}) }]`.
- The create-from-recommendation prefill sets no comparison prices.

### List (`CompetitorProductsView.vue`)
The primary chip shows `· {formatted price}` after the name when `primaryComparison.price` is set. Use the same formatter as the reference-price column.

### Survey editor (`CompetitorGridEditor.vue`)
New column `surveys.grid.columns.comparisonPrice`: the formatted `comparisonPrice`, or `—`. `SurveyPhonePreviewDialog` is unchanged.

### i18n (en-US + id-ID, same change)
- `competitorProducts.comparisons.columnPrice`: "Our price / base unit" / "Harga kita / satuan dasar"
- `surveys.grid.columns.comparisonPrice`: "Our price" / "Harga kita"
- Review `competitorProducts.comparisons.subtitle` in case it implies there is no price.

### Tests
- `competitorProducts.service.spec.ts`: the payload round-trips `comparisons[].price`.
- Adjust the CompetitorGridEditor spec if one exists.
- Run `type-check`, `lint` and `test:unit`.
- Live E2E: master plan §9 step 8, run only when the user says go. Type into InputNumber with `pressSequentially`.
