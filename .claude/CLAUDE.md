# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (hot-reload)
npm run dev

# Run tests in watch mode
npm run test:unit

# Type checking
npm run type-check

# Build for production (includes type-check)
npm run build

# Build only (without type-check)
npm run build-only

# Preview production build
npm run preview

# Lint and auto-fix
npm run lint

# Format code with Prettier
npm run format
```

## Architecture Overview

### Tech Stack
- **Framework**: Vue 3 with TypeScript and Composition API (`<script setup>`)
- **Build Tool**: Vite with Vue DevTools plugin
- **UI Library**: PrimeVue (Aura theme) with TailwindCSS v4
- **State Management**: Pinia
- **Router**: Vue Router with lazy-loaded routes
- **HTTP Client**: Axios (singleton service pattern)
- **Validation**: Zod
- **Internationalization**: Vue I18n with English (US) and Bahasa Indonesia support
- **BI Integration**: Apache Superset embedded SDK

### Project Structure

```
src/
├── views/          # Page-level components (UsersView, RolesView, etc.)
├── components/     # Reusable UI components
│   ├── table/     # Generic TableComponent with server-side features
│   │   ├── TableComponent.vue          # Responsive table with mobile card view
│   │   └── TableActionButtons.vue      # Touch-optimized action buttons
│   ├── button/    # Button components
│   │   └── ResponsiveButton.vue        # Icon-only on mobile, with label on desktop
│   ├── card/      # Card components
│   │   └── ResponsiveCard.vue          # Progressive responsive padding
│   ├── menu/      # Navigation (SideBarComponent, HeaderComponent, LanguageSwitcherComponent)
│   └── dialog/    # Modal dialogs (ConfirmationDialog)
├── composables/    # Reusable composition functions
│   ├── useConfirmDelete.ts      # Delete confirmation pattern
│   ├── useDialog.ts             # Dialog visibility state management
│   └── useResponsiveSize.ts     # Responsive breakpoint detection and button sizing
├── services/       # API services and utilities
│   ├── api.ts                    # Singleton ApiService for HTTP
│   ├── users.service.ts          # User CRUD operations
│   ├── roles.service.ts          # Role CRUD operations
│   ├── permissions.service.ts    # Permission & role-permission operations
│   ├── genericQueryBuilder.ts    # URL query builder for filtering/sorting
│   └── toast.ts                  # Toast notification helpers
├── i18n/           # Internationalization
│   ├── index.ts                  # Vue I18n plugin configuration
│   └── locales/                  # Translation files
│       ├── en-US.ts              # English translations
│       └── id-ID.ts              # Bahasa Indonesia translations
├── types/          # TypeScript type definitions
│   ├── api.type.ts               # Base API response types
│   ├── user.type.ts              # User and DTOs
│   ├── role.type.ts              # Role and DTOs
│   ├── permission.type.ts        # Permission and DTOs
│   └── table.type.ts             # Table column configuration
├── constants/      # Constants and enums
│   ├── api.ts                    # API endpoint URLs
│   ├── filterOperator.ts         # Filter operators
│   ├── dialogMode.ts             # Dialog modes (ADD, EDIT)
│   ├── toastLife.ts              # Toast duration constants
│   ├── dateFormat.ts             # Date format strings
│   └── locale.ts                 # i18n locale constants
├── utils/          # Utility functions
│   └── objectHelper.ts           # Object manipulation helpers
└── stores/         # Pinia state stores
```

### Key Architectural Patterns

#### 1. Service Layer Pattern
The codebase uses a **service layer** to centralize all API calls:

**Base HTTP Service** (`src/services/api.ts`):
- Singleton `ApiService` provides generic HTTP methods (get, post, patch, delete)
- Base URL configured via `VITE_API_BASE_URL` env var
- Global error interceptor logs errors to console
- Backend returns `Base<T>` type defined in `src/types/api.type.ts`:
  ```typescript
  {
    data: T[],
    meta: { total: number, limit: number, offset: number }
  }
  ```

**Entity Services** (static class pattern):
- `UsersService`: User CRUD operations
- `RolesService`: Role CRUD operations
- `PermissionsService`: Permission management and role-permission associations

**Usage Example**:
```typescript
import { UsersService } from '@/services/users.service'

// Delete a user
await UsersService.delete(userId)

