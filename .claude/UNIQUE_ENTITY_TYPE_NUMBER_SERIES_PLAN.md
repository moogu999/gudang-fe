# Enforce One Number Series Per Entity Type — Frontend Plan

## Context

With one series per entity type enforced at the database level, the frontend should prevent the user from attempting to create a second series for an already-used entity type. This is done by disabling already-taken entity type options in the Add dialog, before the user even submits.

---

## Phase 1: Disable Taken Entity Types in NumberSeriesDialog (ADD mode)

**File**: `src/views/number-series/NumberSeriesDialog.vue`

### On mount (ADD mode only)

Fetch all existing series to determine which entity types are already in use:

```typescript
const takenEntityTypes = ref<Set<string>>(new Set())

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    const result = await NumberSeriesService.list()
    takenEntityTypes.value = new Set(result.data.map((s) => s.entityType))
  }

  // ... existing EDIT/VIEW population logic
})
```

### Update entityTypeOptions computed

Mark options as disabled if their value is already taken:

```typescript
const entityTypeOptions = computed(() => [
  {
    label: t('numberSeries.entityTypes.products'),
    value: 'products',
    disabled: takenEntityTypes.value.has('products'),
  },
  {
    label: t('numberSeries.entityTypes.customers'),
    value: 'customers',
    disabled: takenEntityTypes.value.has('customers'),
  },
])
```

### Pass disabled to Select

PrimeVue's `Select` component supports `option-disabled` to read the `disabled` field:

```vue
<Select
  id="entityType"
  name="entityType"
  :options="entityTypeOptions"
  option-label="label"
  option-value="value"
  option-disabled="disabled"
  :disabled="mode === DialogMode.VIEW || mode === DialogMode.EDIT"
  class="w-full"
/>
```

---

## Phase 2: Server Error Fallback

If the user somehow bypasses the UI and the API returns a `422`, the existing `commonErrorToast` in the `onFormSubmit` catch block will surface the error message. No additional work needed.

---

## What Is NOT Needed

- No changes to `useNumberSeries` composable or `ProductDialog` — with one series per entity type, the composable always finds exactly 0 or 1 series, and the existing auto/manual toggle logic remains correct.
- No changes to the EDIT or VIEW modes of `NumberSeriesDialog` — entity type is already immutable in those modes.

---

## Verification

1. `npm run type-check` — no type errors
2. Manual testing:
   - Create a number series for `products`
   - Open the Add dialog again — verify the `products` option is greyed out and unselectable
   - Verify `customers` option is still selectable
   - Create a series for `customers`, then open Add again — verify both options are disabled
