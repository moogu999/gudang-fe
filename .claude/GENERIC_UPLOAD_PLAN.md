# Generic Upload Feature — Frontend Plan (`gudang-fe`)

> Master plan: `../../.claude/GENERIC_UPLOAD_PLAN.md`. Backend plan:
> `../../gudang-be/.claude/GENERIC_UPLOAD_PLAN.md`.

## Context

Employee photo upload is currently bespoke and inlined in
`src/views/employees/EmployeeDetailView.vue`: a custom hidden `<input type="file">` with
`onPhotoSelected` / `tryUploadPhoto` / delete handlers (≈ lines 99–158 and 768–830), calling
`EmployeesService.uploadPhoto` (`src/services/employees.service.ts` lines 39–43) which posts
multipart to `/v1/employees/{id}/photo`. The photo is displayed from `employee.photoUrl` with a
`photoSrc()` helper that prepends `VITE_API_BASE_URL`.

We are replacing this with a generic, reusable upload component/composable/service that talks to
the new backend `/v1/files` endpoint (polymorphic `ownerType` + `ownerId` + `category`), and
migrating the employee view to use it.

**Locked decisions:** dedicated `files` backend table; single+multi cardinality (employee photo =
single); employee API keeps returning `photoUrl`, so display stays unchanged.

## 1. Generic, Reusable Pieces

- `src/types/file.type.ts`
  - `FileRecord`: `{ id, ownerType, ownerId, category, url, originalName, mimeType, size }`.
  - `UploadFileDto`: `{ ownerType, ownerId, category, file }`.
- `src/constants/api.ts` — add `FILES: '/v1/files'` (custom `/v1/` namespace, not `/gen/v1/`).
- `src/services/files.service.ts` — static-class service matching existing convention
  (`UsersService`, `EmployeesService`):
  - `upload(ownerType, ownerId, category, file): Promise<FileRecord>` — builds `FormData`
    (`file`, `ownerType`, `ownerId`, `category`) and calls `ApiService.postMultipart`
    (`src/services/api.ts` lines 177–183 — strips `Content-Type` so the browser sets the boundary;
    60s timeout; cookie auth via `withCredentials`).
  - `list(params: { ownerType; ownerId; category? }): Promise<FileRecord[]>`.
  - `remove(id: number): Promise<void>`.
- `src/composables/useFileUpload.ts` — encapsulates selection, object-URL preview, upload state
  (`isUploading`, `error`), and delete. Options: `cardinality: 'single' | 'multi'`, `accept`,
  `maxSize`. Mirrors the current preview pattern (`URL.createObjectURL` while pending, swap to
  server `url` after upload).
- `src/components/upload/FileUpload.vue` — generic component using a custom hidden
  `<input type="file">` + trigger button + preview (matches existing employee UI style, **not**
  PrimeVue FileUpload, consistent with the current code). Props: `ownerType`, `ownerId`
  (nullable for not-yet-created entities), `category`, `cardinality`, `accept`, `maxSize`,
  `modelValue` (existing url(s)). Emits `uploaded` / `removed`. Builds display URLs with the
  existing `VITE_API_BASE_URL` prepend rule (reuse the `photoSrc` logic).
  - Exposes a `flushPending(ownerId)` method (or accepts a watched `ownerId`) so a parent can
    trigger the actual upload once a new entity id exists — supporting the create flow.

## 2. Employee Migration — `src/views/employees/EmployeeDetailView.vue`

- Replace the bespoke photo markup + `onPhotoSelected` / `tryUploadPhoto` / delete handlers
  (≈ lines 99–158, 768–830) with:
  ```vue
  <FileUpload
    owner-type="employee"
    category="photo"
    cardinality="single"
    :owner-id="employeeId"
    :model-value="employee?.photoUrl"
    @uploaded="onPhotoUploaded"
    @removed="onPhotoRemoved"
  />
  ```
- **Preserve the create flow:** an employee must exist before a file can attach (`ownerId`
  required). Keep the "hold pending file, upload after create" behavior — after the create
  request returns the new id, call the component's `flushPending(newId)` (non-blocking; warning
  toast on failure, same as today).
- Display continues to read `employee.photoUrl` (still returned by the backend), so avatar +
  full-size dialog rendering is unchanged.

## 3. Cleanup

- Remove `EmployeesService.uploadPhoto` (`src/services/employees.service.ts` lines 39–43) and any
  now-unused photo helpers/refs in `EmployeeDetailView.vue`.

## Verification

- `npm run type-check && npm run lint && npm run test:unit`.
- Add a unit test for `useFileUpload` (selection → preview → upload state) and/or
  `files.service` FormData shape.
- `npm run dev` (backend running):
  - **Create flow:** new employee + select photo → after save, photo uploads and renders.
  - **Edit flow:** existing employee → upload replaces the photo; reload shows persisted photo.
  - **Delete:** removing the photo clears it and persists after reload.
  - Confirm no employee-specific upload code path remains (all goes through `FileUpload` →
    `files.service` → `/v1/files`).
