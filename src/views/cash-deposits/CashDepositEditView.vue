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
          @submitted="onSubmitted"
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
import type { CashDepositResponse } from '@/types/cashDeposit.type'

const { t } = useI18n()
const router = useRouter()
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

// A deposit that tripped the variance threshold stays on screen at its detail page, so the
// approval timeline shows what happened; anything else goes back to the list.
function onSubmitted(deposit: CashDepositResponse) {
  const target =
    deposit.status === 'need_approval' ? `/cash-deposits/${deposit.id}` : '/cash-deposits'
  setTimeout(() => router.push(target), 1000)
}
</script>
