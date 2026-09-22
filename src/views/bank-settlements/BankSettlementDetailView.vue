<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('bankSettlements.viewBankSettlement') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <BankSettlementForm
          v-if="bankSettlementId !== undefined"
          :key="bankSettlementId"
          :mode="DialogMode.VIEW"
          :bank-settlement-id="bankSettlementId"
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
import DialogMode from '@/constants/dialogMode'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const toastGroup = 'bankSettlementDetail'
const bankSettlementId = ref<number | undefined>()

// Watched, not read once on mount: the "Split from" link navigates detail → detail,
// which reuses this component instance.
watch(
  () => route.params.id,
  (raw) => {
    const id = Number(raw)
    if (isNaN(id)) {
      router.push('/bank-settlements')
      return
    }
    bankSettlementId.value = id
  },
  { immediate: true },
)
</script>
