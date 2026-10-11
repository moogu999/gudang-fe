<template>
  <Dialog
    :visible="true"
    :header="t('displayPrograms.customers.exitTitle', { name: participant.customer.name })"
    modal
    :style="{ width: '26rem' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('displayPrograms.customers.exitDate') }}</label>
      <DatePicker
        v-model="exitDate"
        date-format="yy-mm-dd"
        :min-date="minDate"
        :max-date="maxDate"
        show-icon
        class="w-full"
        data-testid="exit-date"
      />
      <small class="text-surface-500">{{ t('displayPrograms.customers.exitHint') }}</small>
    </div>
    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="saving"
        @click="emit('close')"
      />
      <Button
        :label="t('displayPrograms.customers.exit')"
        severity="contrast"
        :loading="saving"
        :disabled="!exitDate"
        data-testid="exit-confirm"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import type { DisplayParticipant } from '@/types/displayProgram.type'
import { fromApiDate, toApiDate } from '../displayProgramHelpers'

const props = defineProps<{
  participant: DisplayParticipant
  endDate: string
  saving: boolean
}>()

const emit = defineEmits<{ confirm: [exitDate: string]; close: [] }>()

const { t } = useI18n()

// The exit lies between the join date and the end of the period; today when that is allowed.
const minDate = fromApiDate(props.participant.joinDate)
const maxDate = fromApiDate(props.endDate)
const today = dayjs().startOf('day')
const initial = today.isBefore(minDate)
  ? minDate
  : today.isAfter(maxDate)
    ? maxDate
    : today.toDate()
const exitDate = ref<Date | null>(initial)

function onConfirm() {
  if (exitDate.value) emit('confirm', toApiDate(exitDate.value))
}
</script>
