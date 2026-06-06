# Vehicles (Master Kendaraan) — Frontend Plan

See the umbrella plan at `../../.claude/VEHICLES_PLAN.md` and the backend plan at
`../../gudang-be/.claude/VEHICLES_PLAN.md`.

## Context

Build the **Vehicles** screens against the generic-CRUD endpoints `/gen/v1/vehicles` and
`/gen/v1/vehicle-types`. Legal documents reuse the existing file-upload feature. Because the
mockup is a sectioned detail drawer with document uploads, the create/edit experience uses a
**detail page** (Employee-style) rather than a simple modal dialog. Trip histories are deferred.

Reference implementations to mirror:
- Simple master (list + dialog + FK select): `src/views/warehouses/WarehousesView.vue`, `WarehouseDialog.vue`, `src/services/warehouses.service.ts`, `src/types/warehouse.type.ts`
- Detail page with deferred document upload: `src/views/employees/EmployeeDetailView.vue` (`flushPending(createdId)`)
- File reuse: `src/services/files.service.ts`, `src/composables/useFileUpload.ts`, `src/types/file.type.ts`
- Generic list: `src/components/table/TableComponent.vue`; FK dropdown: `src/components/select/InfiniteSelect.vue`

## 1. Wiring

**`src/constants/api.ts`** — add:
```ts
GEN_VEHICLES: '/gen/v1/vehicles',
GEN_VEHICLE_TYPES: '/gen/v1/vehicle-types',
```

**`src/constants/permissions.ts`** — add ids and route maps:
```ts
VEHICLE_TYPE_READ: 62, VEHICLE_TYPE_WRITE: 63,
VEHICLE_READ: 64, VEHICLE_WRITE: 65,
// ROUTE_PERMISSIONS:        '/vehicles': PERMISSIONS.VEHICLE_READ,
// ROUTE_WRITE_PERMISSIONS:  '/vehicles': PERMISSIONS.VEHICLE_WRITE,
```

**`src/router/index.ts`** — lazy routes (mirror employees):
```ts
{ path: 'vehicles',      name: 'Vehicles',     component: () => import('@/views/vehicles/VehiclesView.vue'),      meta: { requiredPermission: PERMISSIONS.VEHICLE_READ } },
{ path: 'vehicles/new',  name: 'VehicleNew',   component: () => import('@/views/vehicles/VehicleDetailView.vue'), props: { mode: 'add' },                          meta: { requiredPermission: PERMISSIONS.VEHICLE_WRITE } },
{ path: 'vehicles/:id',  name: 'VehicleDetail',component: () => import('@/views/vehicles/VehicleDetailView.vue'), props: r => ({ mode: 'view', id: Number(r.params.id) }), meta: { requiredPermission: PERMISSIONS.VEHICLE_READ } },
```

**`src/components/menu/menu.ts`** — add a **Vehicles** item (new "Logistics/Fleet" group, icon `pi pi-truck`, or under an existing group), `labelKey: 'navigation.vehicles'`, `route: '/vehicles'`.

**`src/i18n/locales/en-US.ts` + `id-ID.ts`** — add `navigation.vehicles` and a `vehicles` block:
`title, addVehicle, editVehicle, viewVehicle, fields.*` (plateNumber, vehicleType, brandModel, color, year, chassisNumber, engineNumber, ownership, capacityKg, volumeM3, bakLength/Width/Height, cargoType, stnkExpiry, insuranceExpiry, nextServiceKm, status), `labels.*` (selectType, uploadStnk/Bpkb/Insurance, markService, deactivate), `options.*` (ownership, cargoType, status), `validation.*`, `messages.*`.

## 2. Types (`src/types/`)

**`vehicleType.type.ts`** — `VehicleType { id, code, name, sortOrder, isActive, ... }`.

