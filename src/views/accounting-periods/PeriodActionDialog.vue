<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Message severity="warn" :closable="false" class="mb-4 text-sm">
      <template v-if="action === 'open'">{{
        t('accountingPeriods.warnings.openConsequence', {
          period: period.name,
          n: closedByOpening.length,
        })
      }}</template>
      <template v-else-if="action === 'close' && successor">{{
        t('accountingPeriods.warnings.closeConsequence', {
          period: period.name,
          successor: successor.name,
        })
      }}</template>
      <template v-else-if="action === 'close'">{{
        t('accountingPeriods.warnings.closeLastPeriod', { period: period.name })
      }}</template>
      <template v-else-if="action === 'request-reopen'">{{
        t('accountingPeriods.warnings.reopenConsequence', {
          period: period.name,
          open: openPeriodName,
        })
      }}</template>
      <template v-else-if="action === 'permanent-close'">{{
        t('accountingPeriods.warnings.permanentCloseConsequence', { period: period.name })
      }}</template>
      <template v-else-if="action === 'revert-permanent-close'">{{
        t('accountingPeriods.warnings.revertConsequence', { period: period.name })
      }}</template>
    </Message>

    <ul v-if="action === 'open' && closedByOpening.length > 0" class="mb-4 ml-5 list-disc text-sm">
      <li v-for="p in closedByOpening" :key="p.id">{{ p.name }}</li>
    </ul>

    <div v-if="action === 'revert-permanent-close'" class="mb-4 flex flex-col gap-2">
      <label for="reason" class="text-sm font-semibold sm:text-base">{{
        t('accountingPeriods.fields.reason')
      }}</label>
      <Textarea
        id="reason"
        v-model="reason"
        rows="3"
        class="w-full"
        autocomplete="off"
        :disabled="isLoading"
      />
    </div>

    <div class="mb-4 flex items-center gap-2">
      <Checkbox v-model="confirmed" input-id="confirmCheckbox" binary :disabled="isLoading" />
      <label for="confirmCheckbox" class="text-sm">{{
        t('accountingPeriods.warnings.confirmCheckbox')
      }}</label>
    </div>

    <div class="flex justify-end gap-2">
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isLoading"
        @click="emits('close')"
      />
      <Button
        type="button"
        :label="!isLoading ? t('common.actions.confirm') : ''"
        :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
        :disabled="isLoading || !canConfirm"
        @click="onConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Message from 'primevue/message'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { AccountingPeriodsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { successorOf, periodsClosedByOpening, type PeriodAction } from './periodActions'
import type { AccountingPeriod } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  action: {
    type: String as PropType<PeriodAction>,
    required: true,
  },
  period: {
    type: Object as PropType<AccountingPeriod>,
    required: true,
  },
  timeline: {
    type: Array as PropType<AccountingPeriod[]>,
    required: true,
  },
})

const emits = defineEmits(['close'])

const toastGroup = 'periodActionDialog'
const isLoading = ref(false)
const confirmed = ref(false)
const reason = ref('')

const closedByOpening = computed(() => periodsClosedByOpening(props.period, props.timeline))
const successor = computed(() => successorOf(props.period, props.timeline))
const openPeriodName = computed(() => props.timeline.find((p) => p.status === 'OPEN')?.name ?? '')

const canConfirm = computed(() => {
  if (!confirmed.value) {
    return false
  }
  if (props.action === 'revert-permanent-close') {
    return reason.value.trim().length > 0
  }
  return true
})

async function onConfirm() {
  if (!canConfirm.value) {
    return
  }

  isLoading.value = true
  try {
    switch (props.action) {
      case 'open':
        await AccountingPeriodsService.open(props.period.id)
        toast.add(commonSuccessToast(t('accountingPeriods.messages.opened'), toastGroup))
        break
      case 'close':
        await AccountingPeriodsService.close(props.period.id)
        toast.add(commonSuccessToast(t('accountingPeriods.messages.closed'), toastGroup))
        break
      case 'request-reopen':
        await AccountingPeriodsService.requestReopen(props.period.id)
        toast.add(commonSuccessToast(t('accountingPeriods.messages.reopenRequested'), toastGroup))
        break
      case 'permanent-close':
        await AccountingPeriodsService.permanentClose(props.period.id)
        toast.add(commonSuccessToast(t('accountingPeriods.messages.permanentlyClosed'), toastGroup))
        break
      case 'revert-permanent-close':
        await AccountingPeriodsService.revertPermanentClose(props.period.id, reason.value.trim())
        toast.add(commonSuccessToast(t('accountingPeriods.messages.reverted'), toastGroup))
        break
    }
    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
