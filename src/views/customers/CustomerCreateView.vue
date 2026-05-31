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
        {{ t('customers.addCustomer') }}
      </h1>
    </div>

    <CustomerForm
      mode="add"
      :is-loading="isLoading"
      @save-draft="onSaveDraft"
      @submit="onSubmit"
      @cancel="router.back()"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { ref } from 'vue'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { CustomersService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import CustomerForm from './CustomerForm.vue'
import type { CreateCustomerV1Dto } from '@/types/customer.type'

const { t } = useI18n()
const router = useRouter()

const toastGroup = 'customerCreate'
const toast = useToast()
const isLoading = ref(false)

async function save(dto: CreateCustomerV1Dto) {
  isLoading.value = true
  try {
    await CustomersService.v1Create(dto)
    const msg = dto.isDraft ? t('customers.messages.draftSaved') : t('customers.messages.customerSaved')
    toast.add(commonSuccessToast(msg, toastGroup))
    if (!dto.isDraft) setTimeout(() => router.push('/customers'), 800)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

function onSaveDraft(dto: CreateCustomerV1Dto) {
  save(dto)
}

function onSubmit(dto: CreateCustomerV1Dto) {
  save(dto)
}
</script>
