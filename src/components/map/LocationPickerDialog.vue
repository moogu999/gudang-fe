<template>
  <Dialog
    :visible="visible"
    :header="t('map.picker.title')"
    modal
    :breakpoints="{ '960px': '90vw', '640px': '100vw' }"
    :style="{ width: '48rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex flex-col gap-3">
      <p class="text-sm text-stone-600">{{ t('map.picker.hint') }}</p>

      <div class="h-80 sm:h-96">
        <BaseMap
          ref="mapRef"
          :markers="markers"
          :center="center"
          :zoom="point ? 15 : 11"
          :auto-fit="false"
          @map-click="place"
          @marker-drag-end="(m) => place(m)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="font-mono text-sm" data-testid="picked-coordinates">
          {{ point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : t('map.picker.noPin') }}
        </span>
        <Button
          type="button"
          icon="pi pi-map-marker"
          size="small"
          severity="secondary"
          :label="t('map.picker.useMyLocation')"
          :loading="locating"
          @click="useMyLocation"
        />
      </div>
    </div>

    <template #footer>
      <Button
        type="button"
        :label="t('map.picker.clear')"
        severity="secondary"
        text
        class="mr-auto"
        @click="emit('apply', { latitude: null, longitude: null })"
      />
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        @click="emit('close')"
      />
      <Button
        type="button"
        :label="t('common.actions.save')"
        :disabled="!point"
        data-testid="apply-location"
        @click="apply"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import BaseMap, { type MapMarker } from './BaseMap.vue'

const props = defineProps<{
  visible: boolean
  latitude?: string | number | null
  longitude?: string | number | null
  /** Where to look when the customer has no pin yet, e.g. the branch. */
  fallbackCenter?: { lat: number; lng: number }
  toastGroup: string
}>()

const emit = defineEmits<{
  close: []
  apply: [coordinates: { latitude: string | null; longitude: string | null }]
}>()

const { t } = useI18n()
const toast = useToast()

const mapRef = ref<InstanceType<typeof BaseMap>>()
const point = ref<{ lat: number; lng: number } | null>(null)
const locating = ref(false)

function parse(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

watch(
  () => props.visible,
  (shown) => {
    if (!shown) return
    const lat = parse(props.latitude)
    const lng = parse(props.longitude)
    point.value = lat !== null && lng !== null ? { lat, lng } : null
  },
  { immediate: true },
)

const center = computed(() => point.value ?? props.fallbackCenter)

const markers = computed<MapMarker[]>(() =>
  point.value ? [{ id: 1, ...point.value, variant: 'pin', draggable: true }] : [],
)

function place(next: { lat: number; lng: number }) {
  point.value = { lat: next.lat, lng: next.lng }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    toast.add(commonErrorToast(new Error(t('map.picker.locationDenied')), props.toastGroup))
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false
      place({ lat: position.coords.latitude, lng: position.coords.longitude })
      mapRef.value?.flyTo({ lat: position.coords.latitude, lng: position.coords.longitude }, 16)
    },
    () => {
      locating.value = false
      toast.add(commonErrorToast(new Error(t('map.picker.locationDenied')), props.toastGroup))
    },
  )
}

function apply() {
  if (!point.value) return
  emit('apply', {
    latitude: point.value.lat.toFixed(8),
    longitude: point.value.lng.toFixed(8),
  })
}
</script>
