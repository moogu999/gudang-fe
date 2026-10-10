<template>
  <Dialog
    :visible="true"
    :header="t('deviceBinding.code.title')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '32rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-3 text-sm">
      <span class="font-semibold">{{ row.employee.name }}</span>
      <span v-if="row.employee.nip"> · {{ row.employee.nip }}</span>
      <span v-if="row.employee.phone"> · {{ row.employee.phone }}</span>
    </p>

    <div v-if="isLoading" class="flex justify-center py-6">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <Message v-else-if="noCode" severity="info" data-testid="activation-no-code">
      {{ t('deviceBinding.code.noCode') }}
    </Message>

    <template v-else-if="view">
      <div class="rounded-lg border border-stone-200 bg-stone-50 p-4 text-center">
        <div class="mb-1 text-xs tracking-wide text-stone-500 uppercase">
          {{
            view.purpose === 'reset_pin'
              ? t('deviceBinding.code.forResetPin')
              : t('deviceBinding.code.forFirstLogin')
          }}
        </div>
        <div class="font-mono text-3xl font-semibold tracking-widest" data-testid="activation-code">
          {{ formatCode(view.code) }}
        </div>
        <div class="mt-2 text-xs text-stone-500">{{ metaLine }}</div>
      </div>

      <p class="mt-3 text-sm text-stone-600">
        {{ t('deviceBinding.code.info', { phone: view.phone }) }}
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <Button
          :label="copied ? t('deviceBinding.code.copied') : t('deviceBinding.code.copy')"
          icon="pi pi-copy"
          size="small"
          severity="secondary"
          outlined
          :disabled="!isSupported"
          @click="onCopy"
        />
        <a
          :href="waLink"
          target="_blank"
          rel="noopener noreferrer"
          class="p-button p-button-sm p-button-outlined p-button-success inline-flex items-center gap-2 no-underline"
        >
          <i class="pi pi-whatsapp" />
          <span>{{ t('deviceBinding.code.shareWa') }}</span>
        </a>
      </div>

      <Divider />

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{{ t('deviceBinding.code.sendVia') }}</span>
        <div v-for="channel in CHANNELS" :key="channel" class="flex items-start gap-2">
          <Checkbox
            v-model="selected"
            :input-id="`send-${channel}`"
            :value="channel"
            :disabled="!view.channels[channel]?.enabled"
          />
          <label :for="`send-${channel}`" class="flex flex-col text-sm">
            <span>
              <i :class="channel === 'email' ? 'pi pi-envelope' : 'pi pi-whatsapp'" class="mr-1" />
              {{ t(`deviceBinding.channel.${channel}`) }}
              <span v-if="view.channels[channel]?.address" class="text-stone-500">
                · {{ view.channels[channel]?.address }}
              </span>
            </span>
            <small v-if="!view.channels[channel]?.enabled" class="text-stone-500">
              {{ disabledReason(channel) }}
            </small>
          </label>
        </div>
        <div>
          <Button
            :label="t('deviceBinding.code.send')"
            icon="pi pi-send"
            size="small"
            :disabled="selected.length === 0"
            :loading="isSending"
            data-testid="activation-send"
            @click="onSend"
          />
        </div>
      </div>

      <div v-if="view.deliveries.length" class="mt-4">
        <span class="text-sm font-semibold">{{ t('deviceBinding.code.deliveries') }}</span>
        <ul class="mt-1 flex flex-col gap-1">
          <li
            v-for="d in view.deliveries"
            :key="d.id"
            class="flex items-center gap-2 text-sm"
            data-testid="activation-delivery"
          >
            <i :class="d.channel === 'email' ? 'pi pi-envelope' : 'pi pi-whatsapp'" />
            <span v-tooltip.top="d.lastError" class="inline-flex">
              <Tag :severity="deliverySeverity(d.status)">
                <i v-if="isDeliveryInFlight(d.status)" class="pi pi-spinner pi-spin mr-1 text-xs" />
                {{ t(`deviceBinding.delivery.${d.status}`) }}
              </Tag>
            </span>
            <span class="text-xs text-stone-500">
              {{ dayjs(d.sentAt ?? d.createdAt).format('DD MMM HH:mm') }}
            </span>
            <span v-if="d.status === 'failed' && d.lastError" class="truncate text-xs text-red-600">
              {{ d.lastError }}
            </span>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <Button :label="t('common.actions.close')" severity="secondary" @click="emit('close')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useClipboard } from '@vueuse/core'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { DeviceBindingService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { ApiError } from '@/types/api.type'
