# Device Binding — Frontend Plan

Companion to `.claude/device-binding-master-plan.md` (decisions D1–D13 are referenced by number) and `gudang-be/.claude/device-binding-be.md` (API contracts in BE §7, admin endpoints only; the FE never calls `/v1/auth/device/*`).

No notification UI exists beyond the activation-code dialog (D7). There is no notification inbox or bell.

---

## 1. Files

```
src/types/deviceBinding.type.ts
src/services/deviceBinding.service.ts            (+ .spec.ts)
src/services/deviceBindingConfigs.service.ts
src/components/StatFilterCard.vue                (+ .spec.ts)        reusable, first of its kind
src/views/device-binding/
  DeviceBindingView.vue
  deviceBindingHelpers.ts                        (+ .spec.ts)        status → severity, short uid, wa.me link, version flags, review checks
  components/
    DeviceBindingRowMenu.vue                     (+ .spec.ts)        first PrimeVue Menu popup row menu
    ActivationCodeDialog.vue
    DeviceActionReasonDialog.vue
    DeviceChangeReviewDialog.vue
    DeviceHistoryDrawer.vue
    DeviceCell.vue                               platform badge + model + OS line + warnings
src/views/configs/DeviceBindingConfigsView.vue   ConfigsView tab
```

Touched outside: `constants/api.ts`, `constants/permissions.ts`, `router/index.ts`, `components/menu/menu.ts`, `views/configs/ConfigsView.vue`, `views/employees/EmployeeDetailView.vue`, `constants/auditReferenceTypes.ts`, `views/audit-trails/*`, `views/my-approvals/MyApprovalsView.vue` (+ wherever the approval module key → label/link map lives), the users list/detail view, `i18n/locales/en-US.ts` + `id-ID.ts`.

---

## 2. Reuse: do not rebuild any of these

| Need | Reuse |
|---|---|
| Table, paging, mobile cards | `components/table/TableComponent.vue` with `:query-adapter="DeviceBindingService.toListQuery"` (hand-written `/v1` list, so set `sortable: false` on every column) |
| Branch filter | `InfiniteSelect` + `userBranchesFetcher(authStore.branchIds)` (as `SalesTeamsView.vue`) |
| Team filter | `InfiniteSelect` over `SalesTeamsService.list` filtered by the selected branch |
| Filter → reload | Computed `url` + `watch(url)` → `nextTick` → `table.clearSearch()` (SalesTeamsView pattern) |
| Approve / reject / timeline | `components/approval/ApprovalActionBar.vue`, `ApprovalTimeline.vue`, `composables/useApproval.ts` with module key `device_binding` |
| Confirm + toast | Page-owned `ConfirmDialog` group + toast group passed as a prop (SalesTeamRowActions pattern) |
| Clipboard | `useClipboard` from `@vueuse/core` (already a dependency) |
| Permissions | `usePermissions('/device-binding')` → `canRead`, `canWrite` |
| Dates | Existing date/relative-time formatting helpers. Check `utils/` for the one used on Giro/Cash Deposit lists before writing a new one |

### Conventions that have caused bugs before
- **Absent vs null.** Go omits nil pointers, so `currentDevice`, `pendingDevice`, `lastSyncAt`, `team`, `createdBy` and `email` may be **missing keys**. Use `== null` / optional chaining, never `!== null`.
- **SelectButton doesn't repaint on programmatic writes.** The stat cards are custom buttons, not a `SelectButton`; that is why `StatFilterCard` exists.
- **Both locales in the same change**, with the same key order.
- **Strict generic-CRUD filters.** The audit-trail `action` filter key is `action` (snake_case). An unknown key returns 400.
- **Vue prop timing.** The review dialog and the drawer fetch on `watch(() => props.visible && props.id, …, { immediate: true })`, not on `onMounted` (AP Payment picker bug).

---

## 3. Types: `src/types/deviceBinding.type.ts`

