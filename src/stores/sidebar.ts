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

  function toggle() {
    isCollapsed.value = !isCollapsed.value
  }

  function collapse() {
    isCollapsed.value = true
  }

  function expand() {
    isCollapsed.value = false
  }

  return {
    isCollapsed,
    toggle,
    collapse,
    expand,
  }
})