import type {
  ActivationCodeView,
  DeviceBinding,
  NotificationChannel,
} from '@/types/deviceBinding.type'
import { deliverySeverity, formatCode, isDeliveryInFlight, waMeLink } from '../deviceBindingHelpers'

const props = defineProps<{
  row: DeviceBinding
  /** A code the page already has (from Reset PIN); fetched otherwise. */
  initial?: ActivationCodeView
  toastGroup: string
}>()

const emit = defineEmits<{ close: [] }>()

const CHANNELS: NotificationChannel[] = ['whatsapp', 'email']
const POLL_EVERY_MS = 3000
const POLL_FOR_MS = 30000

const { t } = useI18n()
const toast = useToast()
const { copy, copied, isSupported } = useClipboard({ legacy: true })

const view = ref<ActivationCodeView | undefined>(props.initial)
const isLoading = ref(!props.initial)
const noCode = ref(false)
const selected = ref<NotificationChannel[]>([])
const isSending = ref(false)

const metaLine = computed(() => {
  const v = view.value
  if (!v) return ''
  const parts: string[] = []
  if (v.createdAt) {
    const at = dayjs(v.createdAt).format('DD MMM YYYY HH:mm')
    parts.push(
      v.createdByName
        ? t('deviceBinding.code.generatedBy', { name: v.createdByName, at })
        : t('deviceBinding.code.generatedBySystem', { at }),
    )
  }
  if (v.expiresAt) {
    parts.push(
      t('deviceBinding.code.validUntil', { date: dayjs(v.expiresAt).format('DD MMM YYYY HH:mm') }),
    )
  }
  parts.push(t('deviceBinding.code.singleUse'))
  return parts.join(' · ')
})

const waLink = computed(() =>
  waMeLink(
    view.value?.phone,
    t('deviceBinding.code.waMessage', {
      name: props.row.employee.name,
      code: formatCode(view.value?.code),
    }),
  ),
)

function disabledReason(channel: NotificationChannel): string {
  const option = view.value?.channels[channel]
  if (!option?.address) {
    return channel === 'email' ? t('deviceBinding.code.noEmail') : t('deviceBinding.code.noPhone')
  }
  return t('deviceBinding.code.providerDisabled')
}

async function onCopy() {
  if (!view.value?.code) return
  await copy(view.value.code)
  toast.add(commonSuccessToast(t('deviceBinding.code.copied'), props.toastGroup))
}

async function load() {
  isLoading.value = true
  try {
    view.value = await DeviceBindingService.getActivationCode(props.row.employee.id)
  } catch (e) {
    if (e instanceof ApiError && e.code === 'no_code') noCode.value = true
    else toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Delivery polling: without the code, so it writes no audit entry.
// ---------------------------------------------------------------------------

let pollTimer: ReturnType<typeof setInterval> | undefined
let pollStartedAt = 0

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = undefined
}

async function pollOnce() {
  if (Date.now() - pollStartedAt > POLL_FOR_MS) return stopPolling()
  try {
    const status = await DeviceBindingService.getActivationCode(props.row.employee.id, false)
    if (view.value) {
      view.value = { ...view.value, deliveries: status.deliveries, channels: status.channels }
    }
    if (!status.deliveries.some((d) => isDeliveryInFlight(d.status))) stopPolling()
  } catch {
    stopPolling()
  }
}

function startPolling() {
  stopPolling()
  pollStartedAt = Date.now()
  pollTimer = setInterval(pollOnce, POLL_EVERY_MS)
}

async function onSend() {
  if (!view.value || selected.value.length === 0) return
  isSending.value = true
  try {
    const sent = await DeviceBindingService.sendActivationCode(
      props.row.employee.id,
      selected.value,
    )
    const sentIds = new Set(sent.map((d) => d.id))
    view.value = {
      ...view.value,
      deliveries: [...sent, ...view.value.deliveries.filter((d) => !sentIds.has(d.id))],
    }
    selected.value = []
    toast.add(commonSuccessToast(t('deviceBinding.code.queued'), props.toastGroup))
    if (sent.some((d) => isDeliveryInFlight(d.status))) startPolling()
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isSending.value = false
  }
}

onMounted(() => {
  if (!props.initial) load()
})

onBeforeUnmount(stopPolling)
</script>