```ts
export type BindingStatus = 'pending_review' | 'active' | 'blocked' | 'not_logged_in'
export type DeviceStatus = 'pending' | 'active' | 'sync_only' | 'released' | 'rejected' | 'blocked'
export type Platform = 'android' | 'ios'
export type ChangeReason = 'new_phone' | 'broken' | 'lost' | 'reset' | 'other'
export type NotificationChannel = 'email' | 'whatsapp'
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'

export interface DeviceInfo {
  id: number; uid: string; platform: Platform; model?: string; osVersion?: string; appVersion?: string
  status: DeviceStatus; boundAt?: string; syncOnlyUntil?: string; lastSyncAt?: string
  changeReason?: ChangeReason; changeNote?: string; requestedAt?: string; previousModel?: string
}
export interface DeviceBindingRow {
  employee: { id: number; name: string; nip?: string; phone: string; typeName: string; branch: Ref; team?: Ref }
  status: BindingStatus
  currentDevice?: DeviceInfo
  pendingDevice?: DeviceInfo
  appOutdated: boolean; osOutdated: boolean; mockLocationDays30: number
  hasUsableCode: boolean; pinSet: boolean; pendingRequestId?: number; openBlockId?: number
}
export interface DeviceBindingSummary {
  enrolled: number; android: number; ios: number; latestAppVersion?: string
  active: number; pending: number; blocked: number; notLoggedIn: number; stale24h: number
  approvalFlowConfigured: boolean
}
export interface ActivationCode { … }      // BE §7 activation-code response
export interface DeviceHistory { … }       // BE §7 history response
export interface ChangeRequestReview { … } // BE §7 requests/{id} response
export interface DeviceBindingConfig { … } // BE §2 device_binding_configs columns, camelCase
export type StatusFilter = BindingStatus | 'stale24h' | null
```

---

## 4. Services

**`deviceBinding.service.ts`** (+ spec covering `toListQuery` param mapping and every URL):

```ts
list(qs) · summary({branchId, teamId, platform}) · toListQuery(state, filters)
getActivationCode(employeeId) · sendActivationCode(employeeId, channels)
resetPin(employeeId, reason) · resetBinding(employeeId, reason)
block(employeeId, reason, deviceId?) · unblock(blockId, reason)
history(employeeId) · getChangeRequest(deviceId)
```

**`deviceBindingConfigs.service.ts`:** `getMyCompany()`, `get(companyId)`, `update(companyId, body)`.

**`constants/api.ts` entries:** `DEVICE_BINDING`, `DEVICE_BINDING_SUMMARY`, `DEVICE_BINDING_ACTIVATION_CODE(id)`, `…_SEND(id)`, `…_RESET_PIN(id)`, `…_RESET_BINDING(id)`, `…_BLOCK(id)`, `…_UNBLOCK(blockId)`, `…_HISTORY(id)`, `…_REQUEST(deviceId)`, `DEVICE_BINDING_CONFIGS_MY_COMPANY`, `DEVICE_BINDING_CONFIGS(companyId)`.

---

## 5. List (mockup "Device Binding — List")

### `DeviceBindingView.vue`

