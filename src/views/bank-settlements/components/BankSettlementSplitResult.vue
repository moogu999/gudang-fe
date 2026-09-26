<template>
  <div class="flex flex-col gap-4">
    <Message severity="success" data-testid="split-result">
      {{ t('bankSettlements.messages.splitCreated', { no: settlement.remainderSettlementNo }) }}
    </Message>
    <div class="flex gap-2">
      <Button
        :label="t('bankSettlements.actions.openRemainder')"
        @click="router.push(`/bank-settlements/${settlement.remainderSettlementId}/edit`)"
      />
      <Button
        severity="secondary"
        :label="t('bankSettlements.actions.backToList')"
        @click="router.push('/bank-settlements')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { BankSettlementResponse } from '@/types/bankSettlement.type'

/**
 * Shown in place of the form after a submit that split. Replacing the form, rather
 * than raising a toast over it, stops a second click re-submitting a completed document
 * and gives the new draft's number and link somewhere to stay.
 */
defineProps<{ settlement: BankSettlementResponse }>()

const { t } = useI18n()
const router = useRouter()
</script>
