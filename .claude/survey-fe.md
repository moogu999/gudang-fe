# Survey — Frontend Plan

**Status:** PLANNED 2026-10-12. FE phases 3–5 IMPLEMENTED 2026-10-12 (uncommitted); unit tests, type-check and lint green; live E2E (master plan §9) NOT run, waiting for the user's go-ahead.
**Master plan:** `../../.claude/survey-master-plan.md` (decisions D1–D20, E2E §9). Backend contract: `../../gudang-be/.claude/survey-be.md` §4–§6. This doc covers phases 3–5.

**Forms:** the survey builder is a **page** (create / edit routes, `usePostSaveNavigation`) with tabs **Settings / Questions** (regular) or **Settings / Products & Columns** (stock check), plus **History**. The config form is a **dialog** inside the Configs tab `survey`.
**Wording:** **Customer**, never Outlet; **Product**, never "SKU". Types: "Regular survey" / "Stock check" (id: "Survey biasa" / "Cek Stok"). The mockup's "Aktifkan" is **Publish**.

---

## 1. Files

```
src/types/survey.type.ts, surveyConfig.type.ts                          (+ src/types barrel)
src/services/surveys.service.ts, surveyConfigs.service.ts               (+ src/services barrel)
src/views/survey-configs/
  SurveyConfigsView.vue                                                 (tab `survey`, copy of MustSellListConfigsView)
  SurveyConfigDialog.vue
src/views/surveys/
  SurveysView.vue                                                       (mockup UI 1)
  SurveyCreateView.vue  SurveyEditView.vue
  SurveyForm.vue                                                        (header buttons, tabs, mode add|edit, readonly)
  surveyHelpers.ts (+ .spec.ts)                                         pure: status severity, lock matrix, list subtitle,
                                                                        question factory per type, payload builder, validation
  surveyErrors.ts (+ .spec.ts)                                          BE code → i18n key / form field / question index
  components/
    SurveyStatusTag.vue
    SurveyTypeCards.vue                                                 two cards, disabled after create
    SurveySettingsTab.vue                                               header, frequency, required, notes
    SurveyScopeCard.vue                                                 customer scope (MslScopeCard pattern) + sales-team chips
    SurveyReachPanel.vue                                                customers + salesmen + View customers
    SurveyQuestionsTab.vue                                              type palette, ordered question cards, drag reorder
    SurveyQuestionCard.vue                                              common fields + per-type editor slot, collapse, delete
    question-editors/
      NumberQuestionEditor.vue  ChoiceQuestionEditor.vue  PhotoQuestionEditor.vue
      CompetitorGridEditor.vue                                          categories, ask flags, product table with exclude toggles
    SurveyStockCheckTab.vue                                             source, product table, columns table
    SurveySalesTeamPickerDialog.vue
    SurveyPhonePreviewDialog.vue (+ .spec.ts)                           D19
    SurveyHistoryTab.vue                                                copy of MslHistoryTab
```

---

## 2. Reuse: do not rebuild any of these

