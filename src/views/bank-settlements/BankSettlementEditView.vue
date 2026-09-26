<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('bankSettlements.actions.editBankSettlement') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <BankSettlementSplitResult v-if="splitResult" :settlement="splitResult" />
        <BankSettlementForm
          v-else-if="bankSettlementId !== undefined"
          :key="bankSettlementId"
          :mode="DialogMode.EDIT"
          :bank-settlement-id="bankSettlementId"
          @submitted="onSubmitted"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('bankSettlements.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import BankSettlementForm from './BankSettlementForm.vue'
import BankSettlementSplitResult from './components/BankSettlementSplitResult.vue'
import DialogMode from '@/constants/dialogMode'
import { usePostSaveNavigation } from '@/composables'
import type { BankSettlementResponse } from '@/types/bankSettlement.type'

const { t } = useI18n()
const router = useRouter()
const { afterUpdate } = usePostSaveNavigation('/bank-settlements')
const route = useRoute()

const toastGroup = 'bankSettlementEdit'
const bankSettlementId = ref<number | undefined>()
const splitResult = ref<BankSettlementResponse | null>(null)

// Watched, not read once on mount: "Open new draft" goes edit → edit, which reuses this
// component instance, so a stale split panel and id would otherwise stay on screen.
watch(
  () => route.params.id,
  (raw) => {
    const id = Number(raw)
    if (isNaN(id)) {
      router.push('/bank-settlements')
      return
    }
    splitResult.value = null
    bankSettlementId.value = id
  },
  { immediate: true },
)

// A submit that split stays on screen so the new draft's number and link don't vanish
// in a redirect; anything else follows the usual post-save navigation.
function onSubmitted(settlement: BankSettlementResponse) {
  if (settlement.remainderSettlementId) {
    splitResult.value = settlement
    return
  }
  afterUpdate(settlement)
}
</script>
