# Number Series - Frontend Plan

## Context

Users need a management page to CRUD number series, and entity forms (Products, Customers) need integration to auto-generate codes from a default series. Users can toggle between auto-generated and manual code entry.

---

## Phase 1: Types & Service

### Types

**File**: `src/types/numberSeries.type.ts`

```typescript
export interface NumberSeries {
  id: number
  name: string
  prefix: string
  separator: string
  dateFormat: string       // "", "YYYY", "YYYYMM", "YYMM"
  padding: number
  currentNumber: number
  entityType: string
  isDefault: boolean
  createdAt: string
  updatedAt?: string
  createdBy?: number
  createdByUser?: { id: number; email: string }
  updatedBy?: number
  updatedByUser?: { id: number; email: string }
}

export interface CreateNumberSeriesDto {
  name: string
  prefix: string
  separator: string
  dateFormat: string
  padding: number
  entityType: string
  isDefault: boolean
  createdBy: number
}

export interface UpdateNumberSeriesDto {
  name?: string
  prefix?: string
  separator?: string
  dateFormat?: string
  padding?: number
  isDefault?: boolean
  updatedBy: number
}

export interface NumberSeriesPreview {
  code: string
  nextNumber: number
  seriesId: number
  seriesName: string
}
```

Export from `src/types/index.ts`.

### API Constants

**File**: `src/constants/api.ts` - add:

```typescript
GEN_NUMBER_SERIES: '/gen/v1/number-series',
NUMBER_SERIES: '/v1/number-series',
```

### Service

**File**: `src/services/numberSeries.service.ts`

Standard static class pattern with CRUD methods (list, getById, create, update, delete) using `GEN_NUMBER_SERIES`, plus:

```typescript
// Custom endpoints
static async preview(entityType: string): Promise<NumberSeriesPreview> {
  return ApiService.get<NumberSeriesPreview>(
    `${API_ENDPOINTS.NUMBER_SERIES}/preview?entityType=${entityType}`
  )
}

static async generateNext(id: number): Promise<{ code: string }> {
  return ApiService.post<{ code: string }>(
    `${API_ENDPOINTS.NUMBER_SERIES}/${id}/next`, {}
  )
}
```

Export from `src/services/index.ts`.

---

## Phase 2: Number Series Management Page

### View

**File**: `src/views/number-series/NumberSeriesView.vue`

Standard TableComponent + Dialog pattern (same as ProductsView). Columns:

| Column | Field | Sortable | Filterable |
|--------|-------|----------|------------|
| Name | `name` | yes | yes |
| Prefix | `prefix` | yes | yes |
| Entity Type | `entityType` | yes | yes |
| Default | `isDefault` | no | yes |
| Current # | `currentNumber` | no | no |
| Actions | - | no | no |

Action buttons: Edit, Delete (with confirmation).

### Dialog

**File**: `src/views/number-series/NumberSeriesDialog.vue`

Form fields:

1. **Name** - InputText, required
2. **Prefix** - InputText, required
3. **Separator** - InputText, default `-`, required
4. **Date Format** - Select/Dropdown with options:
   - `{ label: t('numberSeries.dateFormats.none'), value: '' }`
   - `{ label: t('numberSeries.dateFormats.yyyy'), value: 'YYYY' }`
   - `{ label: t('numberSeries.dateFormats.yyyymm'), value: 'YYYYMM' }`
   - `{ label: t('numberSeries.dateFormats.yymm'), value: 'YYMM' }`
5. **Padding** - InputNumber, min=1, max=10, required
6. **Entity Type** - Select/Dropdown with options:
   - `{ label: t('numberSeries.entityTypes.products'), value: 'products' }`
   - `{ label: t('numberSeries.entityTypes.customers'), value: 'customers' }`
   - Disabled in EDIT mode (entity type is immutable)
7. **Is Default** - Checkbox
8. **Live Preview** - Computed read-only field showing formatted example (client-side only)

### Live Preview Logic (client-side)

```typescript
const preview = computed(() => {
  const parts: string[] = [initialValues.prefix]
  if (initialValues.dateFormat) {
    const now = new Date()
    const dateStr = formatDate(now, initialValues.dateFormat)
    parts.push(dateStr)
  }
  parts.push('1'.padStart(initialValues.padding, '0'))
  return parts.join(initialValues.separator)
})

function formatDate(date: Date, format: string): string {
  const y = date.getFullYear().toString()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  switch (format) {
    case 'YYYY': return y
    case 'YYYYMM': return y + m
    case 'YYMM': return y.slice(-2) + m
    default: return ''
  }
}
```

