# Bulk CSV Upload — Frontend Plan

## Context

Users need a way to quickly fill or migrate data via CSV file uploads. The backend provides two generic endpoints per entity:
- `GET /gen/v1/{entity}/csv-template` — download CSV template
- `POST /gen/v1/{entity}/csv-upload` — upload filled CSV

This plan covers the frontend components and integration needed to support these endpoints.

**Key decisions:**
- **Products** is the first entity; others added later by wiring the same reusable components
- Error display is inline in the dialog (no separate page)
- Max 2 MB file size enforced client-side before upload

---

## 1. Add `upload()` method to ApiService

**File:** `src/services/api.ts` (modify)

```typescript
public async upload<T>(endpoint: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return response.data
}
```

## 2. Add CSV upload types

**File:** `src/types/csvUpload.type.ts` (new)

```typescript
export interface CsvUploadError {
  row: number
  column: string
  value: string
  message: string
}

export interface CsvUploadResponse {
  success: boolean
  totalRows: number
  successCount: number
  errors: CsvUploadError[]
}
```

Export from `src/types/index.ts`.

## 3. Create reusable `CsvUploadDialog.vue`

**File:** `src/components/csv/CsvUploadDialog.vue` (new)

**Props:**
- `visible: boolean`
- `entityName: string` — for i18n display
- `templateUrl: string` — GET endpoint for template download
- `uploadUrl: string` — POST endpoint for CSV upload

**Emits:** `close`, `success`

**UX flow:**
1. **Download Template section** — button triggers download of the CSV template
2. **Upload section** — PrimeVue `FileUpload` component (single file, `.csv` only, max 2 MB client-side check)
3. **Upload button** — calls `ApiService.upload<CsvUploadResponse>(uploadUrl, file)`
4. **On success** — success toast, emit `close` + `success` events, parent refreshes table
5. **On error (400)** — display error list inline in the dialog using `CsvErrorList`

## 4. Create `CsvErrorList.vue`

**File:** `src/components/csv/CsvErrorList.vue` (new)

- Receives `errors: CsvUploadError[]` prop
- Renders a scrollable PrimeVue DataTable with columns: Row, Column, Value, Error
- Max height with scroll for large error lists

## 5. Integrate into ProductsView

**File:** `src/views/products/ProductsView.vue` (modify)

- Add "Import CSV" button in toolbar (next to existing Add button)
- Use `useDialog()` composable for CSV dialog visibility
- Wire `CsvUploadDialog` with product template/upload URLs:
  - `templateUrl`: `API_ENDPOINTS.GEN_PRODUCTS + '/csv-template'`
  - `uploadUrl`: `API_ENDPOINTS.GEN_PRODUCTS + '/csv-upload'`
- On `success` event, refresh the table

## 6. Add i18n keys

**Files:** `src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts` (modify)

```typescript
csv: {
  import: 'Import CSV',
  downloadTemplate: 'Download Template',
  uploadFile: 'Upload CSV File',
  instructions: 'Download the template, fill in your data, then upload the CSV file.',
  maxRows: 'Maximum {max} rows per upload',
  maxSize: 'Maximum file size: {max}',
  uploading: 'Uploading and processing...',
  success: '{count} rows imported successfully',
  errorTitle: 'Upload failed with {count} error(s)',
  errorRow: 'Row',
  errorColumn: 'Column',
  errorValue: 'Value',
  errorMessage: 'Error',
}
```

---

## Files Summary

### New files
| File | Purpose |
|------|---------|
| `src/types/csvUpload.type.ts` | TypeScript types for upload response |
| `src/components/csv/CsvUploadDialog.vue` | Reusable upload dialog |
| `src/components/csv/CsvErrorList.vue` | Error display table |

### Modified files
| File | Change |
|------|--------|
| `src/services/api.ts` | Add `upload()` method |
| `src/types/index.ts` | Export CSV types |
| `src/views/products/ProductsView.vue` | Add Import CSV button + dialog |
| `src/i18n/locales/en-US.ts` | Add `csv.*` keys |
| `src/i18n/locales/id-ID.ts` | Add `csv.*` keys |

## Implementation Order

1. `src/services/api.ts` — add `upload()` method
2. `src/types/csvUpload.type.ts` + `index.ts` — types
3. `src/i18n/locales/` — add i18n keys
4. `src/components/csv/CsvErrorList.vue` — error display
5. `src/components/csv/CsvUploadDialog.vue` — main dialog
6. `src/views/products/ProductsView.vue` — integrate

## Adding CSV Upload to a New Entity View

To add CSV upload to any other view (e.g., CustomersView, CompaniesView):

1. Add "Import CSV" button in the toolbar
2. Add `CsvUploadDialog` with the entity's template/upload URLs
3. Wire `useDialog()` for visibility and refresh on success

No new components needed — everything is reusable.
