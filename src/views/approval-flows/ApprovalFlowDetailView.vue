<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
        <h1 class="text-base font-bold sm:text-lg md:text-2xl">
          {{ mode === 'edit' ? t('approvalFlows.editFlow') : t('approvalFlows.viewFlow') }}
        </h1>
      </div>
      <ResponsiveButton
        v-if="mode === 'view' && canWrite"
        :label="t('common.actions.edit')"
        @click="router.push(`/approval-flows/${id}/edit`)"
      />
    </div>

    <div v-if="isLoading" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>

    <ApprovalFlowForm
      v-else-if="flow"
      :mode="mode"
      :flow="flow"
      :is-loading="isSaving"
      @submit="onSubmit"
      @cancel="router.back()"
    />
    <Message v-else severity="error">{{ t('approvalFlows.messages.notFound') }}</Message>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ApprovalFlowForm from './ApprovalFlowForm.vue'
import { ApprovalsService } from '@/services/approvals.service'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import type { ApprovalFlow, UpdateApprovalFlowDto } from '@/types/approval.type'

const props = defineProps<{
  mode: 'view' | 'edit'
  id: number
}>()

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const toastGroup = 'approvalFlowDetail'
const { canWrite } = usePermissions('/approval-flows')

const isLoading = ref(false)
const isSaving = ref(false)
const flow = ref<ApprovalFlow | null>(null)

async function loadFlow() {
  isLoading.value = true
  try {
    flow.value = await ApprovalsService.getFlow(props.id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    flow.value = null
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(dto: UpdateApprovalFlowDto) {
  isSaving.value = true
  try {
    await ApprovalsService.updateFlow(props.id, dto)
    toast.add(commonSuccessToast(t('approvalFlows.messages.updated'), toastGroup))
    router.push(`/approval-flows/${props.id}`)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

onMounted(loadFlow)
</script>