| Need | Use |
|---|---|
| Create → land on edit, stay on edit after save, re-read + `:key` remount | `usePostSaveNavigation('/surveys')`, as `MustSellListCreateView` / `MustSellListEditView` |
| Stale-version 409 dialog | `MustSellListEditView.vue` (`MSL_STALE` ConfirmDialog → reload) |
| Code Auto/Manual + preview | `codeMode` pattern from `MustSellListForm.vue` + `NumberSeriesService.preview('surveys')` |
| Branch picker | `InfiniteSelect` + `userBranchesFetcher(authStore.branchIds)` + `branchLabel` |
| Principal options (+ "Internal") | `loadLabelFilterOptions('principal', …)` (`views/sales-teams/salesTeamHelpers.ts`); the list filter keeps a "Internal" entry mapped to `principalOptionId=0` |
| Category options (grid, "Add from category") | `loadLabelFilterOptions('category', …)` |
| Customer scope card | `MslScopeCard.vue`: copy into `SurveyScopeCard.vue` and add the sales-team chip row; or, if the copy is verbatim, give `MslScopeCard` a default slot for extra rows and reuse it (record in Deviations) |
| Customers dialog | `MslCustomersDialog.vue`, `MslProductPickerDialog.vue`, `MslCategoryPickerDialog.vue` are hard-wired to `MustSellListsService` and a **required** `principalOptionId`. Add an optional `fetcher` prop (default = the MSL service call) and make `principalOptionId` optional in the two product dialogs; survey passes `SurveysService.customers / productOptions`. Don't copy the three dialogs |
| `/v1` list paging/search | `createListQueryAdapter` + `static toListQuery` (drops sort → no sortable columns) |
| List filter → refresh | `MustSellListsView` pattern (computed `url`, `watch(url)` → `nextTick` → `table.clearSearch()`) |
| Header counts | `MustSellListsView` (`meta.counts`) |
| Drag reorder | Options and stock-check products: `<Column row-reorder>` as `MslProductsTable.vue`. Question **cards**: the repo has no card drag library (no `vuedraggable` / `sortablejs`, checked 2026-10-12), so each card gets ↑ / ↓ buttons; don't add a dependency for this |
| Status tag | `MslStatusTag.vue` (copy, same severities) |
| Date ↔ API | `toApiDate` / `fromApiDate` |
| Start / end pickers | as `MustSellListForm.vue` |
| History tab | `MslHistoryTab.vue` + `constants/auditReferenceTypes.ts` (add `survey`, `survey_config`) |
| Config tab | `MustSellListConfigsView.vue` (`embedded`, `defineExpose({ openAddDialog })`) and its `ConfigsView.vue` wiring |
| Delete confirm | `useConfirmDelete` |
| Permissions | `usePermissions('/surveys')` → `canRead`, `canWrite`; publish via `hasPermission(PERMISSIONS.SURVEY_PUBLISH)` |

### Conventions that have caused bugs before

- **Locales:** both files in the same commit, same keys, same order.
- **Dates:** `YYYY-MM-DD` via `toApiDate`, never `toISOString()`.
- **Omitted keys = empty:** `principal`, `helpText`, `numberMin/Max`, `options`, `grid`, `grid.frozen`, `stockCheck`, `salesTeams`, `sourceSurvey`, `scopeValues` may be absent. `=== undefined` / `?? []`, never `!== null`.
- **Decimals are strings** on the wire (`numberMin`, `numberMax`).
- **SelectButton:** programmatic writes don't repaint it. Local refs for frequency, required, stock source, code mode, config level / required mode.
- **Picker prop timing:** dialogs depending on `branchId` / `principalOptionId` / category ids `watch` + `nextTick` (the AP Payment picker bug).
- **Remount:** `@primevue/forms` reads `initialValues` only on mount; remount with `:key` after the re-read.
- **Toast groups:** every view hosts its own Toast group and passes it down.
- **New enum values** (question types, `required_mode`, `stock_source`) need: the TS union, every `switch`/gate, and both locales. Grep siblings.

---

## 3. Types

