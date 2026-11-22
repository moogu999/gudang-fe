# EC Achievement from Visits — Frontend

**Status:** IMPLEMENTED 2026-11-22 (unit, type-check, lint green; Playwright not run). Master plan: `/.claude/salesman-target-ec-achievement-master-plan.md`. API contract: `effectiveCall` (optional integer) on `LineAchievement` and `AchievementTotals` in `gudang-be/api/salesman_targets.yaml`; absent = 0 achieved, field absent everywhere when the document has no EC target.

## Web (`gudang-fe`)
- **`src/types/salesman-target*.type.ts`:** add `effectiveCall?: number` to the line and totals achievement types. An absent key means 0 achieved (memory: Go omits keys, it doesn't send null).
- **`views/salesman-targets/salesmanTargetAchievement.ts`:**
  - add `targetEc` / `achievedEc` to the row builder, and percent/run-rate/colour using the existing value helpers;
  - an empty EC target means no % and no colour.
- **`components/SalesmanTargetAchievementTab.vue`:**
  - add an **Effective Call** option to the view toggle when `hasEffectiveCall` (local ref; memory: SelectButton programmatic writes don't update the UI);
  - columns: Salesman, Target EC, Achieved EC, %, Run rate, plus a totals row;
  - integers, no currency;
  - help text: "Counts completed visits checked in within the customer radius".
- **i18n:** `salesmanTargets.achievement.ec.*` in both `en-US` and `id-ID`. The UI says Customer, not Outlet.
- **Specs:** extend `salesmanTargetAchievement.spec.ts` and `SalesmanTargetAchievementTab.spec.ts` with three cases: the EC toggle is hidden when `hasEffectiveCall` is off, empty vs 0, and run-rate colour.
- Run unit, type-check and lint.

## Verification (FE)
2. **Playwright on the Achievement tab, in both locales:**
   - the EC view shows correct % and run rate against a hand calculation;
   - the toggle is hidden on a document without EC;
   - no raw i18n keys.