```
┌ Device Binding ───────────────────────────────────────────────────────────────┐
│ 68 salesmen with N-Force access · 64 Android · 4 iOS · latest app 2.4.1       │
│ [!] No approval flow configured for Device Binding. Change requests wait…    │  ← Message warn, only if !approvalFlowConfigured && canAccess /configs
│ ┌59 Registered┐┌3 Awaiting approval┐┌2 Blocked┐┌4 Not logged in┐┌7 No sync >24h┐ │  ← StatFilterCard ×5
│ [Branch ▾] [Team ▾] [Platform ▾] [App version: All / Outdated only ▾] [Search]│
│ Salesman            Mode  Device                 Device ID  App    Last sync  Status   ⋯ │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Header line** comes from `summary`. Re-fetch it whenever the branch, team or platform filter changes, and after any row action (`@changed`).
- **No-flow banner (D6):** links to `/configs?tab=device-binding` when the user has config read.
- **Stat cards:**
  - Each `StatFilterCard` takes `:count`, `:label`, `:severity` (success / warn / danger / secondary / warn), `:active` and `@toggle`.
  - Clicking the active card clears the filter.
  - `stale24h` maps to the `stale=true` query param; the others map to `status=`.
- **Columns:**
  - **Salesman:** avatar initials, name, and `nip · phone` beneath.
  - **Mode:** type badge, `TO` for Salesman and `KV` for Canvass. Labels come from i18n, keyed by the `EMPLOYEE_TYPE_NAMES` constants, not hardcoded strings.
  - **Device:** `DeviceCell`.
  - **Device ID:** `shortUid(uid)` gives `9f3a…c21e`, monospace, with the full uid in a tooltip.
  - **App:** orange when `appOutdated`.
  - **Last sync:** relative time ("Today 07:12", "2 days ago" with the absolute date under it). For pending rows the sub-line is "from old phone".
  - **Status:** a Tag. `pending_review` → warn "Awaiting review", `active` → success "Registered", `blocked` → danger, `not_logged_in` → secondary with an inline "View code" link when `hasUsableCode || !pinSet`.
  - **⋯:** `DeviceBindingRowMenu`.
- **Pending rows** get a row class (`bg-amber-50 dark:bg-amber-950/30`). The server already sorts them first.
- **Deep link:** `?request=<deviceId>` opens `DeviceChangeReviewDialog` on mount (My Approvals link). `?employee=<id>&panel=history` opens the drawer.
- **Export (mockup) is dropped** (D11). Leave no placeholder button.

### `components/DeviceCell.vue`
- A platform badge (`pi pi-android` / `pi pi-apple`) followed by the model.
- Sub-line: `Android 14` · plus "requested change from {previousModel}" (pending) · plus an orange "Below minimum iOS 15" when `osOutdated` · plus a red "Mock location detected N×" when `mockLocationDays30 > 0`.
- Empty state: an em dash.

### `components/StatFilterCard.vue` (reusable)
- A `<button>` with `role="tab"`, `aria-pressed`, a large count and a small label.
- The active state uses a ring and a tinted background drawn from the severity token.
- Spec: emits `toggle`, `aria-pressed` reflects `active`, and it renders the count.

---

## 6. Row menu and action dialogs

### `components/DeviceBindingRowMenu.vue`
This is the first PrimeVue `Menu` used with `:popup="true"`, toggled by a `pi pi-ellipsis-v` text button. The items are a computed array. A disabled item's tooltip goes in the item's `label` suffix, because Menu items don't support tooltips well.

| Item | Visible when | Needs |
|---|---|---|
| View activation code | `hasUsableCode \|\| !pinSet` | WRITE (136; the backend audits the view and may generate a code) |
| Review change request | `status === 'pending_review'` | READ |
| Reset PIN | `pinSet` | WRITE |
| Device history | always | READ |
| Reset binding | `currentDevice` present; disabled with "Resolve the pending request first" when `pendingDevice` | WRITE |
| Block device | `currentDevice \|\| pendingDevice` | WRITE |
| Unblock | `status === 'blocked'` and `openBlockId` present (the row contract carries `openBlockId?`) | WRITE |

It emits `view-code`, `review`, `history` and `action(kind)`. The page owns the dialogs, so only one instance of each exists.

Spec: item visibility per status and permission combination, plus the disabled reset when a request is pending.

### `components/DeviceActionReasonDialog.vue`
- Props: `kind: 'reset_pin' | 'reset_binding' | 'block' | 'unblock'`, `employeeName`, `deviceLabel?`, `visible`.
- A per-kind title, a warning `Message` (e.g. block: "This phone can't be used by any salesman in this company until unblocked"), and a required `Textarea` (trimmed, inline error).
- Confirm is a danger button for block/reset and primary otherwise.
- It calls the service and shows a toast. A 409 `pending_request_exists` toast uses i18n `deviceBinding.errors.pendingRequestExists`.
- It emits `done`. For `reset_pin`, `done` carries the new code payload, and the page then opens `ActivationCodeDialog` with it, so the admin sees the new code immediately.

### `components/ActivationCodeDialog.vue` (mockup "Kode aktivasi & reset PIN")
- It fetches on open (prop-timing watch) unless it is given a payload.
- **Body:**
  - The employee line (`name · nip · phone`).
  - A large code `731 905` (grouped 3+3, monospace).
  - A meta line: "Generated by system 06 Oct 16:12 when N-Force access was enabled · valid until 13 Oct · single use". Purpose `reset_pin` changes the wording.
  - Info text: "Give it directly to the salesman. This code only works with number {phone}…"
- **Buttons:**
  - **Copy** uses `useClipboard`; the toast confirms.
  - **Share to WhatsApp** is an `<a target="_blank">` built by `waMeLink(phone, message)`. The message comes from `t('deviceBinding.code.waMessage', {...})`.
- **"Send via" section (D7):**
  - Checkboxes: WhatsApp (shows `channels.whatsapp.address`) and Email (shows `channels.email.address`). Each is disabled when `!enabled` or there's no address, with the reason as helper text ("No email on employee", "Email provider not configured").
  - The **Send** button posts the selected channels and then re-fetches.
  - A deliveries list underneath shows the channel icon, a status tag (`queued/sending` → info with a spinner, `sent` → success, `failed` → danger with `lastError` in a tooltip, `skipped` → secondary) and the time.
  - While any delivery is `queued` or `sending`, poll the code endpoint every 3 s for up to 30 s. Poll with `?includeCode=false` (BE §7), which returns deliveries only and doesn't audit a view.
- 404 `no_code` → a message saying "PIN already set. Use Reset PIN to issue a new code."

### `deviceBindingHelpers.ts` (+ spec)
- `shortUid(uid)`: first 4 + `…` + last 4.
- `waMeLink(phone, text)`: normalize digits, leading `0` → `62`, then `https://wa.me/<digits>?text=<encodeURIComponent>`. Must match the backend's `normalize_phone`; the spec reuses the BE table cases.
- `formatCode('731905')` → `'731 905'`.
- `statusSeverity(status)`, `deliverySeverity(status)`.
- `reviewChecks(review)` → `[{ key, ok: boolean, severity }]`.
- `deviceDifferences(current, requested)` → keys to highlight.

