<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" aria-label="Go back" />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('priceLists.editPriceList') }}
      </h1>
    </div>

    <PriceListForm
      v-if="priceList"
      mode="edit"
      :price-list="priceList"
      :is-loading="isLoading"
      @submit="onSubmit"
      @cancel="router.back()"
    />

    <ResponsiveCard v-else-if="!isLoadingData">
      <template #content>
        <Message severity="error">{{ t('priceLists.messages.notFound') }}</Message>
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
import { useAuthStore } from '@/stores'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { PriceListsService } from '@/services/price-lists.service'
import type { PriceList, UpdatePriceListDto } from '@/types/price-list'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import PriceListForm from './PriceListForm.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()

const toastGroup = 'priceListEdit'
const isLoading = ref(false)
const isLoadingData = ref(false)
const priceList = ref<PriceList | undefined>(undefined)

onMounted(async () => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/price-lists')
    return
  }
  isLoadingData.value = true
  try {
    priceList.value = await PriceListsService.getById(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingData.value = false
  }
})

async function onSubmit(dto: UpdatePriceListDto) {
  if (!priceList.value) return
  isLoading.value = true
  try {
    dto.updatedBy = authStore.userId ?? undefined
    await PriceListsService.update(priceList.value.id, dto)
    toast.add(commonSuccessToast(t('priceLists.messages.updated'), toastGroup))
    setTimeout(() => router.push(`/price-lists/${priceList.value!.id}`), 1000)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
