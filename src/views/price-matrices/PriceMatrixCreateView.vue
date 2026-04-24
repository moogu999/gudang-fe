<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" aria-label="Go back" />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('priceMatrix.addPriceMatrix') }}
      </h1>
    </div>

    <PriceMatrixForm mode="create" :is-loading="isLoading" @submit="onSubmit" @cancel="router.back()" />
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
import { PriceMatricesService } from '@/services/price-matrices.service'
import type { CreatePriceMatrixDto } from '@/types/price-matrix.type'
import PriceMatrixForm from './PriceMatrixForm.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const toastGroup = 'priceMatrixCreate'
const isLoading = ref(false)

async function onSubmit(dto: CreatePriceMatrixDto) {
  isLoading.value = true
  try {
    await PriceMatricesService.create(dto)
    toast.add(commonSuccessToast(t('priceMatrix.messages.created'), toastGroup))
    setTimeout(() => router.push('/price-matrices'), 1000)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
