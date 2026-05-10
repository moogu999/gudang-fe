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
          ref="customerForm"
          :mode="DialogMode.EDIT"
          :customer="customer"
          :is-loading="isLoading"
          @submit="onFormSubmit"
          @cancel="router.back()"
        />
      </template>
    </ResponsiveCard>

    <!-- Labels Section -->
    <ResponsiveCard v-if="customer" class="mt-4">
      <template #content>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold sm:text-base md:text-lg">
            {{ t('customers.labels.title') }}
          </h3>
          <Button
            :label="t('customers.labels.setLabels')"
            icon="pi pi-tag"
            size="small"
            @click="openSetLabelsDialog"
          />
        </div>
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

    <!-- Set Labels Dialog -->
    <Dialog
      :header="t('customers.labels.setLabels')"
      v-model:visible="isSetLabelsDialogShown"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      :style="{ width: '50vw' }"
      :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
      @hide="isSetLabelsDialogShown = false"
    >
      <CustomerSetLabelsDialog
        v-if="customer && isSetLabelsDialogShown"
        :customer-id="customer.id"
        :current-labels="customer.labels ?? []"
        @close="closeSetLabelsDialog"
      />
    </Dialog>
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
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { CustomersService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CustomerForm from './CustomerForm.vue'
import CustomerSetLabelsDialog from './CustomerSetLabelsDialog.vue'
import DialogMode from '@/constants/dialogMode'
import type { FormSubmitEvent } from '@primevue/forms'
import type { Customer } from '@/types/customer.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const toastGroup = 'customerEdit'
const toast = useToast()

const isLoading = ref(false)
const isLoadingCustomer = ref(false)
const customer = ref<Customer | undefined>(undefined)
const isSetLabelsDialogShown = ref(false)
const customerForm = ref()

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

function openSetLabelsDialog() {
  isSetLabelsDialogShown.value = true
}

async function closeSetLabelsDialog() {
  isSetLabelsDialogShown.value = false
  if (customer.value) {
    try {
      customer.value = await CustomersService.getById(customer.value.id)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    }
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!customer.value) return

  isLoading.value = true

  try {
    const code = await customerForm.value.resolveCode(event)

    await CustomersService.update(customer.value.id, {
      code,
      name: event.states.name.value,
      currencyId: event.states.currencyId.value,
      isActive: event.states.isActive.value,
      sellToId: event.states.sellToId.value,
      deliverToId: event.states.deliverToId.value,
      invoiceToId: event.states.invoiceToId.value,
      joinInvoice: event.states.joinInvoice.value,
      collectToId: event.states.collectToId.value,
      areaId: event.states.areaId.value,
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
