<template>
  <Drawer
    :visible="true"
    position="right"
    class="!w-full md:!w-[28rem]"
    :header="t('deviceBinding.history.title')"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div v-if="isLoading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <template v-else-if="history">
      <p class="mb-4 text-sm text-stone-600" data-testid="history-subtitle">
        <span class="font-semibold text-stone-800">{{ history.employee.name }}</span>
        <span v-if="history.employee.nip"> · {{ history.employee.nip }}</span>
        <span v-if="history.devices.length">
          ·
          {{
            t('deviceBinding.history.subtitle', {
              n: history.devices.length,
              date: formatDate(firstDate),
            })
          }}
        </span>
      </p>

      <p v-if="!history.devices.length" class="text-sm text-stone-500">
        {{ t('deviceBinding.history.empty') }}
      </p>

      <ol class="flex flex-col gap-4">
        <li
          v-for="entry in history.devices"
          :key="entry.device.id"
          class="border-l-2 pl-3"
          :class="entry.device.status === 'active' ? 'border-green-500' : 'border-stone-300'"
          data-testid="history-device"
        >
          <div class="flex flex-wrap items-center gap-2">
            <i :class="entry.device.platform === 'ios' ? 'pi pi-apple' : 'pi pi-android'" />
            <span class="font-semibold">{{ entry.device.model || '—' }}</span>
            <span v-tooltip.top="entry.device.deviceUid" class="font-mono text-xs text-stone-500">
              {{ shortUid(entry.device.deviceUid) }}
            </span>
            <Tag
              :severity="deviceStatusSeverity(entry.device.status)"
              :value="t(`deviceBinding.deviceStatus.${entry.device.status}`)"
              class="text-xs"
            />
          </div>
          <div class="mt-0.5 flex flex-wrap gap-x-2 text-xs text-stone-500">
            <span>{{ periodLine(entry.device) }}</span>
            <RouterLink
              v-if="canReadAudit"
              :to="`/audit-trails?referenceType=employee_device&referenceId=${entry.device.id}`"
              class="text-primary-600 hover:underline"
              data-testid="history-device-audit"
            >
              <i class="pi pi-external-link text-xs" />
              {{ t('deviceBinding.history.openAudit') }}
            </RouterLink>
          </div>

          <div
            v-if="mockDates(entry).length"
            class="mt-1 text-xs text-red-600"
            data-testid="history-mock"
          >
            <i class="pi pi-map-marker text-xs" />
            {{ t('deviceBinding.history.mockDates', { dates: mockDates(entry).join(', ') }) }}
          </div>
          <div v-if="rootedDates(entry).length" class="mt-1 text-xs text-red-600">
            <i class="pi pi-exclamation-triangle text-xs" />
            {{ t('deviceBinding.history.rootedDates', { dates: rootedDates(entry).join(', ') }) }}
          </div>

          <ul v-if="entry.events.length" class="mt-2 flex flex-col gap-1.5">
            <li v-for="(ev, i) in entry.events" :key="i" class="text-sm">
              <EventLine :event="ev" />
            </li>
          </ul>
        </li>
      </ol>

      <template v-if="history.accountEvents.length">
        <Divider />
        <div class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
          {{ t('deviceBinding.history.accountEvents') }}
        </div>
        <ul class="flex flex-col gap-1.5">
          <li v-for="(ev, i) in history.accountEvents" :key="i" class="text-sm">
            <EventLine :event="ev" />
          </li>
        </ul>
      </template>

      <!-- Lockouts and refused sign-ins are logged against the salesman, not a phone. -->
      <div v-if="canReadAudit && hasAccountAudit" class="mt-6">
        <RouterLink
          :to="`/audit-trails?referenceType=nforce_account&referenceId=${employeeId}`"
          class="text-primary-600 text-sm hover:underline"
        >
          <i class="pi pi-external-link mr-1 text-xs" />
          {{ t('deviceBinding.history.openAccountAudit') }}
        </RouterLink>
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'
import Divider from 'primevue/divider'
import Drawer from 'primevue/drawer'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { DeviceBindingService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { PHONE_ACTOR_ACTIONS } from '@/types/auditTrail.type'
import type {
  Device,
  DeviceEvent,
  DeviceHistory,
  DeviceHistoryEntry,
} from '@/types/deviceBinding.type'
import { deviceStatusSeverity, shortUid } from '../deviceBindingHelpers'

const props = defineProps<{
  employeeId: number
  toastGroup: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t, te } = useI18n()
const toast = useToast()
const { canRead: canReadAudit } = usePermissions('/audit-trails')

const history = ref<DeviceHistory>()
const isLoading = ref(true)

const hasAccountAudit = computed(
  () => history.value?.accountEvents.some((e) => e.referenceType === 'nforce_account') ?? false,
)

/** The oldest phone's first appearance; devices come newest first. */
const firstDate = computed(() => {
  const devices = history.value?.devices ?? []
  return devices[devices.length - 1]?.device.createdAt
})

function formatDate(iso: string | undefined): string {
  return iso ? dayjs(iso).format('DD MMM YYYY') : '—'
}

function formatDateTime(iso: string | undefined): string {
  return iso ? dayjs(iso).format('DD MMM YYYY HH:mm') : '—'
}

function periodLine(device: Device): string {
  const from = device.boundAt ?? device.requestedAt ?? device.createdAt
  if (device.status === 'active') {
    return t('deviceBinding.history.activeSince', { date: formatDate(from) })
  }
  if (device.status === 'pending') {
    return t('deviceBinding.history.requestedOn', { date: formatDateTime(device.requestedAt) })
  }
  if (device.status === 'sync_only') {
    return t('deviceBinding.history.syncOnlyUntil', { date: formatDateTime(device.syncOnlyUntil) })
  }
  const to = formatDate(device.releasedAt)
  const reason = device.releaseReason
    ? t(`deviceBinding.history.releaseReason.${device.releaseReason}`)
    : t(`deviceBinding.deviceStatus.${device.status}`)
  return t('deviceBinding.history.period', { from: formatDate(from), to, reason })
}

function flagDates(entry: DeviceHistoryEntry, kind: 'mock_location' | 'rooted'): string[] {
  return entry.flags.filter((f) => f.kind === kind).map((f) => dayjs(f.date).format('DD MMM'))
}
const mockDates = (entry: DeviceHistoryEntry) => flagDates(entry, 'mock_location')
const rootedDates = (entry: DeviceHistoryEntry) => flagDates(entry, 'rooted')

function actorLabel(event: DeviceEvent): string {
  if (event.actorName) return event.actorName
  return PHONE_ACTOR_ACTIONS.has(event.action)
    ? t('deviceBinding.history.byPhone')
    : t('auditTrails.system')
}

/** A change request's reason is stored as its code. */
function reasonLabel(event: DeviceEvent): string {
  const key = `deviceBinding.changeReason.${event.reason}`
  return event.action === 'change_requested' && te(key) ? t(key) : (event.reason ?? '')
}

function actionLabel(action: string): string {
  const key = `auditTrails.actions.${action}`
  return te(key) ? t(key) : action
}

/** One audit event: what happened, by whom, when, and the reason given. */
const EventLine = defineComponent({
  props: { event: { type: Object as PropType<DeviceEvent>, required: true } },
  setup(p) {
    return () =>
      h('div', { class: 'flex flex-col' }, [
        h('div', { class: 'flex flex-wrap gap-x-1' }, [
          h('span', { class: 'font-medium' }, actionLabel(p.event.action)),
          h(
            'span',
            { class: 'text-stone-500' },
            `· ${actorLabel(p.event)} · ${formatDateTime(p.event.at)}`,
          ),
        ]),
        p.event.reason
          ? h('span', { class: 'text-stone-600 italic' }, `“${reasonLabel(p.event)}”`)
          : null,
      ])
  },
})

onMounted(async () => {
  try {
    history.value = await DeviceBindingService.history(props.employeeId)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
    emit('close')
  } finally {
    isLoading.value = false
  }
})
</script>