---

## 7. Review dialog and history drawer

### `components/DeviceChangeReviewDialog.vue` (mockup "Review permintaan ganti device")
- **Props:** `deviceId`, `visible`. It fetches `getChangeRequest(deviceId)` with the prop-timing watch.
- **Header:** "Device change request". Sub-line: employee · nip · team — branch · "submitted {requestedAt}".
- **Two cards side by side** (stacked under `md`):
  - *Current device*: model, platform/OS, device ID, login phone, registered date, last sync.
  - *New device*: model, platform/OS, device ID, login phone with "✓ same", reason (i18n per `ChangeReason`), and the note in quotes.
  - Rows in `differences` render red. A platform difference adds "Platform switch, not a factory reset".
- **Checks list** (`reviewChecks`):
  - ✓ PIN login.
  - ✓/✗ not bound elsewhere and not blocked. ✗ turns red and shows "Reset the other salesman's binding first".
  - ✓/! risk flags.
  - ! old phone last sync, with the sync-only explanation and the config's `syncOnlyDays`.
- **Actions:**
  - When `approval.flowConfigured && approval.submitted`: render `ApprovalActionBar :module-key="'device_binding'" :reference-id="deviceId"`, which handles approve/reject with a required reject comment, plus `ApprovalTimeline`. When the "not bound elsewhere" or "not blocked" check fails, **disable Approve**. `ApprovalActionBar` has no such prop today, so **add an optional `approveDisabledReason?: string` prop** (+ spec case). The backend still guards with a 409.
  - When `!flowConfigured`: a warn `Message` linking to the config tab. No approve.
  - When `flowConfigured && !submitted` (the sweep failed): an info message saying "Not yet submitted; re-save the Device Binding config to submit".
  - **Later** closes the dialog.
