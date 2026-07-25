<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('myApprovals.title') }}
    </h1>

    <Message v-if="!isLoading && !hasEmployeeLink" severity="warn" class="mb-5">
      {{ t('myApprovals.noEmployeeLink') }}
    </Message>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="requests" :loading="isLoading">
          <Column field="moduleKey" :header="t('myApprovals.fields.module')" />
          <Column field="referenceId" :header="t('myApprovals.fields.reference')" />
          <Column field="currentTierOrder" :header="t('myApprovals.fields.currentTier')" />
          <Column :header="t('myApprovals.fields.requestedAt')">
            <template #body="{ data }">
              {{ dayjs(data.requestedAt).format(DateFormat.DATE_TIME) }}
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  :label="t('approvals.actions.approve')"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  :loading="actingId === data.id"
                  @click="onApprove(data.id)"
                />
                <Button
                  :label="t('approvals.actions.reject')"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                  :loading="actingId === data.id"
                  @click="onRejectClick(data.id)"
                />
              </div>
            </template>
          </Column>
          <template #empty>
            {{ t('table.noItems') }}
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>

    <Dialog
      v-model:visible="isRejectDialogVisible"
      modal
      :header="t('approvals.actions.reject')"
      :style="{ width: '30rem' }"
    >
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold">{{ t('approvals.labels.rejectComment') }}</label>
        <Textarea
          v-model="rejectComment"
          rows="3"
          autofocus
          class="w-full"
          @input="rejectCommentError = false"
        />
        <small v-if="rejectCommentError" class="text-red-500">
          {{ t('approvals.validation.rejectCommentRequired') }}
        </small>
      </div>
      <template #footer>
        <Button
          :label="t('common.actions.cancel')"
          severity="secondary"
          @click="isRejectDialogVisible = false"
        />
        <Button
          :label="t('approvals.actions.reject')"
          severity="danger"
          :loading="actingId !== null"
          @click="onRejectConfirm"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import dayjs from 'dayjs'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { ApprovalsService } from '@/services/approvals.service'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DateFormat from '@/constants/dateFormat'
import type { ApprovalRequest } from '@/types/approval.type'

const { t } = useI18n()
const toast = useToast()

const overlayGroup = 'myApprovalsView'
const isLoading = ref(false)
const hasEmployeeLink = ref(true)
const requests = ref<ApprovalRequest[]>([])
const actingId = ref<number | null>(null)
const isRejectDialogVisible = ref(false)
const rejectComment = ref('')
const rejectCommentError = ref(false)
const rejectTargetId = ref<number | null>(null)

async function loadRequests() {
  isLoading.value = true
  try {
    const result = await ApprovalsService.listPendingForMe()
    hasEmployeeLink.value = result.hasEmployeeLink
    requests.value = result.data
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    isLoading.value = false
  }
}

async function onApprove(id: number) {
  actingId.value = id
  try {
    await ApprovalsService.approve(id)
    toast.add(commonSuccessToast(t('approvals.messages.approved'), overlayGroup))
    await loadRequests()
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    actingId.value = null
  }
}

function onRejectClick(id: number) {
  rejectTargetId.value = id
  rejectComment.value = ''
  rejectCommentError.value = false
  isRejectDialogVisible.value = true
}

async function onRejectConfirm() {
  if (rejectTargetId.value === null) return
  if (!rejectComment.value.trim()) {
    rejectCommentError.value = true
    return
  }
  actingId.value = rejectTargetId.value
  try {
    await ApprovalsService.reject(rejectTargetId.value, { comment: rejectComment.value.trim() })
    isRejectDialogVisible.value = false
    toast.add(commonSuccessToast(t('approvals.messages.rejected'), overlayGroup))
    await loadRequests()
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    actingId.value = null
  }
}

onMounted(loadRequests)
</script>
