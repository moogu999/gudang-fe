# Visit Rules — Frontend Plan

**Status:** IMPLEMENTED 2026-11-17, uncommitted. Unit/type/lint green. Live E2E not run (waiting for the user's go).
**Master plan:** `../../.claude/visit-rule-master-plan.md` (decisions D1–D14, catalog §4, E2E §9). **Backend contract:** `../../gudang-be/.claude/visit-rule-be.md` §6. Where they disagree, the master plan wins. Record deviations in §12.

Scope: one new page, `/visit-rules`; an employee-form checkbox; removal of the survey config "required mode".

---

## 1. Files

```
src/types/visitRule.type.ts
src/services/visitRules.service.ts           (+ export in src/services/index.ts)
src/views/visit-rules/
  VisitRulesView.vue                          # page shell: company select, tabs, check-salesman button
  visitRuleHelpers.ts                         # pure: level labels per style, diff, pinned detection, payload builders
  visitRuleHelpers.spec.ts
  components/
    VisitRuleTable.vue                        # shared table (mode 'company' | 'team')
    RuleLevelSelector.vue                     # SelectButton w/ disabled options
    RadiusInput.vue                           # InputNumber m, 10–5000
    ExemptReasonsPicker.vue
    TeamOverridePanel.vue                     # left list + right editor
    VisitRuleHistoryTab.vue
    CheckSalesmanDrawer.vue
    VisitRuleTable.spec.ts  TeamOverridePanel.spec.ts  CheckSalesmanDrawer.spec.ts
```

Also touched:

- `src/constants/api.ts`, `src/constants/permissions.ts` (`VISIT_RULE_READ: 176`, `VISIT_RULE_WRITE: 177`)
- `src/router/index.ts`, `src/components/menu/menu.ts`
- `src/i18n/locales/en-US.ts` and `id-ID.ts`
- `src/views/employees/EmployeeDetailView.vue` and the employee type
- the survey-config files listed in §9

---

## 2. Reuse: do not rebuild any of these

| Need | Reuse |
|---|---|
| History list from `audit_trails` | `SurveyHistoryTab.vue` pattern: `AuditTrailsService` + `GenericQueryBuilder` + `FilterOperator.EQUAL` on `reference_type` / `reference_id` |
| Permission checks | `usePermissions` |
| Company list for the selector | `GEN_COMPANIES` (shared master, readable by any signed-in user) |
| Reason picker | `REASONS` endpoint (`/v1/reasons`) filtered by `type=customer_no_order` and active. Needs REASON_READ on the role |
| Employee picker | the existing employee `InfiniteSelect` usage, filtered to the Salesman/Canvass type ids by name via `EMPLOYEE_TYPE_NAMES` (`src/constants/employeeTypes`) |
| Error toast | `commonErrorToast`. API error codes come in `ApiError.code` / `details` |

### Conventions that have caused bugs before

- **SelectButton programmatic writes don't repaint** (memory `feedback_selectbutton_programmatic_write`). `RuleLevelSelector` keeps a local `ref` and emits `update:modelValue`; never write into a Form state from outside.
- **Omitted vs null:** the BE omits nil fields (`radiusM`, `override`, `lastChangedBy`). Use `== null` / optional chaining, never `!== null`.
- **Toast group:** if the page hosts its own `<Toast group>`, pass it everywhere.
- **i18n:** every key lands in both locale files in the same change and the same order.
- **InfiniteSelect prop timing** (memory `project_ap_payment_e2e`): set filter props before the first load (nextTick).

---

## 3. Types (`visitRule.type.ts`)

```ts
export type VisitRuleLevel = 'required' | 'recommended' | 'off'
export type VisitRuleStyle = 'mandatory' | 'block'
export type VisitRuleSource = 'default' | 'company' | 'team' | 'employee' | 'n/a'

export interface VisitRuleDefinition {
  key: string; categoryKey: string; style: VisitRuleStyle
  allowedLevels: VisitRuleLevel[]; locked: boolean
  appliesTakingOrder: boolean; appliesCanvass: boolean
  paramKind?: 'radius_m'; defaultLevel: VisitRuleLevel; defaultRadiusM?: number
  exemptible: boolean; employeeExemptible: boolean
}
export interface CompanyRuleRow extends VisitRuleDefinition { level: VisitRuleLevel; radiusM?: number; source: 'company' | 'default' }
export interface CompanyRules { company: {id:number;name:string}; categories: {key:string;sortOrder:number}[]
  rules: CompanyRuleRow[]; exemptReasons: ExemptReason[]; lastChangedAt?: string; lastChangedBy?: string }
export interface TeamRuleRow extends VisitRuleDefinition {
  inherited: { level: VisitRuleLevel; radiusM?: number; source: 'company' | 'default' }
  override?: { level: VisitRuleLevel; radiusM?: number } }
export interface TeamRules { team: TeamSummary; note?: string; rules: TeamRuleRow[] }
export interface TeamSummary { id:number; code:string; name:string; branchName:string; memberCount:number; overrideCount:number; note?: string }
export interface EffectiveRules { employee:{id:number;code:string;name:string;mode:'taking_order'|'canvass';exemptDepotCheckIn:boolean}
  team?: {id:number;code:string;name:string}; company:{id:number;name:string}
  rules: (VisitRuleDefinition & { level?: VisitRuleLevel; radiusM?: number; source: VisitRuleSource })[] }
```

---

## 4. Service and wiring

- `api.ts`:
  - `VISIT_RULES_COMPANY: (id) => '/v1/visit-rules/companies/${id}'`
  - `VISIT_RULES_COMPANY_TEAMS: (id) => …/teams`
  - `VISIT_RULES_TEAM: (id) => '/v1/visit-rules/teams/${id}'`
  - `VISIT_RULES_EFFECTIVE: '/v1/visit-rules/effective'`
- `visitRules.service.ts`: `getCompany`, `putCompany`, `listTeams`, `getTeam`, `putTeam`, `deleteTeam`, `getEffective(employeeId)`.
- Router: `path: 'visit-rules'`, `meta.permission: VISIT_RULE_READ`, lazy `VisitRulesView`.
- Menu: entry **after Reasons** in the master-data group (`navigation.visitRules`), gated like its neighbours.

---

## 5. `VisitRulesView.vue` (mockup UI 1 shell)

- **Header:** title, company `Select` (auto-selected and hidden when the user sees only one company; selection kept in `?companyId=` query), and the subtitle "{company} · last changed by {name} {date}" when present. On the right: a **Check salesman** button (opens the drawer) and, on the Default tab only, **Cancel** / **Save** (WRITE only, disabled until dirty).
- **Tabs** (PrimeVue `Tabs`, kept in `?tab=`): `default` | `teams` (badge = number of teams with overrides) | `history`.
- **Default tab:**
  - `VisitRuleTable mode="company"` + `ExemptReasonsPicker` + the info note "A survey or stock check flagged Optional in the Survey master is always optional; these rules only govern surveys flagged Required" (mockup).
  - Local working copy. Dirty = deep diff vs the loaded data (`visitRuleHelpers.isDirty`).
  - Save → `putCompany` with every non-locked rule → replace the state with the response → success toast.
  - Navigating or switching company/tab with unsaved changes → confirm dialog (`onBeforeRouteLeave` + a watcher guard).
- **Read-only mode** (no WRITE): selectors disabled, no Save, no add/reset in the teams tab.
- Errors: map `VISIT_RULE_*` codes to `visitRules.errors.*`. Radius errors highlight the row from `details.key`.

### `VisitRuleTable.vue`

Columns follow the mockup:

| Column | Content |
|---|---|
| Activity | name + sub-description from i18n `visitRules.rules.<key>.name/description` |
| Mode | TO / CV pills |
| Rule | `RuleLevelSelector` |
| Parameter | `RadiusInput` when `paramKind`, else the static hint (e.g. selfie "Front camera, no gallery"), else "—" |
| Set in | `visitRules.rules.<key>.setIn` |

- Grouped by category with a group header row (`visitRules.categories.<key>`, e.g. "Start of day · locks Start Visit").
- `mode="team"` replaces the Rule column with **Team rule** (Follow default / Override toggle + selector) and **Default** (the inherited value text, e.g. "Required · 150 m"). Overridden rows get the yellow tint (`bg-yellow-50 dark:bg-yellow-900/20`).
- Locked rows: selector rendered disabled with the single option highlighted and a lock icon tooltip ("Always required").

### `RuleLevelSelector.vue`

- Props `modelValue`, `style`, `allowedLevels`, `disabled`.
- Options are always the three levels in order. Ones not allowed are disabled and struck through (mockup).
- Labels come from `visitRules.levels.<style>.<level>` (mandatory: Required/Recommended/Off; block: Block/Warning + reason/Off).

### `ExemptReasonsPicker.vue`

- Chip list of selected reasons (code + name, ✕ to remove when writable) + "+ Choose from Reason Code".
- Opens a MultiSelect / InfiniteSelect over `/v1/reasons` with `type=customer_no_order`, active only.
- Inactive reasons that are already selected show with a muted "inactive" tag and stay removable.
- Hint: "If the salesman picks one of these as the didn't-order reason, Stock Check, MSL, Display and Survey don't lock check-out for that visit." Generate the list of exemptible rule names from the definitions, not hardcoded.

---

## 6. Team overrides tab: `TeamOverridePanel.vue` (mockup UI 2)

- **Left list:** `listTeams(companyId)` — name, "{n} differ" tag (warn) or "Follow default" (secondary), "TM-006 · 8 salesmen" sub-line. Teams with overrides come first. The selection is kept in `?teamId=`.
- **"+ Add team override"** opens a dialog listing teams with `overrideCount = 0`. Picking one selects it in edit mode (nothing is saved until Save).
- **Right editor:** `getTeam(id)` → header (name, note `InputText` ≤200, **Reset all to default** with confirm → `deleteTeam`) → `VisitRuleTable mode="team"`.
  - Toggling *Override* seeds the override from the inherited value.
  - Toggling *Follow default* drops the row.
  - The panel has its own Save / Cancel, dirty guard and team-switch guard.
- **Pinned warning** (`visitRuleHelpers.pinnedRows`): for each override equal to the inherited value, show an inline `Message severity="warn"`: "Display is overridden to the same value as the default (Required). This team stays Required even if the default changes later. To follow the default, choose Follow default."
- Save: `putTeam({note, overrides})`. An empty overrides list with an empty note → call `deleteTeam` instead.
- 409 `VISIT_RULE_TEAM_COMPANY_UNRESOLVED` → error toast and the list refreshes (the BE excludes such teams anyway).

---

## 7. History tab: `VisitRuleHistoryTab.vue`

- Copy the `SurveyHistoryTab.vue` structure: filter `reference_type = 'visit_rules'` and `reference_id = companyId`, sorted `created_at desc`, paginated, "Load more".
- Each entry shows who/when and description lines. Lines are machine text from the BE (`outlet_radius: recommended · 100 m → recommended · 80 m`, `[TM-006 …] display: …`). `visitRuleHelpers.humanizeAuditLine` replaces known rule keys and levels with their i18n labels and falls back to the raw line. Unit-test that fallback.
- Refresh it after any successful save on the other tabs.

---

## 8. `CheckSalesmanDrawer.vue` (mockup UI 3)

- Right `Drawer`. Employee picker limited to Salesman + Canvass types, active, non-draft.
- On pick → `getEffective(id)` → header "KS-061 — Agus Wibowo · {team or 'No team'} · TO/CV".
- Table: Activity | Effective (level label in the rule's style + radius) | Source tag (`default` → "System default", `company` → "Default", `team` → "Team", `employee` → "Employee").
- `n/a` rows show "Not applicable to TO" in muted text.
- 422 `VISIT_RULE_NOT_FIELD_EMPLOYEE` / 409 → inline message instead of the table.
- Works from any tab. It reads the server state: if the page has unsaved edits, show a note "Shows saved rules only".

---

## 9. Other pages

### Employee form (`EmployeeDetailView.vue`)

- Add `exemptDepotCheckIn` (`ToggleSwitch`, label "Exempt from depot check-in", hint "Only this rule can be set per person. See Visit Rules"). Shown only when the selected type name is Salesman or Canvass (`EMPLOYEE_TYPE_NAMES`). When the type changes away, reset it to false.
- Include it in the create/update payload and the employee type. Show it on the detail view read mode.

### Survey config cleanup (D10)

- `views/survey-configs/SurveyConfigDialog.vue`: remove the required-mode field, ref and payload key.
- `SurveyConfigsView.vue`: remove the column.
- `views/surveys/SurveysView.vue`: remove the `requiredModeSummary` fragment (keep the rest of the summary sentence grammatical in both locales).
- `types/survey.type.ts`: remove `SurveyRequiredMode` and the fields.
- Locales: remove `surveyConfigs.fields.requiredMode`, `labels.requiredModeHint`, `modes.*`, `surveys.list.requiredModeSummary`.
- Update affected specs.
- Grep `requiredMode|required_mode|SurveyRequiredMode` → zero hits.

---

## 10. i18n (both files, same order)

`navigation.visitRules`, plus `visitRules.*`:

- `title`, `lastChanged`, `tabs.{default,teams,history}`, `actions.*` (checkSalesman, addTeamOverride, resetAll, followDefault, override)
- `columns.*`
- `categories.{start_of_day,check_in,outlet_activity}`
- `rules.<key>.{name,description,setIn,paramHint?}` for all 11 keys (ID text from the mockup, EN translated)
- `levels.mandatory.{required,recommended,off}`, `levels.block.{required,recommended,off}`
- `modes.{taking_order,canvass}` (TO/CV short + long)
- `sources.*`, `pinnedWarning`, `exempt.{title,hint,choose,inactive}`, `surveyOptionalNote`
- `teams.{differ,followDefault,members,noTeams}`
- `drawer.*`, `history.empty`
- `errors.<CODE>` for every BE code in BE §6

Plus employee `fields.exemptDepotCheckIn` / `hints.exemptDepotCheckIn`.

---

## 11. Tests (vitest) & verification

- `visitRuleHelpers.spec.ts`: dirty diff, company payload (all non-locked, no locked), team payload sparse, pinned detection, empty → delete decision, audit line humanizer.
- `VisitRuleTable.spec.ts`: disabled levels per `allowedLevels`, locked row read-only, radius input only for `paramKind`, team mode tint + Follow default toggle.
- `TeamOverridePanel.spec.ts`: add override flow, reset confirm calls `deleteTeam`, pinned warning.
- `CheckSalesmanDrawer.spec.ts`: source tags, `n/a` rendering, error states.
- Update the existing survey-config and employee specs.
- `npm run test:unit`, `npm run type-check`, `npm run lint` green.
- **Live E2E (master §9) only after the user says go.** Shut down the dev servers afterwards (memory `feedback_kill_dev_servers_by_pid`).
- `graphify update .` from the repo root.

---

## 12. Deviations

- **Exemption reasons** use a PrimeVue `MultiSelect` (chips) over `ReasonsService.list({type:'customer_no_order', isActive:true})`, not a separate chip list + dialog. Saved-but-deactivated reasons stay in the options, suffixed "(inactive)".
- **Check-salesman picker** has a Taking Order / Canvass toggle (employee list filters one `employeeTypeId` only) and lists active, non-draft employees of that type.
- **Add team override** dialog just selects a team with no overrides; nothing is saved until Save.
- **Survey form** lost its "required hint" line along with the config's required mode (not listed in §9).
- **Employee flag** is always sent on create/update (PUT replaces), forced to false when the type is not Salesman/Canvass. The toggle sits in the System access card, shown for those types only.
- `RuleLevelSelector`'s style prop is named `levelStyle` (`style` is a reserved attribute in Vue).
- Team count badge comes from an extra `listTeams` call on company load.
