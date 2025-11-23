<script setup lang="ts">
import SideBarComponent from '@/components/menu/SideBarComponent.vue'
import HeaderComponent from '@/components/menu/HeaderComponent.vue'
import PanelMenuComponent from '@/components/menu/PanelMenuComponent.vue'
import Drawer from 'primevue/drawer'
import { RouterView, useRoute } from 'vue-router'
import { useSidebarStore } from '@/stores'
import { computed, watch } from 'vue'

const route = useRoute()
const sidebarStore = useSidebarStore()
const gridClass = computed(() =>
  sidebarStore.isCollapsed
    ? 'md:grid-cols-[70px_minmax(220px,1fr)] lg:grid-cols-[70px_minmax(280px,1fr)]'
    : 'md:grid-cols-[220px_minmax(220px,1fr)] lg:grid-cols-[280px_minmax(280px,1fr)]',
)

const isDrawerOpen = computed({
  get: () => sidebarStore.isDrawerOpen,
  set: (value) => {
    if (value) {
      sidebarStore.openDrawer()
    } else {
      sidebarStore.closeDrawer()
    }
  },
})

// Close drawer on route change
watch(
  () => route.path,
  () => {
    sidebarStore.closeDrawer()
  },
)
</script>

<template>
  <div :class="['grid min-h-screen w-full', gridClass]">
    <Drawer v-model:visible="isDrawerOpen" header="Menu">
      <PanelMenuComponent />
    </Drawer>

    <div class="hidden border-r border-stone-200/70 bg-stone-50/70 md:block">
      <SideBarComponent />
    </div>

    <div class="flex flex-col">
      <header
        class="flex h-14 items-center gap-4 border-b border-stone-200/70 bg-stone-50/70 px-4 lg:h-[60px] lg:px-6"
      >
        <HeaderComponent />
      </header>

      <main class="flex flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-4 lg:gap-10 lg:p-10">
        <RouterView />
      </main>
    </div>
  </div>
</template>
