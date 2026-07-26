<template>
  <div v-if="!isLoading" class="flex flex-wrap items-center gap-2">
    <Button
      v-if="showSubmit"
      :label="t('approvals.actions.submit')"
      icon="pi pi-send"
      :loading="isActing"
      @click="onSubmitClick"
    />
    <Button
      v-if="showApprove"
      :label="t('approvals.actions.approve')"
      icon="pi pi-check"
      severity="success"
      :loading="isActing"
      @click="onApproveClick"
    />
    <Button
      v-if="showReject"
      :label="t('approvals.actions.reject')"
      icon="pi pi-times"
      severity="danger"
      :loading="isActing"
      @click="onRejectClick"
    />
    <Button
      v-if="showCancel"
      :label="t('approvals.actions.cancel')"
      icon="pi pi-ban"
      severity="secondary"
      outlined
      :loading="isActing"
      @click="onCancelClick"
    />
  </div>

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
        :loading="isActing"
        @click="onRejectConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import { useApproval } from '@/composables/useApproval'
import { useAuthStore } from '@/stores/auth'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'

const props = defineProps<{
  moduleKey: string
  referenceId: number
  /** Flow to submit under, when this document has no request yet. Omit to hide the Submit action. */
  submitFlowId?: number | null
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const toastGroup = 'approvalActionBar'

const { request, isLoading, refresh, approve, reject, cancel, submit } = useApproval(
  props.moduleKey,
  props.referenceId,
)

const isActing = ref(false)
const isRejectDialogVisible = ref(false)
const rejectComment = ref('')
const rejectCommentError = ref(false)

const showSubmit = computed(() => !request.value && !!props.submitFlowId && !isLoading.value)
const showApprove = computed(
  () => !!request.value && request.value.status === 'pending' && request.value.canAct,
)
const showReject = computed(
  () => !!request.value && request.value.status === 'pending' && request.value.canAct,
)
const showCancel = computed(
  () =>
    !!request.value &&
    request.value.status === 'pending' &&
    request.value.requestedByUserId === authStore.userId,
)

async function onSubmitClick() {
  if (!props.submitFlowId) return
  isActing.value = true
  try {
    await submit(props.submitFlowId)
    toast.add(commonSuccessToast(t('approvals.messages.submitted'), toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isActing.value = false
  }
}

async function onApproveClick() {
  isActing.value = true
  try {
    await approve()
    toast.add(commonSuccessToast(t('approvals.messages.approved'), toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isActing.value = false
  }
}

function onRejectClick() {
  rejectComment.value = ''
  rejectCommentError.value = false
  isRejectDialogVisible.value = true
}

async function onRejectConfirm() {
  if (!rejectComment.value.trim()) {
    rejectCommentError.value = true
    return
  }
  isActing.value = true
  try {
    await reject(rejectComment.value.trim())
    isRejectDialogVisible.value = false
    rejectComment.value = ''
    toast.add(commonSuccessToast(t('approvals.messages.rejected'), toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isActing.value = false
  }
}

async function onCancelClick() {
  isActing.value = true
  try {
    await cancel()
    toast.add(commonSuccessToast(t('approvals.messages.cancelled'), toastGroup))
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isActing.value = false
  }
}

onMounted(refresh)

defineExpose({ refresh })
</script>