- On `changed`, emit `changed` so the page reloads the list and the summary.

### `components/DeviceHistoryDrawer.vue` (mockup "Riwayat device")
- This is the first content `Drawer`: `position="right"`, `class="!w-full md:!w-[28rem]"`.
- **Header:** "Device history", then `name · nip · {n} devices since {first date}`.
- **Timeline:** PrimeVue `Timeline` (or a simple vertical list if Timeline styling clashes), newest first. Each device row shows:
  - the platform badge, model and short uid;
  - the period: "Active since …" or "{from} — {to} · {release reason}";
  - "approved by {actorName}" or "blocked by {actorName}";
  - the reason in quotes;
  - the red flag line "Mock location detected: 24 Sep, 02 Oct".
- The last entry is "First login · auto-bind" with a timestamp.
- Read-only. A link "Open in audit trail" goes to `/audit-trails?referenceType=employee_device&referenceId=<deviceId>` when the user has `AUDIT_TRAIL_READ`.

---

## 8. Changes outside `device-binding/`

### Configs: `views/configs/DeviceBindingConfigsView.vue` + `ConfigsView.vue`
- **Form fields:**
  - Approval flow: a `Select` over approval flows filtered to `moduleKey = 'device_binding'` and active, with "None" as an option. Helper text: "Without a flow, change requests wait and can't be approved".
  - `InputNumber` fields: activation code validity (days), sync-only days, max PIN attempts, lockout minutes.
  - Text inputs for min app version and min OS, per platform. Validate `^\d+(\.\d+){0,2}$`.
- **Save → toast.** If the flow went from none to set, the toast also says "{n} pending requests submitted". The count comes from the PUT response's `submittedCount` (BE §7).
- **Wiring into `ConfigsView`** follows its five steps: import + `v-if` render, `usePermissions('/device-binding-configs')`, a `configOptions` entry `device-binding`, a `canWriteActive` branch with the ref/add handling, and the permission added to the Config menu item's `permissionsAny`.

### Employee form: `views/employees/EmployeeDetailView.vue`
- Under the N-Force toggle, a hint: "Salesman and Canvass employees with N-Force access get an activation code automatically and appear in Device Binding."
  - Show it only when the selected type is Salesman or Canvass (`EMPLOYEE_TYPE_NAMES`).
  - When another type has N-Force on, show a muted note instead: "This type doesn't use device binding".
- Map the 409 `phone_taken_nforce` to a field-level error on phone, using the employee name from the error.
- After saving an employee who became eligible, the toast gets an action link "Open Device Binding" (`/device-binding?employee=<id>`), shown only with `DEVICE_BINDING_READ`.

### Audit trails
- **`constants/auditReferenceTypes.ts`:** add `employee_device`, `activation_code`, `device_block`, `device_binding_config`.
  - Their reference fetchers can point at nothing, since these entities have no list endpoint. Use the existing pattern's "no picker" variant if there is one. Otherwise allow free-text reference id for these types.
  - **Also register the three Sales Team types**, which are still labels-only. This is optional, but cheap while in this file; flag it in the PR.
- **`AuditTrailsView.vue`:**
  - New columns **Action** (i18n `auditTrails.actions.<action>`, falling back to the raw key) and **Reason** (truncated, with a tooltip).
  - "System" when `createdBy` is absent.
  - `AuditTrailFilters.vue` gains an Action `Select` (filter key `action`).
- **`AuditTrailDetailView.vue`:** show the action and reason above the diff.
- **Specs:** update the existing `AuditTrailFilters` spec.

### My Approvals
- **Checked:** `MyApprovalsView.vue` has no module key → label/route map today. It shows the raw `moduleKey` and `referenceId` columns, plus its own Approve/Reject buttons. There's no backend summary either (BE §8).
- Add a small map in the view (or `constants/approvalModules.ts`): `device_binding` → i18n label + link `/device-binding?request=<referenceId>`. Unknown keys fall back to the raw key and no link, so other modules are unchanged. Adding labels for the other modules is optional; flag it in the PR.
- Approving straight from My Approvals is allowed: the backend re-checks every rule. A 409 (`device_bound_to_other`, `device_blocked`, `request_not_pending`, `concurrent_change`) shows the backend message in a toast.