// Create a user
await UsersService.create({
  email: 'user@example.com',
  password: 'password123',
  createdBy: 1
})
```

**Why Static Classes?**
- No need to instantiate (e.g., `UsersService.delete()` vs `new UsersService().delete()`)
- Clear namespace for related operations
- Easy to mock in tests

**API Endpoints Centralization**:
All API URLs are defined in `src/constants/api.ts`:
```typescript
export const API_ENDPOINTS = {
  USERS: '/gen/v1/users',
  ROLES: '/gen/v1/roles',
  PERMISSIONS: '/gen/v1/permissions',
  ROLE_PERMISSIONS: '/gen/v1/role-permissions',
} as const
```

Services reference these constants:
```typescript
import { API_ENDPOINTS } from '@/constants/api'

export class UsersService {
  private static readonly BASE_URL = API_ENDPOINTS.USERS
  // ...
}
```

#### 2. Composables Pattern
Reusable composition functions extract common logic across views.

**useConfirmDelete** (`src/composables/useConfirmDelete.ts`):
Handles delete confirmation dialog pattern with toast notifications.

```typescript
import { useConfirmDelete } from '@/composables/useConfirmDelete'

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: 'usersView',
  entityName: 'user',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

// In template: <ConfirmationDialog :accept-handler="deleteAcceptanceHandler" />
// In button click:
function onDeleteClick(id: number) {
  confirmDelete(() => UsersService.delete(id))
}
```

**Benefits**:
- Reduces code duplication (delete pattern repeated across all CRUD views)
- Consistent UX (same confirmation dialog behavior everywhere)
- Centralized logic makes updates easier

**useDialog** (`src/composables/useDialog.ts`):
Manages dialog visibility state with optional close callbacks.

```typescript
import { useDialog } from '@/composables/useDialog'

const { isVisible, open, close } = useDialog({
  onClose: async () => {
    await table.value.clearSearch()
  }
})

// In template: <Dialog v-model:visible="isVisible" @hide="close">
// In button: <Button @click="open">Add User</Button>
```

#### 3. Generic Table Component Pattern
`TableComponent.vue` is a reusable PrimeVue DataTable wrapper with built-in:
- Server-side pagination, sorting, and filtering
- Search with debounce (Enter key trigger)
- Generic query building via `GenericQueryBuilder`
- URL-based data fetching (pass `url` prop)
- Configurable columns via `Column[]` type
- Scoped slot `#content="{ col, data }"` for custom cell rendering

**Usage Example** (see `src/views/users/UsersView.vue`):
```vue
<TableComponent ref="table" :url="url" :columns="columns">
  <template #content="{ col, data }">
    <span v-if="col.header === 'Created At'">
      {{ dayjs(data[col.field]).format(DateFormat.DATE_TIME) }}
    </span>
    <div v-if="col.header === 'Actions'">
      <Button icon="pi pi-trash" @click="onDeleteClick(data['id'])" />
    </div>
  </template>
</TableComponent>
```

#### 4. View-Level Dialog Pattern
Each CRUD view (e.g., UsersView) follows this pattern:
- Main view component handles table display and toolbar
- Separate dialog component (e.g., `UserDialog.vue`) for create/edit forms
- PrimeVue `Toast` and `ConfirmationDialog` with unique `overlayGroup` per view
- Dialog closes trigger table refresh via `table.value.clearSearch()`

**Form Pattern with InfiniteSelect (Dropdown Fields)**:

When using `InfiniteSelect` for foreign key relationships (e.g., selecting a department, currency, etc.), integrate it with PrimeVue Forms using the `name` attribute:

```vue
<template>
  <Form v-slot="$form" :initial-values="initialValues" :resolver="resolver" @submit="onFormSubmit">
    <!-- Text field example -->
    <InputText id="code" name="code" />

    <!-- InfiniteSelect example -->
    <InfiniteSelect
      id="currencyId"
      name="currencyId"
      option-label="code"
      option-value="id"
      :fetch-fn="(query) => CurrenciesService.list(query)"
      :initial-option="initialCurrency"
      :disabled="mode === DialogMode.VIEW"
      sort-by="code"
      sort-operator="asc"
    />

    <Button type="submit" />
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, onBeforeMount, computed } from 'vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CurrenciesService } from '@/services'

// Initial option for pre-populating the dropdown
const initialCurrency = ref()

// Form initial values
const initialValues = reactive({
  code: '',
  currencyId: undefined as number | undefined,
})

// When editing, populate initial values
onBeforeMount(() => {
  if (mode === DialogMode.EDIT && props.entity) {
    initialValues.code = props.entity.code
    initialValues.currencyId = props.entity.currencyId

    // Set initial option for dropdown display
    if (props.entity.currency) {
      initialCurrency.value = {
        id: props.entity.currencyId,
        code: props.entity.currency.code,
      }
    }
  }
})

// Form submission - access value directly from form state
async function onFormSubmit(event: FormSubmitEvent) {
  await EntityService.create({
    code: event.states.code.value,
    currencyId: event.states.currencyId.value, // ✅ Direct access via form state
    createdBy: authStore.userId!,
  })
}
</script>
```

