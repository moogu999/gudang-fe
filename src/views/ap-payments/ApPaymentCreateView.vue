<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('apPayments.addApPayment') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <ApPaymentForm :mode="DialogMode.ADD" @submitted="onSubmitted" @cancel="router.back()" />
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ApPaymentForm from './ApPaymentForm.vue'
import DialogMode from '@/constants/dialogMode'

const { t } = useI18n()
const router = useRouter()

const toastGroup = 'apPaymentCreate'

function onSubmitted() {
  setTimeout(() => router.push('/ap-payments'), 1000)
}
</script>
