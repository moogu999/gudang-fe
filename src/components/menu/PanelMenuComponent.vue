<template>
  <PanelMenu :model="mainMenu" multiple class="w-full md:w-80">
    <template #item="{ item }">
      <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
        <a
          class="flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2"
          :href="href"
          @click="navigate"
        >
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
        </a>
      </RouterLink>

      <a
        v-else
        class="flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2"
        :href="item.url"
        :target="item.target"
      >
        <span :class="item.icon" />
        <span class="ml-2">{{ item.label }}</span>
        <span v-if="item.items" class="pi pi-angle-down text-primary ml-auto" />
      </a>
    </template>
  </PanelMenu>
</template>

<script setup lang="ts">
import PanelMenu from 'primevue/panelmenu'
import { mainMenu } from './menu'
</script>