**Key Points:**
- **Integration**: Add `name="fieldId"` and `option-value="id"` to integrate with PrimeVue Forms
- **Initial Values**: Add the field to `initialValues` reactive object
- **Initial Option**: Use `initial-option` prop to pre-populate dropdown when editing
  - Prevents issues when selected option isn't in the first page of results
  - Example: Currency "ZAR" would be missing without `initial-option` if dropdown shows only first 10 items
- **Form Submission**: Access value via `event.states.fieldId.value` (no need for separate refs or helper functions)
- **Validation**: Add field to Zod schema like any other form field

**❌ Don't use this pattern (overly complex):**
```typescript
// Avoid: Separate refs and helper functions
const selectedCurrency = ref<Currency | undefined>()
const initialCurrency = ref<Currency | undefined>()

function getCurrencyId(): number | undefined {
  if (!selectedCurrency.value) return undefined
  return selectedCurrency.value.id
}

// In template: v-model="selectedCurrency"
// In submit: currencyId: getCurrencyId()
```

**✅ Use this pattern (simple, integrated with forms):**
```typescript
// Just one ref for initial option
const initialCurrency = ref()

// Add to form initial values
const initialValues = reactive({
  currencyId: undefined as number | undefined,
})

// In template: name="currencyId"
// In submit: currencyId: event.states.currencyId.value
```

#### 5. Route Structure
All routes in `src/router/index.ts` use lazy loading:
```typescript
{
  path: '/users',
  component: () => import('@/views/users/UsersView.vue')
}
```

#### 6. Layout Structure
`App.vue` implements a sidebar + header + main layout:
- Responsive grid: `md:grid-cols-[220px_1fr]`, `lg:grid-cols-[280px_1fr]`
- `SideBarComponent`: Navigation menu from `src/components/menu/menu.ts`
- `HeaderComponent`: Top bar with mobile menu toggle and language switcher
- `RouterView`: Main content area

#### 7. Responsive Design
The application is fully responsive and optimized for mobile, tablet, and desktop devices using a mobile-first approach with TailwindCSS breakpoints.

**Breakpoints Reference:**
```
Mobile:  0px - 639px   (default, no prefix)
sm:      640px+        (large phones landscape, small tablets)
md:      768px+        (tablets portrait, large phones landscape)
lg:      1024px+       (small desktops, tablets landscape)
xl:      1280px+       (desktops)
2xl:     1536px+       (large desktops)
```

**Key Responsive Features:**

1. **Responsive Layout** (`src/layouts/MainLayout.vue`):
   - Mobile: Full-width drawer navigation
   - Tablet: Auto-collapsed sidebar for more content space
   - Desktop: Expanded sidebar navigation
   - Progressive padding: `p-2` (mobile) → `sm:p-4` → `lg:p-10`
   - Drawer auto-closes on route change for better mobile UX

2. **Table Component** (`src/components/table/TableComponent.vue`):
   - Mobile: Card-based list view with stacked data
   - Desktop: Traditional DataTable with columns
   - Responsive pagination (simple prev/next on mobile)
   - Mobile search drawer instead of inline search
   - Columns support `hideOnMobile` property to hide less important data

3. **Dialogs and Forms**:
   - Responsive dialog sizing via PrimeVue `:breakpoints` prop
   - Mobile: 90vw width, full-screen feel
   - Tablet: 75vw width
   - Desktop: 50vw or fixed width
   - Form fields stack vertically on mobile, horizontal on desktop:
     ```vue
     <div class="flex flex-col gap-2 md:flex-row md:gap-4">
       <label class="w-full font-semibold md:w-32">Email</label>
       <InputText class="w-full" />
     </div>
     ```

4. **Responsive Typography**:
   - Page headers: `text-base sm:text-lg md:text-2xl`
   - Dialog headers: `text-base sm:text-lg md:text-xl`
   - Form labels: `text-sm sm:text-base`
   - Progressive scaling for better readability at all sizes