### Users
- **Backend shape since phase 2:** `GET /gen/v1/users` omits `email` when it's NULL, and `/v1/auth/me` may omit it too. Make `email` optional in `types/user.type.ts`, then follow the type-check errors.
- **Join columns:** generic-CRUD responses that join users (`userEmail` on user roles, user branches and similar, `createdByEmail` on documents) return `""`, not an absent key, for an email-less user. A salesman account can be a sales order's creator, so render `""` as "—" wherever those columns show.
- **User list and detail:** an email cell with "—" when absent, plus an "N-Force" tag when `employeeId` is set and there is no email.
- **Edit form:** don't require an email for an existing email-less user. Leave it read-only, because these accounts have no password login.

---

## 9. Wiring

### `src/constants/permissions.ts`
```ts
DEVICE_BINDING_READ: 135, DEVICE_BINDING_WRITE: 136,
DEVICE_BINDING_CONFIG_READ: 137, DEVICE_BINDING_CONFIG_WRITE: 138,
```
- `ROUTE_PERMISSIONS['/device-binding'] = DEVICE_BINDING_READ`, `ROUTE_WRITE_PERMISSIONS['/device-binding'] = DEVICE_BINDING_WRITE`.
- The same pair for `/device-binding-configs` (137/138).

### `src/router/index.ts`
- `/device-binding` → `DeviceBindingView`, with `meta: { requiredPermission: PERMISSIONS.DEVICE_BINDING_READ, titleKey: 'navigation.deviceBinding' }`.

### `src/components/menu/menu.ts`
- "Device Binding" goes directly after Sales Teams, with `labelKey: 'navigation.deviceBinding'` and `route: '/device-binding'`.

### i18n: both files, same change, same key order
```
navigation.deviceBinding
deviceBinding.title / headerLine / noFlowBanner
deviceBinding.stats.{active,pending,blocked,notLoggedIn,stale24h}
deviceBinding.filters.{branch,team,platform,appVersion,allVersions,outdatedOnly,search}
deviceBinding.columns.{salesman,mode,device,deviceId,app,lastSync,status}
deviceBinding.status.{pending_review,active,blocked,not_logged_in}
deviceBinding.deviceStatus.{pending,active,sync_only,released,rejected,blocked}
deviceBinding.mode.{salesman,canvass}
deviceBinding.device.{requestedFrom,belowMinOs,mockDetected,fromOldPhone,never}
deviceBinding.menu.{viewCode,review,resetPin,history,resetBinding,block,unblock,resolvePendingFirst}
deviceBinding.code.{title,auto,forFirstLogin,forResetPin,meta,info,copy,copied,shareWa,waMessage,sendVia,send,noEmail,noPhone,providerDisabled,noCode,deliveries}
deviceBinding.delivery.{queued,sending,sent,failed,skipped}
deviceBinding.reason.{title.*,warning.*,label,required,confirm.*}
deviceBinding.review.{title,current,new,model,platformOs,deviceId,loginPhone,same,registered,lastSync,reason,note,checks.*,platformSwitch,noFlow,notSubmitted,later,boundElsewhereHint}
deviceBinding.changeReason.{new_phone,broken,lost,reset,other}
deviceBinding.history.{title,subtitle,activeSince,period,approvedBy,blockedBy,releaseReason.*,firstLogin,mockDates,openAudit}
deviceBinding.errors.{pendingRequestExists,deviceBoundToOther,deviceBlocked,requestNotPending,phoneTakenNforce}
deviceBinding.config.{title,flow,flowNone,flowHelp,codeTtl,syncOnlyDays,maxPinAttempts,lockoutMinutes,minApp,minOs,android,ios,saved,submitted}
employees.nforceHint / employees.nforceNotApplicable / employees.openDeviceBinding
auditTrails.references.{employee_device,activation_code,device_block,device_binding_config}
auditTrails.actions.{auto_bind,change_requested,approved,rejected,reset_binding,released_ineligible,block,unblock,view_code,code_generated,code_sent,reset_pin,identity_declined,lockout,login_blocked_device,login_rejected}
auditTrails.columns.{action,reason}  auditTrails.system
approvals.modules.device_binding
users.nforceAccount
```
Write the id-ID wording from the mockup, which is already in Indonesian: "Terdaftar", "Menunggu approval", "Diblokir", "Belum login", "Belum sync > 24 jam", "Lihat kode aktivasi", "Riwayat device", and so on.

