<template>
  <Dialog
    :visible="true"
    :header="t('salesTeams.endMember.title')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '28rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-4 text-sm">
      {{ member.employee.name }}<span v-if="member.employee.nip"> · {{ member.employee.nip }}</span>
    </p>
    <div class="flex flex-col gap-1">
      <label for="endDate" class="text-sm font-semibold">{{
        t('salesTeams.endMember.endDate')
      }}</label>
      <DatePicker
        v-model="endDate"
        input-id="endDate"
        :min-date="minDate"
        :max-date="maxDate"
        date-format="yy-mm-dd"
        show-icon
        fluid
        class="w-full"
      />
      <small class="text-stone-500">{{ t('salesTeams.endMember.hint') }}</small>
    </div>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t('salesTeams.endMember.confirm')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="!endDate || isSaving"
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
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { SalesTeamMember } from '@/types/salesTeam.type'
import { fromApiDate, toApiDate, today } from '../salesTeamHelpers'

const props = defineProps<{
  teamId: number
  member: SalesTeamMember
  toastGroup: string
}>()

const emit = defineEmits<{ close: []; ended: [] }>()

const { t } = useI18n()
const toast = useToast()

// Inclusive, between the start date and today.
const minDate = fromApiDate(props.member.startDate)
const maxDate = today()
const endDate = ref<Date | null>(today())
const isSaving = ref(false)

async function onConfirm() {
  if (!endDate.value) return
  isSaving.value = true
  try {
    await SalesTeamsService.endMember(
      props.teamId,
      props.member.membershipId,
      toApiDate(endDate.value),
    )
    toast.add(commonSuccessToast(t('salesTeams.messages.memberEnded'), props.toastGroup))
    emit('ended')
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isSaving.value = false
  }
}
</script>
