<template>
  <PanelMenu
    ref="panelMenuRef"
    v-model:expandedKeys="expandedKeys"
    :model="filteredMenu"
    multiple
    :class="[collapsed ? 'w-full' : 'w-full md:w-80', collapsed ? 'sidebar-collapsed' : '']"
  >
    <template #item="{ item }">
      <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
        <a
          v-tooltip.right="collapsed ? getTranslatedLabel(item) : ''"
          :class="[
            'text-surface-700 dark:text-surface-0 flex cursor-pointer items-center py-3 sm:py-2',
            collapsed ? 'justify-center px-0' : 'px-4',
          ]"
          :href="href"
          @click="navigate"
        >
          <span :class="item.icon" />
          <span v-if="!collapsed" class="ml-2">{{ getTranslatedLabel(item) }}</span>
        </a>
      </RouterLink>

      <a
        v-else
        v-tooltip.right="collapsed ? getTranslatedLabel(item) : ''"
        :class="[
          'text-surface-700 dark:text-surface-0 flex cursor-pointer items-center py-3 sm:py-2',
          collapsed ? 'justify-center px-0' : 'px-4',
        ]"
        :href="item.url"
        :target="item.target"
        @click="handleParentMenuClick(item, !!item.items)"
      >
        <span :class="item.icon" />
        <span v-if="!collapsed" class="ml-2">{{ getTranslatedLabel(item) }}</span>
        <span v-if="item.items && !collapsed" class="pi pi-angle-down text-primary ml-auto" />
      </a>
    </template>
  </PanelMenu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PanelMenu from 'primevue/panelmenu'
import { mainMenu } from './menu'
import { usePermissions } from '@/composables'
import { useSidebarStore } from '@/stores'

const props = defineProps<{
  collapsed?: boolean
}>()

const { t } = useI18n()
const { canAccessRoute } = usePermissions()
const sidebarStore = useSidebarStore()

/**
 * Custom menu item type with i18n support
 */
interface TranslatableMenuItem {
  labelKey?: string
  label?: string | ((...args: unknown[]) => string)
  [key: string]: unknown
}

/**
 * Get translated label for a menu item
 * Falls back to the static label if translation key is not provided
 */
function getTranslatedLabel(item: TranslatableMenuItem): string {
  if (item.labelKey) {
    return t(item.labelKey)
  }
  if (typeof item.label === 'string') {
    return item.label
  }
  return ''
}

// Track which menu items are expanded
const expandedKeys = ref<Record<string, boolean>>({})

// Track which menu was clicked while collapsed (to auto-expand it)
const pendingExpandKey = ref<string | null>(null)

// Reference to the PanelMenu component
const panelMenuRef = ref()

/**
 * Handle click on parent menu items when collapsed
 * Expands sidebar and marks menu for auto-expansion
 */
function handleParentMenuClick(item: { key?: string }, hasItems: boolean) {
  if (hasItems && sidebarStore.isCollapsed && item.key) {
    // Store the key of the menu to expand
    pendingExpandKey.value = item.key
    sidebarStore.expand()
  }
}

/**
 * Watch for sidebar expansion and auto-expand pending menu
 */
watch(
  () => props.collapsed,
  (isCollapsed, wasCollapsed) => {
    // When sidebar transitions from collapsed to expanded
    if (wasCollapsed && !isCollapsed && pendingExpandKey.value) {
      const keyToExpand = pendingExpandKey.value
      // Use setTimeout to allow PrimeVue to fully render before setting expanded state
      setTimeout(() => {
        // Force reactivity by creating a new object
        const newKeys: Record<string, boolean> = {}
        newKeys[keyToExpand] = true
        expandedKeys.value = newKeys
      }, 100) // 100ms delay to let PrimeVue render
      // Clear pending state
      pendingExpandKey.value = null
    }
  }
)

/**
 * Filter menu items based on user permissions
 * - Hide menu items user doesn't have READ permission for
 * - Hide entire menu sections if user can't access any items within
 * - Add unique keys for tracking expansion state
 * - Keep menu structure intact even when collapsed (hide via CSS)
 */
const filteredMenu = computed(() => {
  return mainMenu
    .map((menuItem, index) => {
      // Generate a unique key for each menu item
      const key = menuItem.label?.toLowerCase().replace(/\s+/g, '-') || `menu-${index}`

      // If menu has subitems, filter them
      if (menuItem.items) {
        const accessibleItems = menuItem.items.filter((item) => {
          return item.route ? canAccessRoute(item.route) : true
        })

        if (accessibleItems.length === 0) {
          return null
        }

        return {
          ...menuItem,
          key,
          items: accessibleItems,
        }
      }

      if (menuItem.route && !canAccessRoute(menuItem.route)) {
        return null
      }

      return {
        ...menuItem,
        key,
      }
    })
    .filter((item) => item !== null)
})
</script>

<style scoped>
/* Hide submenu items when sidebar is collapsed */
.sidebar-collapsed :deep(.p-panelmenu-content) {
  display: none !important;
}

/* Prevent menu expansion animation when collapsed */
.sidebar-collapsed :deep(.p-toggleable-content) {
  display: none !important;
}
</style>
