<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <!-- Branch -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="branchId" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('purchaseOrderConfigs.fields.branch') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            id="branchId"
            name="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            :placeholder="t('purchaseOrderConfigs.labels.selectBranch')"
            sort-by="name"
            sort-operator="asc"
          />
          <InputText v-else :value="props.config?.branchName" disabled class="w-full" />
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">
            {{ $form.branchId.error.message }}
          </Message>
        </div>
      </div>

      <!-- Approval Flow -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="approvalFlowId" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('purchaseOrderConfigs.fields.approvalFlow') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="approvalFlowId"
            name="approvalFlowId"
            option-label="name"
            option-value="id"
            :fetch-fn="fetchApprovalFlows"
            :initial-option="initialApprovalFlow"
            :placeholder="t('purchaseOrderConfigs.labels.noApprovalRequired')"
            show-clear
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <small class="text-surface-500">{{
            t('purchaseOrderConfigs.labels.approvalFlowHint')
          }}</small>
          <Message
            v-if="$form.approvalFlowId?.invalid"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ $form.approvalFlowId.error.message }}
          </Message>
        </div>
      </div>

      <div v-if="mode !== DialogMode.VIEW" class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emit('close')"
        />
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isLoading"
        />
      </div>
      <div v-else class="flex justify-end gap-2">
        <Button type="button" :label="t('common.actions.close')" @click="emit('close')" />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DialogMode from '@/constants/dialogMode'
import { BranchesService, PurchaseOrderConfigService, ApprovalsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { Base } from '@/types/api.type'
import type { PurchaseOrderConfig, ApprovalFlow } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  config: {
    type: Object as PropType<PurchaseOrderConfig>,
    default: undefined,
  },
})

const emit = defineEmits(['close'])

const toastGroup = 'purchaseOrderConfigDialog'
const isLoading = ref(false)
const initialApprovalFlow = ref<ApprovalFlow | undefined>()

const initialValues = reactive({
  branchId: undefined as number | undefined,
  approvalFlowId: undefined as number | undefined,
})

async function fetchApprovalFlows(): Promise<Base<ApprovalFlow>> {
  const flows = await ApprovalsService.listFlows('purchase_order')
  const active = flows.filter((f) => f.isActive)
  return { data: active, meta: { total: active.length, limit: active.length, offset: 0 } }
}

onBeforeMount(() => {
  if ((props.mode === DialogMode.EDIT || props.mode === DialogMode.VIEW) && props.config) {
    if (props.config.approvalFlowId) {
      initialValues.approvalFlowId = props.config.approvalFlowId
      initialApprovalFlow.value = { id: props.config.approvalFlowId, name: '' } as ApprovalFlow
    }
  }
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      branchId:
        props.mode === DialogMode.ADD
          ? z.number({ message: t('purchaseOrderConfigs.validation.branchRequired') })
          : z.number().optional(),
      approvalFlowId: z.number().optional(),
    }),
  ),
)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  const branchId =
    props.mode === DialogMode.ADD ? event.states.branchId.value : props.config!.branchId

  isLoading.value = true
  try {
    await PurchaseOrderConfigService.upsert(branchId, {
      approvalFlowId: event.states.approvalFlowId.value ?? null,
    })

    const message =
      props.mode === DialogMode.ADD
        ? t('purchaseOrderConfigs.messages.created')
        : t('purchaseOrderConfigs.messages.updated')

    toast.add(commonSuccessToast(message, toastGroup))
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
