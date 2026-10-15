export type MarkerVariant = 'primary' | 'muted' | 'preview' | 'pin'

const VARIANT_CLASSES: Record<MarkerVariant, string> = {
  primary: 'bg-[var(--p-primary-500)] text-white border-white',
  muted: 'bg-stone-400 text-white border-white',
  preview: 'bg-amber-500 text-white border-white',
  pin: 'bg-red-500 text-white border-white',
}

/**
 * The DOM element of a map pin: a numbered circle, or a plain dot when there is no label.
 * MapLibre adds `maplibregl-marker` to it, which is what tests look for.
 */
export function createMarkerElement(label: string | undefined, variant: MarkerVariant): HTMLElement {
  const el = document.createElement('div')
  el.className = `flex h-7 min-w-7 items-center justify-center rounded-full border-2 px-1 text-xs font-semibold shadow ${VARIANT_CLASSES[variant]}`
  if (label) el.textContent = label
  else el.classList.add('h-4', 'min-w-4', 'w-4', 'px-0')
  el.dataset.testid = 'map-marker'
  return el
}
