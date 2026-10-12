# Promotions — Return to the List After Save

Status: **planned, not started.** Requested during SIT (SIT-01-C04, creating `PRM-SIT-DISC` /
`PRM-SIT-BONUS`).

## Goal

After a promotion is saved, from create or from edit, land on the list
(`/promotions`) instead of staying on the promotion's edit page.

## Today

| View | After a successful save | Where |
|---|---|---|
| `PromotionCreateView.vue` | success toast, then `router.replace('/promotions/{id}/edit')` after 1 s | `usePostSaveNavigation('/promotions').afterCreate` |
| `PromotionEditView.vue` | success toast, stays on the edit page and re-mounts the form from the server's copy (`formKey++`) | view-local, line ~94 |

Promotions have no status, so `usePostSaveNavigation` treats them as always editable,
which is why create lands on edit.

## Design

Change only the two promotion views. **Do not change `usePostSaveNavigation`:** 28 views
use it, and "stay on the editable record" is the intended default for drafts (SO, PO, GR, …).

1. **Create** (`PromotionCreateView.vue`): replace `afterCreate(promotion)` with a delayed
   `router.replace('/promotions')`. Keep the same 1 s delay as the composable
   (`NAVIGATE_DELAY_MS`), so the success toast can be read. Use `replace`, so Back does not
   return to the spent create form.
2. **Edit** (`PromotionEditView.vue`): after the success toast, `router.push('/promotions')`
   with the same delay, instead of `formKey++`. Drop `formKey` if nothing else uses it.
3. **Toast across navigation:** both toasts use a view-local group (`promotionCreate` /
   `promotionEdit`). Check that the toast is still shown for the delay before the view unmounts.
   Same pattern as `usePostSaveNavigation`, so no change expected.
4. **Optional, cleaner:** add a `toList` option to `usePostSaveNavigation`
   (e.g. `usePostSaveNavigation('/promotions', { afterSave: 'list' })`) instead of
   hand-rolling the delay in two views. Only worth it if another resource wants the same.

## Open question

Should the **edit** view also go back to the list, or only create? The SIT request says
"after save promosi", read here as both. Confirm before implementing.

## Tests

- View specs for create and edit: on a successful save, the router navigates to
  `/promotions` (fake timers for the delay). On a failed save, it stays and shows the error toast.
- `npm run type-check`, `eslint`, `vitest run`.

## Manual verification

- Create a promotion: toast, then land on `/promotions`, with the new promotion in the list.
- Edit a promotion: toast, then land on `/promotions`.
- Save with an error (e.g. missing required field): stays on the form with the error toast.

## Delivery

Own branch and PR (FE only), not inside the open `dev-rian → main` PR (gudang-fe#13).
