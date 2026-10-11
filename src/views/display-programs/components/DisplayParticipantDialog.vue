<template>
  <Dialog
    :visible="true"
    :header="t('displayPrograms.customers.editTitle', { name: participant.customer.name })"
    modal
    :style="{ width: '28rem' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('displayPrograms.customers.joinDate') }}</label>
        <DatePicker
          v-model="joinDate"
          date-format="yy-mm-dd"
          :min-date="minDate"
          :max-date="maxDate"
          show-icon
          class="w-full"
          data-testid="participant-join"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{
          t('displayPrograms.customers.rentOverride')
        }}</label>
        <InputNumber
          v-model="rentOverride"
          mode="decimal"
          locale="id-ID"
          prefix="Rp "
          :min="0"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          show-clear
          input-class="w-full"
          class="w-full"
          data-testid="participant-rent"
        />
        <small class="text-surface-500">{{
          t('displayPrograms.customers.rentOverrideHint')
        }}</small>
      </div>
    </div>
    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="saving"
        @click="emit('close')"
      />
      <Button
        :label="t('common.actions.save')"
        :loading="saving"
        :disabled="!joinDate"
        data-testid="participant-save"
        @click="onSave"
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
import InputNumber from 'primevue/inputnumber'
import type { DisplayParticipant } from '@/types/displayProgram.type'
import { fromApiDate, inputToDecimal, rentToInput, toApiDate } from '../displayProgramHelpers'

const props = defineProps<{
  participant: DisplayParticipant
  startDate: string
  endDate: string
  saving: boolean
}>()

const emit = defineEmits<{
  save: [body: { joinDate: string; rentOverride?: string }]
  close: []
}>()

const { t } = useI18n()

const joinDate = ref<Date | null>(fromApiDate(props.participant.joinDate))
const rentOverride = ref<number | null>(rentToInput(props.participant.rentOverride))
const minDate = fromApiDate(props.startDate)
const maxDate = fromApiDate(props.participant.exitDate ?? props.endDate)

function onSave() {
  if (!joinDate.value) return
  const rent = inputToDecimal(rentOverride.value)
  emit('save', {
    joinDate: toApiDate(joinDate.value),
    ...(rent !== undefined ? { rentOverride: rent } : {}),
  })
}
</script>
