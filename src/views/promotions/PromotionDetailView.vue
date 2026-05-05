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
        {{ t('promotions.viewPromotion') }}
      </h1>
    </div>

    <PromotionForm v-if="promotion" mode="view" :promotion="promotion" @cancel="router.back()" />

    <ResponsiveCard v-else-if="!isLoadingData">
      <template #content>
        <Message severity="error">{{ t('promotions.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-else>
      <template #content>
        <div class="flex items-center justify-center p-8">
          <i class="pi pi-spinner pi-spin text-4xl" />
        </div>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import { PromotionsService } from '@/services/promotions.service'
import type { Promotion } from '@/types/promotion.type'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import PromotionForm from './PromotionForm.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'promotionDetail'
const isLoadingData = ref(false)
const promotion = ref<Promotion | undefined>(undefined)

onMounted(async () => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/promotions')
    return
  }
  isLoadingData.value = true
  try {
    promotion.value = await PromotionsService.getById(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingData.value = false
  }
})
</script>
