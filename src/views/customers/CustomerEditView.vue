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
        {{ t('customers.editCustomer') }}
      </h1>
    </div>

    <ResponsiveCard v-if="customer">
      <template #content>
        <CustomerForm
          :mode="DialogMode.EDIT"
          :customer="customer"
          :is-loading="isLoading"
          @submit="onFormSubmit"
          @cancel="router.back()"
        />
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-else-if="!isLoadingCustomer">
      <template #content>
        <Message severity="error">{{ t('customers.messages.customerNotFound') }}</Message>
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
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import { ref, onMounted } from 'vue'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Message from 'primevue/message'
import { CustomersService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CustomerForm from './CustomerForm.vue'
import DialogMode from '@/constants/dialogMode'
import type { FormSubmitEvent } from '@primevue/forms'
import type { Customer } from '@/types/customer.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Toast
const toastGroup = 'customerEdit'
const toast = useToast()

const isLoading = ref(false)
const isLoadingCustomer = ref(false)
const customer = ref<Customer | undefined>(undefined)

onMounted(async () => {
  const customerId = Number(route.params.id)
  if (isNaN(customerId)) {
    toast.add(commonErrorToast(new Error('Invalid customer ID'), toastGroup))
    router.push('/customers')
    return
  }

  isLoadingCustomer.value = true
  try {
    customer.value = await CustomersService.getById(customerId)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingCustomer.value = false
  }
})

async function onFormSubmit(event: FormSubmitEvent) {
  if (!customer.value) return

  isLoading.value = true

  try {
    await CustomersService.update(customer.value.id, {
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
      updatedBy: authStore.userId!,
    })

    toast.add(commonSuccessToast(t('customers.messages.customerUpdated'), toastGroup))

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
