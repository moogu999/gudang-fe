<template>
  <PanelMenu :model="mainMenu" multiple :class="collapsed ? 'w-full' : 'w-full md:w-80'">
    <template #item="{ item }">
      <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
        <a
          v-tooltip.right="collapsed ? item.label : ''"
          :class="[
            'flex items-center cursor-pointer text-surface-700 dark:text-surface-0 py-2',
            collapsed ? 'px-0 justify-center' : 'px-4',
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
          'flex items-center cursor-pointer text-surface-700 dark:text-surface-0 py-2',
          collapsed ? 'px-0 justify-center' : 'px-4',
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
import PanelMenu from 'primevue/panelmenu'
import { mainMenu } from './menu'

defineProps<{
  collapsed?: boolean
}>()
</script>
