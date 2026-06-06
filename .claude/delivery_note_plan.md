# Frontend Plan — Surat Jalan (Delivery Note) + Picking List

> Part of the **Surat Jalan** feature. See the master plan at `../../.claude/SURAT_JALAN_PLAN.md`
> and the backend plan at `../../gudang-be/.claude/delivery_note_plan.md`.

## Context

**Surat Jalan** (English: **Delivery Note**) consolidates one or more open **Delivery Orders (DO)**
into a single shipment (vehicle + driver) for delivery to outlets. On create, the backend
auto-generates a **Picking List** that aggregates all line items across the DOs (summed per
product + warehouse) for the warehouse team.

This adds the Delivery Note + Picking List frontend, modelled on the existing `delivery-orders` /
`sales-orders` features. The create screen is based on the `n_command_surat_jalan_v2.html` mockup,
**with the _Tipe Armada_ input and the entire _Cetak & Dokumen_ (print) section removed** per
request. Reuse `InfiniteSelect`, `NumberSeriesService.preview`, `VehiclesService`,
`EmployeesService`, `DeliveryOrdersService`, `ApiService`, and the `Base<T>` pagination type. Keep
all decimals/quantities as **strings** (monetary/precision convention).

### Mockup fields dropped (no data source)
Per-DO **weight (kg)** / **volume (m³)** and the vehicle **capacity %** bar, plus the
**salesman / area / routing / deadline** filters — none are backed by the DO data model. The
picker keeps a simplified filter: **text search** (DO no / customer) + optional **warehouse**.

## 1. Types (`src/types/`)
- `deliveryNote.type.ts`:
  - `DeliveryNoteListItem` (`id, no, deliveryDate, vehiclePlate, driverName, deliveryOrderCount, status`)
  - `DeliveryNoteDetail` (header + `deliveryOrders: {id,no,customerName,warehouseName}[]` + `pickingList: {id,no}`)
  - `AvailableDeliveryOrder` (`id, no, customerName, warehouseId, warehouseName, totalAmount: string`)
  - `CreateDeliveryNoteRequest` (`deliveryDate, vehicleId?, driverEmployeeId?, notes?, deliveryOrderIds: number[]`)
- `pickingList.type.ts`:
  - `PickingListListItem` (`id, no, deliveryNoteNo, createdAt, status`)
  - `PickingListItemView` (`productId, productCode, productName, warehouseName, quantity: string, uomSymbol, labelName: string|null, labelValue: string|null`)
  - `PickingListDetail` (header + `items: PickingListItemView[]`)
- Barrel-export both from `src/types/index.ts`.

## 2. Services + endpoints
- `src/services/deliveryNotes.service.ts` (static-class pattern like `deliveryOrders.service.ts`):
  `list(qs?)`, `get(id)`, `create(payload)`, `cancel(id)`, `listAvailableDeliveryOrders(qs?)`.
- `src/services/pickingLists.service.ts`: `list(qs?)`, `get(id)`. Export both from `src/services/index.ts`.
- `src/constants/api.ts`:
  ```ts
  DELIVERY_NOTES: '/v1/delivery-notes',
  DELIVERY_NOTE_BY_ID: (id: number) => `/v1/delivery-notes/${id}`,
  DELIVERY_NOTE_CANCEL: (id: number) => `/v1/delivery-notes/${id}/cancel`,
  DELIVERY_NOTE_AVAILABLE_DOS: '/v1/delivery-notes/available-delivery-orders',
  PICKING_LISTS: '/v1/picking-lists',
  PICKING_LIST_BY_ID: (id: number) => `/v1/picking-lists/${id}`,
  ```

## 3. Views (`src/views/`)

### `delivery-notes/DeliveryNotesView.vue` (list)
Responsive DataTable like `DeliveryOrdersView.vue`: columns no, delivery date, vehicle, driver,
#DOs, status. "Create" button → `DeliveryNoteCreate`; eye → `DeliveryNoteDetail`.

### `delivery-notes/DeliveryNoteCreateView.vue` (the builder)
Mirrors the mockup **minus Tipe Armada and the Cetak & Dokumen panel**:
- **Informasi Pengiriman**: `No` (read-only, `NumberSeriesService.preview('delivery_notes')`,
  "assigned on save" helper — pattern from `SalesOrderForm.vue`); `Tanggal Pengiriman` (date,
  default today); `Catatan` (notes); **Driver** = `InfiniteSelect` over `EmployeesService.list`;
  **Kendaraan** = `InfiniteSelect` over `VehiclesService.list` (label = plate / brand).
- **DO picker**: simplified filter row (text search + warehouse `InfiniteSelect`) → DataTable from
  `listAvailableDeliveryOrders` with row checkboxes, "select all", bulk "Add selected" / "Add all".
  Eye opens a detail dialog reusing `DeliveryOrdersService.get`.
- **Added DO list** ("DO dalam Surat Jalan ini"): rows with a remove button + a summary bar
  showing **#DO, #outlets, total value** (no kg/m³/capacity bar).
- Sticky footer + header **"Submit & Picking List"** → `DeliveryNotesService.create()` → success
  toast incl. the returned PL no → navigate to `DeliveryNoteDetail`.

### `delivery-notes/DeliveryNoteDetailView.vue`
Header, member-DO table, and a card linking to the generated Picking List (mirrors the mockup's
green "Picking List dibuat otomatis" reference).

### `picking-lists/PickingListsView.vue` (list)
DataTable: no, related DN no, date, status; eye → `PickingListDetail`.

### `picking-lists/PickingListDetailView.vue`
Items **grouped into sections by `labelValue`** — products sharing the same first-label value
render under one section header; products with no label fall under an **"Uncategorized"** section.
`computed` builds `Record<string, PickingListItemView[]>` keyed by `labelValue`; each section is a
small DataTable (product, warehouse, quantity + uom symbol).

## 4. Wiring
- `src/router/index.ts`: routes `delivery-notes`, `delivery-notes/create`, `delivery-notes/:id`,
  `picking-lists`, `picking-lists/:id`, each with `meta.requiredPermission`.
- `src/components/menu/menu.ts`: add "Delivery Note" + "Picking List" entries (Warehouse/Sales group).
- `src/constants/permissions.ts`: add `DELIVERY_NOTE_READ/WRITE`, `PICKING_LIST_READ` and the
  route → permission maps. **IDs must match the backend permission seed migration.**
- `src/i18n/locales/en-US.ts` + `id-ID.ts`: `deliveryNotes.*`, `pickingLists.*` keys.

## 5. Files
- **New**: `src/views/delivery-notes/**`, `src/views/picking-lists/**`,
  `src/types/deliveryNote.type.ts`, `src/types/pickingList.type.ts`,
  `src/services/deliveryNotes.service.ts`, `src/services/pickingLists.service.ts`.
- **Edited**: `constants/api.ts`, `constants/permissions.ts`, `router/index.ts`,
  `components/menu/menu.ts`, `types/index.ts`, `services/index.ts`, i18n locales.
- **Reused**: `components/select/InfiniteSelect.vue`, `NumberSeriesService`, `VehiclesService`,
  `EmployeesService`, `DeliveryOrdersService`, `ApiService`, `Base<T>`.

## 6. Verification
1. `npm install && npm run dev`. Create page: number preview shows; Driver/Vehicle pickers load;
   DO picker lists available DOs; bulk-add + remove work; Submit creates and routes to detail
   showing the PL link.
2. Picking List detail groups items into sections by first-label value (+ an "Uncategorized" section).
3. `npm run type-check && npm run lint && npm run test:unit`.