---

## 10. Tests (vitest)

| Spec | Covers |
|---|---|
| `services/deviceBinding.service.spec.ts` | URLs, `toListQuery` mapping (status vs `stale`), `includeCode=false` |
| `components/StatFilterCard.spec.ts` | toggle emit, `aria-pressed`, count render |
| `views/device-binding/deviceBindingHelpers.spec.ts` | `shortUid`, `waMeLink` (same phone table as BE `normalize_phone`), `formatCode`, `reviewChecks`, `deviceDifferences` |
| `views/device-binding/components/DeviceBindingRowMenu.spec.ts` | visibility per status × READ/WRITE, disabled reset with a pending request |
| `components/approval/ApprovalActionBar.spec.ts` | new `approveDisabledReason` prop disables Approve and shows the reason |
| `views/audit-trails/components/AuditTrailFilters.spec.ts` | Action filter emits `action` |

Follow the house style: `vi.mock('vue-i18n')` returning the key, mocked toast/confirm/services, a stub tooltip directive, and `data-testid` selectors.

---

## 11. Verification

1. `npm run type-check`, `npm run lint` and `npm run test:unit` all green.
2. Run the live E2E from master §9 (steps 1, 2, 5, 6, 8–16 touch the UI) with Playwright MCP against a running `gudang-be`. Use curl for the device side.
3. Walk the whole UI in `id-ID`: no raw keys, including the menu items and the delivery tags.
4. Check the small viewport (Playwright `browser_resize` 390×844): the stat cards wrap, the table switches to cards, the drawer goes full width and the review cards stack. Remember the small-viewport menu gotcha from the Sales Team E2E.
5. Stop the dev server by port PID.

---

## 12. Implementation log

### Phases 5–7 — DONE 2026-10-10 (uncommitted)

**Verified:** `npm run type-check`, `npm run lint`, prettier and `npm run test:unit` (53 files, 413 tests) green. Backend `go vet ./...`, `go test ./...` and the DB-backed `make test-embeds` green after the one backend change below. A live E2E against `gudang-be` (Playwright for the admin side, a Python driver for the device API) covered master §9 steps 1–16 on the UI: enrollment from the employee form, phone conflict as a field error, first login and weak PIN, lockout → Reset PIN → new code shown at once, change request without a flow (banner, highlighted first row, review dialog with no Approve), the config-save sweep, My Approvals label + link, Approve disabled when the phone is bound elsewhere (and the backend 409 from My Approvals), approve, reject with a required comment, block/unblock, reset binding (and disabled while a submitted request waits), stat cards as filters, "Outdated only", history drawer, audit list Action/Reason/actor, deliveries Queued → Sent for WhatsApp and Email, lifecycle (deactivating withdraws the request), permissions (no 135 / 135 only / no 137), id-ID walk (no raw keys) and 375 px. Fixtures (ST employees 55–59 toggled on, a flow, a temp role) were reverted or deleted afterwards; servers stopped.

**Deviations from this plan:**

