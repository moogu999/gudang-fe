# Plan: Product Custom Labels — Frontend Implementation

## Context

The backend adds a three-table EAV system for company-scoped product labels (`product_label_definitions` → `product_label_options` → `product_label_values`). This plan covers the matching FE changes:

1. **Reference data CRUD** — manage label definitions and their allowed options (new views, similar to UomGroups parent-child pattern)
2. **Label assignment** — assign label values to individual products inside `ProductDialog` (new "Labels" section in EDIT mode, similar to UomGroupDialog's "Conversion Levels" section)
3. **Label-filtered product search** — filter the product list by label definition + option (label filter panel in `ProductsView`)

New BE endpoints:
- `GET/POST/PATCH/DELETE /gen/v1/product-label-definitions`
- `GET/POST/PATCH/DELETE /gen/v1/product-label-options`
- `PUT /api/v1/products/{productId}/labels`
- `GET /api/v1/products` (custom endpoint with `labelFilter[n][definitionId]` + `labelFilter[n][optionId]` query params; replaces GEN endpoint when label filters are active)
- `GET /gen/v1/products` now returns inline `labels` array on each product

---

## Critical Files

| Role | Path |
|------|------|
| API constants | `src/constants/api.ts` |
| Permissions | `src/constants/permissions.ts` |
| Product types | `src/types/product.type.ts` |
| Product service | `src/services/products.service.ts` |
| Product list view | `src/views/products/ProductsView.vue` |
| Product form dialog | `src/views/products/ProductDialog.vue` |
| UomGroupDialog (reference pattern) | `src/views/uom-groups/UomGroupDialog.vue` |
| UomConversionLevelDialog (reference pattern) | `src/views/uom-groups/UomConversionLevelDialog.vue` |
| Router | `src/router/index.ts` |
| Navigation menu | `src/components/menu/menu.ts` |
| i18n English | `src/i18n/locales/en-US.ts` |
| i18n Indonesian | `src/i18n/locales/id-ID.ts` |
| Types barrel | `src/types/index.ts` |
| Services barrel | `src/services/index.ts` |

---

## Step-by-Step Implementation

### 0. BE Prerequisite — Permission Migration

IDs 22 and 23 are currently gaps in the permissions sequence. Add them before implementing the FE permission guards.

**New file: `gudang-be/migrations/000051_insert_product_label_definition_permissions.up.sql`**

```sql
INSERT INTO permissions (id, name, description) VALUES
    (22, 'PRODUCT_LABEL_DEFINITION_READ', 'Permission to read product label definition information'),
    (23, 'PRODUCT_LABEL_DEFINITION_WRITE', 'Permission to create and update product label definition information')
ON CONFLICT (id) DO NOTHING;

SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions));

DO $$
DECLARE
    v_role_id INT;
    v_creator_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE name = 'SUPER_ADMIN';
    SELECT id INTO v_creator_id FROM users LIMIT 1;

    IF v_role_id IS NOT NULL AND v_creator_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, created_by)
        SELECT v_role_id, p.id, v_creator_id
        FROM permissions p
        WHERE p.id IN (22, 23)
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = v_role_id AND rp.permission_id = p.id
        );
    END IF;
END $$;
```

**Down file: `gudang-be/migrations/000051_insert_product_label_definition_permissions.down.sql`**

```sql
DELETE FROM role_permissions WHERE permission_id IN (22, 23);
DELETE FROM permissions WHERE id IN (22, 23);
```

**Update `gudang-be/internal/user/domain/permission.go`** — add constants:

```go
PermissionProductLabelDefinitionRead  int64 = 22
PermissionProductLabelDefinitionWrite int64 = 23
```

---

### 1. API Constants — `src/constants/api.ts`

Add three entries:
```typescript
GEN_PRODUCT_LABEL_DEFINITIONS: '/gen/v1/product-label-definitions',
GEN_PRODUCT_LABEL_OPTIONS: '/gen/v1/product-label-options',
PRODUCTS_V1: '/v1/products',                 // custom endpoint (label-filtered search + set labels)
```

> `PRODUCT_LABELS` uses the pattern `${API_ENDPOINTS.PRODUCTS_V1}/${productId}/labels` — built in the service, not a standalone constant.

---

### 2. Types — new file `src/types/productLabelDefinition.type.ts`

```typescript
export interface ProductLabelDefinition {
  id: number
  companyId: number
  name: string
  createdAt: string
  updatedAt?: string
}

export interface ProductLabelOption {
  id: number
  productLabelDefinitionId: number
  value: string
  createdAt: string
  updatedAt?: string
}

export interface CreateProductLabelDefinitionDto { companyId: number; name: string; createdBy: number }
export interface UpdateProductLabelDefinitionDto { name?: string; updatedBy: number }
export interface CreateProductLabelOptionDto { productLabelDefinitionId: number; value: string; createdBy: number }
export interface UpdateProductLabelOptionDto { value?: string; updatedBy: number }
```

### 3. Update `src/types/product.type.ts`

Add label-related types and extend `Product`:

```typescript
export interface ProductLabelDefinitionLite { id: number; name: string }
export interface ProductLabelOptionLite { id: number; value: string }
export interface ProductLabelValue {
  id: number
  productId: number
  labelDefinitionId: number
  labelOptionId: number
  definition?: ProductLabelDefinitionLite
  option?: ProductLabelOptionLite
}

// Add to Product interface:
labels?: ProductLabelValue[]
```

Update barrel `src/types/index.ts` to re-export from `productLabelDefinition.type.ts`.

---

### 4. Services

**New `src/services/productLabelDefinitions.service.ts`** — static class, pattern from `uomGroups.service.ts`:
- `list(queryString?)` → `GET /gen/v1/product-label-definitions`
- `getById(id)` → `GET /gen/v1/product-label-definitions/{id}`
- `create(dto)` → `POST`
- `update(id, dto)` → `PATCH`
- `delete(id)` → `DELETE`

**New `src/services/productLabelOptions.service.ts`** — same pattern:
- `list(queryString?)` → `GET /gen/v1/product-label-options`
- `create(dto)` / `update(id, dto)` / `delete(id)`

**Update `src/services/products.service.ts`** — add:
```typescript
static async setLabels(
  productId: number,
  labels: { labelDefinitionId: number; labelOptionId: number }[]
): Promise<void> {
  return ApiService.put(`${API_ENDPOINTS.PRODUCTS_V1}/${productId}/labels`, { labels })
}
```

Update barrel `src/services/index.ts` to export both new services.

---

### 5. Permissions — `src/constants/permissions.ts`

Add new constants for label definition management:
```typescript
PRODUCT_LABEL_DEFINITION_READ: 22,
PRODUCT_LABEL_DEFINITION_WRITE: 23,
```
Add entries to `ROUTE_PERMISSIONS` and `ROUTE_WRITE_PERMISSIONS` for `/product-label-definitions`.

---

### 6. Reference Data Views

#### `src/views/product-label-definitions/ProductLabelDefinitionsView.vue`

Mirrors `UomGroupsView.vue`:
- `TableComponent` with columns: `name`, `createdAt`, actions
- Toolbar "Add" button guarded by `canWrite`
- Dialog with `ProductLabelDefinitionDialog` for ADD / EDIT / VIEW / DELETE
- `useConfirmDelete` for row delete

#### `src/views/product-label-definitions/ProductLabelDefinitionDialog.vue`

Mirrors `UomGroupDialog.vue`:
- Parent form: `name` (required), validated with Zod
- **Options section** (EDIT mode only, like Conversion Levels in UomGroupDialog):
  - `DataTable` showing `value`, actions (edit / delete)
  - "Add Option" button opens `ProductLabelOptionDialog`
  - On close/reopen of child dialog: `loadOptions()` refetches via `ProductLabelOptionsService.list(query)` filtered by `product_label_definition_id`
  - `useConfirmDelete` for option delete (409 error from BE when option is in use — surface as toast)

#### `src/views/product-label-definitions/ProductLabelOptionDialog.vue`

Mirrors `UomConversionLevelDialog.vue`:
- Props: `mode`, `option`, `definitionId`
- Form: `value` field (required)
- Calls `ProductLabelOptionsService.create / update` on submit

---

### 7. Product Label Assignment — `ProductDialog.vue` + new `ProductSetLabelsDialog.vue`

#### Modify `src/views/products/ProductDialog.vue`

Add a **Labels section** in EDIT mode (after the `<Divider />`), following the same pattern as UomGroupDialog's conversion levels:

```vue
<!-- Labels Section (EDIT mode only) -->
<div v-if="mode === DialogMode.EDIT && props.product">
  <Divider />
  <div class="mb-3 flex items-center justify-between">
    <h3 class="text-sm font-semibold sm:text-base md:text-lg">{{ t('products.labels.title') }}</h3>
    <Button :label="t('products.labels.setLabels')" icon="pi pi-tag" size="small" @click="openLabelsDialog" />
  </div>
  <DataTable :value="currentLabels" :loading="isLoadingLabels" class="text-sm" ...>
    <Column field="definition.name" header="Label" />
    <Column field="option.value" header="Value" />
  </DataTable>
</div>
```

- `currentLabels` loaded from the product's `labels` field (already returned by `GET /gen/v1/products/{id}`)
- `openLabelsDialog` opens `ProductSetLabelsDialog` nested inside ProductDialog (same pattern as UomConversionLevelDialog)
- On label dialog close: reload product via `ProductsService.getById()` to refresh `currentLabels`

#### New `src/views/products/ProductSetLabelsDialog.vue`

- Props: `productId: number`, `currentLabels: ProductLabelValue[]`
- Fetches all label definitions (`ProductLabelDefinitionsService.list()` — BE filters by the user's company automatically)
- Loads options per definition in parallel on mount
- For each definition, renders a `Select` (PrimeVue) with options pre-loaded; `show-clear` to allow removing a label
- Pre-populates from `currentLabels` (match `labelDefinitionId` → `labelOptionId`)
- Submit collects all `{labelDefinitionId, labelOptionId}` pairs (skip undefined) and calls `ProductsService.setLabels(productId, labels)`
- Emits `close` on success

> **Known TODO**: `companyId` in `ProductLabelDefinitionDialog.create()` is hardcoded to `1` — wire up once auth store exposes `companyId`.

---

### 8. Label-Filtered Product Search — `ProductsView.vue`

Add a **Label Filters** panel above the table:
- A list of filter rows, each with:
  - Definition `InfiniteSelect` (fetches from `/gen/v1/product-label-definitions`)
  - Option `InfiniteSelect` (fetches from `/gen/v1/product-label-options` filtered by chosen `definitionId`; disabled until definition is chosen)
  - Remove row button
- "Add Label Filter" button

Make `url` a computed ref:
```typescript
const url = computed(() => {
  const activeFilters = labelFilters.value.filter(f => f.definitionId && f.optionId)
  if (activeFilters.length === 0) return API_ENDPOINTS.GEN_PRODUCTS

  const params = new URLSearchParams()
  activeFilters.forEach((f, i) => {
    params.append(`labelFilter[${i}][definitionId]`, String(f.definitionId))
    params.append(`labelFilter[${i}][optionId]`, String(f.optionId))
  })
  return `${API_ENDPOINTS.PRODUCTS_V1}?${params.toString()}`
})
```

> **Assumption**: `GET /api/v1/products` accepts the same `page`, `limit`, and `search` params that `TableComponent` appends. Confirm with BE implementation.

---

### 9. Routing — `src/router/index.ts`

```typescript
{
  path: 'product-label-definitions',
  name: 'ProductLabelDefinitions',
  component: () => import('@/views/product-label-definitions/ProductLabelDefinitionsView.vue'),
  meta: { requiredPermission: PERMISSIONS.PRODUCT_LABEL_DEFINITION_READ },
}
```

---

### 10. Navigation — `src/components/menu/menu.ts`

Add "Product Label Definitions" entry under the Products/Catalog section.

---

### 11. i18n — `src/i18n/locales/en-US.ts` and `id-ID.ts`

New `productLabelDefinitions` top-level section + additions to `products.labels.*` and `products.fields.*` in both locale files.

---

## Verification

1. **Reference data CRUD**: `/product-label-definitions` → create "Size" → add S/M/L options → edit/delete options → delete definition
2. **Product label assignment**: ProductDialog EDIT mode → Labels section → "Set Labels" → assign → save → labels persist on reload; 21 labels → 400 error from BE
3. **Label-filtered search**: ProductsView → add Size=S filter → only matching products shown; add second filter → AND intersection; clear → reverts to `/gen/v1/products`
4. **Labels in responses**: `GET /gen/v1/products/{id}` returns `labels` array
5. **Permission guards**: `PRODUCT_LABEL_DEFINITION_READ` gates the route; `PRODUCT_WRITE` gates "Set Labels" button
