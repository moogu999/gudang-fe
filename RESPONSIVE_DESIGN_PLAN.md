# Responsive Design Plan for Small & Medium Screens

**Created:** 2025-11-23
**Last Updated:** 2025-11-24
**Status:** 🔄 Phase 3 In Progress (Item 1 Complete)

## Progress Summary

- ✅ **Phase 1:** 4/4 items completed (100%)
  - ✅ Main layout padding adjustments
  - ✅ Dialog responsive sizing
  - ✅ Form layout stacking
  - ✅ Basic responsive typography
- ✅ **Phase 2:** 4/4 items completed (100%)
  - ✅ TableComponent mobile card view
  - ✅ Header search optimization with mobile drawer
  - ✅ Toolbar responsive behavior
  - ✅ Action button optimization (icon-only with proper aria-labels)
- 🔄 **Phase 3:** 3/5 items completed (60%)
  - ✅ Complete typography adjustments
  - ✅ Touch target enhancements
  - ✅ Card spacing refinements

**Overall Progress:** 11/13 items (85%)

## Table of Contents

- [Current State Analysis](#current-state-analysis)
- [Implementation Plan](#implementation-plan)
- [Implementation Priority](#implementation-priority)
- [Testing Checklist](#testing-checklist)
- [Tailwind Breakpoints Reference](#tailwind-breakpoints-reference)

---

## Current State Analysis

### What's Working ✅

- Sidebar hidden on mobile with drawer alternative (`MainLayout.vue:39-46`)
- Header has mobile/desktop toggle buttons (`HeaderComponent.vue:4-20`)
- Basic responsive grid layout for md+ screens
- Drawer closes on route change for better mobile UX

### What Needs Improvement ❌

- TableComponent has no mobile-specific rendering
- Dialogs have fixed min-width that's too wide for mobile
- Form layouts use horizontal flexbox (labels left, inputs right)
- Header search takes full width on all screens
- Toolbars and action buttons not optimized for mobile
- Main content padding is fixed for all screen sizes
- No responsive typography scaling
- Touch targets may be too small on mobile devices

---

## Implementation Plan

### 1. TableComponent Mobile Optimization

**File:** `src/components/table/TableComponent.vue`

**Current Issues:**

- DataTable displays poorly on mobile screens
- Too many columns visible on small screens
- Pagination controls are cramped
- Action buttons are too small for touch

**Changes Required:**

1. **Add responsive view detection:**

   ```typescript
   // Add breakpoint detection
   import { useMediaQuery } from '@vueuse/core'

   const isMobile = useMediaQuery('(max-width: 767px)')
   ```

2. **Implement mobile card view:**

   ```vue
   <!-- Mobile: Card list view -->
   <div v-if="isMobile" class="space-y-4">
     <Card v-for="(item, index) in items" :key="item[dataKey]">
       <template #content>
         <div class="space-y-2">
           <div v-for="col in columns" :key="col.field">
             <div class="text-xs font-semibold text-stone-500">
               {{ col.header }}
             </div>
   <div class="mt-1">
               <slot name="content" :col="col" :data="item">
                 {{ getNestedValue(item, col.field) }}
               </slot>
             </div>

   <!-- Desktop: DataTable view -->
   <DataTable v-else ...></DataTable>
   ```

3. **Adjust header controls for mobile:**

   ```vue
   <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
     <!-- Search field -->
     <IconField class="w-full sm:w-auto">
       ...
     </IconField>

     <!-- Action buttons -->
     <div class="flex justify-end gap-2">
       <Button icon="pi pi-refresh" ... />
       <Button :label="t('table.clearFilters')" ... />
     </div>
   </div>
   ```

4. **Simplify pagination for mobile:**

   ```typescript
   const paginatorTemplate = computed(() =>
     isMobile.value
       ? 'PrevPageLink NextPageLink'
       : 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
   )
   ```

5. **Hide less important columns on mobile:**
   ```typescript
   const visibleColumns = computed(() => {
     if (isMobile.value) {
       // Show only essential columns
       return props.columns.filter((col) => !col.hideOnMobile)
     }
     return props.columns
   })
   ```

**Column Type Update:**

```typescript
// src/types/table.type.ts
export type Column = {
  // ... existing properties
  hideOnMobile?: boolean // Add this property
}
```

---

### 2. Dialog Responsive Sizing

**Files to Update:**

- `src/views/users/UsersView.vue:58`
- `src/views/roles/RolesView.vue`
- `src/views/permissions/PermissionsView.vue`
- `src/views/departments/DepartmentsView.vue`
- `src/views/divisions/DivisionsView.vue`
- Any other views with dialogs

**Current Issue:**

```vue
<Dialog class="min-w-100" ...></Dialog>
```

Fixed width doesn't work on mobile screens.

**Solution:**

```vue
<Dialog
  :class="['w-[95vw] sm:w-full', 'max-w-md md:max-w-lg lg:max-w-xl xl:min-w-100']"
  :pt="{
    root: 'mx-2 sm:mx-0',
  }"
  ...
></Dialog>
```

**Alternative using PrimeVue breakpoints:**

```vue
<Dialog
  :breakpoints="{
    '960px': '75vw',
    '640px': '90vw',
  }"
  :style="{ width: '50vw' }"
  ...
></Dialog>
```

---

### 3. Form Layout Responsive Stacking

**Files to Update:**

- `src/views/users/UserDialog.vue`
- `src/views/roles/RoleDialog.vue`
- `src/views/permissions/PermissionDialog.vue`
- All other dialog form components

**Current Pattern:**

```vue
<div class="mb-4 flex items-start gap-4">
  <label for="email" class="w-32 font-semibold">Email</label>
  <div class="flex flex-auto flex-col gap-1">
    <InputText id="email" />
  </div>
</div>
```

**New Responsive Pattern:**

```vue
<div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
  <label for="email" class="w-full font-semibold md:w-32">
    Email
  </label>
  <div class="flex w-full flex-auto flex-col gap-1">
    <InputText id="email" class="w-full" />
    <Message v-if="$form.email?.invalid" ...>
  </div>
</div>
```

**Key Changes:**

- `flex-col` on mobile, `md:flex-row` on desktop
- `gap-2` on mobile, `md:gap-4` on desktop
- `w-full` label on mobile, `md:w-32` on desktop
- Ensure input fields are `w-full`

**Password/Special Fields:**

```vue
<Password
  :pt="{
    root: 'w-full',
    pcInputText: {
      root: '!w-full !grow',
    },
  }"
  ...
/>
```

---

### 4. Header Component Optimization

**File:** `src/components/menu/HeaderComponent.vue`

**Changes Required:**

1. **Hide search on mobile, show search button:**

   ```vue
   <!-- Mobile search button -->
   <Button
     icon="pi pi-search"
     severity="secondary"
     text
     @click="openMobileSearchDrawer"
     aria-label="Search"
     class="md:!hidden"
   />

   <!-- Desktop search -->
   <div class="hidden w-full flex-1 md:block">
     <form>
       <div class="relative">
         <IconField>
           <InputIcon class="pi pi-search" />
           <InputText placeholder="Search" />
         </IconField>
       </div>
     </form>
   </div>
   ```

2. **Add search drawer for mobile:**

   ```vue
   <Drawer
     v-model:visible="isSearchDrawerOpen"
     position="top"
     :pt="{
       root: 'h-auto',
     }"
   >
     <template #header>
       <h3>{{ t('common.search') }}</h3>
     </template>
     <IconField class="w-full">
       <InputIcon class="pi pi-search" />
       <InputText
         placeholder="Search"
         class="w-full"
         autofocus
       />
     </IconField>
   </Drawer>
   ```

3. **Optimize header spacing:**

   ```vue
   <header class="flex h-14 items-center gap-2 sm:gap-4 ..."></header>
   ```

4. **Stack components on very small screens if needed:**
   ```vue
   <div class="flex items-center gap-2">
     <LanguageSwitcherComponent />
     <Avatar ... />
   </div>
   ```

---

### 5. Toolbar Responsive Behavior

**Files to Update:**

- `src/views/users/UsersView.vue:8`
- `src/views/roles/RolesView.vue`
- All other views with Toolbar component

**Current:**

```vue
<Toolbar v-if="canWrite" class="mb-5">
  <template #end>
    <Button :label="t('common.actions.add')" icon="pi pi-plus" @click="addUser" />
  </template>
</Toolbar>
```

**Enhanced Responsive Version:**

```vue
<Toolbar v-if="canWrite" class="mb-5">
  <template #end>
    <div class="flex w-full justify-end gap-2 sm:w-auto">
      <!-- Mobile: Icon only -->
      <Button
        icon="pi pi-plus"
        @click="addUser"
        class="sm:hidden"
        :aria-label="t('common.actions.add')"
      />

      <!-- Desktop: With label -->
      <Button
        :label="t('common.actions.add')"
        icon="pi pi-plus"
        @click="addUser"
        class="hidden sm:inline-flex"
      />
    </div>
  </template>
</Toolbar>
```

**Alternative - Responsive label:**

```vue
<Button
  :label="isDesktop ? t('common.actions.add') : undefined"
  icon="pi pi-plus"
  @click="addUser"
  :aria-label="t('common.actions.add')"
/>
```

---

### 6. Main Layout Content Padding

**File:** `src/layouts/MainLayout.vue:55`

**Current:**

```vue
<main class="flex flex-1 flex-col gap-4 p-4 lg:gap-10 lg:p-10"></main>
```

**Enhanced:**

```vue
<main class="flex flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-4 lg:gap-10 lg:p-10"></main>
```

**Rationale:**

- More screen space on mobile devices
- Progressive enhancement: `p-2` → `sm:p-4` → `lg:p-10`
- Gap follows same pattern: `gap-2` → `sm:gap-4` → `lg:gap-10`

---

### 7. Card Component Spacing

**Files to Update:**

- All views using `<Card>` for table containers
- Dialog content areas

**Pattern:**

```vue
<Card
  :pt="{
    body: 'p-2 sm:p-4 md:p-6',
    content: 'p-0',
  }"
>
  <template #content>
    <TableComponent ... />
  </template>
</Card>
```

**For inline cards:**

```vue
<Card class="p-2 sm:p-4"></Card>
```

---

### 8. Action Buttons in Tables

**Files to Update:**

- `src/views/users/UsersView.vue:22-52`
- `src/views/roles/RolesView.vue`
- All other views with table action columns

**Current Pattern:**

```vue
<div class="flex items-center" v-if="col.field === ''">
  <Button icon="pi pi-pen-to-square" ... />
  <Button icon="pi pi-trash" ... />
</div>
```

**Enhanced Responsive Pattern:**

**Option 1: Icon-only on mobile, with labels on desktop**

```vue
<div class="flex items-center gap-1" v-if="col.field === ''">
  <!-- Edit button -->
  <Button
    icon="pi pi-pen-to-square"
    severity="contrast"
    @click="editUser(data)"
    text
    rounded
    outlined
    :aria-label="t('common.actions.edit')"
    class="sm:!rounded-md"
  />

  <!-- Delete button -->
  <Button
    icon="pi pi-trash"
    severity="danger"
    @click="onDeleteClick(data['id'])"
    text
    rounded
    outlined
    :aria-label="t('common.actions.delete')"
    class="sm:!rounded-md"
  />
</div>
```

**Option 2: Menu dropdown on mobile**

```vue
<div class="flex items-center" v-if="col.field === ''">
  <!-- Desktop: Individual buttons -->
  <div class="hidden items-center gap-1 sm:flex">
    <Button icon="pi pi-pen-to-square" ... />
    <Button icon="pi pi-trash" ... />
  </div>

  <!-- Mobile: Menu dropdown -->
  <div class="sm:hidden">
    <Button
      icon="pi pi-ellipsis-v"
      text
      rounded
      @click="toggleActionMenu($event, data)"
    />
    <Menu
      :ref="`menu-${data.id}`"
      :model="getActionMenuItems(data)"
      popup
    />
  </div>
</div>
```

**Menu items helper:**

```typescript
function getActionMenuItems(data: User) {
  const items = []

  if (canWrite) {
    items.push(
      {
        label: t('common.actions.edit'),
        icon: 'pi pi-pen-to-square',
        command: () => editUser(data),
      },
      {
        label: t('common.actions.delete'),
        icon: 'pi pi-trash',
        command: () => onDeleteClick(data.id),
      },
    )
  } else {
    items.push({
      label: t('common.actions.view'),
      icon: 'pi pi-eye',
      command: () => viewUser(data),
    })
  }

  return items
}
```

---

### 9. Responsive Typography

**Files to Update:**

- All view component headers
- Dialog headers
- Form labels

**Page Headings:**

```vue
<!-- Before -->
<h1 class="mb-5 text-lg font-semibold md:text-2xl">{{ t('users.title') }}</h1>

<!-- After -->
<h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
  {{ t('users.title') }}
</h1>
```

**Scale:**

```
Mobile:  text-base (16px)
Small:   text-lg (18px)
Medium+: text-2xl (24px)
```

**Dialog Headers:**
Dialog component automatically handles this via PrimeVue, but can be customized:

```vue
<Dialog
  :pt="{
    header: 'text-base sm:text-lg md:text-xl',
  }"
  ...
/>
```

**Form Labels:**

```vue
<label class="text-sm font-semibold sm:text-base"></label>
```

---

### 10. Touch-Friendly Interactions

**Global Button Sizing:**

Create a composable for consistent touch targets:

**File:** `src/composables/useResponsiveSize.ts`

```typescript
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

export function useResponsiveSize() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const buttonSize = computed(() => {
    if (isMobile.value) return 'large'
    return 'normal'
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    buttonSize,
  }
}
```

**Usage:**

```vue
<script setup>
import { useResponsiveSize } from '@/composables/useResponsiveSize'

const { isMobile, buttonSize } = useResponsiveSize()
</script>

<template>
  <Button :size="buttonSize" ... />
</template>
```

**Minimum Touch Targets:**

- All interactive elements should be minimum 44x44px on mobile
- Increase spacing between buttons to prevent mis-taps
- Use `p-3` instead of `p-2` for mobile buttons

**Example:**

```vue
<Button class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" ... />
```

---

## Additional Enhancements

### 11. Responsive Sidebar Width

**File:** `src/layouts/MainLayout.vue`

**Current:**

```typescript
const gridClass = computed(() =>
  sidebarStore.isCollapsed
    ? 'md:grid-cols-[70px_minmax(220px,1fr)] lg:grid-cols-[70px_minmax(280px,1fr)]'
    : 'md:grid-cols-[220px_minmax(220px,1fr)] lg:grid-cols-[280px_minmax(280px,1fr)]',
)
```

**Consider:**

- Auto-collapse sidebar on tablet portrait
- Adjust breakpoint behavior

---

### 12. Infinite Select Responsiveness

**File:** Component using `InfiniteSelect` (e.g., `UserDialog.vue`)

**Ensure dropdown positioning works on mobile:**

```vue
<InfiniteSelect
  :pt="{
    root: 'w-full',
    overlay: 'max-w-[95vw] sm:max-w-full',
  }"
  ...
/>
```

---

### 13. Tabs Responsiveness

**File:** `src/views/users/UserDialog.vue:117`

**Current:**

```vue
<Tabs value="0">
  <TabList>
    <Tab value="0">{{ t('users.tabs.roles') }}</Tab>
  </TabList>
</Tabs>
```

**Enhanced for mobile:**

```vue
<Tabs
  value="0"
  :pt="{
    tablist: 'flex-wrap gap-1 sm:gap-2',
    tab: 'text-sm sm:text-base',
  }"
></Tabs>
```

---

## Implementation Priority

### Phase 1: High Priority (Core UX Fixes)

**Estimated effort:** 4-6 hours
**Status:** ✅ Items 1-3 COMPLETED (2025-11-23)

1. ✅ **Main layout padding adjustments** (`MainLayout.vue`)

   - Updated `src/layouts/MainLayout.vue:55`
   - Progressive padding: `p-2` (mobile) → `sm:p-4` → `lg:p-10`
   - Progressive gap: `gap-2` (mobile) → `sm:gap-4` → `lg:gap-10`

2. ✅ **Dialog responsive sizing** (all dialog components)

   - Updated 6 dialog components with PrimeVue `:breakpoints` prop
   - Simple dialogs: 50vw (desktop) → 75vw (tablet) → 90vw (mobile)
   - Complex dialogs: 80vw with maxWidth 1200px (desktop) → 75vw (tablet) → 90vw (mobile)
   - Files: `UsersView.vue`, `RolesView.vue`, `DivisionsView.vue`, `BranchesView.vue`, `DepartmentsView.vue`, `CompaniesView.vue`

3. ✅ **Form layout stacking** (all dialog forms)

   - Updated 6 dialog form components with responsive flex layout
   - Mobile: vertical stacking (`flex-col gap-2`)
   - Desktop: horizontal layout (`md:flex-row md:gap-4`)
   - Labels: `w-full` (mobile) → `md:w-32` (desktop)
   - All inputs now have `w-full` class
   - Special handling for Password and InfiniteSelect components with pass-through props
   - Files: `UserDialog.vue`, `RoleDialog.vue`, `DepartmentDialog.vue`, `DivisionDialog.vue`, `CompanyDialog.vue`, `BranchDialog.vue`

4. ✅ **Basic responsive typography** (page headers, dialog headers, form labels)
   - **Page Headers (10 files):** Added responsive sizing `text-base sm:text-lg md:text-2xl` with responsive margin `mb-3 sm:mb-5`
     - Main views: `UsersView.vue`, `RolesView.vue`, `PermissionsView.vue`, `DepartmentsView.vue`, `DivisionsView.vue`, `CompaniesView.vue`, `BranchesView.vue`, `HomeView.vue`
     - Special pages: `SignInView.vue` (text-xl sm:text-2xl), `NotFoundView.vue` (text-5xl sm:text-6xl)
   - **Dialog Headers (6 files):** Added PrimeVue pass-through prop `:pt="{ header: 'text-base sm:text-lg md:text-xl' }"`
     - Files: All view files with Dialog components (UsersView, RolesView, etc.)
   - **Form Labels (18 labels across 10 files):** Added `text-sm sm:text-base`
     - Dialog forms: `UserDialog.vue` (4 labels), `RoleDialog.vue` (2 labels), `DepartmentDialog.vue` (1 label), `DivisionDialog.vue` (1 label), `CompanyDialog.vue` (4 labels), `BranchDialog.vue` (3 labels)
     - Tab components: `RolesTab.vue`, `PermissionsTab.vue`, `DivisionsTab.vue`, `BranchesTab.vue`
     - Auth: `SignInView.vue` (2 labels)

**Impact:** Immediate improvement to mobile usability, forms become usable on mobile

---

### Phase 2: Medium Priority (Enhanced Mobile Experience)

**Estimated effort:** 6-8 hours
**Status:** ✅ COMPLETED (2025-11-24) - All 4 items completed

5. ✅ **TableComponent mobile card view** (COMPLETED 2025-11-24)

   - Installed `@vueuse/core` dependency for `useMediaQuery`
   - Added `hideOnMobile?: boolean` property to `Column` type in `src/types/table.type.ts`
   - Implemented responsive view detection using `useMediaQuery('(max-width: 767px)')`
   - Created mobile card view layout with:
     - Stacked cards for each data row
     - Responsive header controls (vertical stacking on mobile)
     - Loading and empty states for mobile
     - Simple prev/next pagination buttons
   - Desktop DataTable view:
     - Updated header controls with responsive flex layout
     - Dynamic paginator template (simplified on mobile)
   - Added `visibleColumns` computed property to filter columns based on `hideOnMobile`
   - Added generic type constraint `T extends Record<string, any>` for type safety
   - Files modified:
     - `src/types/table.type.ts` - Added `hideOnMobile` property
     - `src/components/table/TableComponent.vue` - Full mobile responsive implementation

6. ✅ **Header search optimization with mobile drawer** (COMPLETED 2025-11-24)

   - Implemented mobile-first search UX pattern:
     - Desktop: Full search field in header (`hidden md:block`)
     - Mobile: Search button icon that opens drawer (`md:!hidden`)
   - Added mobile search drawer:
     - Opens from top with `position="top"`
     - Auto-height with custom pass-through prop: `:pt="{ root: 'h-auto' }"`
     - Full-width search input with auto-focus
     - Includes search icon and localized placeholder text
   - Integrated i18n for all search-related text:
     - `t('table.search')` - Search label
     - `t('table.searchPlaceholder')` - "Press Enter to search"
   - Optimized header spacing in `MainLayout.vue`:
     - Progressive gap: `gap-2` (mobile) → `sm:gap-4` (tablet+)
     - Progressive padding: `px-2` (mobile) → `sm:px-4` → `lg:px-6`
   - Added state management with `ref(false)` for drawer visibility
   - Files modified:
     - `src/components/menu/HeaderComponent.vue` - Added mobile search button, drawer, and responsive controls
     - `src/layouts/MainLayout.vue` - Updated header spacing for mobile optimization

7. ✅ **Toolbar responsive behavior** (COMPLETED 2025-11-24)

   - Created generic `ResponsiveButton` component (`src/components/button/ResponsiveButton.vue`):
     - Mobile: Icon-only button with `sm:!hidden` class
     - Desktop: Button with label using `hidden sm:!inline-flex` class
     - Accepts all standard PrimeVue Button props (severity, text, outlined, rounded, disabled)
     - Proper aria-label support for accessibility
   - Updated 6 CRUD view files to use ResponsiveButton:
     - `UsersView.vue`, `RolesView.vue`, `DivisionsView.vue`
     - `DepartmentsView.vue`, `CompaniesView.vue`, `BranchesView.vue`
   - Simplified toolbar implementation: `<ResponsiveButton :label="t('common.actions.add')" @click="addEntity" />`
   - Consistent UX: All "Add" buttons now show icon-only on mobile, full label on desktop

8. ✅ **Action button optimization (icon-only with proper aria-labels)** (COMPLETED 2025-11-24)
   - Created generic `TableActionButtons` component (`src/components/table/TableActionButtons.vue`):
     - Handles common edit/delete/view pattern based on `canWrite` permission
     - Edit button: `pi-pen-to-square` icon with contrast severity
     - Delete button: `pi-trash` icon with danger severity
     - View button: `pi-eye` icon (shown when canWrite is false)
     - All buttons include proper aria-labels from i18n
     - Rounded buttons on mobile (`rounded`), normal rounded corners on desktop (`sm:!rounded-md`)
     - Added `gap-1` for proper spacing between buttons
   - Updated 6 CRUD view files to use TableActionButtons:
     - `UsersView.vue`, `RolesView.vue`, `DivisionsView.vue`
     - `DepartmentsView.vue`, `CompaniesView.vue`, `BranchesView.vue`
   - Simplified action column implementation: `<TableActionButtons :can-write="canWrite" @edit="..." @delete="..." @view="..." />`
   - Improved accessibility: All icon-only buttons now have proper aria-labels
   - Removed unused Button imports from all view files

**Impact:** Professional mobile experience, native app-like feel

---

### Phase 3: Low Priority (Polish & Refinement)

**Estimated effort:** 2-4 hours
**Status:** 🔄 In Progress - Items 1-3 COMPLETED (2025-11-24)

9. ✅ **Complete typography adjustments** (COMPLETED 2025-11-24)

   - TableComponent mobile card view typography:
     - Empty state text: `text-sm sm:text-base`
     - Card field labels: `text-xs sm:text-sm`
     - Card field values: `text-sm sm:text-base`
     - Number column label and values with responsive sizing
     - Mobile pagination text: `text-xs sm:text-sm`
   - Tabs typography in dialogs (4 files):
     - `UserDialog.vue`, `RoleDialog.vue`, `DepartmentDialog.vue`, `CompanyDialog.vue`
     - Added PrimeVue pass-through props: `tablist: 'flex-wrap gap-1 sm:gap-2'`, `tab: 'text-sm sm:text-base'`
   - Sidebar brand title: `text-base sm:text-lg`
   - HomeView empty state description: `text-xs sm:text-sm`
   - Files modified:
     - `src/components/table/TableComponent.vue`
     - `src/views/users/UserDialog.vue`
     - `src/views/roles/RoleDialog.vue`
     - `src/views/departments/DepartmentDialog.vue`
     - `src/views/companies/CompanyDialog.vue`
     - `src/components/menu/SideBarComponent.vue`
     - `src/views/home/HomeView.vue`

10. ✅ **Touch target enhancements** (COMPLETED 2025-11-24)

- Created `useResponsiveSize` composable (`src/composables/useResponsiveSize.ts`):
  - Provides reactive breakpoint detection (isMobile, isTablet, isDesktop)
  - Returns dynamic buttonSize: 'large' on mobile, undefined on desktop
  - Uses `@vueuse/core` useMediaQuery for media query detection
- Updated `ResponsiveButton` component:
  - Uses `useResponsiveSize` composable for consistent button sizing
  - Added minimum touch target: `min-h-[44px] sm:min-h-0`
  - Ensures 44x44px minimum on mobile (Apple/Google accessibility guidelines)
- Updated `TableActionButtons` component:
  - Applied buttonSize from useResponsiveSize to all action buttons
  - Added `min-h-[44px] min-w-[44px]` for mobile touch targets
  - Increased button spacing: `gap-2` (mobile) → `sm:gap-1` (desktop)
  - Enhanced Edit, Delete, and View buttons with proper touch areas
- Updated `TableComponent` buttons:
  - Mobile view: Refresh and Clear Filters buttons with 44px minimum height
  - Mobile pagination: Previous/Next buttons with 44x44px touch targets
  - Desktop view: Normal button sizing with `sm:min-h-0` reset
- Updated `HeaderComponent` buttons:
  - Mobile menu toggle: 44x44px touch target with buttonSize
  - Mobile search button: 44x44px touch target with buttonSize
  - Desktop buttons: Normal sizing with `sm:min-h-0` reset
- Added to composables barrel export: `src/composables/index.ts`
- Files modified:
  - `src/composables/useResponsiveSize.ts` (new file)
  - `src/composables/index.ts`
  - `src/components/button/ResponsiveButton.vue`
  - `src/components/table/TableActionButtons.vue`
  - `src/components/table/TableComponent.vue`
  - `src/components/menu/HeaderComponent.vue`

11. ✅ **Card spacing refinements** (COMPLETED 2025-11-24)

- Created generic `ResponsiveCard` component (`src/components/card/ResponsiveCard.vue`):
  - Wraps PrimeVue Card with responsive padding via pass-through props
  - Progressive padding: `p-2` (mobile) → `sm:p-4` → `md:p-6`
  - Content area with `p-0` to allow full-width table rendering
  - Supports all Card slots: header, title, subtitle, content, footer
- Updated 7 CRUD view files to use ResponsiveCard:
  - Replaced `<Card>` with `<ResponsiveCard>` for table containers
  - Removed inline pass-through props (now handled by component)
  - Updated imports from `primevue/card` to `@/components/card/ResponsiveCard.vue`
  - Files: `UsersView.vue`, `RolesView.vue`, `PermissionsView.vue`, `DepartmentsView.vue`, `DivisionsView.vue`, `CompaniesView.vue`, `BranchesView.vue`
- Consistent spacing across all table views
- Better mobile screen space utilization with reduced padding
- SignInView.vue kept with standard Card (different layout requirements)
- Files modified:
  - `src/components/card/ResponsiveCard.vue` (new file)
  - `src/views/users/UsersView.vue`
  - `src/views/roles/RolesView.vue`
  - `src/views/permissions/PermissionsView.vue`
  - `src/views/departments/DepartmentsView.vue`
  - `src/views/divisions/DivisionsView.vue`
  - `src/views/companies/CompaniesView.vue`
  - `src/views/branches/BranchesView.vue`

12. ⬜ Sidebar auto-collapse on tablet
13. ⬜ Component-specific mobile optimizations

**Impact:** Polished, production-ready mobile experience

---

## Testing Checklist

### Device Testing

- [ ] **iPhone SE (375px)** - Smallest common mobile screen
- [ ] **iPhone 12/13/14 (390px)** - Standard mobile
- [ ] **iPhone 14 Pro Max (428px)** - Large mobile
- [ ] **iPad Mini (768px)** - Tablet portrait
- [ ] **iPad Pro (1024px)** - Tablet landscape
- [ ] **Desktop (1280px+)** - Ensure nothing breaks

### Feature Testing

#### Layout & Navigation

- [ ] Sidebar toggle works on desktop
- [ ] Drawer opens/closes on mobile
- [ ] Drawer closes on route change
- [ ] Header elements don't overlap on small screens
- [x] Main content has appropriate padding at all sizes (Phase 1 #1)
- [ ] Language switcher works on all screen sizes

#### Tables

- [ ] Table switches to card view on mobile
- [ ] All data displays correctly in card view
- [ ] Pagination works on mobile
- [ ] Search works on mobile
- [ ] Filters work on mobile
- [ ] Sorting works on mobile
- [ ] Refresh button works
- [ ] Clear filters button works
- [ ] Action buttons are tappable (minimum 44px)

#### Dialogs & Forms

- [x] Dialogs fit on screen without horizontal scroll (Phase 1 #2)
- [x] Form fields stack vertically on mobile (Phase 1 #3)
- [x] Form fields are side-by-side on desktop (Phase 1 #3)
- [x] All inputs are easily tappable (Phase 1 #3)
- [x] Validation messages display correctly (Phase 1 #3)
- [x] Submit/cancel buttons are accessible (Phase 1 #3)
- [x] InfiniteSelect dropdowns work on mobile (Phase 1 #3)
- [x] Password visibility toggle works (Phase 1 #3)
- [ ] Tabs in dialogs work on mobile

#### CRUD Operations

- [ ] Create user on mobile
- [ ] Edit user on mobile
- [ ] Delete user on mobile (confirmation works)
- [ ] Create role on mobile
- [ ] Edit role on mobile
- [ ] Delete role on mobile
- [ ] Permission assignment works on mobile
- [ ] Department/Division CRUD on mobile

#### Touch Interactions

- [ ] All buttons respond to touch (no double-tap needed)
- [ ] Swipe gestures don't interfere (if any)
- [ ] Dropdowns/menus can be dismissed easily
- [ ] No accidental clicks due to small targets
- [ ] Tooltips work on touch (or are hidden)

#### Performance

- [ ] No layout shifts during responsive transitions
- [ ] Smooth animations on mobile devices
- [ ] No jank when opening drawers/dialogs
- [ ] Table card view renders efficiently

### Browser Testing

- [ ] Safari iOS (iPhone)
- [ ] Chrome Android
- [ ] Chrome Desktop (responsive mode)
- [ ] Firefox Desktop (responsive mode)
- [ ] Edge Desktop (responsive mode)

### Orientation Testing

- [ ] Portrait mode on mobile
- [ ] Landscape mode on mobile
- [ ] Portrait mode on tablet
- [ ] Landscape mode on tablet

### Accessibility Testing

- [ ] Screen reader navigation works
- [ ] Keyboard navigation works on all screen sizes
- [ ] Focus indicators visible
- [ ] Proper aria-labels on icon-only buttons
- [ ] Color contrast sufficient at all sizes
- [ ] Text remains readable when zoomed

---

## Tailwind Breakpoints Reference

```css
/* Default (Mobile First) */
/* 0px - 639px */

sm: 640px   /* Large phones (landscape), small tablets */
md: 768px   /* Tablets (portrait), large phones (landscape) */
lg: 1024px  /* Small desktops, tablets (landscape) */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Common Media Queries

```typescript
// In Vue components
import { useMediaQuery } from '@vueuse/core'

const isMobile = useMediaQuery('(max-width: 767px)')
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
const isDesktop = useMediaQuery('(min-width: 1024px)')
```

### Responsive Class Patterns

```
Mobile-first approach (Tailwind default):
text-sm md:text-base lg:text-lg    ← Scales up
p-2 sm:p-4 lg:p-6                  ← Increases padding

Desktop-first utilities (when needed):
block md:hidden                    ← Show on mobile, hide on desktop
hidden md:block                    ← Hide on mobile, show on desktop
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@vueuse/core": "^10.x.x" // For useMediaQuery composable
  }
}
```

Install:

```bash
npm install @vueuse/core
```

---

## Notes & Considerations

### Design Decisions

1. **Mobile-first approach:** Start with mobile styles, enhance for larger screens
2. **Progressive enhancement:** Core functionality works everywhere, enhanced on larger screens
3. **Touch-first:** Assume touch input on mobile, optimize accordingly
4. **Performance:** Minimize JS for responsive behavior, use CSS when possible

### Known Limitations

1. PrimeVue DataTable doesn't have built-in mobile view - requires custom implementation
2. Some PrimeVue components may need `pt` (pass-through) props for full control
3. Drawer component auto-closes on route change (this is desired behavior)

### Future Enhancements

- [ ] Add swipe gestures for drawer
- [ ] Implement pull-to-refresh on mobile
- [ ] Add mobile-specific shortcuts/gestures
- [ ] Consider PWA features (install prompt, offline support)
- [ ] Add responsive charts/visualizations (for BI integration)
- [ ] Implement virtual scrolling for long lists on mobile

---

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project architecture and conventions
- [Tailwind CSS Documentation](https://tailwindcss.com/docs/responsive-design)
- [PrimeVue Documentation](https://primevue.org/)
- [VueUse Documentation](https://vueuse.org/)

---

**Last Updated:** 2025-11-24
**Next Review:** When completing Phase 3 implementation
