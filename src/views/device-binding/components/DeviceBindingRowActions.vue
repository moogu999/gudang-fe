<template>
  <div class="flex flex-nowrap items-center justify-end gap-0.5 md:justify-start">
    <template v-for="action in actions" :key="action.key">
      <Button
        v-if="action.key === 'review'"
        :label="t('deviceBinding.menu.reviewShort')"
        icon="pi pi-check-square"
        size="small"
        severity="warn"
        outlined
        :data-testid="`row-action-${action.key}`"
        @click="action.run"
      />
      <!-- A disabled button gets no hover, so the wrapper carries the tooltip. -->
      <span v-else v-tooltip.top="action.tooltip" class="inline-flex">
        <Button
          :icon="action.icon"
          :severity="action.severity"
          text
          rounded
          size="small"
          :disabled="action.disabled"
          :aria-label="action.tooltip"
          :data-testid="`row-action-${action.key}`"
          @click="action.run"
        />
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import type { DeviceActionKind, DeviceBinding } from '@/types/deviceBinding.type'

const props = defineProps<{
  row: DeviceBinding
  canWrite: boolean
}>()

const emit = defineEmits<{
  'view-code': []
  review: []
  history: []
  action: [kind: DeviceActionKind]
}>()

const { t } = useI18n()

type Severity = 'secondary' | 'danger' | 'success' | 'warn' | 'info'

interface RowAction {
  key: 'view-code' | 'review' | 'history' | DeviceActionKind
  icon: string
  tooltip: string
  severity: Severity
  disabled?: boolean
  run: () => void
}

/** The actions that make sense for the row's state, in the order they show. */
const actions = computed<RowAction[]>(() => {
  const row = props.row
  const list: RowAction[] = []

  if (row.status === 'pending_review' && row.pendingDevice) {
    list.push({
      key: 'review',
      icon: 'pi pi-check-square',
      tooltip: t('deviceBinding.menu.review'),
      severity: 'warn',
      run: () => emit('review'),
    })
  }
  // Viewing a code is audited and may generate one, so it needs write.
  if (props.canWrite && row.canViewCode) {
    list.push({
      key: 'view-code',
      icon: 'pi pi-key',
      tooltip: t('deviceBinding.menu.viewCode'),
      severity: 'secondary',
      run: () => emit('view-code'),
    })
  }
  if (props.canWrite && row.pinSet) {
    list.push({
      key: 'reset_pin',
      icon: 'pi pi-refresh',
      tooltip: t('deviceBinding.menu.resetPin'),
      severity: 'secondary',
      run: () => emit('action', 'reset_pin'),
    })
  }
  list.push({
    key: 'history',
    icon: 'pi pi-history',
    tooltip: t('deviceBinding.menu.history'),
    severity: 'secondary',
    run: () => emit('history'),
  })

  if (!props.canWrite) return list

  if (row.currentDevice) {
    // A request already sent to approval has to be decided first; the API refuses otherwise.
    const blocked = !!row.pendingDevice && row.pendingRequestId != null
    list.push({
      key: 'reset_binding',
      icon: 'pi pi-replay',
      tooltip: blocked
        ? `${t('deviceBinding.menu.resetBinding')} (${t('deviceBinding.menu.resolvePendingFirst')})`
        : t('deviceBinding.menu.resetBinding'),
      severity: 'secondary',
      disabled: blocked,
      run: () => emit('action', 'reset_binding'),
    })
  }
  if (row.currentDevice || row.pendingDevice) {
    list.push({
      key: 'block',
      icon: 'pi pi-ban',
      tooltip: t('deviceBinding.menu.block'),
      severity: 'danger',
      run: () => emit('action', 'block'),
    })
  }
  if (row.status === 'blocked' && row.openBlockId != null) {
    list.push({
      key: 'unblock',
      icon: 'pi pi-unlock',
      tooltip: t('deviceBinding.menu.unblock'),
      severity: 'success',
      run: () => emit('action', 'unblock'),
    })
  }
  return list
})

defineExpose({ actions })
</script>
