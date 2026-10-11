<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/salesman-targets')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('salesmanTargets.list.create') }}
      </h1>
    </div>

    <SalesmanTargetForm
      mode="add"
      :is-loading="isLoading"
      :toast-group="toastGroup"
      @create="onCreate"
      @cancel="router.push('/salesman-targets')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { SalesmanTargetsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CreateSalesmanTargetRequest } from '@/types/salesmanTarget.type'
import { translateTargetError } from './salesmanTargetHelpers'
import SalesmanTargetForm from './SalesmanTargetForm.vue'

const { t, te } = useI18n()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/salesman-targets')

const toastGroup = 'salesmanTargetCreate'
const isLoading = ref(false)

async function onCreate(body: CreateSalesmanTargetRequest) {
  isLoading.value = true
  try {
    const saved = await SalesmanTargetsService.create(body)
    toast.add(
      commonSuccessToast(t('salesmanTargets.messages.created', { code: saved.code }), toastGroup),
    )
    afterCreate(saved)
  } catch (e) {
    toast.add(commonErrorToast(translateTargetError(e, t, te), toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
