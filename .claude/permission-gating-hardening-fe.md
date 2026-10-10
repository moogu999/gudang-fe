# Permission Gating Hardening — Frontend Plan

**Backend counterpart:** [`../../gudang-be/.claude/generic-crud-authorization-be.md`](../../gudang-be/.claude/generic-crud-authorization-be.md) (item A — the one that actually protects data)

**Status:** items B, C, D and E are done — see the "Done 2026-09-26" notes under each.
Item F has no frontend fix (it points at item A). Item A (backend) itself is a separate,
larger rollout tracked in the backend plan; see the counterpart link above for its
current status.

**Last refreshed:** 2026-09-26, after pulling `main` into `dev-rian` a second time (giro
deposit/receipt/clearing landed on `main`, adding the `/giro` hub route plus
`/giro-receipts` and `/giro-clearings`; a separate `main` commit also removed the
Cash Deposit Categories menu entry and route entirely). `main` had independently kept
its own `ROUTE_PERMISSIONS` read map this whole time rather than adopting item C/E's
router-meta approach — that map was not revived; `usePermissions.ts` stays the one place
read and write permissions are resolved. The two new giro hub routes
(`/giro-receipts`, `/giro-clearings`) needed `requiredPermission`/`requiredWritePermission`
meta added by hand, since `main` wired them the old way (nothing declared it). All counts
in items B/C/E below predate this merge; the counts changed (route additions/removals)
but no conclusion did — re-verify counts before quoting them if that matters for future
work.

## Why this exists

`sales1@yahoo.com` (role "Sales Cabang A", holding only `SALES_ORDER_READ` and
`SALES_ORDER_WRITE`) could see the **Purchasing** section and the **Return Delivery
Orders** entry in the sidebar. Both were menu-visibility leaks: the navigation guard
still refused the pages, so the user was bounced to Home with no message.

Root cause was two sources of truth. The guard read `meta.requiredPermission` off the
route; the sidebar read a separate `ROUTE_PERMISSIONS` map keyed by exact path, and
that map returned "allowed" for any path it did not contain. `/ap-outstanding` was
missing from it entirely, and `/return-delivery-orders/create` did not match the
`/return-delivery-orders` key.

**Already fixed** (see [`src/composables/usePermissions.ts`](../src/composables/usePermissions.ts)
and [`src/composables/usePermissions.spec.ts`](../src/composables/usePermissions.spec.ts)):
menu visibility now resolves the route through the router and reads the permission the
router itself declares; `ROUTE_PERMISSIONS` is deleted; unmatched paths are denied.

The items below are what that fix did **not** close. They were found while auditing it
and are recorded here rather than folded into the same change.

---

## B. `permissionsAny` is a third source of truth, and it is already out of sync

**Cause.** A menu item may declare `permissionsAny`, which short-circuits the router
lookup ([`src/composables/usePermissions.ts`](../src/composables/usePermissions.ts),
`canAccessMenuItem`). The Config entry uses it because `/configs` is one screen holding
several independently-permissioned tabs.

[`src/components/menu/menu.ts:378-384`](../src/components/menu/menu.ts) lists five
permissions:

```
SALES_ORDER_CONFIG_READ, BOOKING_ORDER_CONFIG_READ, PURCHASE_ORDER_CONFIG_READ,
GOODS_RECEIPT_CONFIG_READ, AP_INVOICE_CONFIG_READ
```

[`src/views/configs/ConfigsView.vue:86-100`](../src/views/configs/ConfigsView.vue) gates
nine tabs (was eight — `CashDepositConfigsView` was added by the 2026-09-20 main merge).
Four permissions are now missing from the menu list: `CREDIT_DEBIT_NOTE_CONFIG_READ`,
`AP_PAYMENT_CONFIG_READ`, `ACCOUNTING_PERIOD_READ`, and `CASH_DEPOSIT_CONFIG_READ`.

**Impact.** A user holding only one of those four does not see the Config menu at all,
although the screen would show them a working tab. This is the inverse of the original
bug — too strict rather than too loose — so it fails quietly as a missing feature, not
as a leak.

**Fix.** Derive the list instead of repeating it. Export the tab table from
`ConfigsView` (or a small shared module) as `{ value, labelKey, permission }[]`, have
the view build its tabs from it and `menu.ts` build `permissionsAny` from the same
array. One edit adds a tab in both places.

