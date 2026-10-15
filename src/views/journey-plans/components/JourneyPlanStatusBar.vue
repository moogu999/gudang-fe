<template>
  <div class="mb-4 flex flex-col gap-2" data-testid="plan-status">
    <Message
      v-if="status && !status.hasEverRun"
      severity="info"
      data-testid="never-run"
    >
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ t('journeyPlans.status.neverRun') }}</span>
        <Button
          v-if="canWrite"
          :label="t('journeyPlans.status.generateNow')"
          size="small"
          :loading="busy"
          @click="emit('regenerate')"
        />
      </div>
    </Message>

    <Message v-if="status?.lastNightly?.error" severity="error" data-testid="nightly-error">
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ t('journeyPlans.status.nightlyFailed', { error: status.lastNightly.error }) }}</span>
        <Button
          v-if="canWrite"
          :label="t('journeyPlans.regenerate')"
          size="small"
          :loading="busy"
          @click="emit('regenerate')"
        />
      </div>
    </Message>

    <div
      v-if="status"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-600"
    >
      <span v-if="status.lastNightly && !status.lastNightly.error">
        {{ t('journeyPlans.status.generated', { time: timeOf(status.lastNightly.startedAt) }) }}
      </span>
      <span v-if="status.availableUntil">
        {{
          t('journeyPlans.status.availableUntil', {
            date: status.availableUntil,
            days: status.horizonDays,
          })
        }}
      </span>
      <span>{{ t('journeyPlans.status.todayLocked') }}</span>
      <span v-if="status.lastRun" class="ml-auto">
        {{
          t('journeyPlans.status.lastRun', {
            time: timeOf(status.lastRun.startedAt),
            trigger: t(`journeyPlans.triggers.${status.lastRun.trigger}`),
          })
        }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { JourneyPlanStatus } from '@/types'

defineProps<{
  status: JourneyPlanStatus | null
  canWrite: boolean
  busy: boolean
}>()
const emit = defineEmits<{ regenerate: [] }>()

const { t } = useI18n()

function timeOf(iso: string): string {
  return dayjs(iso).format('HH:mm')
}
</script>
