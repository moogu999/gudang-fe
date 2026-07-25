<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('approvalFlows.addFlow') }}
      </h1>
    </div>

    <ApprovalFlowForm
      mode="create"
      :is-loading="isSaving"
      @submit="onSubmit"
      @cancel="router.back()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import ApprovalFlowForm from './ApprovalFlowForm.vue'
import { ApprovalsService } from '@/services/approvals.service'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { CreateApprovalFlowDto } from '@/types/approval.type'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const toastGroup = 'approvalFlowCreate'

const isSaving = ref(false)

async function onSubmit(dto: CreateApprovalFlowDto) {
  isSaving.value = true
  try {
    const flow = await ApprovalsService.createFlow(dto)
    toast.add(commonSuccessToast(t('approvalFlows.messages.created'), toastGroup))
    router.push(`/approval-flows/${flow.id}`)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}
</script>