- **Files:** `StatFilterCard` lives in `components/card/`; the config form is `views/device-binding-configs/DeviceBindingConfigsView.vue` (like the other config tabs), not under `views/configs/`. The config tab has no Add button; it is one form saved in place.
- **Service:** `DeviceBindingService.listUrl(filters)` builds the list url (status card → `status`, "No sync > 24h" → `stale=true`, `outdated`); `toListQuery` only maps `search`/`page` to `q`/`offset`. Search param is `q`; device ids are `deviceUid` (not `uid`).
- **`ApiError` carries the backend `code`** (`types/api.type.ts`, `services/api.ts`), used for `no_code`, `phone_taken_nforce` and the friendlier 409 texts (`deviceBinding.errors.*`).
- **Backend change:** the employee API had no `code` on its 409, so `api/employees.yaml` `ErrorResponse` gained `code`, and create/update/toggle-active send `phone_taken_nforce`. The employee form shows the other employee's name from the message's trailing `(Name)`.
- **`ApprovalActionBar`:** besides `approveDisabledReason`, it gained `toastGroup`. Its default group `approvalActionBar` is rendered by no page, so its toasts never showed anywhere (pre-existing; the SO/AP forms are still affected).
- **`TableComponent`:** new `rowClass` prop (pending rows), and `dataKey` may be a nested path (`employee.id`) in the mobile card list too.
- **Dialogs and drawer** mount with `v-if` and fetch on mount, instead of `visible` + a prop-timing watch.
- **No-flow banner** shows for everyone with list access; only the settings link needs config read.
- **Reset binding** is disabled only while a *submitted* request waits (`pendingRequestId`); an unsubmitted one is released by the reset (backend §13).
- **Audit:** reference type `nforce_account` is registered with an employee picker; `employee_device`, `activation_code`, `device_block`, `device_binding_config` have no picker, so the filter takes a typed id. `AUDIT_ACTIONS` and `PHONE_ACTOR_ACTIONS` live in `types/auditTrail.type.ts`. Entries with no `createdBy` read "The salesman's phone" for phone actions and "System" otherwise (list and drawer). Sales Team reference types were **not** registered (their list endpoint is hand-written and would need an adapter).
- **History drawer:** "Open in audit trail" is per phone (`employee_device/<id>`); the account-level link (`nforce_account/<employeeId>`) shows only when such events exist. Change-request reasons are translated.
- **Users:** `email` optional on `User` and `MeResponse`; the list shows "—" plus an "N-Force" tag; the edit form no longer requires an email. Join columns showing `""` were left alone: salesman accounts don't create the master data those columns belong to, and no view shows a sales order's creator.
- **Row actions are inline, not a ⋯ menu** (user request, 2026-10-10). `components/DeviceBindingRowActions.vue` (was `DeviceBindingRowMenu.vue`) renders every available action in the Actions column: a labelled **Review** button on pending rows, then icon buttons with tooltips for View code, Reset PIN, History, Reset binding (disabled with the reason while a submitted request waits), Block and Unblock. Visibility rules are unchanged. The status cell's "View activation code" link was dropped as a duplicate. The buttons stay on one line; at 1280 CSS px the table scrolls ~60 px sideways (fits at 1440).
- **View code visibility uses the backend's `canViewCode`**, not `hasUsableCode || !pinSet`. The old rule hid the action after a PIN-reset code expired unused, though viewing reissues it (backend §13).
- **Employee form:** instead of a toast action, a "Device Binding" header button (view mode, eligible, `DEVICE_BINDING_READ`) opens `/device-binding?employee=<id>`, which opens the history drawer.

**Gotchas:**

- **Playwright closes popup Menus** when the toggle is partly off-screen: its scroll-into-view lands after the menu opens and PrimeVue hides on scroll. `scrollIntoViewIfNeeded()` + a short wait before clicking avoids it. Real users aren't affected. (The device list no longer uses a popup menu.)
- The MCP browser runs at DPR 1.5: `setViewportSize(390, …)` is a 260 CSS-px viewport. Use 563×1266 for 375 CSS px.
- The locale key is `app-locale`, not `locale`.
- `PATCH /v1/employees/{id}/active` needs `updatedBy`; without it the API answers 500 (FK), not 400.
- Dates format in English month names in id-ID (dayjs has no locale set, app-wide).
