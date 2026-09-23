<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('giroReceipts.viewGiroReceipt') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <GiroReceiptForm
          v-if="giroReceiptId !== undefined"
          :key="giroReceiptId"
          :mode="DialogMode.VIEW"
          :giro-receipt-id="giroReceiptId"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('giroReceipts.messages.notFound') }}</Message>
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
import GiroReceiptForm from './GiroReceiptForm.vue'
import DialogMode from '@/constants/dialogMode'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const toastGroup = 'giroReceiptDetail'
const giroReceiptId = ref<number | undefined>()

// Watched, not read once on mount: the register links receipt → receipt, which reuses this
// component instance.
watch(
  () => route.params.id,
  (raw) => {
    const id = Number(raw)
    if (isNaN(id)) {
      router.push('/giro?tab=receipts')
      return
    }
    giroReceiptId.value = id
  },
  { immediate: true },
)
</script>
