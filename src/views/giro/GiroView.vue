<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">{{ t('giro.title') }}</h1>
      <!-- Create actions sit in the header so they're reachable from every tab. -->
      <div class="flex flex-wrap gap-2">
        <ResponsiveButton
          v-if="canWriteReceipt"
          icon="pi pi-plus"
          data-testid="receive-giros"
          :label="t('giro.actions.receiveGiros')"
          @click="router.push('/giro-receipts/create')"
        />
        <ResponsiveButton
          v-if="canWriteClearing"
          icon="pi pi-building-columns"
          severity="secondary"
          data-testid="deposit-for-clearing"
          :label="t('giroRegister.actions.depositForClearing')"
          @click="router.push('/giro-clearings/create')"
        />
      </div>
    </div>

    <Tabs v-if="activeTab" :value="activeTab" class="mb-4" @update:value="onTabChange">
      <TabList>
        <Tab
          v-for="tab in tabs"
          :key="tab.value"
          :value="tab.value"
          :data-testid="`giro-tab-${tab.value}`"
        >
          {{ tab.label }}
        </Tab>
      </TabList>
    </Tabs>

    <!-- Kept alive so a tab's filters, page and Register selection survive switching tabs. -->
    <KeepAlive>
      <component :is="activeComponent" v-if="activeComponent" :key="activeTab" />
    </KeepAlive>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import GiroRegisterTab from '@/views/giro-register/GiroRegisterTab.vue'
import GiroReceiptsTab from '@/views/giro-receipts/GiroReceiptsTab.vue'
import GiroClearingsTab from '@/views/giro-clearings/GiroClearingsTab.vue'
import { usePermissions } from '@/composables'

type GiroTab = 'register' | 'receipts' | 'clearings'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// The Register and Receipts both read giro receipts (GIRO_RECEIPT_READ); Clearings has its own.
const { canRead: canReadReceipt, canWrite: canWriteReceipt } = usePermissions('/giro-receipts')
const { canRead: canReadClearing, canWrite: canWriteClearing } = usePermissions('/giro-clearings')

const COMPONENTS: Record<GiroTab, Component> = {
  register: GiroRegisterTab,
  receipts: GiroReceiptsTab,
  clearings: GiroClearingsTab,
}

const tabs = computed(() => {
  const list: { value: GiroTab; label: string }[] = []
  if (canReadReceipt.value) {
    list.push({ value: 'register', label: t('giro.tabs.register') })
    list.push({ value: 'receipts', label: t('giro.tabs.receipts') })
  }
  if (canReadClearing.value) list.push({ value: 'clearings', label: t('giro.tabs.clearings') })
  return list
})

function resolveTab(raw: unknown): GiroTab | null {
  if (typeof raw === 'string' && tabs.value.some((tab) => tab.value === raw)) return raw as GiroTab
  return tabs.value[0]?.value ?? null
}

const activeTab = ref<GiroTab | null>(resolveTab(route.query.tab))
const activeComponent = computed(() => (activeTab.value ? COMPONENTS[activeTab.value] : null))

// Keep ?tab= in the URL so Back from a document lands on the tab it was opened from.
function onTabChange(value: string | number) {
  const next = resolveTab(value)
  if (!next || next === activeTab.value) return
  activeTab.value = next
  router.replace({ query: { ...route.query, tab: next } })
}

// A redirect from an old list URL (or a hand-edited ?tab=) arrives while mounted.
watch(
  () => route.query.tab,
  (raw) => {
    const next = resolveTab(raw)
    if (next && next !== activeTab.value) activeTab.value = next
  },
)
</script>
