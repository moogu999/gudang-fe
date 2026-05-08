# Promotion Feature — Frontend Plan

> See `../../PROMOTION_PLAN.md` for the master plan, cross-cutting contracts, and shared data
> model. This document covers the frontend slice only.

## Context

The Promotion feature lets back-office users author rule-based promotions: a header (code,
description, currency, date range, active toggle, promo type) plus an unlimited list of
**(qualifying group → reward)** pairs. Only the **per-transaction** promo type is enabled in the
UI now; the **period-based** option is shown but disabled with a "Coming soon" tooltip.

The list page consumes the **generic CRUD** endpoint `/gen/v1/promotions` (flat list); the form
and detail pages use the **custom** endpoints under `/api/v1/promotions` because the read/write
shape is deeply nested.

## New files
```
src/views/promotions/
  PromotionsView.vue           // list page
  PromotionCreateView.vue      // thin wrapper around PromotionForm (mode=create)
  PromotionEditView.vue        // loads by id, renders PromotionForm (mode=edit)
  PromotionDetailView.vue      // read-only summary
  PromotionForm.vue            // shared create/edit form (the heavy lifter)
  components/
    PromotionGroupCard.vue     // one (group + reward) pair
    DiscountTiersTable.vue
    FixedBonusTiersTable.vue
    CustomerChoicePoolTable.vue
src/services/promotions.service.ts
src/types/promotion.type.ts
```

## Modified files
- `src/router/index.ts` — 4 routes
- `src/constants/api.ts` — `GEN_PROMOTIONS`, `PROMOTIONS`
- `src/constants/permissions.ts` — `PROMOTION_READ`, `PROMOTION_WRITE`
- `src/i18n/locales/en-US.ts`, `id-ID.ts` — `promotions` namespace

## Type definitions (sketch)
```ts
export type PromoType = 'per_transaction' | 'period_based'
export type QualifierKind = 'products' | 'labels'
export type ThresholdKind = 'min_qty' | 'min_amount'
export type RewardType = 'discount' | 'bonus'
export type BonusKind = 'fixed' | 'customer_choice'
export type DiscountType = 'flat' | 'percentage'

export type PromotionGroupProduct = {
  id?: number; productId: number; mandatory: boolean
  minQty?: string | null; minAmount?: string | null
  product?: { id: number; code: string; name: string; smallestUomCode?: string }
}

export type DiscountTier = {
  id?: number; minQty?: string | null; minAmount?: string | null
  discountType: DiscountType; value: string
}

export type FixedBonusTierItem = {
  id?: number; productId: number; qty: string
  product?: { id: number; code: string; name: string; smallestUomCode?: string }
}
export type FixedBonusTier = {
  id?: number; minQty?: string | null; minAmount?: string | null
  items: FixedBonusTierItem[]
}

export type CustomerChoicePoolItem = {
  id?: number; productId: number; bonusAmount: string
  product?: { id: number; code: string; name: string; smallestUomCode?: string }
}

export type PromotionReward =
  | { type: 'discount'; discountTiers: DiscountTier[] }
  | { type: 'bonus'; bonusKind: 'fixed'; fixedBonusTiers: FixedBonusTier[] }
  | { type: 'bonus'; bonusKind: 'customer_choice'
      pickableCount: number; pool: CustomerChoicePoolItem[] }

export type PromotionGroup = {
  id?: number
  qualifierKind: QualifierKind; thresholdKind: ThresholdKind
  products?: PromotionGroupProduct[]
  labelOptionIds?: number[]
  reward: PromotionReward
}

export type Promotion = {
  id: number; code: string; description: string
  currencyId: number; currency?: { id: number; code: string; symbol?: string }
  startDate: string; endDate: string | null; active: boolean
  promoType: PromoType; groups: PromotionGroup[]
}
export type PromotionListItem = Omit<Promotion, 'groups'>
```

## List view (`PromotionsView.vue`)
- Use existing `TableComponent` wired to `PromotionsService.list()` against `/gen/v1/promotions`.
- Columns: code, description, currency, startDate, endDate, active (Tag), promoType (Tag),
  actions (view/edit/delete).
- Use `useConfirmDelete` and `usePermissions('/promotions')` per existing pattern.
- "Add Promotion" button → `PromotionCreate` route.

