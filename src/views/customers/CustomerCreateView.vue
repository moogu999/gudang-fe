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

    <ResponsiveCard>
      <template #content>
        <CustomerForm
          :mode="DialogMode.ADD"
          :is-loading="isLoading"
          @submit="onFormSubmit"
          @cancel="router.back()"
        />
      </template>
    </ResponsiveCard>
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
import { useAuthStore } from '@/stores'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CustomerForm from './CustomerForm.vue'
import DialogMode from '@/constants/dialogMode'
import type { FormSubmitEvent } from '@primevue/forms'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

// Toast
const toastGroup = 'customerCreate'
const toast = useToast()

const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  isLoading.value = true

  try {
    await CustomersService.create({
      name: event.states.name.value,
      currencyId: event.states.currencyId.value,
      taxable: event.states.taxable.value,
      address: event.states.address.value || undefined,
      countryId: event.states.countryId.value,
      provinceId: event.states.provinceId.value,
      cityId: event.states.cityId.value,
      districtId: event.states.districtId.value,
      subDistrictId: event.states.subDistrictId.value,
      zipCode: event.states.zipCode.value || undefined,
      longitude: event.states.longitude.value,
      latitude: event.states.latitude.value,
      createdBy: authStore.userId!,
    })

    toast.add(commonSuccessToast(t('customers.messages.customerCreated'), toastGroup))

    setTimeout(() => {
      router.push('/customers')
    }, 1000)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