5. **Touch-Friendly Interactions**:
   - Minimum 44x44px touch targets on mobile (WCAG 2.1 compliance)
   - `useResponsiveSize` composable for consistent button sizing
   - Icon-only buttons on mobile (with aria-labels)
   - Increased spacing between interactive elements on mobile

6. **Responsive Components**:
   - **ResponsiveButton** (`src/components/button/ResponsiveButton.vue`): Icon-only on mobile, with label on desktop
   - **ResponsiveCard** (`src/components/card/ResponsiveCard.vue`): Progressive padding (`p-2` → `sm:p-4` → `md:p-6`)
   - **TableActionButtons** (`src/components/table/TableActionButtons.vue`): Touch-optimized action buttons
   - **HeaderComponent**: Mobile search drawer, responsive spacing
   - **ConfirmationDialog**: Responsive padding, stacked buttons on mobile

7. **Media Query Detection**:
   ```typescript
   import { useResponsiveSize } from '@/composables/useResponsiveSize'

   const { isMobile, isTablet, isDesktop, buttonSize } = useResponsiveSize()
   ```

**Responsive Development Guidelines:**

- Use mobile-first approach: start with mobile styles, enhance for larger screens
- Test on multiple device sizes (iPhone SE 375px minimum)
- All interactive elements must have 44x44px minimum touch target on mobile
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:` for breakpoint-specific styles
- Consider touch vs. mouse interactions (no hover states required on mobile)
- Stack form fields vertically on mobile, horizontal on desktop
- Simplify navigation and reduce cognitive load on small screens

#### 8. Internationalization (i18n) Pattern
The application supports multiple languages using Vue I18n:

**Supported Locales:**
- English (US): `en-US`
- Bahasa Indonesia: `id-ID`

**Configuration** (`src/i18n/index.ts`):
- Composition API mode enabled
- Automatic locale detection: localStorage → browser language → default (en-US)
- Locale preference persisted to localStorage
- Global functions: `saveLocale()`, `SUPPORTED_LOCALES`, `LOCALE_NAMES`

**Translation Files** (`src/i18n/locales/`):
- `en-US.ts`: English translations
- `id-ID.ts`: Bahasa Indonesia translations
- Organized by domain: `common`, `navigation`, `table`, `users`, `roles`, `permissions`, etc.

**Usage Patterns:**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

// Simple translation
const title = t('users.title') // 'Users' or 'Pengguna'

// Translation with interpolation
const message = t('common.messages.deleteSuccess', { entity: 'User' })
// 'User deleted successfully' or 'User berhasil dihapus'

// Computed columns for reactive translations
const columns = computed(() => [
  { field: 'email', header: t('users.fields.email') },
  { field: 'name', header: t('common.labels.name') },
])
</script>

<template>
  <!-- In templates -->
  <h1>{{ t('users.title') }}</h1>
  <Button :label="t('common.actions.save')" />
</template>
```

**Form Validation with i18n:**
```typescript
// Use computed() for reactive validation messages
const resolver = computed(() =>
  zodResolver(
    z.object({
      email: z.string().email({ message: t('users.validation.emailInvalid') }),
      password: z.string().min(8, t('users.validation.passwordMinLength')),
    })
  )
)
```

**Language Switcher:**
- `LanguageSwitcherComponent` in header allows runtime locale switching
- Changes persist across sessions via localStorage
- All UI elements update immediately when locale changes

**Translation Key Naming Convention:**
- Domain-based: `{domain}.{category}.{key}`
- Examples:
  - `common.actions.save` → Common actions
  - `users.fields.email` → User-specific fields
  - `table.search` → Table component strings
  - `common.messages.confirmDelete` → Reusable messages

**Adding New Translations:**
1. Add keys to both `en-US.ts` and `id-ID.ts`
2. Use `t()` function in components
3. For dynamic content (table columns, dialogs), use `computed()` for reactivity
4. For validation schemas, wrap resolver in `computed()`

### PrimeVue Integration
- Theme: Aura preset with dark mode disabled
- Global services registered in `main.ts`:
  - `ToastService` (notifications)
  - `ConfirmationService` (confirm dialogs)
- Import components individually (tree-shaking optimized)

### Type Definitions
All TypeScript types are centralized in `src/types/`:
- **Entity types**: User, Role, Permission (e.g., `user.type.ts`)
- **DTO types**: CreateUserDto, UpdateRoleDto, etc. (co-located with entities)
- **API types**: Base, Meta response wrappers (`api.type.ts`)
- **Component types**: Column configuration for TableComponent (`table.type.ts`)
- **Runtime validation**: Use Zod schemas in dialog forms (already a dependency)

