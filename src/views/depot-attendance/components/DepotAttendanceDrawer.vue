<template>
  <Drawer
    :visible="true"
    position="right"
    class="!w-full md:!w-[32rem]"
    :header="t('depotAttendance.drawer.title')"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div v-if="isLoading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <template v-else-if="detail">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="font-semibold">{{ detail.employee.name }}</span>
        <span v-if="detail.employee.nip" class="text-sm text-stone-500">{{
          detail.employee.nip
        }}</span>
        <Tag
          :severity="statusSeverity(record.status)"
          :value="t(`depotAttendance.status.${record.status}`)"
          data-testid="drawer-status"
        />
      </div>

      <!-- Selfie -->
      <div class="mb-4">
        <Image
          v-if="detail.selfieUrl"
          :src="buildFileUrl(detail.selfieUrl)"
          preview
          image-class="max-h-80 w-full rounded-md object-contain bg-stone-100"
          data-testid="drawer-selfie"
        />
        <p v-else class="rounded-md bg-stone-100 p-4 text-sm text-stone-500">
          {{ t('depotAttendance.drawer.noSelfie') }}
        </p>
      </div>

      <!-- Map: the depot, its radius and where the salesman clocked in -->
      <div class="mb-4">
        <div v-if="hasMap" class="h-64" data-testid="drawer-map">
          <BaseMap :markers="markers" :circles="circles" />
        </div>
        <p v-else class="text-sm text-stone-500" data-testid="drawer-no-map">
          {{ noMapText }}
        </p>
      </div>

      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.date') }}</dt>
        <dd>{{ dayjs(record.date).format('DD MMM YYYY') }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.team') }}</dt>
        <dd>{{ detail.team?.name ?? '—' }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.depot') }}</dt>
        <dd>{{ detail.branch.name }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.capturedAt') }}</dt>
        <dd>{{ formatDateTime(record.capturedAt) }} WIB</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.receivedAt') }}</dt>
        <dd>{{ formatDateTime(record.receivedAt) }} WIB</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.distance') }}</dt>
        <dd>{{ distanceText(record.distanceM, record.radiusM) }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.accuracy') }}</dt>
        <dd>{{ record.accuracyM != null ? `${Math.round(record.accuracyM)} m` : '—' }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.rule') }}</dt>
        <dd>{{ t(`depotAttendance.level.${record.ruleLevel}`) }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.reason') }}</dt>
        <dd>{{ detail.reason ? `${detail.reason.code} · ${detail.reason.name}` : '—' }}</dd>
        <dt class="text-stone-500">{{ t('depotAttendance.drawer.note') }}</dt>
        <dd class="break-words whitespace-pre-wrap">{{ record.note || '—' }}</dd>
      </dl>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Drawer from 'primevue/drawer'
import Image from 'primevue/image'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import BaseMap, { type MapMarker } from '@/components/map/BaseMap.vue'
import type { MapCircle } from '@/components/map/mapGeometry'
import { DepotAttendanceService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { buildFileUrl } from '@/utils/fileUrl'
import type { DepotAttendanceDetail } from '@/types/depotAttendance.type'
import { distanceText, formatDateTime, statusSeverity } from '../depotAttendanceHelpers'

const props = defineProps<{ attendanceId: number; toastGroup: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()

const isLoading = ref(true)
const detail = ref<DepotAttendanceDetail>()

const record = computed(() => detail.value!.attendance)

const depot = computed(() => {
  const r = detail.value?.attendance
  return r?.depotLatitude != null && r.depotLongitude != null
    ? { lat: r.depotLatitude, lng: r.depotLongitude }
    : undefined
})

const spot = computed(() => {
  const r = detail.value?.attendance
  return r?.latitude != null && r.longitude != null
    ? { lat: r.latitude, lng: r.longitude }
    : undefined
})

const hasMap = computed(() => !!depot.value || !!spot.value)

const markers = computed<MapMarker[]>(() => {
  const list: MapMarker[] = []
  if (depot.value) {
    list.push({ id: 1, ...depot.value, variant: 'muted', popup: t('depotAttendance.drawer.depot') })
  }
  if (spot.value) {
    list.push({
      id: 2,
      ...spot.value,
      variant: record.value.withinRadius === false ? 'pin' : 'primary',
      popup: t('depotAttendance.drawer.clockedInHere'),
    })
  }
  return list
})

const circles = computed<MapCircle[]>(() =>
  depot.value && record.value.radiusM
    ? [{ id: 1, ...depot.value, radiusM: record.value.radiusM }]
    : [],
)

/** Says what is missing: no depot point on the branch, or a fix that never arrived. */
const noMapText = computed(() =>
  depot.value || !detail.value
    ? t('depotAttendance.drawer.noLocation')
    : t('depotAttendance.drawer.noDepotPoint'),
)

onMounted(async () => {
  try {
    detail.value = await DepotAttendanceService.get(props.attendanceId)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
    emit('close')
  } finally {
    isLoading.value = false
  }
})
</script>
