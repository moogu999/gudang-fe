<template>
  <div v-if="device" class="flex flex-col gap-0.5">
    <div class="flex items-center gap-1.5">
      <i
        :class="device.platform === 'ios' ? 'pi pi-apple' : 'pi pi-android'"
        class="text-sm"
        :aria-label="device.platform"
      />
      <span class="font-medium">{{ device.model || '—' }}</span>
    </div>
    <div class="flex flex-wrap gap-x-2 text-xs text-stone-500">
      <span>{{ platformLabel(device) }}</span>
      <span v-if="pending && device.previousModel">
        · {{ t('deviceBinding.device.requestedFrom', { model: device.previousModel }) }}
      </span>
    </div>
    <span v-if="osOutdated" class="text-xs text-orange-600">
      {{ t('deviceBinding.device.belowMinOs') }}
    </span>
    <span v-if="mockLocationDays > 0" class="text-xs text-red-600">
      <i class="pi pi-map-marker text-xs" />
      {{ t('deviceBinding.device.mockDetected', { n: mockLocationDays }) }}
    </span>
  </div>
  <span v-else class="text-stone-400">—</span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Device } from '@/types/deviceBinding.type'
import { platformLabel } from '../deviceBindingHelpers'

withDefaults(
  defineProps<{
    device?: Device
    /** The device is a change request, so its sub-line names the phone it replaces. */
    pending?: boolean
    osOutdated?: boolean
    mockLocationDays?: number
  }>(),
  { pending: false, osOutdated: false, mockLocationDays: 0, device: undefined },
)

const { t } = useI18n()
</script>
