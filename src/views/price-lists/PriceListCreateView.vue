<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" aria-label="Go back" />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('priceLists.addPriceList') }}
      </h1>
    </div>

    <PriceListForm mode="create" :is-loading="isLoading" @submit="onSubmit" @cancel="router.back()" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { PriceListsService } from '@/services/price-lists.service'
import type { CreatePriceListDto } from '@/types/price-list'
import PriceListForm from './PriceListForm.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const toastGroup = 'priceListCreate'
const isLoading = ref(false)

async function onSubmit(dto: CreatePriceListDto) {
  isLoading.value = true
  try {
    dto.createdBy = authStore.userId ?? undefined
    await PriceListsService.create(dto)
    toast.add(commonSuccessToast(t('priceLists.messages.created'), toastGroup))
    setTimeout(() => router.push('/price-lists'), 1000)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
