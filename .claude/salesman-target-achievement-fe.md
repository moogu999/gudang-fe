# Salesman Target Achievement — Frontend Plan

Companion to `.claude/salesman-target-achievement-master-plan.md` (decisions **A1–A13** are referenced by number) and `gudang-be/.claude/salesman-target-achievement-be.md`. The existing target screens are described in `.claude/salesman-target-fe.md`.

Web only. The mobile app is untouched (A9).

---

## 1. Files

| File | Change |
|---|---|
| `src/types/salesmanTarget.type.ts` | + `SalesmanTargetAchievement`, `AchievementLine`, `AchievementItemBreakdownRow`, `AchievementSummary` |
| `src/services/salesmanTargets.service.ts` | + `achievement(id)`, `achievementItem(id, itemId, employeeId?)`, `achievementSummaries(ids)` |
| `src/constants/api.ts` | + the three paths, next to the existing salesman-target entries |
| `src/constants/permissions.ts` | + `SALESMAN_TARGET_ACHIEVEMENT_READ: 167` |
| `src/views/salesman-targets/salesmanTargetAchievement.ts` | **New**, pure: `pct`, `idealPct`, `runRate`, `band`, `mergeAchievement` |
| `src/views/salesman-targets/salesmanTargetAchievement.spec.ts` | **New** |
| `src/views/salesman-targets/components/SalesmanTargetAchievementTab.vue` | **New** |
| `src/views/salesman-targets/components/SalesmanTargetAchievementTab.spec.ts` | **New** |
| `src/views/salesman-targets/components/AchievementSkuDialog.vue` | **New** |
| `src/views/salesman-targets/SalesmanTargetEditView.vue` | Third tab `achievement` |
| `src/views/salesman-targets/SalesmanTargetsView.vue` | "Achieved" column (A13) |
| `src/components/table/TableComponent.vue` | + an additive `loaded` emit carrying the fetched rows (see §5) |
| `src/views/salesman-targets/SalesmanTargetForm.vue` | Help text only (see §6) |
| `src/i18n/locales/en-US.ts`, `id-ID.ts` | `salesmanTargets.achievement.*`, list column, help text |

---

## 2. Reuse: do not rebuild any of these

| Need | Use |
|---|---|
| Qty in the item's unit | `unitOf(item)` and `toDisplay(baseQty, unit)` from `salesmanTargetGrid.ts`. Use `fromApiItem` to build the item list from the loaded document |
| Item header label | `itemLabel(...)`, and the SKU/KAT badge style from `TargetItemChips.vue` |
| Number formatting | `formatNumber(value, locale, digits)` from `salesmanTargetHelpers.ts`. Use 4 fraction digits for non-base units, as in the grid |
| Error toasts | `translateTargetError(e, t, te)` |
| Inactive salesman tag | The same tag the grid shows when `employeeActive` is false |
| Card shell | `ResponsiveCard` |

### Conventions that have caused bugs before

- **Absent is not `null`.** Go omits empty maps and pointers. A missing `cells[itemId]` means 0 achieved; a missing target cell means *not targeted*. Use `!= null` or `in`, never `!== null`.
- **SelectButton** for Value / Qty uses a local `ref`, not a form state write.
- **Decimals arrive as strings.** Parse once in `mergeAchievement`, and never add strings.
- **Both locale files, same keys, same order**, in the same change.
- **Customer, not Outlet**, in any copy.
- **No plan refs in code comments.**

---

## 3. Types and pure helpers

```ts
export interface AchievementLine {
  employeeId: number
  achievedValue?: string          // present when the document has_value
  cells?: Record<string, string>  // itemId → base qty; absent key = 0
}
export interface SalesmanTargetAchievement {
  targetId: number
  asOf: string
  workingDays: { total: number; elapsed: number }
  lines: AchievementLine[]
  totals: { achievedValue?: string; cells?: Record<string, string> }
}
export interface AchievementItemBreakdownRow {
  productId: number; productCode: string; productName: string; qty: string; value?: string
}
export interface AchievementSummary { targetId: number; achievedValue: string }
```

`salesmanTargetAchievement.ts` (pure, unit-tested):