**Import Convention**:
```typescript
import type { User, CreateUserDto } from '@/types/user.type'
import type { Base } from '@/types/api.type'
import type { Column } from '@/types/table.type'
```

### Constants Organization
All constants and enums are in `src/constants/`:
- **api.ts**: API endpoint URLs (centralized, used by services)
- **dateFormat.ts**: Date format strings for dayjs
- **dialogMode.ts**: Dialog modes (ADD, EDIT)
- **filterOperator.ts**: Filter operators for table filtering
- **toastLife.ts**: Toast notification duration constants

**Import Convention**:
```typescript
import DateFormat from '@/constants/dateFormat'
import DialogMode from '@/constants/dialogMode'
import { API_ENDPOINTS } from '@/constants/api'

// Or use barrel export for multiple imports:
import { DateFormat, DialogMode, API_ENDPOINTS } from '@/constants'
```

### Barrel Exports (index.ts)
Each major directory has a barrel export file for cleaner imports:

- **`src/types/index.ts`**: All type definitions
- **`src/services/index.ts`**: All services
- **`src/constants/index.ts`**: All constants
- **`src/composables/index.ts`**: All composables

**Example - Before barrel exports**:
```typescript
import type { User, CreateUserDto } from '@/types/user.type'
import type { Role } from '@/types/role.type'
import type { Base } from '@/types/api.type'
import { UsersService } from '@/services/users.service'
import { RolesService } from '@/services/roles.service'
```

**Example - After barrel exports**:
```typescript
import type { User, CreateUserDto, Role, Base } from '@/types'
import { UsersService, RolesService } from '@/services'
```

### Toast Notification Helpers
Centralized toast notification functions in `src/services/toast.ts`:

- **`commonErrorToast(error, group)`**: Standard error notification
- **`commonSuccessToast(message, group)`**: Standard success notification

**Usage**:
```typescript
import { commonSuccessToast, commonErrorToast } from '@/services/toast'

try {
  await UsersService.create(userData)
  toast.add(commonSuccessToast('User is created.', overlayGroup))
} catch (e) {
  toast.add(commonErrorToast(e, overlayGroup))
}
```

### Environment Variables
Configure in `.env` file:
```
VITE_API_BASE_URL=http://localhost:8080
```

### Path Alias
Use `@/` to reference `src/` directory (configured in `vite.config.ts`):
```typescript
import ApiService from '@/services/api'
```

## Development Notes

### When Adding New CRUD Views
1. **Define types**: Create `src/types/[entity].type.ts` with entity and DTO types
2. **Create service**: Create `src/services/[entity].service.ts` following the static class pattern
3. **Create views**:
   - Create `src/views/[entity-name]/[Entity]View.vue` with TableComponent
   - Create `src/views/[entity-name]/[Entity]Dialog.vue` for create/edit form
4. **Add routing**: Add route to `src/router/index.ts` with lazy loading
5. **Add navigation**: Add menu entry to `src/components/menu/menu.ts`

**Service Template**:
```typescript
import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Entity, CreateEntityDto } from '@/types/entity.type'
import { API_ENDPOINTS } from '@/constants/api'

export class EntityService {
  private static readonly BASE_URL = API_ENDPOINTS.ENTITIES

  static async list(queryString?: string): Promise<Base<Entity>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Entity>>(url)
  }

  static async create(data: CreateEntityDto): Promise<Entity> {
    return ApiService.post<Entity>(this.BASE_URL, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
```

**Note**: Don't forget to add the new endpoint to `src/constants/api.ts`:
```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  ENTITIES: '/gen/v1/entities',
} as const
```

### Code Documentation
All services include comprehensive JSDoc comments with:
- Service-level documentation with examples
- Method-level documentation with `@param`, `@returns`, `@throws`
- Usage examples for complex operations

**View in IDE**: Hover over any service method to see documentation inline.

**Example**:
```typescript
/**
 * Create a new user account
 *
 * @param data - User creation data including email, password, and creator ID
 * @returns Promise resolving to the created user object
 * @throws Error if email already exists or validation fails
 *
 * @example
 * ```typescript
 * const newUser = await UsersService.create({
 *   email: 'john.doe@example.com',
 *   password: 'SecurePass123!',
 *   createdBy: currentUserId
 * })
 * ```
 */
static async create(data: CreateUserDto): Promise<User>
```

### Testing
- Test runner: Vitest with jsdom environment
- Test utils: `@vue/test-utils` for component testing
- Tests should be in `src/components/__tests__/` or co-located with components
