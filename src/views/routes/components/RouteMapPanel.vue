<template>
  <div class="flex flex-col gap-2" data-testid="route-map-panel">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-semibold">
        {{
          showAll
            ? t('routes.map.titleAll')
            : t('routes.map.title', { day: t(`calendar.weekdaysShort.${bit}`), week })
        }}
      </span>
      <Select
        :model-value="week"
        :disabled="showAll"
        :options="weekOptions"
        option-label="label"
        option-value="value"
        size="small"
        class="w-20"
        @update:model-value="(v: number) => emit('update:week', v)"
      />
      <Select
        :model-value="bit"
        :options="dayOptions"
        option-label="label"
        option-value="value"
        size="small"
        class="w-24"
        @update:model-value="(v: number) => emit('update:bit', v)"
      />
      <Tag v-if="preview" :value="t('routes.map.previewTag')" severity="warn" />
    </div>

    <div class="h-64">
      <BaseMap :markers="markers" />
    </div>

    <div v-if="canWrite" class="flex flex-wrap gap-2">
      <template v-if="!preview">
        <Button
          type="button"
          size="small"
          severity="secondary"
          icon="pi pi-sort-amount-down"
          :label="t('routes.map.sortFromMap')"
          :disabled="located.length < 2"
          data-testid="sort-from-map"
          @click="startPreview"
        />
      </template>
      <template v-else>
        <Button
          type="button"
          size="small"
          :label="t('routes.map.apply')"
          :loading="saving"
          data-testid="apply-sort"
          @click="applyPreview"
        />
        <Button
          type="button"
          size="small"
          severity="secondary"
          :label="t('common.actions.cancel')"
          :disabled="saving"
          @click="preview = null"
        />
      </template>
    </div>

    <p v-if="dayCustomers.length === 0" class="text-xs text-stone-500">{{ t('routes.map.empty') }}</p>

    <div v-if="unlocated.length > 0" class="text-xs text-stone-600" data-testid="no-location">
      <span class="font-semibold">{{ t('routes.map.noLocation') }}:</span>
      {{ unlocated.map((c) => c.customer.name).join(', ') }}
    </div>
    <p class="text-xs text-stone-500">{{ t('routes.map.note') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import BaseMap, { type MapMarker } from '@/components/map/BaseMap.vue'
import { RoutesService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { mergeSlotOrder, nearestNeighbourOrder } from '@/utils/geo'
import { frequencyMatches, maskHas } from '@/utils/visitCycle'
import type { RouteCustomer } from '@/types'
import { translateRouteError } from '../routeErrors'

const props = defineProps<{
  routeId: number
  /** Every customer of the route, in visit order. */
  customers: RouteCustomer[]
  week: number
  bit: number
  allowSunday: boolean
  canWrite: boolean
  toastGroup: string
}>()

const emit = defineEmits<{
  'update:week': [week: number]
  'update:bit': [bit: number]
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

/** The routeCustomerIds in the order sort-from-map proposes, or null when not previewing. */
const preview = ref<number[] | null>(null)
const saving = ref(false)

const weekOptions = [1, 2, 3, 4].map((w) => ({ label: `W${w}`, value: w }))
const ALL_DAYS = -1
const showAll = computed(() => props.bit === ALL_DAYS)
const dayOptions = computed(() => [
  { label: t('routes.map.allDays'), value: ALL_DAYS },
  ...(props.allowSunday ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5]).map((b) => ({
    label: t(`calendar.weekdaysShort.${b}`),
    value: b,
  })),
])

// Cycle customers visited on this weekday of this cycle week, in route order.
// With "All" selected, every customer of the route, whatever its schedule.
const dayCustomers = computed(() =>
  props.customers.filter(
    (c) =>
      showAll.value ||
      c.patternType === 'cycle' &&
      c.daysMask != null &&
      c.frequency != null &&
      maskHas(c.daysMask, props.bit) &&
      frequencyMatches(c.frequency, c.f1Week, props.week),
  ),
)

function coordinates(c: RouteCustomer): { lat: number; lng: number } | null {
  const lat = c.customer.latitude == null ? NaN : Number(c.customer.latitude)
  const lng = c.customer.longitude == null ? NaN : Number(c.customer.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

const located = computed(() => dayCustomers.value.filter((c) => coordinates(c)))
const unlocated = computed(() => dayCustomers.value.filter((c) => !coordinates(c)))

const orderedLocated = computed(() => {
  if (!preview.value) return located.value
  const byId = new Map(located.value.map((c) => [c.routeCustomerId, c]))
  return preview.value.map((id) => byId.get(id)).filter((c): c is RouteCustomer => !!c)
})

const markers = computed<MapMarker[]>(() =>
  orderedLocated.value.map((c, i) => ({
    id: c.routeCustomerId,
    ...coordinates(c)!,
    label: String(i + 1),
    variant: preview.value ? 'preview' : 'primary',
    popup: `${i + 1}. ${c.customer.name}`,
  })),
)

function startPreview() {
  const points = located.value.map((c) => ({ id: c.routeCustomerId, ...coordinates(c)! }))
  const order = nearestNeighbourOrder(points, points[0]?.id)
  preview.value = order
}

async function applyPreview() {
  if (!preview.value) return
  saving.value = true
  try {
    // The proposal orders only the located customers of this day; everyone else keeps their slot.
    const dayOrder = [...preview.value, ...unlocated.value.map((c) => c.routeCustomerId)]
    const fullOrder = mergeSlotOrder(
      props.customers.map((c) => c.routeCustomerId),
      dayOrder,
    )
    await RoutesService.reorderCustomers(props.routeId, fullOrder)
    preview.value = null
    emit('saved')
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    saving.value = false
  }
}

// A different day or week is a different set of customers.
watch(
  () => [props.week, props.bit],
  () => (preview.value = null),
)
</script>
