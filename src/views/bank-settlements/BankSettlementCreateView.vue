<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('bankSettlements.addBankSettlement') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <BankSettlementSplitResult v-if="splitResult" :settlement="splitResult" />
        <BankSettlementForm
          v-else
          :mode="DialogMode.ADD"
          @submitted="onSubmitted"
          @cancel="router.back()"
        />
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import BankSettlementForm from './BankSettlementForm.vue'
import BankSettlementSplitResult from './components/BankSettlementSplitResult.vue'
import DialogMode from '@/constants/dialogMode'
import type { BankSettlementResponse } from '@/types/bankSettlement.type'

const { t } = useI18n()
const router = useRouter()

const toastGroup = 'bankSettlementCreate'
const splitResult = ref<BankSettlementResponse | null>(null)

// A submit that split (D4) stays on screen so the new draft's number and link don't vanish
// in a redirect; anything else goes back to the list.
function onSubmitted(settlement: BankSettlementResponse) {
  if (settlement.remainderSettlementId) {
    splitResult.value = settlement
    return
  }
  setTimeout(() => router.push('/bank-settlements'), 1000)
}
</script>
