<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        aria-label="Go back"
        @click="router.back()"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('promotions.addPromotion') }}
      </h1>
    </div>

    <PromotionForm
      mode="create"
      :is-loading="isLoading"
      @submit="onSubmit"
      @cancel="router.back()"
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
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { PromotionsService } from '@/services/promotions.service'
import type { CreatePromotionDto } from '@/types/promotion.type'
import PromotionForm from './PromotionForm.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const toastGroup = 'promotionCreate'
const isLoading = ref(false)

async function onSubmit(dto: CreatePromotionDto) {
  isLoading.value = true
  try {
    await PromotionsService.create(dto)
    toast.add(commonSuccessToast(t('promotions.messages.created'), toastGroup))
    setTimeout(() => router.push('/promotions'), 1000)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
