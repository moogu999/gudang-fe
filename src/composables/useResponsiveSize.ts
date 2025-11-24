import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

/**
 * Composable for responsive size detection and button sizing
 *
 * Provides reactive breakpoint detection and responsive button size configuration
 * for optimal touch targets on mobile devices.
 *
 * @returns Object containing breakpoint flags and button size
 *
 * @example
 * ```typescript
 * import { useResponsiveSize } from '@/composables/useResponsiveSize'
 *
 * const { isMobile, buttonSize } = useResponsiveSize()
 * ```
 *
 * ```vue
 * <Button :size="buttonSize" ... />
 * ```
 */
export function useResponsiveSize() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  /**
   * Button size based on current breakpoint
   * - Mobile: 'large' for better touch targets (minimum 44x44px)
   * - Desktop: undefined (normal size)
   */
  const buttonSize = computed(() => {
    if (isMobile.value) return 'large'
    return undefined
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    buttonSize,
  }
}