```ts
export type SurveyType = 'regular' | 'stock_check'
export type SurveyFrequency = 'once_per_period' | 'every_visit'
export type SurveyStatus = 'draft' | 'published'
export type SurveyDisplayStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type SurveyScopeLevel = 'outlet_type' | 'channel' | 'category'
export type SurveyRequiredMode = 'block_checkout' | 'reminder'
export type SurveyQuestionType =
  'text' | 'number' | 'yes_no' | 'single_choice' | 'multi_choice' | 'photo' | 'competitor_grid'
export type SurveyStockSource = 'msl' | 'products'

export interface SurveyQuestionOption { id?: number; label: string }
export interface SurveyGridConfig {
  categories: { id: number; name?: string }[]
  excluded: { id: number; name?: string }[]
  askAvailability: boolean; askPrice: boolean; askPhoto: boolean
  askOurStorePrice: boolean; allowUnlisted: boolean
  frozen?: SurveyGridProduct[]          // published only
}
export interface SurveyGridProduct {
  competitorProductId: number; name: string; brandName: string
  comparisonProduct?: { id: number; name: string }
  comparisonPrice?: string                // added 2026-10-14, live, shown in CompetitorGridEditor
  excluded?: boolean                    // preview endpoint only
}
export interface SurveyQuestion {
  id?: number; clientKey: string        // clientKey: stable key for v-for / drag before save
  type: SurveyQuestionType; text: string; helpText?: string; isRequired: boolean
  numberMin?: string; numberMax?: string; numberAllowDecimal?: boolean
  choiceAllowOther?: boolean; options?: SurveyQuestionOption[]
  photoMax?: number
  grid?: SurveyGridConfig
}
export interface SurveyStockCheck {
  source: SurveyStockSource; askStore: boolean; storeRequired: boolean; askDisplay: boolean
  products: { id: number; code: string; name: string; categoryName?: string }[]
}
export interface SurveyDetail { /* header + scopeValues + salesTeams + questions? + stockCheck? + sourceSurvey? + displayStatus + version + stamps (BE §6) */ }
export interface SurveyListRow { /* BE §6 list row */ }
export interface SurveyConfig { branchId: number; branch?: {…}; scopeLevel: SurveyScopeLevel; requiredMode: SurveyRequiredMode; stockCheckQtyDefault: boolean; updatedAt?: string }
export interface SurveyPreview { customerCount: number; salesmanCount: number; activeMslCount: number }
```

`clientKey` is stripped by the payload builder.

---

## 4. Services, config tab and list (phase 3)

### `surveys.service.ts`

`list(query)`, `get(id)`, `create(body)`, `update(id, body)`, `remove(id)`, `publish(id, version)`, `unpublish(id, version)`, `endEarly(id, version)`, `duplicate(id)`, `preview(body)`, `customers(query)`, `productOptions(query)`, `competitorGridPreview({categoryOptionIds, excludeIds})`, `salesTeamOptions({branchId, q})`.

### `surveyConfigs.service.ts`

`list`, `myBranch(branchId)`, `get(branchId)`, `upsert(branchId, body)`, `remove(branchId)`.

### `api.ts`

`SURVEYS`, `SURVEY_BY_ID(id)`, `_PUBLISH(id)`, `_UNPUBLISH(id)`, `_END_EARLY(id)`, `_DUPLICATE(id)`, `SURVEYS_PREVIEW`, `SURVEYS_CUSTOMERS`, `SURVEYS_PRODUCT_OPTIONS`, `SURVEYS_COMPETITOR_GRID_PREVIEW`, `SURVEYS_SALES_TEAM_OPTIONS`; `SURVEY_CONFIGS`, `SURVEY_CONFIGS_MY_BRANCH`, `SURVEY_CONFIG_BY_BRANCH(id)`.

### `SurveyConfigsView.vue` (tab `survey` in ConfigsView)

- Copy of `MustSellListConfigsView`. Table: branch, scope level tag, required mode tag ("Blocks check-out" / "Reminder only"), qty default (Yes/No), last updated, edit/delete.
- `SurveyConfigDialog`: branch (locked on edit); scope level `SelectButton` (local ref); "What does Required mean on the phone?" `SelectButton` Block check-out / Reminder only, hint: "Applies to every Required survey of the branch, immediately. Reminder = check-out stays enabled with a confirmation."; "Ask store stock by default in new stock checks" `ToggleSwitch`, hint "Off = only Available / Not available".
- Help text: "Customer scope level applies to new surveys only."
- `ConfigsView.vue` wiring: `usePermissions('/survey-configs')`, option `{ label: t('navigation.surveyConfigs'), value: 'survey' }`, `canWriteActive`, `onAddClick`, `v-if` render; redirect route `survey-configs` → `/configs?tab=survey`; add 165/166 to the Config menu item's `permissionsAny`.

