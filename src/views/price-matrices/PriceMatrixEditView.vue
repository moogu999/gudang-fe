<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="router.back()"
        aria-label="Go back"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('priceMatrix.editPriceMatrix') }}
      </h1>
    </div>

    <PriceMatrixForm
      v-if="priceMatrix"
      mode="edit"
      :price-matrix="priceMatrix"
      :is-loading="isLoading"
      @submit="onSubmit"
      @cancel="router.back()"
    />

    <ResponsiveCard v-else-if="!isLoadingData">
      <template #content>
        <Message severity="error">{{ t('priceMatrix.messages.notFound') }}</Message>
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
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { PriceMatricesService } from '@/services/price-matrices.service'
import type { PriceMatrix, UpdatePriceMatrixDto } from '@/types/price-matrix.type'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import PriceMatrixForm from './PriceMatrixForm.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'priceMatrixEdit'
const isLoading = ref(false)
const isLoadingData = ref(false)
const priceMatrix = ref<PriceMatrix | undefined>(undefined)

onMounted(async () => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/price-matrices')
    return
  }
  isLoadingData.value = true
  try {
    priceMatrix.value = await PriceMatricesService.getById(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingData.value = false
  }
})

async function onSubmit(dto: UpdatePriceMatrixDto) {
  if (!priceMatrix.value) return
  isLoading.value = true
  try {
    await PriceMatricesService.update(priceMatrix.value.id, dto)
    toast.add(commonSuccessToast(t('priceMatrix.messages.updated'), toastGroup))
    setTimeout(() => router.push(`/price-matrices/${priceMatrix.value!.id}`), 1000)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