**Done 2026-09-26.** New shared module
[`src/views/configs/configTabs.ts`](../src/views/configs/configTabs.ts) exports
`CONFIG_TABS: { value, labelKey, readPermission }[]` for all 9 tabs. `menu.ts`'s
`permissionsAny` is now `CONFIG_TABS.map((tab) => tab.readPermission)`; `ConfigsView`'s
`configOptions` now filters `CONFIG_TABS` by `hasPermission(tab.readPermission)` instead
of nine hand-written `canReadXxx` computeds. As a side effect this also normalized the
`cd` tab, which previously read its permission via `usePermissions('/cash-deposit-configs').canRead`
(a redirect-only route with no meta, unlike the other eight) — now `hasPermission` is
direct for all nine, consistently. Write-side plumbing (`canWriteXxx`, the per-tab refs,
`onAddClick`) is untouched — that is item E's concern, not this one.

**Verification.** A test asserting `menu.ts`'s `permissionsAny` for `/configs` equals
the set of permissions in the tab table. Added to
[`src/composables/usePermissions.spec.ts`](../src/composables/usePermissions.spec.ts)
("Config menu entry" describe block). Full suite: 445 tests passing (was 445 before,
+1 net after removing none and adding this one plus item C's 124).

---

## C. Nothing guarantees a new route declares a permission

**Cause.** [`src/composables/usePermissions.spec.ts`](../src/composables/usePermissions.spec.ts)
asserts every menu route *matches a registered route*. It does not assert the matched
route *declares* `meta.requiredPermission`. A route registered without that meta is
open to every authenticated user, and the suite stays green.

Current state is good. Of 128 distinct route paths, 115 declare a permission and 8 are
pure redirects (was 116 / 102 / 8 pre-merge — the 14 new cash-deposit/bank-settlement/
AR-clearing routes are all correctly declared, and `/cash-deposit-configs` joined the
redirect list); the five real routes that declare none are deliberate: `/sign-in`,
`/` (Home), `superset`, `configs`, and the catch-all. Counted directly off
`router.getRoutes()`, not by hand.

**Impact.** Latent. The next route added without the meta reintroduces the original
class of bug, silently.

**Fix.** Add a test over `router.getRoutes()` requiring `meta.requiredPermission` on
every record except an explicit, named allowlist. The allowlist is the point: adding
to it is a visible decision in a diff, forgetting the meta is not.

**Done 2026-09-26.** [`src/router/index.spec.ts`](../src/router/index.spec.ts). Allowlist:
`/sign-in`, `/`, `/superset`, `/configs`, `/:notFound(.*)`. 124 assertions, all passing.
Verified the regression guard actually guards: temporarily commented out
`WAREHOUSE_READ` on `/warehouses` and confirmed the test failed, then reverted.

**Verification.** The test itself. Confirm it fails when `requiredPermission` is
temporarily removed from a route.

**Note.** This is the cheapest item here and the only one that protects the fix already
shipped. Worth doing first regardless of the rest.

---

## D. `/configs` and `/superset` are open to any authenticated user

**Cause.** Neither route declares `meta.requiredPermission`
([`src/router/index.ts:54-59`](../src/router/index.ts) for Superset,
[`src/router/index.ts:552-556`](../src/router/index.ts) for Configs), so both the guard
and the sidebar allow them.

**Impact.**

- `/configs` — low. Reaching it by URL shows a screen whose tabs are all gated; a user
  with no config permissions sees an empty shell.
- `/superset` — deferred, see below.

**Fix.** For Configs, either accept it (and say so in a comment on the route) or give it
a permission derived from item B's tab table.

**Done 2026-09-26.** Accepted. Comment added at the `configs` route in
[`src/router/index.ts`](../src/router/index.ts) explaining that every tab is
self-gating via `CONFIG_TABS`, so an unpermissioned user reaches an empty shell rather
than data. Already on item C's allowlist.

**Verification.** Covered by item C's test once the route is added to the allowlist or
given a permission.

### Superset — deferred by decision, do not work on it

The Superset embed is a prototype, not a finished integration, so gating it would only
dress up something that is not ready. Recorded here so the findings are not lost if it
is ever taken up properly.

[`internal/user/usecase/generate_superset_guest_token.go`](../../gudang-be/internal/user/usecase/generate_superset_guest_token.go)
hardcodes the signing secret (`"testing"`) and the Superset domain
(`http://localhost:8088`), issues the token as user `"anon"` with empty `rls_rules`,
still carries `fmt.Println` debug output, and signs a guest token for **whatever
dashboard id the caller passes** rather than a known set.

Its endpoint `/v1/superset/{id}` is also absent from the `isProtectedRoute` allowlist in
[`cmd/main.go:463`](../../gudang-be/cmd/main.go), so the JWT middleware never runs. This
was verified against the running container: an unauthenticated `GET` returns `200` with
a valid guest token. Impact today is bounded by whether a Superset instance is actually
reachable in the deployed environment.

If the feature is revived, order the work as: put the endpoint behind auth → move the
secret and domain into `configs/` → restrict to an allowlist of dashboard ids → decide
row-level scoping → and only then add a permission. No existing permission fits; it
would need a new one (e.g. `DASHBOARD_READ`).

---

## E. `canWrite` still uses a map, and still defaults to allow

**Cause.** Write permissions have no equivalent on a route — the router only describes
who may *open* a screen — so `canWrite` still reads `ROUTE_WRITE_PERMISSIONS`
([`src/constants/permissions.ts`](../src/constants/permissions.ts)) and returns `true`
for a path the map does not contain.

**Impact.** None today: all 46 paths passed to `usePermissions()` are present in the
map (verified — was 41, the new cash-deposit/bank-settlement/AR-clearing/cash-deposit-
category views added 5 more, all present). But nothing keeps it that way, and the
failure mode is the original bug exactly — a new view whose path is missing shows its
Add/Edit/Delete buttons to everyone.

**Fix.** Two viable shapes, in order of preference:

1. Declare write permissions on the route as `meta.requiredWritePermission`, next to
   the read one. Both then come from the same declaration, `ROUTE_WRITE_PERMISSIONS`
   disappears, and item C's test can require both. Costs one meta line per route.
2. Keep the map but make the miss loud: a test asserting every path passed to
   `usePermissions()` exists in it. Cheaper, but keeps a second source of truth.

Option 1 finishes the job item A's frontend counterpart started; option 2 only stops
the bleeding.

**Done 2026-09-26, option 1.** Added `requiredWritePermission?: number` to `RouteMeta`
in [`src/router/index.ts`](../src/router/index.ts) and declared it on all 46 routes the
old map covered (38 real list routes + the 8 `*-configs` redirect-only routes — verified
`router.resolve()` surfaces a redirect record's own `meta` rather than the target it
points at, so the redirect entries can carry it too). Cross-checked every
`usePermissions('/path')` call site in `src/views/**` against the old map first: 46
distinct paths were actually read this way; the other ~8 map entries (`/return-delivery-orders`,
`/sales-orders`, `/booking-orders`, `/delivery-notes`, `/goods-issue-notes`,
`/delivery-confirmations`, `/goods-return-notes`, `/my-approvals`) were dead — those
views check `hasPermission(PERMISSIONS.X_WRITE)` directly instead, or gate writes purely
through a separately-permissioned `/create` route — so they were dropped rather than
migrated. `usePermissions.ts`'s `canWrite` now resolves `meta.requiredWritePermission`
via `router.resolve()`, mirroring `canRead`'s existing `meta.requiredPermission` lookup
(shared as one `permissionFor(path, metaKey)` helper); `ROUTE_WRITE_PERMISSIONS` and its
export are deleted.

As a side effect, `canWrite` now denies a path matching no route at all (previously
defaulted to allowed, since the map lookup never checked route existence) — the same
"deny on misconfiguration" rule `canAccessRoute` already applied to reads.

**Verification.** For option 1, extend item C's test to cover write permissions and
delete the map. For option 2, the new test plus a run of the full suite.

Done: added a "router write-permission coverage" block to
[`src/router/index.spec.ts`](../src/router/index.spec.ts) asserting all 46 migrated
paths declare the expected permission id, and that no other route declares one by
accident (171 tests in that file). Added 6 new `canWrite` unit tests to
[`src/composables/usePermissions.spec.ts`](../src/composables/usePermissions.spec.ts) —
there had been zero direct test coverage of `canWrite` before this. `vue-tsc`, `eslint`,
and the full suite (499 tests, 35 files) all pass.

---

## F. All of this is client-side

**Cause.** Menu filtering and the navigation guard both run in the browser. Anyone can
bypass them with devtools, or skip the UI and call the API directly.

**Impact.** Everything in items B–E is UX correctness, not access control. The data is
protected only to the extent the backend enforces permissions — and for `/gen/v1/*` it
currently does not.

**Fix.** [`../../gudang-be/.claude/generic-crud-authorization-be.md`](../../gudang-be/.claude/generic-crud-authorization-be.md).
There is no frontend fix for this item; it is recorded here so the frontend work is not
mistaken for a security fix.

---

## Suggested order

| | Item | Size | Why here |
|---|---|---|---|
| 1 | **A** (backend) | large | The only item that protects data. Its escalation sub-fix (`role_permissions`) is small and can go first. |
| 2 | **C** | small | Protects the fix already shipped; one test file. |
| 3 | **B** | small | A real, present defect with a contained fix. |
| 4 | **E** | medium | Closes the last default-allow lookup on the frontend. |
| 5 | **D** | small | Configs only — the Superset half is deferred by decision. |

Items B–E are independent of each other and of A; each is its own PR.
