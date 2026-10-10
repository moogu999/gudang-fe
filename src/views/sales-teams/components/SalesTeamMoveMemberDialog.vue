<template>
  <Dialog
    :visible="true"
    :header="t('salesTeams.move.title')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '36rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-4 text-sm text-stone-600">
      {{ candidate.employee.name
      }}<span v-if="candidate.employee.nip"> · {{ candidate.employee.nip }}</span>
    </p>

    <div class="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div class="flex-1 rounded-md border p-3" data-testid="current-team">
        <div class="text-xs text-stone-500 uppercase">{{ t('salesTeams.move.currentTeam') }}</div>
        <div class="font-mono font-semibold">{{ candidate.currentTeam?.code }}</div>
        <div class="text-sm">{{ candidate.currentTeam?.name }}</div>
        <div class="text-xs text-stone-500">
          {{ t('salesTeams.move.skus', { n: candidate.currentTeam?.skuCount ?? 0 }) }}
        </div>
      </div>
      <i class="pi pi-arrow-right self-center text-stone-400 max-sm:rotate-90" />
      <div class="border-primary-300 flex-1 rounded-md border p-3" data-testid="new-team">
        <div class="text-xs text-stone-500 uppercase">{{ t('salesTeams.move.newTeam') }}</div>
        <div class="font-mono font-semibold">{{ team.code }}</div>
        <div class="text-sm">{{ team.name }}</div>
        <div class="text-xs text-stone-500">
          {{ t('salesTeams.move.skus', { n: team.skuCount }) }}
        </div>
      </div>
    </div>

    <div class="mb-3 flex flex-col gap-1">
      <label for="moveEffectiveDate" class="text-sm font-semibold">{{
        t('salesTeams.move.effectiveDate')
      }}</label>
      <DatePicker
        v-model="effectiveDate"
        input-id="moveEffectiveDate"
        :min-date="minDate"
        :max-date="maxDate"
        date-format="yy-mm-dd"
        show-icon
        fluid
        class="w-full"
      />
    </div>

    <Message severity="info" size="small" variant="simple">{{ t('salesTeams.move.note') }}</Message>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t('salesTeams.move.confirm')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="!effectiveDate || isSaving"
        data-testid="confirm-move"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { MemberCandidate, SalesTeam } from '@/types/salesTeam.type'
import { fromApiDate, toApiDate, today } from '../salesTeamHelpers'

const props = defineProps<{
  team: Pick<SalesTeam, 'id' | 'code' | 'name' | 'skuCount'>
  candidate: MemberCandidate
  /** Carried over from the add dialog. */
  initialDate: Date
  toastGroup: string
}>()

const emit = defineEmits<{ close: []; moved: [] }>()

const { t } = useI18n()
const toast = useToast()

// The old membership ends the day before the move, so the move can't start before it did.
// Starting on the same day is a correction: the API deletes the mistaken membership instead.
const currentStart = props.candidate.currentTeam?.startDate
const minDate = currentStart ? fromApiDate(currentStart) : undefined
const maxDate = today()
const effectiveDate = ref<Date | null>(props.initialDate)
const isSaving = ref(false)

async function onConfirm() {
  if (!effectiveDate.value) return
  isSaving.value = true
  try {
    await SalesTeamsService.addMember(props.team.id, {
      employeeId: props.candidate.employee.id,
      startDate: toApiDate(effectiveDate.value),
      move: true,
    })
    toast.add(
      commonSuccessToast(
        t('salesTeams.messages.memberMoved', { name: props.candidate.employee.name }),
        props.toastGroup,
      ),
    )
    emit('moved')
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isSaving.value = false
  }
}
</script>