## Form view (`PromotionForm.vue`) — the meat
Two top-level sections inside `ResponsiveCard`s:
1. **Header**: code, description, currency (Select / InfiniteSelect populated from the existing
   currencies endpoint — submitted as `currencyId`), startDate,
   endDate (nullable, "Active forever" hint when blank), active toggle, promoType (Select with
   only `per_transaction` enabled; `period_based` disabled with tooltip "Coming soon").
2. **Groups & Rewards**: dynamic list with **Add Group** button. Each renders `PromotionGroupCard`.

`PromotionGroupCard.vue`:
- Header row: `qualifierKind` segmented (Products / Labels), `thresholdKind` segmented (Min Qty /
  Min Amount), remove-group button.
- If `qualifierKind === 'products'`:
  - `InfiniteSelect` (`fetch-fn = ProductsService.list`) to add a product → appends to
    `group.products` with full product object cached (incl. smallest UoM code, derived from
    `product.uomGroup.levels` lowest level — request includes-style param if needed; otherwise
    show `-` until backend exposes it).
  - Table of selected products: columns Code, Name, Smallest UoM, Mandatory (Checkbox),
    Min Qty / Min Amount input (only when Mandatory = true; field switches based on group
    `thresholdKind`), remove row.
- If `qualifierKind === 'labels'`:
  - `MultiSelect` of label options (loaded from existing label endpoints — same pattern as
    `ProductSetLabelsDialog.vue`). No UoM column. No mandatory/per-row min fields.
- Group-level threshold: single Min Qty or Min Amount input (per `thresholdKind`), used as the
  group's overall qualifier.
- **Reward** sub-section:
  - `Select` for `reward.type` (Discount / Bonus).
  - If Discount → `DiscountTiersTable` (rows: Min Qty/Amount per group's thresholdKind,
    Discount Type Select per row, Value InputNumber).
  - If Bonus → `Select` for `bonusKind` (Fixed / Customer Choice).
    - Fixed → `FixedBonusTiersTable` (each tier expands to nested items table: product picker +
      qty + Smallest UoM column).
    - Customer Choice → single threshold inputs (Min Qty/Amount), `pickableCount` InputNumber,
      `CustomerChoicePoolTable` (product picker + Smallest UoM + Bonus Amount input).
- Add/remove for tiers and pool items follow `PriceListForm` pattern (push/splice on a `ref`).

## Validation
Manual `validate()` in `PromotionForm.vue` mirroring `PriceListForm`:
- code, currencyId, startDate required; endDate ≥ startDate when present.
- ≥1 group; each group passes its own validation (≥1 product OR ≥1 label, threshold filled,
  reward valid).
- Discount: ≥1 tier, each tier value > 0; if percentage, value 0–100.
- Fixed bonus: each tier ≥1 item, each item qty > 0.
- Customer choice: pickableCount ≥ 1, pool size ≥ pickableCount, bonusAmount ≥ 0.

Errors stored in a parallel `errors` ref shaped like the form, displayed inline next to inputs.

## Service (`promotions.service.ts`)
Same static-class pattern as `price-lists.service.ts`:
- `list(qs?)` → `Base<PromotionListItem>` from `GEN_PROMOTIONS`.
- `getById(id)` → `Promotion` from `PROMOTIONS/{id}`.
- `create(dto)` → `Promotion` POST `PROMOTIONS`.
- `update(id, dto)` → `Promotion` PUT `PROMOTIONS/{id}`.
- `delete(id)` → DELETE `GEN_PROMOTIONS/{id}` (generic CRUD delete; backend cascades).

## Routing
4 routes (`/promotions`, `/promotions/create`, `/promotions/:id`, `/promotions/:id/edit`) with
`requiredPermission` meta from new constants.

## i18n
Add a `promotions` namespace to both locale files with: `title`, `addPromotion`, `fields.*`,
`labels.*` (groups, addGroup, qualifierKind, thresholdKind, reward, discountTiers, addTier,
fixedBonusTiers, customerChoicePool, addPoolItem, etc.), `validation.*`.