Display as: `Preview: ITM-202604-001`

### Zod validation

```typescript
z.object({
  name: z.string().min(1, t('numberSeries.validation.nameRequired')),
  prefix: z.string().min(1, t('numberSeries.validation.prefixRequired')),
  separator: z.string().min(1, t('numberSeries.validation.separatorRequired')),
  dateFormat: z.string(),
  padding: z.number().min(1).max(10),
  entityType: z.string().min(1, t('numberSeries.validation.entityTypeRequired')),
  isDefault: z.boolean(),
})
```

---

## Phase 3: Routing & Navigation

### Router

**File**: `src/router/index.ts` - add route under the authenticated layout:

```typescript
{
  path: 'number-series',
  name: 'NumberSeries',
  component: () => import('@/views/number-series/NumberSeriesView.vue'),
}
```

### Navigation Menu

**File**: `src/components/menu/menu.ts` - add under Settings group (or create one):

```typescript
{
  label: 'Number Series',
  labelKey: 'navigation.numberSeries',
  icon: 'pi pi-hashtag',
  route: '/number-series',
}
```

---

## Phase 4: i18n

**Files**: `src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts`

Add `numberSeries` key with fields, validation, messages, entityTypes, dateFormats sections. Also add `navigation.numberSeries`.

---

## Phase 5: Entity Form Integration

### Product Dialog Modification

**File**: `src/views/products/ProductDialog.vue`

Changes to the code field section in ADD mode:

1. **Add code mode toggle** - SelectButton or ToggleSwitch above the code input:
   - "Auto" (default if a default series exists for `products`)
   - "Manual" (default if no default series exists)

2. **Auto mode behavior**:
   - On dialog mount (ADD mode), call `NumberSeriesService.preview('products')`
   - Display preview in a read-only InputText with helper text: "(assigned on save)"
   - Store the `seriesId` from the preview response

3. **Manual mode behavior**:
   - Show normal editable InputText (existing behavior)

4. **Submit logic change**:
   ```typescript
   async function onFormSubmit(event: FormSubmitEvent) {
     let code: string
     if (codeMode.value === 'auto') {
       const result = await NumberSeriesService.generateNext(seriesId.value)
       code = result.code
     } else {
       code = event.states.code.value
     }
     await ProductsService.create({ code, ...otherFields })
   }
   ```

5. **Validation adjustment**:
   - Code field is required only in manual mode
   - In auto mode, skip code validation (it's generated server-side)

6. **EDIT mode**: No change - code field behaves as before (always manual/editable)

### Customer Form Modification

Apply the same pattern to the customer creation form. Identify the file (likely `src/views/customers/CustomerDialog.vue` or `CustomerForm.vue`) and apply identical integration.

### Reusable composable (optional, if patterns are identical)

**File**: `src/composables/useNumberSeries.ts`

```typescript
export function useNumberSeries(entityType: string) {
  const codeMode = ref<'auto' | 'manual'>('manual')
  const previewCode = ref('')
  const seriesId = ref<number | null>(null)
  const loading = ref(false)

  async function loadPreview() { ... }
  async function generateCode(): Promise<string> { ... }

  return { codeMode, previewCode, seriesId, loading, loadPreview, generateCode }
}
```

This keeps the integration DRY across Products and Customers.

---

## Files Summary

### New files
- `src/types/numberSeries.type.ts`
- `src/services/numberSeries.service.ts`
- `src/views/number-series/NumberSeriesView.vue`
- `src/views/number-series/NumberSeriesDialog.vue`
- `src/composables/useNumberSeries.ts`

### Modified files
- `src/constants/api.ts` - add 2 endpoints
- `src/types/index.ts` - barrel export
- `src/services/index.ts` - barrel export
- `src/router/index.ts` - add route
- `src/components/menu/menu.ts` - add nav item
- `src/i18n/locales/en-US.ts` - add translations
- `src/i18n/locales/id-ID.ts` - add translations
- `src/views/products/ProductDialog.vue` - auto-generate toggle
- Customer form file (TBD) - auto-generate toggle

---

## Verification

1. `npm run type-check` - no type errors
2. `npm run lint` - no lint errors
3. `npm run build` - production build succeeds
4. Manual testing:
   - Navigate to Number Series page, create a series (e.g. prefix=ITM, dateFormat=YYYYMM, padding=3, entity=products, default=true)
   - Verify live preview shows correct format
   - Open Product create dialog - verify auto mode shows preview code
   - Toggle to manual - verify code field becomes editable
   - Submit in auto mode - verify product is created with generated code
   - Submit again - verify code incremented
   - Submit in manual mode - verify custom code is used
