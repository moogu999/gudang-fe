<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="reopenFlowId" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('accountingPeriods.fields.reopenFlow')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="reopenFlowId"
            name="reopenFlowId"
            option-label="name"
            option-value="id"
            :fetch-fn="fetchApprovalFlows"
            :initial-option="initialFlow"
            :placeholder="t('accountingPeriods.labels.selectReopenFlow')"
            show-clear
          />
          <small class="text-surface-500">{{
            t('accountingPeriods.helpers.reopenFlowHint')
          }}</small>
          <Message
            v-if="$form.reopenFlowId?.invalid"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ $form.reopenFlowId.error.message }}
          </Message>
        </div>
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
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isLoading"
        />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { AccountingPeriodsService, ApprovalsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { Base } from '@/types/api.type'
import type { AccountingPeriodConfig, ApprovalFlow } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  companyId: {
    type: Number,
    required: true,
  },
  config: {
    type: Object as PropType<AccountingPeriodConfig | null>,
    default: null,
  },
})

const emits = defineEmits(['close'])

const toastGroup = 'accountingPeriodConfigDialog'
const isLoading = ref(false)
const initialFlow = ref<ApprovalFlow | undefined>(undefined)

const initialValues = reactive({
  reopenFlowId: undefined as number | undefined,
})

onBeforeMount(() => {
  if (props.config?.reopenFlowId) {
    initialValues.reopenFlowId = props.config.reopenFlowId
    initialFlow.value = { id: props.config.reopenFlowId, name: '' } as ApprovalFlow
  }
})

async function fetchApprovalFlows(): Promise<Base<ApprovalFlow>> {
  const flows = await ApprovalsService.listFlows('accounting_period_reopen')
  const active = flows.filter((f) => f.isActive)
  return { data: active, meta: { total: active.length, limit: active.length, offset: 0 } }
}

const resolver = computed(() =>
  zodResolver(
    z.object({
      reopenFlowId: z.number().optional(),
    }),
  ),
)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true
  try {
    await AccountingPeriodsService.upsertConfig(
      props.companyId,
      event.states.reopenFlowId.value ?? null,
    )
    toast.add(commonSuccessToast(t('accountingPeriods.messages.configSaved'), toastGroup))
    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
