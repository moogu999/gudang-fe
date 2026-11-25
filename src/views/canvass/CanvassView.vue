<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">{{ t('canvass.title') }}</h1>
      <!-- The Add action follows the active tab, so it is reachable without leaving the page. -->
      <ResponsiveButton
        v-if="activeTab === 'loadings' && canWriteLoading"
        icon="pi pi-plus"
        data-testid="add-loading"
        :label="t('canvassLoadings.addLoading')"
        @click="router.push('/canvass-loadings/create')"
      />
      <ResponsiveButton
        v-else-if="activeTab === 'unloadings' && canWriteUnloading"
        icon="pi pi-plus"
        data-testid="add-unloading"
        :label="t('canvassUnloadings.addUnloading')"
        @click="router.push('/canvass-unloadings/create')"
      />
    </div>

    <Tabs v-if="activeTab" :value="activeTab" class="mb-4" @update:value="onTabChange">
      <TabList>
        <Tab
          v-for="tab in tabs"
          :key="tab.value"
          :value="tab.value"
          :data-testid="`canvass-tab-${tab.value}`"
        >
          {{ tab.label }}
        </Tab>
      </TabList>
    </Tabs>

    <!-- Kept alive so a tab's filters and page survive switching tabs. -->
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
import CanvassLoadingsTab from '@/views/canvass-loadings/CanvassLoadingsTab.vue'
import CanvassUnloadingsTab from '@/views/canvass-unloadings/CanvassUnloadingsTab.vue'
import { usePermissions } from '@/composables'

type CanvassTab = 'loadings' | 'unloadings'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const { canRead: canReadLoading, canWrite: canWriteLoading } = usePermissions('/canvass-loadings')
const { canRead: canReadUnloading, canWrite: canWriteUnloading } =
  usePermissions('/canvass-unloadings')

const COMPONENTS: Record<CanvassTab, Component> = {
  loadings: CanvassLoadingsTab,
  unloadings: CanvassUnloadingsTab,
}

const tabs = computed(() => {
  const list: { value: CanvassTab; label: string }[] = []
  if (canReadLoading.value) list.push({ value: 'loadings', label: t('canvass.tabs.loadings') })
  if (canReadUnloading.value) list.push({ value: 'unloadings', label: t('canvass.tabs.unloadings') })
  return list
})

function resolveTab(raw: unknown): CanvassTab | null {
  if (typeof raw === 'string' && tabs.value.some((tab) => tab.value === raw)) {
    return raw as CanvassTab
  }
  return tabs.value[0]?.value ?? null
}

const activeTab = ref<CanvassTab | null>(resolveTab(route.query.tab))
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
