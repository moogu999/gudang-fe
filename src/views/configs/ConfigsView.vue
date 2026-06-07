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
import { usePermissions } from '@/composables'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const { canRead: canReadSO, canWrite: canWriteSO } = usePermissions('/sales-order-configs')
const { canRead: canReadBO, canWrite: canWriteBO } = usePermissions('/booking-order-configs')

const configOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  if (canReadSO.value) options.push({ label: t('navigation.salesOrderConfigs'), value: 'so' })
  if (canReadBO.value) options.push({ label: t('navigation.bookingOrderConfigs'), value: 'bo' })
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
  return false
})

const showToolbar = computed(() => configOptions.value.length > 1 || canWriteActive.value)

const soRef = ref<InstanceType<typeof SalesOrderConfigsView> | null>(null)
const boRef = ref<InstanceType<typeof BookingOrderConfigsView> | null>(null)

function onAddClick() {
  if (activeConfig.value === 'so') soRef.value?.openAddDialog()
  else if (activeConfig.value === 'bo') boRef.value?.openAddDialog()
}
</script>
