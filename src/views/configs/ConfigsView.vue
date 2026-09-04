<template>
  <div>
    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('configs.title') }}
    </h1>

    <Toolbar v-if="showToolbar" class="mb-5">
      <template #start>
        <Select
          v-if="configOptions.length > 1"
          v-model="activeConfig"
          :options="configOptions"
          option-label="label"
          option-value="value"
          class="min-w-40"
          @update:model-value="onActiveConfigChange"
        />
      </template>
      <template #end>
        <ResponsiveButton
          v-if="canWriteActive"
          :label="t('common.actions.add')"
          @click="onAddClick"
        />
      </template>
    </Toolbar>

    <SalesOrderConfigsView v-if="activeConfig === 'so'" ref="soRef" :embedded="true" />
    <BookingOrderConfigsView v-if="activeConfig === 'bo'" ref="boRef" :embedded="true" />
    <PurchaseOrderConfigsView v-if="activeConfig === 'po'" ref="poRef" :embedded="true" />
    <GoodsReceiptConfigsView v-if="activeConfig === 'gr'" ref="grRef" :embedded="true" />
    <ApInvoiceConfigsView v-if="activeConfig === 'ap'" ref="apRef" :embedded="true" />
    <CreditDebitNoteConfigsView v-if="activeConfig === 'cdn'" ref="cdnRef" :embedded="true" />
    <ApPaymentConfigsView v-if="activeConfig === 'bkk'" ref="bkkRef" :embedded="true" />
    <AccountingPeriodConfigsView v-if="activeConfig === 'apc'" ref="apcRef" :embedded="true" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Toolbar from 'primevue/toolbar'
import Select from 'primevue/select'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import SalesOrderConfigsView from '@/views/sales-order-configs/SalesOrderConfigsView.vue'
import BookingOrderConfigsView from '@/views/booking-order-configs/BookingOrderConfigsView.vue'
import PurchaseOrderConfigsView from '@/views/purchase-order-configs/PurchaseOrderConfigsView.vue'
import GoodsReceiptConfigsView from '@/views/goods-receipt-configs/GoodsReceiptConfigsView.vue'
import ApInvoiceConfigsView from '@/views/ap-invoice-configs/ApInvoiceConfigsView.vue'
import CreditDebitNoteConfigsView from '@/views/credit-debit-note-configs/CreditDebitNoteConfigsView.vue'
import ApPaymentConfigsView from '@/views/ap-payment-configs/ApPaymentConfigsView.vue'
import AccountingPeriodConfigsView from '@/views/accounting-period-configs/AccountingPeriodConfigsView.vue'
import { usePermissions } from '@/composables'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const { canRead: canReadSO, canWrite: canWriteSO } = usePermissions('/sales-order-configs')
const { canRead: canReadBO, canWrite: canWriteBO } = usePermissions('/booking-order-configs')
const { canRead: canReadPO, canWrite: canWritePO } = usePermissions('/purchase-order-configs')
const { canRead: canReadGR, canWrite: canWriteGR } = usePermissions('/goods-receipt-configs')
const { canRead: canReadAP, canWrite: canWriteAP } = usePermissions('/ap-invoice-configs')
const { canRead: canReadCDN, canWrite: canWriteCDN } = usePermissions('/credit-debit-note-configs')
const { canRead: canReadBKK, canWrite: canWriteBKK } = usePermissions('/ap-payment-configs')
const { canRead: canReadAPC, canWrite: canWriteAPC } = usePermissions('/accounting-periods')

const configOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  if (canReadSO.value) options.push({ label: t('navigation.salesOrderConfigs'), value: 'so' })
  if (canReadBO.value) options.push({ label: t('navigation.bookingOrderConfigs'), value: 'bo' })
  if (canReadPO.value) options.push({ label: t('navigation.purchaseOrderConfigs'), value: 'po' })
  if (canReadGR.value) options.push({ label: t('navigation.goodsReceiptConfigs'), value: 'gr' })
  if (canReadAP.value) options.push({ label: t('navigation.apInvoiceConfigs'), value: 'ap' })
  if (canReadCDN.value)
    options.push({ label: t('navigation.creditDebitNoteConfigs'), value: 'cdn' })
  if (canReadBKK.value) options.push({ label: t('navigation.apPaymentConfigs'), value: 'bkk' })
  if (canReadAPC.value)
    options.push({ label: t('navigation.accountingPeriodConfigs'), value: 'apc' })
  return options
})

function resolveInitialTab(): string | null {
  const tab = route.query.tab as string | undefined
  if (tab && configOptions.value.some((o) => o.value === tab)) return tab
  return configOptions.value[0]?.value ?? null
}

const activeConfig = ref<string | null>(resolveInitialTab())

function onActiveConfigChange(val: string | null) {
  if (val) router.replace({ query: { ...route.query, tab: val } })
}

const canWriteActive = computed(() => {
  if (activeConfig.value === 'so') return canWriteSO.value
  if (activeConfig.value === 'bo') return canWriteBO.value
  if (activeConfig.value === 'po') return canWritePO.value
  if (activeConfig.value === 'gr') return canWriteGR.value
  if (activeConfig.value === 'ap') return canWriteAP.value
  if (activeConfig.value === 'cdn') return canWriteCDN.value
  if (activeConfig.value === 'bkk') return canWriteBKK.value
  if (activeConfig.value === 'apc') return canWriteAPC.value
  return false
})

const showToolbar = computed(() => configOptions.value.length > 1 || canWriteActive.value)

const soRef = ref<InstanceType<typeof SalesOrderConfigsView> | null>(null)
const boRef = ref<InstanceType<typeof BookingOrderConfigsView> | null>(null)
const poRef = ref<InstanceType<typeof PurchaseOrderConfigsView> | null>(null)
const grRef = ref<InstanceType<typeof GoodsReceiptConfigsView> | null>(null)
const apRef = ref<InstanceType<typeof ApInvoiceConfigsView> | null>(null)
const cdnRef = ref<InstanceType<typeof CreditDebitNoteConfigsView> | null>(null)
const bkkRef = ref<InstanceType<typeof ApPaymentConfigsView> | null>(null)
const apcRef = ref<InstanceType<typeof AccountingPeriodConfigsView> | null>(null)

function onAddClick() {
  if (activeConfig.value === 'so') soRef.value?.openAddDialog()
  else if (activeConfig.value === 'bo') boRef.value?.openAddDialog()
  else if (activeConfig.value === 'po') poRef.value?.openAddDialog()
  else if (activeConfig.value === 'gr') grRef.value?.openAddDialog()
  else if (activeConfig.value === 'ap') apRef.value?.openAddDialog()
  else if (activeConfig.value === 'cdn') cdnRef.value?.openAddDialog()
  else if (activeConfig.value === 'bkk') bkkRef.value?.openAddDialog()
  else if (activeConfig.value === 'apc') apcRef.value?.openAddDialog()
}
</script>
