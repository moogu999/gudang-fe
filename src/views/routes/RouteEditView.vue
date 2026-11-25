<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog :group="confirmGroup" />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/routes')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ route ? `${route.code} · ${route.name}` : t('routes.editRoute') }}
      </h1>
      <Tag
        v-if="route"
        :value="route.isActive ? t('routes.status.active') : t('routes.status.inactive')"
        :severity="route.isActive ? 'success' : 'secondary'"
      />
      <div v-if="route && canWrite" class="ml-auto flex gap-2">
        <Button
          :label="route.isActive ? t('routes.menu.deactivate') : t('routes.menu.activate')"
          :icon="route.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
          severity="secondary"
          size="small"
          data-testid="toggle-active"
          @click="confirmToggle"
        />
      </div>
    </div>

    <div v-if="isLoadingRoute && !route" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="route">
      <Message v-if="!route.isActive" severity="warn" class="mb-4" data-testid="inactive-banner">
        {{ t('routes.inactiveBanner') }}
      </Message>

      <!-- Remounted after each save: the form reads the route only on mount. -->
      <RouteForm
        :key="formKey"
        ref="form"
        mode="edit"
        :route="route"
        :is-loading="isSaving"
        :readonly="!canWrite"
        @submit="onSubmit"
        @cancel="router.push('/routes')"
        @change-salesman="isHandoverShown = true"
      />

      <ResponsiveCard class="mt-6">
        <template #content>
          <Tabs v-model:value="activeTab">
            <TabList>
              <Tab value="customers">
                {{ t('routes.tabs.customers') }} ({{ route.customerCount }})
              </Tab>
              <Tab value="salesmen">{{ t('routes.tabs.salesmen') }}</Tab>
              <Tab value="history">{{ t('routes.tabs.history') }}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="customers">
                <RouteCustomersTab
                  :route="route"
                  :config="config"
                  :holidays="holidays"
                  :can-write="canWrite && route.isActive"
                  :toast-group="toastGroup"
                  @changed="reloadRoute"
                />
              </TabPanel>
              <TabPanel value="salesmen">
                <RouteSalesmenTab
                  :route="route"
                  :can-write="canWrite"
                  :reload-key="reloadKey"
                  :toast-group="toastGroup"
                  @changed="reloadRoute"
                />
              </TabPanel>
              <TabPanel value="history">
                <RouteHistoryTab
                  :route-id="route.id"
                  :reload-key="reloadKey"
                  :toast-group="toastGroup"
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </template>
      </ResponsiveCard>

      <RouteChangeSalesmanDialog
        v-if="isHandoverShown"
        :route="route"
        :toast-group="toastGroup"
        @close="isHandoverShown = false"
        @changed="reloadRoute"
      />
    </template>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('routes.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { JourneyPlanConfigService, RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import type { CreateRouteRequest, JourneyPlanConfig, Route } from '@/types'
import RouteForm from './RouteForm.vue'
import RouteCustomersTab from './components/RouteCustomersTab.vue'
import RouteSalesmenTab from './components/RouteSalesmenTab.vue'
import RouteHistoryTab from './components/RouteHistoryTab.vue'
import RouteChangeSalesmanDialog from './components/RouteChangeSalesmanDialog.vue'
import { loadBranchHolidays, type HolidayRange } from './routeHelpers'
import { routeErrorCode, routeErrorField, routeErrorKey, translateRouteError } from './routeErrors'

const { t } = useI18n()
const vueRoute = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { canWrite } = usePermissions('/routes')

const toastGroup = 'routeEdit'
const confirmGroup = 'routeEditConfirm'
const route = ref<Route | undefined>()
const config = ref<JourneyPlanConfig | undefined>()
const holidays = ref<HolidayRange[]>([])
const isLoadingRoute = ref(false)
const isSaving = ref(false)
const isHandoverShown = ref(false)
const formKey = ref(0)
const reloadKey = ref(0)
const activeTab = ref('customers')
const form = ref<InstanceType<typeof RouteForm>>()

const routeId = Number(vueRoute.params.id)

async function reloadRoute() {
  isLoadingRoute.value = true
  try {
    route.value = await RoutesService.get(routeId)
    reloadKey.value++
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), toastGroup))
  } finally {
    isLoadingRoute.value = false
  }
}

async function loadSupport() {
  if (!route.value) return
  const branchId = route.value.branch.id
  const [configResult, holidayResult] = await Promise.allSettled([
    JourneyPlanConfigService.getMyBranch(branchId),
    loadBranchHolidays(branchId),
  ])
  if (configResult.status === 'fulfilled') config.value = configResult.value
  if (holidayResult.status === 'fulfilled') holidays.value = holidayResult.value
}

onMounted(async () => {
  if (isNaN(routeId)) {
    router.push('/routes')
    return
  }
  await reloadRoute()
  await loadSupport()
})

async function onSubmit(body: CreateRouteRequest) {
  if (!route.value) return
  isSaving.value = true
  try {
    await RoutesService.update(route.value.id, {
      version: route.value.version,
      name: body.name,
      salesTeamId: body.salesTeamId,
      description: body.description ?? null,
    })
    // Re-read rather than trusting the update response, so the form shows exactly what was stored.
    await reloadRoute()
    formKey.value++
    toast.add(commonSuccessToast(t('routes.messages.updated'), toastGroup))
  } catch (e) {
    const code = routeErrorCode(e)
    const field = routeErrorField(code)
    const key = routeErrorKey(code)
    if (field && key) form.value?.setFieldError(field, t(key))
    else toast.add(commonErrorToast(translateRouteError(e, t), toastGroup))
  } finally {
    isSaving.value = false
  }
}

function confirmToggle() {
  const current = route.value
  if (!current) return
  const deactivating = current.isActive
  confirm.require({
    group: confirmGroup,
    header: deactivating ? t('routes.deactivate.header') : t('routes.activate.header'),
    message: deactivating
      ? t('routes.deactivate.message', { code: current.code })
      : t('routes.activate.message', { code: current.code }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: deactivating ? t('routes.menu.deactivate') : t('routes.menu.activate') },
    accept: async () => {
      try {
        if (deactivating) await RoutesService.deactivate(current.id)
        else await RoutesService.activate(current.id)
        toast.add(
          commonSuccessToast(
            deactivating ? t('routes.messages.deactivated') : t('routes.messages.activated'),
            toastGroup,
          ),
        )
        await reloadRoute()
      } catch (e) {
        toast.add(commonErrorToast(translateRouteError(e, t), toastGroup))
      }
    },
  })
}
</script>
