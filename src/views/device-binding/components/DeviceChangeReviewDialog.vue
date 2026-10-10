<template>
  <Dialog
    :visible="true"
    :header="t('deviceBinding.review.title')"
    modal
    :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
    :style="{ width: '52rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div v-if="isLoading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <template v-else-if="review">
      <p class="mb-4 text-sm text-stone-600" data-testid="review-subtitle">
        <span class="font-semibold text-stone-800">{{ review.employee.name }}</span>
        <span v-if="review.employee.nip"> · {{ review.employee.nip }}</span>
        <span v-if="review.employee.team"> · {{ review.employee.team.name }}</span>
        <span v-if="review.employee.branch"> — {{ review.employee.branch.name }}</span>
        <span v-if="review.requested.requestedAt">
          ·
          {{
            t('deviceBinding.review.submitted', {
              at: dayjs(review.requested.requestedAt).format('DD MMM YYYY HH:mm'),
            })
          }}
        </span>
      </p>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <!-- Current phone -->
        <div class="rounded-lg border border-stone-200 p-3" data-testid="review-current">
          <div class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {{ t('deviceBinding.review.current') }}
          </div>
          <dl v-if="review.current" class="grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1 text-sm">
            <dt class="text-stone-500">{{ t('deviceBinding.review.model') }}</dt>
            <dd :class="diffClass('model')">{{ review.current.model || '—' }}</dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.platformOs') }}</dt>
            <dd :class="diffClass('platform', 'osVersion')">{{ platformLabel(review.current) }}</dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.deviceId') }}</dt>
            <dd v-tooltip.top="review.current.deviceUid" class="font-mono">
              {{ shortUid(review.current.deviceUid) }}
            </dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.loginPhone') }}</dt>
            <dd>{{ review.employee.phone || '—' }}</dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.registered') }}</dt>
            <dd>{{ formatDateTime(review.current.boundAt) }}</dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.lastSync') }}</dt>
            <dd>{{ formatDateTime(review.current.lastSyncAt) }}</dd>
          </dl>
          <p v-else class="text-sm text-stone-500">{{ t('deviceBinding.review.noCurrent') }}</p>
        </div>

        <!-- Requested phone -->
        <div class="rounded-lg border border-amber-300 bg-amber-50 p-3" data-testid="review-new">
          <div class="mb-2 text-xs font-semibold tracking-wide text-amber-700 uppercase">
            {{ t('deviceBinding.review.new') }}
          </div>
          <dl class="grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1 text-sm">
            <dt class="text-stone-500">{{ t('deviceBinding.review.model') }}</dt>
            <dd :class="diffClass('model')">{{ review.requested.model || '—' }}</dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.platformOs') }}</dt>
            <dd :class="diffClass('platform', 'osVersion')">
              {{ platformLabel(review.requested) }}
              <div v-if="differences.has('platform')" class="text-xs">
                {{ t('deviceBinding.review.platformSwitch') }}
              </div>
            </dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.deviceId') }}</dt>
            <dd v-tooltip.top="review.requested.deviceUid" class="font-mono">
              {{ shortUid(review.requested.deviceUid) }}
            </dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.loginPhone') }}</dt>
            <dd>
              {{ review.employee.phone || '—' }}
              <span class="text-green-700">✓ {{ t('deviceBinding.review.same') }}</span>
            </dd>
            <dt class="text-stone-500">{{ t('deviceBinding.review.reason') }}</dt>
            <dd>
              {{
                review.requested.changeReason
                  ? t(`deviceBinding.changeReason.${review.requested.changeReason}`)
                  : '—'
              }}
            </dd>
            <template v-if="review.requested.changeNote">
              <dt class="text-stone-500">{{ t('deviceBinding.review.note') }}</dt>
              <dd class="italic">“{{ review.requested.changeNote }}”</dd>
            </template>
          </dl>
        </div>
      </div>

      <!-- Automatic checks -->
      <ul class="mt-4 flex flex-col gap-1.5 text-sm" data-testid="review-checks">
        <li v-for="check in checks" :key="check.key" class="flex items-start gap-2">
          <i :class="checkIcon(check.severity)" class="mt-0.5" />
          <span :class="check.severity === 'danger' ? 'text-red-700' : ''">
            {{ checkText(check.key, check.ok) }}
          </span>
        </li>
      </ul>

      <Divider />

      <!-- Approval -->
      <Message v-if="!review.approval.flowConfigured" severity="warn" data-testid="review-no-flow">
        {{ t('deviceBinding.review.noFlow') }}
        <RouterLink
          v-if="canReadConfig"
          to="/configs?tab=device-binding"
          class="ml-1 font-semibold underline"
        >
          {{ t('deviceBinding.openConfig') }}
        </RouterLink>
      </Message>
      <Message
        v-else-if="!review.approval.submitted"
        severity="info"
        data-testid="review-not-submitted"
      >
        {{ t('deviceBinding.review.notSubmitted') }}
      </Message>
      <template v-else>
        <ApprovalTimeline
          ref="timelineRef"
          module-key="device_binding"
          :reference-id="deviceId"
          :show-status-header="false"
        />
        <ApprovalActionBar
          module-key="device_binding"
          :reference-id="deviceId"
          :approve-disabled-reason="approveDisabledReason"
          :toast-group="toastGroup"
          @changed="onApprovalChanged"
        />
      </template>
    </template>

    <template #footer>
      <Button
        :label="t('deviceBinding.review.later')"
        severity="secondary"
        @click="emit('close')"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import { DeviceBindingConfigService, DeviceBindingService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import type { ChangeRequestReview, DeviceDifference } from '@/types/deviceBinding.type'
import {
  blockingCheck,
  deviceDifferences,
  platformLabel,
  reviewChecks,
  shortUid,
  type ReviewCheckKey,
  type Severity,
} from '../deviceBindingHelpers'

const props = defineProps<{
  /** The requested phone's id, which is also the approval's reference id. */
  deviceId: number
  toastGroup: string
}>()

const emit = defineEmits<{ close: []; changed: [] }>()

const { t } = useI18n()
const toast = useToast()
const { canRead: canReadConfig } = usePermissions('/device-binding-configs')

const review = ref<ChangeRequestReview>()
const isLoading = ref(true)
const syncOnlyDays = ref<number>()
const timelineRef = ref<InstanceType<typeof ApprovalTimeline>>()

const differences = computed(() =>
  review.value
    ? deviceDifferences(review.value.current, review.value.requested, review.value.differences)
    : new Set<DeviceDifference>(),
)
const checks = computed(() => (review.value ? reviewChecks(review.value) : []))

const approveDisabledReason = computed(() => {
  if (!review.value) return undefined
  const failing = blockingCheck(review.value)
  if (failing === 'notBoundElsewhere') return t('deviceBinding.review.boundElsewhereHint')
  if (failing === 'notBlocked') return t('deviceBinding.review.blockedHint')
  return undefined
})

function diffClass(...fields: DeviceDifference[]): string {
  return fields.some((f) => differences.value.has(f)) ? 'font-semibold text-red-600' : ''
}

function formatDateTime(iso: string | undefined): string {
  return iso ? dayjs(iso).format('DD MMM YYYY HH:mm') : '—'
}

function checkIcon(severity: Severity): string {
  if (severity === 'success') return 'pi pi-check-circle text-green-600'
  if (severity === 'danger') return 'pi pi-times-circle text-red-600'
  return 'pi pi-exclamation-circle text-amber-600'
}

function checkText(key: ReviewCheckKey, ok: boolean): string {
  if (key === 'oldLastSync') {
    const at = formatDateTime(
      review.value?.checks.oldLastSyncAt ?? review.value?.current?.lastSyncAt,
    )
    return syncOnlyDays.value != null
      ? t('deviceBinding.review.checks.oldLastSyncDays', { at, days: syncOnlyDays.value })
      : t('deviceBinding.review.checks.oldLastSync', { at })
  }
  return t(`deviceBinding.review.checks.${key}.${ok ? 'ok' : 'fail'}`)
}

async function load() {
  isLoading.value = true
  try {
    review.value = await DeviceBindingService.getChangeRequest(props.deviceId)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
    emit('close')
  } finally {
    isLoading.value = false
  }
}

async function loadSyncOnlyDays() {
  if (!canReadConfig.value) return
  try {
    syncOnlyDays.value = (await DeviceBindingConfigService.getMyCompany()).syncOnlyDays
  } catch {
    // Only used in the wording of one check.
  }
}

async function onApprovalChanged() {
  await Promise.all([load(), timelineRef.value?.refresh()])
  emit('changed')
}

onMounted(() => {
  load()
  loadSyncOnlyDays()
})
</script>