### `SurveysView.vue` (mockup UI 1)

- Branch selector (user's branches, primary default). Header: "3 active · 1 scheduled · 1 draft · Config: Required surveys block check-out" (or "…: Required surveys only remind"; "No config — set it up" link when absent, which also disables New).
- Filters: principal (All / each / Internal), type, frequency, status (Current default, Draft, Scheduled, Active, Ended, All), search.
- Columns (none sortable): **Survey** (name, code muted; subtitle from `surveyHelpers.listSubtitle`: "4 questions · incl. Competitor Grid", "3 questions · photo", "No questions yet", "Follows customer MSL · Available + Store stock", "12 products · Available only", "Duplicated from <name>"), type tag for stock checks, **Principal** ("Internal" when absent), **Period**, **Frequency**, **Required** (tag Required / Optional), **Status** (`SurveyStatusTag`).
- Row click → edit. ⋯ menu: Duplicate (WRITE; navigates to the copy, warns when `scopeCleared`), End early (PUBLISH, Active only, confirm), Delete (WRITE, Draft only, `useConfirmDelete`).
- Footnote: "Response progress and export come with the N-Force app."

---

## 5. Create / edit page (phase 4)

### `SurveyCreateView.vue` / `SurveyEditView.vue`

Copy of the MSL views. Create: reads the branch config (`myBranch`); 404 → inline message with a link to the config tab and no form. Edit: loads the detail, shows the stale dialog on `SURVEY_STALE`, remounts on re-read.

### `SurveyForm.vue`

- **Header bar:** name, code, `SurveyStatusTag`, type tag; "Created by <name> · <date>". Buttons: **Preview phone** (always), **Save draft** / **Save** (WRITE, not Ended), **Publish** (PUBLISH, Draft; disabled with a tooltip listing the reasons from `surveyHelpers.publishBlockers(form, preview, gridCounts)`), **Unpublish** (Scheduled), **End early** (Active), ⋯ Duplicate / Delete.
- Publish/unpublish/end-early save first when the form is dirty (as MSL), then send `version`.
- **Tabs:** Settings · Questions (badge = count) **or** Products & Columns · History (edit mode only).

### `SurveyTypeCards.vue`

Two cards (Regular survey: "Free questions, 7 types incl. Competitor Grid. Filled in after the order. Results for reports." / Stock check: "Our own products × fixed columns (Available, Store stock, Display stock). Filled in before the order. Used by the order screen."). Selectable on create only; afterwards disabled with "The survey type can't be changed after creation".

### `SurveySettingsTab.vue`

Branch (create only), code mode, name, principal (optional, "— Internal —"), start, end, frequency `SelectButton` with the hint "Once per period: after a customer has answered, the survey doesn't appear there again until the period ends (whoever the salesman is).", required `SelectButton` Required / Optional with the config hint ("Current config: Required = blocks check-out until filled in."), notes. Locks per §7. Then `SurveyScopeCard` and `SurveyReachPanel` side by side (stack on narrow screens).

### `SurveyScopeCard.vue`

- Customer scope as `MslScopeCard` (level label from the survey snapshot / branch config, "All" chip, chips + Add).
- **Sales teams (optional — empty = all teams)**: chips `TM-005 Indofood GT`, "+ Add" opens `SurveySalesTeamPickerDialog` (multi-select from `salesTeamOptions`, shows member count). Inactive saved teams show a muted "inactive" tag.

### `SurveyReachPanel.vue`

Debounced `preview` on scope/team change: "**1,240** customers · **8** salesmen" + "View customers" (shared `MslCustomersDialog` with the survey fetcher) + help "The survey appears when both the customer and the salesman are in scope. Customer count is across all branches."

---

## 6. Questions tab (regular, phase 4)

### `SurveyQuestionsTab.vue`

- "Add question" palette: Text, Number, Yes / No, Single choice, Multiple choice, Photo, Competitor Grid (disabled at 30 questions; Grid disabled at 3 grids). New question = `surveyHelpers.newQuestion(type)` (required on; choice with 2 empty options; photo max 3; grid all ask flags except photo on, our-store-price off, allow-unlisted on), appended and scrolled into view.
- Cards in order, numbered, reorderable with ↑ / ↓ (§2), each with delete (confirm when it has text).
- Banner: "No conditional logic: every question always shows, in order. Make questions that may not apply optional."
- **Locked mode** (Scheduled / Active): every field read-only except **help text**; palette, delete and reorder hidden; banner "Questions are locked after publishing. Only help text can change. Unpublish (while scheduled) or End and Duplicate to change questions."

### `SurveyQuestionCard.vue`

Number badge, question text (textarea, 300), type tag, "Help text" (optional, 300), **Required** toggle, then the type editor:
- **NumberQuestionEditor:** min, max (`InputNumber`, strings in the model), "Allow decimals".
- **ChoiceQuestionEditor:** option rows (label, reorder, delete), "+ Add option" (max 20), "Allow 'Other' with free text" toggle; inline errors for < 2 options and duplicate labels.
- **PhotoQuestionEditor:** "Max photos" 1–5; static note "Camera only (not from the gallery), with timestamp & GPS."
- Text / Yes-No: no extra editor.

### `CompetitorGridEditor.vue`

- "Take products from categories": category multi-select chips (`loadLabelFilterOptions('category')`).
- "Asked per product": checkboxes Available / Price / Photo (≥ 1, inline error) and "Store price of our comparison product".
- Product table from `competitorGridPreview` (Draft) or `grid.frozen` (published): Competitor product, Brand, Our comparison product (or "—"), **Include** toggle (Draft only; toggling edits `excluded`). Counter "6 of 8 products from the master (active)". Empty → warning "No competitor products in these categories — publishing will be blocked."
- Note: "The product list is frozen when the survey is published. New competitor products in the master won't enter a published survey; field proposals can still be added by salesmen."
- "Allow 'Product not in list'" toggle (hint: "creates a recommendation in Competitor Products").

---

## 7. Products & Columns tab (stock check, phase 4)

### `SurveyStockCheckTab.vue`

- **Product source** cards: **Follow customer MSL** ("Each customer automatically checks the products of the active MSLs that apply to it. No second list to maintain.") with the info line "N active MSLs in this branch" from `preview.activeMslCount` (+ "for <principal>" when set); **Pick from products** ("Pick per category or per product. Same list for every customer in scope.").
- Shared note: "On the phone, products the salesman's team doesn't carry are still shown for checking, but are not highlighted on the order screen."
- **Product table** (source `products` only): Code, Name, Category, remove, row-reorder; "Add product" (`MslProductPickerDialog` with the survey fetcher, `principalOptionId` optional), "Add from product category" (`MslCategoryPickerDialog`, same). Counter, max 200.
- **Columns table** (fixed labels, not editable): Column, Description, Input unit, Required:
  - Available / Not available — "always on" — — — Yes
  - Store stock (total in store, shelf + warehouse) — toggle — "Small unit (PCS/PAK), salesman picks" — toggle "When available"
  - Display stock (visible on the shelf only) — toggle, disabled while Store stock is off — "Same as store stock" — —
- Note: "Default for the qty columns comes from the branch config. All quantities are stored in the base unit. Display stock can't exceed store stock."
- Locked mode as §6.

---

## 8. Phone preview, status and read-only behaviour

### `SurveyPhonePreviewDialog.vue` (D19)

- Props: the current form model (unsaved), grid products already loaded by the editors, customer name placeholder "TK Sumber Rejeki".
- Phone frame (fixed 360×720 box, scrolls inside). Regular: title, "Question n of N", one question per screen rendered read-only-interactive by type (text input, number input, Yes/No buttons, radio/checkbox list + "Other", photo placeholder tiles × max, grid rows with the asked fields + comparison row when enabled + "Product not in list"), Back / Next. Required questions show a "Required" chip.
- Stock check: one screen "Check the shelf & store warehouse. Fill in stock when available." — one row per product: Available / Not available buttons; qty inputs (with a unit dropdown placeholder "PCS ▾") shown only when Available and the column is on; "Continue to order". Source `msl`: three sample rows labelled "Sample — products come from the customer's active MSL".
- Pure helper `previewScreens(form)` builds the screen list; unit-tested.

### Status and lock behaviour (`surveyHelpers.lockedFields(displayStatus)`)

| | Draft | Scheduled | Active | Ended |
|---|---|---|---|---|
| Type cards, branch | create only | ✗ | ✗ | ✗ |
| Name, notes, scopes | ✓ | ✓ | ✓ | ✗ |
| Principal | ✓ | ✗ | ✗ | ✗ |
| Start, frequency, required | ✓ | ✓ | ✗ | ✗ |
| End | ✓ | ✓ | ✓ (min today) | ✗ |
| Questions / stock content | ✓ | help text only | help text only | ✗ |
| Buttons | Save, Publish, Delete, Duplicate | Save, Unpublish, Duplicate | Save, End early, Duplicate | Duplicate |

Read-only for users without WRITE (and Ended): every input disabled, no palette, no buttons except Preview phone.

Error mapping (`surveyErrors.ts`): `SURVEY_INVALID_QUESTION` / `SURVEY_GRID_EMPTY` scroll to and highlight the question card by index / id; `SURVEY_PRODUCT_PRINCIPAL_MISMATCH` marks the product rows; `SURVEY_FIELD_LOCKED` → toast + reload; `SURVEY_CONFIG_MISSING` → link to the config tab; `SURVEY_CODE_DUPLICATE` → Code field.

---

## 9. History tab: `SurveyHistoryTab.vue`

Copy of `MslHistoryTab` with reference type `survey`.

---

## 10. Wiring

### `src/constants/permissions.ts`

`SURVEY_READ: 162`, `SURVEY_WRITE: 163`, `SURVEY_PUBLISH: 164`, `SURVEY_CONFIG_READ: 165`, `SURVEY_CONFIG_WRITE: 166`, and the route → permission map entries for `/surveys` and `/survey-configs`.

### `src/router/index.ts`

`/surveys` (list), `/surveys/create`, `/surveys/:id/edit`, redirect `/survey-configs` → `/configs?tab=survey`; meta permissions as MSL.

### `src/components/menu/menu.ts`

Sales section: "Surveys" after Display Programs (`labelKey: 'navigation.surveys'`, read permission 162). Config item `permissionsAny` gains 165/166.

### i18n: both files, same change, same key order

`navigation.surveys`, `navigation.surveyConfigs`; `surveyConfigs.*` (fields, modes, hints); `surveys.*`: list (title, header counts, config line, filters, columns, subtitles, footnote), types + type card texts, settings fields + hints, scope + reach texts, question types, question editor labels, grid editor texts, stock-check source/column texts, lock banners, publish blockers, phone preview strings, actions + confirms, error codes (`surveys.errors.<CODE>`), history. id-ID follows the mockup's own Indonesian wording where it exists ("Survey biasa", "Cek Stok", "Sekali per pelanggan per periode", "Setiap kunjungan", "Wajib", "Opsional", "Ada / Tidak", "Stok toko", "Stok display"), but "Pelanggan" for Outlet and "Produk" for SKU.

---

## 11. Tests (vitest)

| File | What |
|---|---|
| `surveyHelpers.spec.ts` | `listSubtitle` per row shape; `lockedFields` per status; `newQuestion` defaults per type; payload builder (strips `clientKey`, omits other-type fields, decimals as strings, regular vs stock check); client validation mirrors BE §5.1; `publishBlockers` |
| `surveyErrors.spec.ts` | each code → key/field/index |
| `SurveyPhonePreviewDialog.spec.ts` | `previewScreens`: one screen per question, grid rows + comparison row, stock check hides qty on Not available, `msl` sample rows |
| `CompetitorGridEditor` (mount) | toggling Include updates `excluded`; frozen list shown when published; empty warning |
| MSL dialogs | existing specs still green after adding the `fetcher` prop; one case with the survey fetcher and no principal |

Run `npm run test:unit`, `npm run type-check`, `npm run lint`.

---

## 12. Verification

1. Unit tests, type-check and lint green.
2. Against the live backend: the master plan §9 (all items) with Playwright MCP — **only once the user gives the go-ahead**.
3. `graphify update .` from the repo root.

---

## 13. Deviations

Implemented 2026-10-12. Where the code differs from §1–§12:

- **`ApiError` gained `details`** (`field`, `index`, `questionId`, `productIds`), filled in `services/api.ts` from the error body. Without it the FE could not point `SURVEY_INVALID_QUESTION` / `SURVEY_GRID_EMPTY` / `SURVEY_PRODUCT_PRINCIPAL_MISMATCH` at a card or row. `errorLocation()` in `surveyErrors.ts` reads it; the form's exposed `applyError(e)` highlights and scrolls.
- **No `SurveySettingsTab.vue`**: the Settings tab lives inside `SurveyForm.vue`, which owns all state (a separate tab component would have needed ~20 v-models). `SurveyTypeCards.vue`, `SurveyScopeCard.vue`, `SurveyReachPanel.vue` are separate as planned.
- **Tabs live in `SurveyForm`**, with the History tab as a slot the edit view fills. The active tab is a `v-model:tab` owned by the edit view, so the remount after a save keeps the user on the same tab.
- **Shared MSL dialogs** got the planned optional props: `fetcher` on `MslCustomersDialog`, `MslProductPickerDialog` and `MslCategoryPickerDialog`; `principalOptionId` is optional on the two product dialogs. `MslCategoryPickerDialog` shows a principal-free count text (`mustSellLists.products.categoryCountAll`) and hides the principal help when there is no principal.
- **`MslScopeCard` was copied** into `SurveyScopeCard` (not given a slot) because the teams block shares its toast group, branch and i18n; the survey copy uses `surveys.scope.*`.
- **Choice options reorder with the same DataTable row-reorder as products**, not ↑ / ↓; only the question cards use ↑ / ↓. Options carry a client-only `clientKey` (never sent).
- **Header counts and the config summary** come from one `limit=1&status=all` call per branch, as MSL. The branch filter is required (not clearable).
- **Principal "Internal"** is its own entry with value `0` in the list filter; the form's principal select is clearable instead (empty = Internal).
- **Stock check `askStore`** is always sent explicitly (the form already read the branch default), so the API's "omitted" rule is never relied on.
- **Content validation is skipped on a published survey** (questions and stock content are locked, the API ignores them anyway); only the header is validated.
- **Grid editor** fetches the live list once per category change with no exclusions and applies the Include toggles locally. A viewer without `SURVEY_WRITE` cannot read the preview endpoint, so a *draft* grid shows no product rows for them (a published grid shows its frozen list). Publish blockers treat a not-yet-loaded grid as unknown, never empty.
- **Indonesian wording**: "customer" / "Publikasikan" / "Batalkan publikasi" follow the existing MSL id-ID strings rather than "Pelanggan" / "Terbitkan" from the plan, so the two sibling modules read alike.
- **Tests**: `surveyHelpers.spec.ts`, `surveyErrors.spec.ts`, `surveys.service.spec.ts`, `CompetitorGridEditor.spec.ts`, plus a fetcher case in `MslProductPickerDialog.spec.ts`. The phone preview's `previewScreens` is tested in `surveyHelpers.spec.ts`; the dialog component itself, the form and the list view are covered by the E2E walk-through only.
- **Not run**: the live E2E (master plan §9), including the BE curl smoke that is still pending (403 without 162, parallel manual-code POST, parallel PUTs).
