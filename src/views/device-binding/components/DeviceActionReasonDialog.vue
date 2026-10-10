<template>
  <Dialog
    :visible="true"
    :header="t(`deviceBinding.reason.title.${kind}`)"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '30rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-3 text-sm">
      <span class="font-semibold">{{ row.employee.name }}</span>
      <span v-if="row.employee.nip"> · {{ row.employee.nip }}</span>
      <span v-if="deviceLabel" class="text-stone-500"> · {{ deviceLabel }}</span>
    </p>

    <Message :severity="isDestructive ? 'warn' : 'info'" class="mb-4" size="small">
      {{ t(`deviceBinding.reason.warning.${kind}`) }}
    </Message>

    <div class="flex flex-col gap-1">
      <label for="deviceActionReason" class="text-sm font-semibold">
        {{ t('deviceBinding.reason.label') }}
      </label>
      <Textarea
        id="deviceActionReason"
        v-model="reason"
        rows="3"
        autofocus
        class="w-full"
        data-testid="device-action-reason"
        @input="showError = false"
      />
      <small v-if="showError" class="text-red-500">{{ t('deviceBinding.reason.required') }}</small>
    </div>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t(`deviceBinding.reason.confirm.${kind}`)"
        :severity="isDestructive ? 'danger' : undefined"
        :loading="isSaving"
        data-testid="device-action-confirm"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { DeviceBindingService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import ToastLife from '@/constants/toastLife'
import type {
  ActivationCodeView,
  DeviceActionKind,
  DeviceBinding,
} from '@/types/deviceBinding.type'
import { errorMessageKey } from '../deviceBindingHelpers'

const props = defineProps<{
  kind: DeviceActionKind
  row: DeviceBinding
  toastGroup: string
}>()

const emit = defineEmits<{
  close: []
  /** For `reset_pin`, carries the new code so the page can show it straight away. */
  done: [code?: ActivationCodeView]
}>()

const { t } = useI18n()
const toast = useToast()

const reason = ref('')
const showError = ref(false)
const isSaving = ref(false)

const isDestructive = computed(() => props.kind === 'block' || props.kind === 'reset_binding')

/** The phone the action applies to: the bound one, else the one waiting for approval. */
const targetDevice = computed(() => props.row.currentDevice ?? props.row.pendingDevice)
const deviceLabel = computed(() => {
  if (props.kind === 'reset_pin' || props.kind === 'unblock') return ''
  return targetDevice.value?.model ?? ''
})

async function run(text: string): Promise<ActivationCodeView | undefined> {
  const employeeId = props.row.employee.id
  switch (props.kind) {
    case 'reset_pin':
      return DeviceBindingService.resetPin(employeeId, text)
    case 'reset_binding':
      await DeviceBindingService.resetBinding(employeeId, text)
      return undefined
    case 'block':
      await DeviceBindingService.block(employeeId, text, targetDevice.value?.id)
      return undefined
    case 'unblock':
      await DeviceBindingService.unblock(props.row.openBlockId!, text)
      return undefined
  }
}

async function onConfirm() {
  const text = reason.value.trim()
  if (!text) {
    showError.value = true
    return
  }
  isSaving.value = true
  try {
    const code = await run(text)
    toast.add(commonSuccessToast(t(`deviceBinding.reason.success.${props.kind}`), props.toastGroup))
    emit('done', code)
  } catch (e) {
    const key = errorMessageKey(e)
    toast.add(commonErrorToast(key ? t(key) : e, props.toastGroup, ToastLife.FIVE_SECONDS))
  } finally {
    isSaving.value = false
  }
}
</script>