## Reused existing pieces (do not reinvent)
- `src/components/table/TableComponent.vue` — list table.
- `src/components/select/InfiniteSelect.vue` — product picker.
- `src/composables/useConfirmDelete`, `useDialog`, `usePermissions`.
- `src/services/api.ts` (`ApiService`) and `Base<T>` type.
- `ProductsService.list()` — qualifying & bonus product selectors.
- Label loading pattern from `ProductSetLabelsDialog.vue`.
- `ResponsiveCard`, `ConfirmationDialog` wrappers.
- `PriceListForm.vue` is the structural template for the nested form.

## Verification
1. `npm run type-check` clean.
2. `npm run lint` clean.
3. `npm run dev`; with BE running:
   - List page renders, pagination + search work.
   - Create: build a promotion with 2 groups (one products+discount tiers, one labels+fixed
     bonus); save; appears in list.
   - Edit: open existing promotion; all nested data hydrates correctly; modify and save;
     reload reflects changes.
   - Detail page renders read-only.
   - Delete via list-row action; row disappears, BE 404s on subsequent GET.
   - Toggle `active` off mid-range; verify the value persists (no eval logic this iteration).
4. `npm run build` succeeds.

---

# Iteration 2 — Period-Based Promo Type (Frontend)

> See `../../../.claude/PROMOTION_PLAN.md` (Iteration 2 section) for shared context.

## Goal

Enable the currently-disabled "Period-based" option in the promo type selector and render the
type-specific form sections. Reuse the per-transaction form's qualifier and structural patterns
wholesale; add only the period-specific bits.

## Types (`src/types/promotion.type.ts`)

Extend existing types:

- `PromoType` — already a union including `period_based`; no change.
- `PromotionGroup` / `GroupForm`:
  - Add `measureKind?: 'total_qty' | 'total_amount'`.
  - Add `periodSettings?: GroupPeriodSettings` (per group).
  - Add `voucherTiers?: VoucherTier[]`.
  - `reward` becomes optional (already conceptually optional).

New types:

```ts
interface GroupPeriodSettings {
  resetCycle: 'end_of_period' | 'after_redemption' | 'never'
  voucherApplyOn: 'next_transaction'
  voucherValidityDays: number
  voucherMinRedeemAmount: string | null   // decimal-as-string, null = no minimum
  voucherStackable: boolean
}

interface VoucherTierForm {
  threshold: string                       // mapped to minQty or minAmount on submit
  voucherDiscountType: 'flat' | 'percentage' | ''
  voucherValue: string
}
```

## Service (`src/services/promotions.service.ts`)

No new methods — existing `create`/`update`/`getById` already round-trip the full nested tree.
Generated DTO types pick up the new fields once the OpenAPI types regenerate.

## Form (`src/views/promotions/components/PromotionForm.vue`)

1. **Enable period_based option.** Remove the `disabled` flag + "Coming soon" tooltip on the
   period-based promo type entry (line ~239).
2. **Hydration (`onMounted`)**: when `form.promoType === 'period_based'`, populate each group's
   `measureKind`, `periodSettings`, and `voucherTiers` from the API response.
3. **Submit (`buildGroupDto`)**: when `period_based`, for each group omit `reward` and include
   `measureKind`, `periodSettings`, `voucherTiers`. The header itself gains no new fields.
4. **Validation (`validate`)**: when `promoType === 'period_based'`, validate per group:
   - `measureKind` selected.
   - `periodSettings` required, `validityDays > 0`, `minRedeemAmount` either blank or `> 0`,
     `resetCycle` and `voucherApplyOn` selected.
   - `voucherTiers` non-empty; thresholds strictly ascending; percentage values 0–100.

## New components