**`vehicle.type.ts`**:
```ts
export interface Vehicle {
  id: number
  plateNumber: string
  vehicleTypeId: number
  vehicleTypeCode: string
  vehicleTypeName: string
  brandModel: string | null
  color: string | null
  year: number | null
  chassisNumber: string | null
  engineNumber: string | null
  ownership: 'owned' | 'leased'
  capacityKg: string | null          // decimal string
  volumeM3: string | null
  bakLengthM: string | null
  bakWidthM: string | null
  bakHeightM: string | null
  cargoType: 'dry' | 'chiller' | 'freezer' | 'mixed'
  stnkExpiry: string | null
  insuranceExpiry: string | null
  nextServiceKm: number | null
  status: 'available' | 'service' | 'inactive'
  createdAt: string; createdBy: number; createdByEmail: string
  updatedAt: string | null; updatedBy: number | null; updatedByEmail: string | null
}
export interface CreateVehicleDto { /* writable fields */ createdBy: number }
export interface UpdateVehicleDto { /* writable fields */ updatedBy: number }
```

## 3. Services (`src/services/`)

`vehicleTypes.service.ts` and `vehicles.service.ts` — static-class pattern copied from
`warehouses.service.ts` (`list/create/update/delete`), pointed at the new endpoints. Add both to
the `src/services/index.ts` barrel.

## 4. Views (`src/views/vehicles/`)

### `VehiclesView.vue` (list)
- `TableComponent` with columns: plate (`plateNumber`), type (`vehicleTypeName`, `underlyingField: vehicleTypeId`), `capacityKg`, `volumeM3`, STNK (`stnkExpiry` + days-left helper), ownership, status badge, actions.
- Toolbar "Tambah Kendaraan" → `router.push('/vehicles/new')`; row edit/view → `/vehicles/:id`.
- `usePermissions('/vehicles')` for `canWrite`; `useConfirmDelete` for delete via `VehiclesService.delete`.
- **Optional** summary cards (total / available / in service / total capacity) and type chip filters computed client-side from the loaded page (defer if it complicates the first cut).

### `VehicleDetailView.vue` (create / view / edit)
- Sections mirroring the mockup: **Identitas**, **Kapasitas Muatan**, **Dokumen Legal**, status quick-actions.
- `Form` + `zodResolver` (mirror `WarehouseDialog.vue`); **vehicle type** via `InfiniteSelect` bound to `VehicleTypesService.list` (`option-label="name"`, `option-value="id"`, `initial-option` on edit).
- Capacity numbers handled as decimal **strings** to/from the API.
- **Documents**: one row per `stnk` / `bpkb` / `insurance` using `useFileUpload({ ownerType: 'vehicle', category, cardinality: 'single', accept: '.pdf,image/*' })`.
  - On view/edit: `FilesService.list({ ownerType: 'vehicle', ownerId: id, category })` to show current file (link opens `record.url`).
  - On add: hold pending files; after `VehiclesService.create` returns the new `id`, call each `useFileUpload` instance's `upload(id)` (the `flushPending` pattern from `EmployeeDetailView.vue`).
  - Reuse `useFileUpload` (generic) rather than `FileUpload.vue`, which is avatar/image-specific.
- Status quick-actions ("Tandai Servis" / "Non-aktifkan") → `VehiclesService.update(id, { status, updatedBy })`.

### Vehicle Types management (optional follow-up)
A minimal `VehicleTypesView.vue` + `VehicleTypeDialog.vue` (copy Warehouse pattern) if direct
management of the lookup is wanted; otherwise the seeded list is sufficient.

## Verify
```bash
npm run type-check && npm run lint
npm run dev
# - /vehicles lists rows with type name + status badge
# - create a vehicle, attach an STNK PDF, save -> file visible via /v1/files
# - edit status (Mark Service) reflects in the list badge
# - without VEHICLE_WRITE: add/edit/delete actions hidden (usePermissions)
# - toggle locale id-ID / en-US: all labels translated
```
