<template>
  <PanelMenu :model="filteredMenu" multiple :class="collapsed ? 'w-full' : 'w-full md:w-80'">
    <template #item="{ item }">
      <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
        <a
          v-tooltip.right="collapsed ? item.label : ''"
          :class="[
            'text-surface-700 dark:text-surface-0 flex cursor-pointer items-center py-2',
            collapsed ? 'justify-center px-0' : 'px-4',
          ]"
          :href="href"
          @click="navigate"
        >
          <span :class="item.icon" />
          <span v-if="!collapsed" class="ml-2">{{ item.label }}</span>
        </a>
      </RouterLink>

      <a
        v-else
        v-tooltip.right="collapsed ? item.label : ''"
        :class="[
          'text-surface-700 dark:text-surface-0 flex cursor-pointer items-center py-2',
          collapsed ? 'justify-center px-0' : 'px-4',
        ]"
        :href="item.url"
        :target="item.target"
      >
        <span :class="item.icon" />
        <span v-if="!collapsed" class="ml-2">{{ item.label }}</span>
        <span v-if="item.items && !collapsed" class="pi pi-angle-down text-primary ml-auto" />
      </a>
    </template>
  </PanelMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PanelMenu from 'primevue/panelmenu'
import { mainMenu } from './menu'
import { usePermissions } from '@/composables'

defineProps<{
  collapsed?: boolean
}>()

const { canAccessRoute } = usePermissions()

/**
 * Filter menu items based on user permissions
 * - Hide menu items user doesn't have READ permission for
 * - Hide entire menu sections if user can't access any items within
 */
const filteredMenu = computed(() => {
  return mainMenu
    .map((menuItem) => {
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
          items: accessibleItems,
        }
      }

      if (menuItem.route && !canAccessRoute(menuItem.route)) {
        return null
      }

      return menuItem
    })
    .filter((item) => item !== null)
})
</script>
