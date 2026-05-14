# Promotion — Multiplicative Reward Tiers (Frontend Plan)

Master plan: `../../.claude/PROMOTION_MULTIPLICATIVE_TIERS_PLAN.md`.

Scope: surface a per-tier `isMultiplicative` toggle on the promotion form and detail views for
**Discount tiers (flat only)** and **Fixed Bonus tiers**. No transaction-time logic.

## 1. Types (`src/types/promotion.type.ts`)

Add `isMultiplicative?: boolean | null` to every discount-tier and fixed-bonus-tier interface:

- The "view / get-by-id" tier shapes (around lines 13, 65, 90).
- The "form" tier shapes (around lines 28, 74).
- The "request" tier shapes (around lines 143, 155, 181, 188, 201).

Keep optional + nullable to stay tolerant of legacy payloads. Default to `false` when building
form state from a fresh tier.

## 2. Service (`src/services/promotions.service.ts`)

- Outbound: include `isMultiplicative` in the create/update payload mappers for both tier types.
  Coerce `undefined → false` before sending so the BE always gets a deterministic value.
- Inbound: pass through; legacy promotions arrive with the field missing → the form code treats
  that as `false`.

## 3. UI — Discount Tiers (`src/views/promotions/components/DiscountTiersTable.vue`)

- Add a new column **"Multiplicative"** with a `PrimeVue` `<ToggleSwitch>` (or `Checkbox`,
  matching existing booleans in the file) bound to `row.isMultiplicative`.
- The control is **disabled and forced `false`** when `row.discountType === 'percentage'`. When
  the user switches a tier from `flat → percentage`, programmatically reset `isMultiplicative`
  to `false`.
- Add a tooltip / small help text: "When on, the discount scales with floor(qty / minQty)
  (or amount-basis equivalent). Flat discounts only."
- Detail view: render as a read-only "Yes / No" cell on the same table when in read-only mode.

## 4. UI — Fixed Bonus Tiers (`src/views/promotions/components/FixedBonusTiersTable.vue`)

- Same column treatment, no `discountType` gating.
- Tooltip: "When on, each bonus item's quantity scales with floor(qty / minQty) (or amount-basis
  equivalent)."

## 5. Form validation (`PromotionForm.vue`)

- Reject submit when any discount tier has `discountType === 'percentage' && isMultiplicative ===
  true` (defence in depth — the BE also enforces this). Show inline error on the offending row.
- No other cross-field validation.

## 6. i18n

Add keys under the promotion namespace:

- `promotion.tier.multiplicative.label` → "Multiplicative"
- `promotion.tier.multiplicative.discountHelp` → "Scales the flat discount by floor(qty / minQty)
  (or amount/minAmount). Flat discounts only."
- `promotion.tier.multiplicative.bonusHelp` → "Scales each bonus item quantity by floor(qty /
  minQty) (or amount/minAmount)."
- `promotion.tier.multiplicative.percentageDisabled` → "Not available for percentage discounts."

(Provide ID/EN copy following the existing convention.)

## 7. Out of scope

- Showing or computing the *resolved* multiplier preview on the form. The actual evaluation lives
  in the future transaction-calculation design and will likely be displayed on a sales-order
  preview, not on the promotion authoring page.

## 8. Manual test plan

- Create promotion: flat discount tier, toggle on → save → reload → toggle still on.
- Create promotion: percentage discount tier → toggle disabled, cannot be set.
- Switch a tier from flat (toggle on) to percentage → toggle resets to off automatically.
- Create promotion: fixed-bonus tier with toggle on → save → reload → toggle still on.
- Load a legacy promotion (created before backend rollout) → toggles render as off.
