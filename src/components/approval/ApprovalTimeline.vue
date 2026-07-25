<template>
  <div v-if="isLoading" class="flex justify-center py-4">
    <ProgressSpinner style="width: 2rem; height: 2rem" />
  </div>

  <div v-else-if="!request" class="text-surface-500 text-sm">
    {{ t('approvals.timeline.none') }}
  </div>

  <div v-else>
    <div v-if="showStatusHeader" class="mb-3 flex items-center gap-2">
      <Tag
        :severity="statusSeverity(request.status)"
        :value="t(`approvals.status.${request.status}`)"
      />
      <span class="text-surface-500 text-sm"
        >{{ request.moduleKey }} #{{ request.referenceId }}</span
      >
    </div>

    <Timeline :value="request.tiers" align="left">
      <template #marker="{ item }">
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full text-white"
          :class="tierMarkerClass(item.status)"
        >
          <i :class="tierMarkerIcon(item.status)" />
        </span>
      </template>
      <template #content="{ item }">
        <div class="pb-4">
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ item.name }}</span>
            <Tag
              :severity="statusSeverity(item.status)"
              :value="t(`approvals.tierStatus.${item.status}`)"
              class="text-xs"
            />
          </div>
          <div class="text-surface-500 mt-1 text-sm">
            {{ t('approvals.timeline.approverPool', { names: approverNames(item) }) }}
          </div>
          <div v-if="item.actedAt" class="text-surface-500 mt-1 text-xs">
            {{ t('approvals.timeline.actedAt', { date: formatDate(item.actedAt) }) }}
          </div>
          <div v-if="item.comment" class="mt-1 text-sm italic">"{{ item.comment }}"</div>
        </div>
      </template>
    </Timeline>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Timeline from 'primevue/timeline'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import { useApproval } from '@/composables/useApproval'
import type { ApprovalStatus, ApprovalTierStatus, ApprovalRequestTier } from '@/types/approval.type'
import DateFormat from '@/constants/dateFormat'

const props = withDefaults(
  defineProps<{
    moduleKey: string
    referenceId: number
    /** Show the request's own status tag + module/reference line above the timeline. */
    showStatusHeader?: boolean
  }>(),
  { showStatusHeader: true },
)

const { t } = useI18n()

const { request, isLoading, refresh } = useApproval(props.moduleKey, props.referenceId)

function statusSeverity(status: ApprovalStatus | ApprovalTierStatus) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'cancelled') return 'secondary'
  return 'warn'
}

function tierMarkerClass(status: ApprovalTierStatus) {
  if (status === 'approved') return 'bg-green-500'
  if (status === 'rejected') return 'bg-red-500'
  return 'bg-surface-400'
}

function tierMarkerIcon(status: ApprovalTierStatus) {
  if (status === 'approved') return 'pi pi-check'
  if (status === 'rejected') return 'pi pi-times'
  return 'pi pi-clock'
}

function formatDate(value: string) {
  return dayjs(value).format(DateFormat.DATE_TIME)
}

function approverNames(tier: ApprovalRequestTier): string {
  return tier.approvers.map((a) => a.employeeName).join(', ')
}

onMounted(refresh)

defineExpose({ refresh, request })
</script>
