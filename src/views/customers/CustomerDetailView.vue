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

    <!-- Loading -->
    <div v-if="isLoadingCustomer" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="customer">
      <CustomerForm mode="edit" :customer="customer" disabled @cancel="router.back()" />

      <!-- Labels Section (read-only) -->
      <ResponsiveCard class="mt-6">
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
    </template>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('customers.messages.customerNotFound') }}</Message>
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
import type { Customer } from '@/types/customer.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

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
    customer.value = await CustomersService.v1Get(customerId)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingCustomer.value = false
  }
})
</script>
