<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('cashDeposits.actions.editCashDeposit') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <CashDepositForm
          v-if="cashDepositId !== undefined"
          :mode="DialogMode.EDIT"
          :cash-deposit-id="cashDepositId"
          @submitted="afterUpdate"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('cashDeposits.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CashDepositForm from './CashDepositForm.vue'
import DialogMode from '@/constants/dialogMode'
import { usePostSaveNavigation } from '@/composables'

const { t } = useI18n()
const router = useRouter()
const { afterUpdate } = usePostSaveNavigation('/cash-deposits')
const route = useRoute()

const toastGroup = 'cashDepositEdit'
const cashDepositId = ref<number | undefined>()

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/cash-deposits')
    return
  }
  cashDepositId.value = id
})
</script>
