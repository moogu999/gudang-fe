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

    <!-- Loading -->
    <div v-if="isLoadingCustomer" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="customer">
      <CustomerForm
        mode="edit"
        :customer="customer"
        :is-loading="isLoading"
        @save-draft="onSaveDraft"
        @submit="onSubmit"
        @cancel="router.back()"
      />

      <!-- Labels section -->
      <ResponsiveCard class="mt-6">
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
    </template>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('customers.messages.customerNotFound') }}</Message>
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
import type { Customer, CreateCustomerV1Dto, UpdateCustomerV1Dto } from '@/types/customer.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const toastGroup = 'customerEdit'
const toast = useToast()

const isLoading = ref(false)
const isLoadingCustomer = ref(false)
const customer = ref<Customer | undefined>(undefined)
const isSetLabelsDialogShown = ref(false)

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

function openSetLabelsDialog() {
  isSetLabelsDialogShown.value = true
}

async function closeSetLabelsDialog() {
  isSetLabelsDialogShown.value = false
  if (customer.value) {
    try {
      customer.value = await CustomersService.v1Get(customer.value.id)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    }
  }
}

async function save(dto: CreateCustomerV1Dto | UpdateCustomerV1Dto) {
  if (!customer.value) return
  isLoading.value = true
  try {
    const prev = customer.value
    const updated = await CustomersService.v1Update(prev.id, dto as UpdateCustomerV1Dto)
    customer.value = { ...updated, labels: updated.labels ?? prev.labels }
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
