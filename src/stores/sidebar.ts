import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Sidebar state management store
 *
 * Manages the collapsed/expanded state of the application sidebar.
 * The state persists across component renders and is shared globally.
 */
export const useSidebarStore = defineStore('sidebar', () => {
  const isCollapsed = ref(false)
  const isDrawerOpen = ref(false)

  function toggle() {
    isCollapsed.value = !isCollapsed.value
  }

  function collapse() {
    isCollapsed.value = true
  }

  function expand() {
    isCollapsed.value = false
  }

  function openDrawer() {
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
  }

  function toggleDrawer() {
    isDrawerOpen.value = !isDrawerOpen.value
  }

  return {
    isCollapsed,
    isDrawerOpen,
    toggle,
    collapse,
    expand,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }
})