- `src/views/promotions/components/VoucherTiersTable.vue` (new). Mirror `DiscountTiersTable.vue`'s
  structure exactly — same `defineModel<VoucherTierForm[]>()` pattern, same add/remove buttons,
  same per-row error display. Columns: Threshold (label switches via the group's `measureKind`)
  | Voucher Type (flat/percentage SelectButton) | Value.
- `src/views/promotions/components/GroupPeriodSettingsBlock.vue` (new). A block (not a separate
  card) embedded inside `PromotionGroupCard.vue`, rendered only when parent
  `promoType === 'period_based'`. Fields:
  - Reset cycle — `Select` with three options.
  - Voucher apply-on — `Select` (single option `next_transaction` for now).
  - Voucher validity days — `InputNumber`, min 1.
  - Voucher minimum redeem amount — `InputText` (decimal-as-string, blank = no minimum).
  - Voucher stackable — `Checkbox`.
  - Uses `defineModel<GroupPeriodSettingsForm>()`; receives `errors` and `isView` props.

## Modified components

- `src/views/promotions/components/PromotionGroupCard.vue`:
  - When parent `promoType === 'period_based'`:
    - Replace the existing threshold-kind toggle (`min_qty`/`min_amount`) **label** with
      `total_qty`/`total_amount` (same SelectButton, same underlying enum values bound to
      `measureKind`). Per-row qualifier inputs (per-product/per-label `min_qty`/`min_amount`) stay
      visible — they're the per-row gates for the running measure.
    - Hide the existing reward section (discount tiers / fixed bonus / customer choice).
    - Show `GroupPeriodSettingsBlock` bound to `group.periodSettings`.
    - Show `VoucherTiersTable` bound to `group.voucherTiers`.
- `PromotionDetailView.vue`: render each group's `measureKind`, `periodSettings`, and
  `voucherTiers` read-only when `promoType === 'period_based'`.

## i18n (`src/i18n/locales/en-US.ts` and `id-ID.ts`)

Extend the `promotions` namespace:

```ts
promotions: {
  // ...existing...
  labels: {
    // ...existing...
    measureKinds: { total_qty: 'Total Quantity', total_amount: 'Total Amount' },
    resetCycles: {
      end_of_period: 'Reset at end of period',
      after_redemption: 'Reset after redemption',
      never: 'Never reset (lifetime)',
    },
    voucherApplyOns: { next_transaction: 'Next transaction' },
    voucherDiscountTypes: { flat: 'Flat', percentage: 'Percentage' },
  },
  fields: {
    // ...existing...
    resetCycle: 'Reset Cycle',
    voucherApplyOn: 'Apply Voucher On',
    voucherValidityDays: 'Voucher Validity (days)',
    voucherMinRedeemAmount: 'Minimum Spend to Redeem',
    voucherStackable: 'Stackable with other promos',
    measureKind: 'Measure',
    voucherTiers: 'Voucher Tiers',
    voucherDiscountType: 'Voucher Type',
    voucherValue: 'Voucher Value',
  },
  validation: {
    // ...existing...
    periodSettingsRequired: '...',
    measureKindRequired: '...',
    voucherTiersRequired: '...',
    voucherTiersAscending: '...',
    voucherValueRange: '...',
  },
}
```

Mirror the same keys in `id-ID.ts`.

## Constants / routes / permissions

- `src/constants/api.ts` — no change (same endpoints).
- `src/constants/permissions.ts` — no change (`PROMOTION_READ`/`PROMOTION_WRITE` cover both).
- Router — no change (same 4 routes).

## List view (`PromotionsView.vue`)

No change. The `promoType` column already renders both values via the existing
`labels.promoTypes.{per_transaction,period_based}` i18n entry.

## Verification (FE — iteration 2)

- `npm run type-check` and `npm run lint` clean.
- `npm run dev`, then in the browser:
  - Create a `period_based` promo with two groups: one product-qualifier with measure
    `total_qty`, one label-qualifier with measure `total_amount`. Two voucher tiers per group.
    Configure period settings on each group with **different reset cycles** to verify per-group
    independence. Save → loads back identical → edit → delete.
  - Create a `per_transaction` promo to confirm no regression on the existing flow.

## Files changed (FE)

| File | Change |
|---|---|
| `src/types/promotion.type.ts` | Extend types |
| `src/views/promotions/components/PromotionForm.vue` | Enable period_based; hydration/submit/validate |
| `src/views/promotions/components/PromotionGroupCard.vue` | Type-conditional rendering; embed period block + voucher tiers |
| `src/views/promotions/components/VoucherTiersTable.vue` | New ✅ |
| `src/views/promotions/components/GroupPeriodSettingsBlock.vue` | New ✅ |
| `src/views/promotions/views/PromotionDetailView.vue` | Render new per-group fields read-only (delegated to PromotionForm view mode) ✅ |
| `src/i18n/locales/en-US.ts`, `src/i18n/locales/id-ID.ts` | New strings ✅ |
