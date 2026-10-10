<template>
  <template v-if="canWrite">
    <Button
      v-tooltip.top="t('salesTeams.rowActions.duplicate')"
      icon="pi pi-copy"
      severity="secondary"
      text
      rounded
      size="small"
      :aria-label="t('salesTeams.rowActions.duplicate')"
      data-testid="row-duplicate"
      @click="emit('duplicate', team)"
    />
    <!-- A disabled button gets no hover, so the wrapper carries the tooltip. -->
    <span
      v-if="team.isActive"
      v-tooltip.top="
        deactivateBlocked
          ? t('salesTeams.rowActions.deactivateBlocked', { n: team.memberCount })
          : t('salesTeams.rowActions.deactivate')
      "
      class="inline-flex"
    >
      <Button
        icon="pi pi-ban"
        severity="danger"
        text
        rounded
        size="small"
        :disabled="deactivateBlocked"
        :aria-label="t('salesTeams.rowActions.deactivate')"
        data-testid="row-deactivate"
        @click="confirmDeactivate"
      />
    </span>
    <Button
      v-else
      v-tooltip.top="t('salesTeams.rowActions.activate')"
      icon="pi pi-check-circle"
      severity="success"
      text
      rounded
      size="small"
      :aria-label="t('salesTeams.rowActions.activate')"
      data-testid="row-activate"
      @click="activate"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { SalesTeam } from '@/types/salesTeam.type'

const props = defineProps<{
  team: SalesTeam
  canWrite: boolean
  /** Toast group of the page that hosts the actions. */
  toastGroup: string
  /** Group of the one ConfirmDialog the host page renders for all rows. */
  confirmGroup: string
}>()

const emit = defineEmits<{
  changed: []
  duplicate: [team: SalesTeam]
}>()

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()

// A team with members can't be deactivated; say why instead of letting the API refuse.
const deactivateBlocked = computed(() => props.team.memberCount > 0)

function confirmDeactivate() {
  confirm.require({
    group: props.confirmGroup,
    header: t('salesTeams.rowActions.deactivate'),
    message: t('salesTeams.rowActions.confirmDeactivate', { code: props.team.code }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('salesTeams.rowActions.deactivate'), severity: 'danger' },
    accept: deactivate,
  })
}

async function deactivate() {
  try {
    await SalesTeamsService.deactivate(props.team.id)
    toast.add(commonSuccessToast(t('salesTeams.messages.deactivated'), props.toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
}

async function activate() {
  try {
    await SalesTeamsService.activate(props.team.id)
    toast.add(commonSuccessToast(t('salesTeams.messages.activated'), props.toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
}
</script>
