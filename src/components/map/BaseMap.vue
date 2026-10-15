<template>
  <div class="relative h-full w-full overflow-hidden rounded-md border border-stone-200">
    <div ref="container" class="h-full w-full" data-testid="map-canvas" />
    <Message
      v-if="unavailable"
      severity="warn"
      class="absolute inset-x-2 top-2"
      data-testid="map-unavailable"
    >
      {{ t('map.unavailable') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Message from 'primevue/message'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE_URL } from './mapConfig'
import { createMarkerElement, type MarkerVariant } from './NumberedMarker'

export interface MapMarker {
  id: number
  lat: number
  lng: number
  /** Text inside the pin, usually the visit number. */
  label?: string
  variant?: MarkerVariant
  /** Shown in a popup when the pin is clicked. */
  popup?: string
  draggable?: boolean
}

const props = withDefaults(
  defineProps<{
    markers?: MapMarker[]
    center?: { lat: number; lng: number }
    zoom?: number
    /** Fit the view to the markers whenever they change. */
    autoFit?: boolean
  }>(),
  { markers: () => [], center: undefined, zoom: DEFAULT_MAP_ZOOM, autoFit: true },
)

const emit = defineEmits<{
  'map-click': [point: { lat: number; lng: number }]
  'marker-drag-end': [marker: { id: number; lat: number; lng: number }]
  'marker-click': [id: number]
}>()

const { t } = useI18n()
const container = ref<HTMLElement>()
const unavailable = ref(false)

let map: MapLibreMap | null = null
let maplibre: typeof import('maplibre-gl') | null = null
let resizeObserver: ResizeObserver | null = null
let rendered: Marker[] = []

function clearMarkers() {
  rendered.forEach((m) => m.remove())
  rendered = []
}

function renderMarkers() {
  if (!map || !maplibre) return
  clearMarkers()
  for (const m of props.markers) {
    const el = createMarkerElement(m.label, m.variant ?? 'primary')
    const marker = new maplibre.Marker({ element: el, draggable: !!m.draggable })
      .setLngLat([m.lng, m.lat])
      .addTo(map)
    if (m.popup) marker.setPopup(new maplibre.Popup({ offset: 14 }).setText(m.popup))
    el.addEventListener('click', () => emit('marker-click', m.id))
    if (m.draggable) {
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat()
        emit('marker-drag-end', { id: m.id, lat, lng })
      })
    }
    rendered.push(marker)
  }
  if (props.autoFit) fitTo()
}

/** Zooms to show every marker; keeps the current view when there is none. */
function fitTo() {
  if (!map || !maplibre || props.markers.length === 0) return
  if (props.markers.length === 1) {
    const [only] = props.markers
    map.easeTo({ center: [only.lng, only.lat], zoom: Math.max(map.getZoom(), 15), duration: 0 })
    return
  }
  const bounds = new maplibre.LngLatBounds()
  props.markers.forEach((m) => bounds.extend([m.lng, m.lat]))
  map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 })
}

function flyTo(point: { lat: number; lng: number }, zoom?: number) {
  map?.easeTo({ center: [point.lng, point.lat], zoom: zoom ?? map.getZoom(), duration: 0 })
}

onMounted(async () => {
  if (!container.value) return
  try {
    // The map and its stylesheet load together, so neither is in the main bundle.
    const [lib] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
    maplibre = lib
    const start = props.center ?? props.markers[0] ?? DEFAULT_MAP_CENTER
    map = new lib.Map({
      container: container.value,
      style: MAP_STYLE_URL,
      center: [start.lng, start.lat],
      zoom: props.zoom,
      attributionControl: false,
    })
    map.addControl(new lib.AttributionControl({ compact: true }))
    map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', (e) => emit('map-click', { lat: e.lngLat.lat, lng: e.lngLat.lng }))
    map.on('load', renderMarkers)
    renderMarkers()
    resizeObserver = new ResizeObserver(() => map?.resize())
    resizeObserver.observe(container.value)
  } catch {
    // No WebGL, or the library failed to load: the rest of the page keeps working.
    unavailable.value = true
  }
})

watch(() => props.markers, renderMarkers, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  clearMarkers()
  map?.remove()
  map = null
})

defineExpose({ fitTo, flyTo })
</script>
