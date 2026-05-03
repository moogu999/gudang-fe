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
        {{ t('customers.viewCustomer') }}
      </h1>
    </div>

    <ResponsiveCard v-if="customer">
      <template #content>
        <CustomerForm :mode="DialogMode.VIEW" :customer="customer" @cancel="router.back()" />
      </template>
    </ResponsiveCard>

    <!-- Labels Section (read-only) -->
    <ResponsiveCard v-if="customer" class="mt-4">
      <template #content>
        <h3 class="mb-3 text-sm font-semibold sm:text-base md:text-lg">
          {{ t('customers.labels.title') }}
        </h3>
        <DataTable
          :value="customer.labels ?? []"
          striped-rows
          responsive-layout="scroll"
          :empty-message="t('table.noResults')"
          class="text-sm"
        >
          <Column field="definition.name" :header="t('customers.labels.fields.label')" />
          <Column field="option.value" :header="t('customers.labels.fields.value')" />
        </DataTable>
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { CustomersService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CustomerForm from './CustomerForm.vue'
import DialogMode from '@/constants/dialogMode'
import type { Customer } from '@/types/customer.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// Toast
const toastGroup = 'customerDetail'
const toast = useToast()

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
</script>
