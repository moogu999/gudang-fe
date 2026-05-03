# Customer Labels Integration — Frontend Plan

## Konteks

Type `customerLabelDefinition.type.ts`, service `customerLabelDefinitions.service.ts` dan `customerLabelOptions.service.ts` sudah ada. Yang belum ada adalah **integrasi ke modul Customer**: assignment label per customer, tampilan label di edit/detail, dan filter label di list view. Pola referensi: `views/products/`, `services/products.service.ts`, `views/products/ProductSetLabelsDialog.vue`.

## Perubahan

### 1. Type `Customer` + tipe label value
**File**: `src/types/customer.type.ts`

Tambahkan ke `Customer`:

```ts
labels?: CustomerLabelValue[]
```

Tambahkan tipe-tipe pendukung (mirror `ProductLabelValue`/`ProductLabelDefinitionLite`/`ProductLabelOptionLite` di `src/types/product.type.ts`):

```ts
export type CustomerLabelDefinitionLite = { id: number; name: string }
export type CustomerLabelOptionLite = { id: number; value: string }

export type CustomerLabelValue = {
  id: number
  customerId: number
  labelDefinitionId: number
  labelOptionId: number
  definition?: CustomerLabelDefinitionLite
  option?: CustomerLabelOptionLite
}
```

Export dari `src/types/index.ts`.

### 2. Konstanta API
**File**: `src/constants/api.ts`

Tambahkan endpoint v1 untuk filter + setLabels:

```ts
CUSTOMERS_V1: '/v1/customers',
```

`GEN_CUSTOMER_LABEL_DEFINITIONS` dan `GEN_CUSTOMER_LABEL_OPTIONS` sudah ada.

### 3. CustomersService — `setLabels`
**File**: `src/services/customers.service.ts`

Mirror `ProductsService.setLabels` (lihat `services/products.service.ts`):

```ts
static async setLabels(
  customerId: number,
  labels: { labelDefinitionId: number; labelOptionId: number }[],
): Promise<void> {
  return ApiService.put<void>(
    `${API_ENDPOINTS.CUSTOMERS_V1}/${customerId}/labels`,
    { labels },
  )
}
```

### 4. Komponen `CustomerSetLabelsDialog.vue` (baru)
**File**: `src/views/customers/CustomerSetLabelsDialog.vue`

Direct port dari `src/views/products/ProductSetLabelsDialog.vue`:
- Props: `customerId: number`, `currentLabels: CustomerLabelValue[]`.
- Service: `CustomerLabelDefinitionsService.list` dan `CustomerLabelOptionsService.list`.
- Filter option: `customer_label_definition_id` (bukan `product_label_definition_id`).
- Save: `CustomersService.setLabels(customerId, labels)`.
- I18n key: `customers.labels.*`.
- Emit `close` setelah save.

### 5. Tampilkan label di Edit + Detail Customer
**Files**:
- `src/views/customers/CustomerEditView.vue`
- `src/views/customers/CustomerDetailView.vue`

Mirror blok "Labels Section" di `src/views/products/ProductDialog.vue:169-232`:
- Read-only `<DataTable>` dengan kolom `definition.name` & `option.value`.
- Tombol **Set Labels** (hanya di Edit) yang membuka `<Dialog>` berisi `<CustomerSetLabelsDialog />`.
- Setelah dialog tutup, panggil `CustomersService.getById(id)` untuk refresh `customer.labels`.

Detail view: tabel read-only saja, tanpa tombol set.

> Catatan: customer pakai route-based view (bukan dialog seperti product), jadi section ini muncul **di dalam** `CustomerEditView` di bawah `CustomerForm` (atau di dalam `CustomerForm` di bawah field address). Pilih lokasi yang konsisten secara UX — rekomendasi: `CustomerEditView` setelah `<CustomerForm>` block, supaya form submit tidak ikut mengubah label.

### 6. Filter label di `CustomersView`
**File**: `src/views/customers/CustomersView.vue`

Mirror `views/products/ProductsView.vue:1-100`:
- Tombol toolbar **Add Label Filter**.
- State `labelFilters: { definitionId?: number; optionId?: number }[]`.
- Tiap baris filter = dua `<InfiniteSelect>`:
  - Definition → `CustomerLabelDefinitionsService.list`.
  - Option → `CustomerLabelOptionsService.list` dengan `customFilters` `customer_label_definition_id = filter.definitionId`.
- `url` table:
  - Kalau ada filter aktif (definitionId & optionId terisi) → `${CUSTOMERS_V1}?labelFilter[i][definitionId]=...&labelFilter[i][optionId]=...&...querybuilder`.
  - Kalau kosong → `${GEN_CUSTOMERS}` seperti sekarang.

### 7. i18n
**Files**: `src/i18n/locales/en-US.ts`, `src/i18n/locales/id-ID.ts`

Tambah namespace `customers.labels` mirror dari `products.labels`:
- `title`, `setLabels`, `addLabelFilter`, `labelFilter`
- `selectDefinition`, `selectOption`, `noDefinitions`
- `labelsUpdated`
- `fields.label`, `fields.value`

## Critical Files

Baru:
- `src/views/customers/CustomerSetLabelsDialog.vue`

Edit:
- `src/types/customer.type.ts`, `src/types/index.ts`
- `src/constants/api.ts`
- `src/services/customers.service.ts`
- `src/views/customers/CustomerEditView.vue`
- `src/views/customers/CustomerDetailView.vue`
- `src/views/customers/CustomersView.vue`
- `src/i18n/locales/en-US.ts`, `src/i18n/locales/id-ID.ts`

## Reuse / Reference

- `src/views/products/ProductSetLabelsDialog.vue` — template komponen set labels.
- `src/views/products/ProductDialog.vue:169-232` — pola tampilan section label + tombol open dialog.
- `src/views/products/ProductsView.vue:1-100` — pola toolbar + label filter rows + URL building.
- `src/services/products.service.ts` — pola `setLabels`.
- `src/types/product.type.ts` — pola tipe `ProductLabelValue` + `*Lite`.

## Verifikasi

1. `npm run type-check` — bersih.
2. `npm run lint` — bersih.
3. `npm run dev` — test manual:
   - `/customers` → tombol **Add Label Filter** muncul; setelah pilih definition + option, tabel hanya menampilkan customer dengan label tsb.
   - Edit customer → bagian Labels muncul, current labels ter-list. Klik **Set Labels** → dialog muncul, simpan → tabel label ter-update.
   - Detail customer → label tampil read-only, tanpa tombol set.
4. Switch bahasa ke `id-ID` → semua label baru ter-translate.
5. `npm run test:unit` — tidak ada regresi.
