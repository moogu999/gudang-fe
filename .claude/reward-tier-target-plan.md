# Frontend Plan: Per-Target Reward Tiers

See `../../.claude/reward-tier-target-plan.md` for cross-project context and the
confirmed decisions. This document covers the Vue 3 frontend (`gudang-fe/`) only.

## Summary

Each discount tier and fixed-bonus tier gains a **Target** selector: the whole
invoice, or one of the promotion group's qualifier items (a product or a label
option). Tier validation (ascending order, uniqueness) becomes per-target. This
depends on the backend OpenAPI change being merged first.

## 1. Types — `src/types/promotion.type.ts`

- Add `type TargetKind = 'invoice' | 'product' | 'label'`.
- `PromotionDiscountTier` and `PromotionFixedBonusTier`: add
  `targetKind: TargetKind`, `targetProductId?: number | null`,
  `targetLabelOptionId?: number | null`, and optional denormalized
  `targetProduct?: { code: string; name: string }` /
  `targetLabel?: { name: string }` for display.
- `CreateDiscountTierDto` and `CreateFixedBonusTierDto`: add `targetKind`,
  `targetProductId`, `targetLabelOptionId`.
- Form-internal tier types (`DiscountTierForm`, `FixedBonusTierForm` defined in the
  components): add the same fields, defaulting `targetKind` to `'invoice'` for new
  rows.

## 2. Components

`PromotionGroupCard.vue`:
- Pass the group's current qualifier list down to `DiscountTiersTable.vue` and
  `FixedBonusTiersTable.vue` as a prop — the qualifier products when
  `qualifierKind = products`, or the qualifier label options when
  `qualifierKind = labels`.
- When the qualifier list changes, reset any tier target that no longer references a
  valid qualifier item back to `invoice`.

`DiscountTiersTable.vue`:
- Add a **Target** column — a PrimeVue `Select` whose options are "Whole invoice"
  plus the group's qualifier items. Selecting an item sets `targetKind` and the
  matching ref id, clearing the other ref id.

`FixedBonusTiersTable.vue`:
- Add the same Target selector to the tier header, alongside the existing threshold
  input and multiplicative toggle.
- The existing per-tier `items` (bonus products granted) are unchanged — the new
  target is the *qualifying* scope, distinct from the bonus items.

## 3. Validation — `PromotionForm.vue` `validate()`

- Replace the current global strictly-ascending check for discount and fixed-bonus
  tiers with a **per-target** check: group tiers by `(targetKind, refId)`, each
  bucket must be strictly ascending on the active threshold.
- Add the **invoice-blocks-product** collision check: no threshold value used by an
  `invoice` tier may appear on any product/label tier (two product/label targets may
  share a value).
- Require a target selection per tier; require the ref id when `targetKind` is
  `product` or `label`.

## 4. Build/submit & i18n

- The tier-to-DTO builders include `targetKind`, `targetProductId`,
  `targetLabelOptionId`.
- `src/i18n/locales/en-US.ts`: add keys under `promotions` for the Target column
  label, the "Whole invoice" option label, and the new validation messages
  (target required, per-target ascending, invoice/product collision).

## 5. Regenerate / verify

- Re-pull the regenerated API contract after the backend OpenAPI change lands.
- `npm run type-check`
- `npm run lint`
- `npm run test:unit`

## Critical files

- `src/types/promotion.type.ts`
- `src/views/promotions/components/PromotionGroupCard.vue`
- `src/views/promotions/components/DiscountTiersTable.vue`
- `src/views/promotions/components/FixedBonusTiersTable.vue`
- `src/views/promotions/PromotionForm.vue`
- `src/i18n/locales/en-US.ts`

## Verification

`npm run dev`, open the Promotion create form:
- Add a per_transaction group with qualifier products A & B and a discount reward.
- Confirm each tier's Target selector lists only "Whole invoice", A, and B.
- An `invoice` tier @ qty 5 plus a `product` (A) tier @ qty 5 → collision error.
- Product A @ 5 and product B @ 5 → valid.
- Repeat for a fixed-bonus reward. Save and reload to confirm the round-trip.