```ts
pct(achieved: number, target: number | null): number | null     // null when target is null or 0
idealPct(wd): number | null                                      // elapsed / total; null when total = 0
runRate(achieved, target, wd): number | null                     // achieved / elapsed × total / target; null when elapsed = 0 or no target
band(achievedPct, ideal): 'good' | 'warn' | 'bad' | null         // good ≥ ideal; warn ≥ 0.7 × ideal; bad below; null if either is null
mergeAchievement(target: SalesmanTarget, a: SalesmanTargetAchievement): AchievementRow[]
```

`mergeAchievement` joins the document's lines (name, code, active flag, target value, target cells) with the achievement lines by `employeeId`. It returns one row per document line, in the document's order, holding parsed numbers. A line missing from the response gets 0 achieved.

---

## 4. Achievement tab (`SalesmanTargetAchievementTab.vue`, mockup UI 4)

### Props, loading and visibility

- **Props:** `target: SalesmanTarget`, `reloadKey: number`, `toastGroup: string`.
- **Load:** fetch on mount and whenever `reloadKey` changes. The edit view bumps it together with `historyKey` after a save.
- **Mounting:** the tab is mounted only when it is first opened (`v-if` on the active tab, or PrimeVue's lazy panels), so opening a document doesn't run the invoice query.
- **Visibility in `SalesmanTargetEditView.vue`:** shown only when `target.status !== 'draft'` and `hasPermission(PERMISSIONS.SALESMAN_TARGET_ACHIEVEMENT_READ)`. A 409 `TARGET_NOT_ACTIVE` (a race with nothing) shows the not-active message.

### Layout

1. **Summary cards** (a responsive grid: one column on mobile, three on desktop):
   - **Achieved value**, when `hasValue`: Rp total, "x % of Rp target", and the run rate. Its colour comes from `band`.
   - **Working days**: `elapsed / total`, plus "ideal now x %".
   - **Qty items**, when `hasQty`: the number of items whose total achieved % ≥ ideal, as "n of m on track".
2. **Toolbar:**
   - a local-ref `SelectButton` (Value | Qty per item), showing only the types that are on and hidden when only one is
   - on the right, "Data as of 07 Oct 13:00" (`asOf` in local time) and a Refresh button
3. **Value table** (`DataTable`, frozen first column):
   - Columns: Salesman (name, code underneath, inactive tag) | Target | Achieved | % | Run rate. Footer row: Total.
   - A line with an empty target shows the achieved value with "—" for %, run rate and colour (empty ≠ 0, master D8).
   - The % and run-rate cells take their colour from `band`.
4. **Qty table** (hand-rolled `<table>` like `SalesmanTargetGrid.vue`, frozen salesman column):
   - One column group per item: Target | Achieved | %. The item header shows the label, the SKU/KAT badge and the unit code.
   - Values are in the item's display unit (`unitOf`). A category whose units are not uniform shows the base unit, exactly as the grid does.
   - **Category** achieved cells and their column totals are buttons (`role="button"`, keyboard reachable) that open `AchievementSkuDialog` for that item, with the row's employee or none for the total. Product cells are plain text.
   - The footer row holds column totals.
5. **Legend** under the table: "Colour compares achievement with the working-day progress (x %): green ≥ ideal, orange 70–99 % of ideal, red < 70 %."
6. **Value basis** note: the existing `salesmanTargets.form.valueBasis` text, plus "Counted from applied invoices, by the date they were applied. Returns are not deducted yet."

### Empty and loading states

- A spinner while loading.
- A document with no lines shows the not-applicable message.
- An error shows a toast and an inline "Retry" message.

### Colour classes

Use Tailwind text colours with dark-mode-safe shades, the same ones the gap warning in the grid footer uses: good = `text-green-700`, warn = `text-orange-600`, bad = `text-red-600`. Never use colour alone: % values also carry the band in an `aria-label`.

---

## 5. SKU dialog and list column

### `AchievementSkuDialog.vue` (A7)

- **Props:** `targetId`, the `item` (its label, unit and `hasValue`), `employee` (`{ id, name }` or none), `visible`.
- **On open:** calls `achievementItem(targetId, item.id, employee?.id)`.
- **Table:** SKU code | Name | Qty (in the **item's** unit when it is uniform, else base) | Value (when `hasValue`). The footer total must equal the clicked cell.
- **Header:** "Mi Goreng Reguler · Budi Santoso", or "· all salesmen".
- **Note:** "Analysis only; not a target."

### List column (`SalesmanTargetsView.vue`, A13)

The list's rows come from `TableComponent`'s own fetch, and the component exposes no rows today. Add an **additive** `loaded` emit (`emit('loaded', rows)`) to `TableComponent.vue` after each successful fetch. Existing users are unaffected; no other change to the shared component.

On `@loaded`, when the caller holds 167:
1. Collect the ids of non-draft rows with `totalTargetValue` present.
2. Call `achievementSummaries(ids)` once.
3. Keep the result in a `Map<targetId, achievedValue>`.

The new column "Achieved" goes after Target value and is `hideOnMobile`. It renders `Rp x (y %)`, or "—" when the row is a draft or has no entry yet. The column is absent from `columns` when the caller lacks 167. A failed summary call leaves "—" and logs; it never toasts over the list.

---

## 6. Form help text

`salesmanTargets.form.valueBasis` currently reads "… This basis is fixed." Extend the copy, keeping the key, so it now says how achievement is counted:

- en-US: "Value = net after all discounts, excl. VAT, regular items only (bonus not counted). Achievement counts applied invoices by their applied date."
- id-ID: same meaning.

---

## 7. i18n

New keys under `salesmanTargets` (both files, same order):

```
tabs.achievement
achievement.cards.value / valueOf / runRate / workingDays / idealNow / qtyOnTrack
achievement.view.value / view.qty
achievement.asOf / refresh / retry
achievement.columns.salesman / target / achieved / pct / runRate / total
achievement.legend
achievement.basis
achievement.notActive / noLines / loadFailed
achievement.sku.title / allSalesmen / analysisOnly / columns.code / name / qty / value / empty
list.columns.achieved
errors.TARGET_ITEM_NOT_CATEGORY
```

id-ID wording: Pencapaian, Hari kerja, Run rate (kept as is, as in the mockup), "ideal saat ini", "Data per", "Hanya analisa, bukan target".

---

## 8. Tests (vitest)

| Spec | What |
|---|---|
| `salesmanTargetAchievement.spec.ts` | `pct` with target 0 / null → null; `runRate` with elapsed 0 → null; elapsed = total → equals pct; `band` at exactly ideal (good), at exactly 0.7 × ideal (warn), just below (bad); `mergeAchievement`: a line missing from the response → 0, absent cell → 0, document order kept, decimals parsed |
| `SalesmanTargetAchievementTab.spec.ts` | Mocked service: Value/Qty toggle hidden when only one type is on; a CTN item shows `toDisplay` values; a mixed-unit category shows base; category cells open the dialog and product cells don't; an empty target shows "—"; the inactive tag renders |
| `salesmanTargets.service.spec.ts` | The three new calls build the right URLs (`ids` comma-joined, `employeeId` optional) |
| `TableComponent` | Existing specs pass. Add one assertion that `loaded` fires with the rows |

Run `npm run test:unit`, `npm run type-check` and `npm run lint`.

---

## 9. Verification

1. Unit tests, type-check and lint are green.
2. **Live E2E only after the user's go-ahead.** Then run the master plan §8 UI items 2–11. Use real keystrokes for `InputNumber`, delete screenshots from the repo root, and stop the dev servers by port PID.
3. `graphify update .` from the repo root.

---

## 10. Deviations

FE implemented 2026-10-14, uncommitted. `npm run test:unit` (988), `type-check`, `lint` green. Live E2E not run.

- **Value table is a hand-rolled `<table>`**, not a `DataTable`, so it shares the frozen-column markup with the qty table.
- **Run rate colour** is judged against 100 % of target, not the working-day ideal (the ideal would colour almost every projection green). The legend says so.
- **Qty "on track" card** counts items whose total achieved % is at or above the ideal, out of items that have a target.
- **Extra i18n keys:** `achievement.cards.onTrack` and `achievement.bands.*` (aria-labels), plus `list.columns.achieved`.
- **No `TableComponent` spec** asserting the `loaded` emit was added; the emit is one line after a successful fetch.
- **Refresh:** the tab reloads on `reloadKey` (the edit view's `historyKey`) and via its Refresh button.
