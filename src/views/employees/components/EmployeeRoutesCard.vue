<template>
  <ResponsiveCard class="mb-6" data-testid="employee-routes">
    <template #header>
      <h2 class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6">
        {{ t('employees.sections.routes') }}
      </h2>
    </template>
    <template #content>
      <div class="px-4 pb-4 sm:px-6 sm:pb-6">
        <p class="mb-3 text-sm text-stone-500">{{ t('employees.routes.managedFromRoutes') }}</p>

        <div v-if="loading" class="flex justify-center py-4">
          <i class="pi pi-spinner pi-spin text-xl text-stone-400" />
        </div>
        <p v-else-if="routes.length === 0" class="text-sm text-stone-500">
          {{ t('employees.routes.empty') }}
        </p>
        <DataTable v-else :value="routes" data-key="id" class="text-sm">
          <Column :header="t('employees.routes.columns.code')">
            <template #body="{ data }">
              <router-link
                :to="`/routes/${data.id}/edit`"
                class="text-primary-500 font-mono hover:underline"
              >
                {{ data.code }}
              </router-link>
            </template>
          </Column>
          <Column field="name" :header="t('employees.routes.columns.name')" />
          <Column :header="t('employees.routes.columns.team')">
            <template #body="{ data }">{{ data.salesTeam.code }}</template>
          </Column>
          <Column field="customerCount" :header="t('employees.routes.columns.customers')" />
          <Column>
            <template #body="{ data }">
              <Tag
                v-if="isPending(data)"
                severity="info"
                :value="t('employees.routes.from', { date: data.pendingHolder.startDate })"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { RoutesService } from '@/services'
import type { Route } from '@/types'

const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const routes = ref<Route[]>([])
const loading = ref(false)

/** A route this employee takes over from a later date, not yet theirs. */
function isPending(route: Route): boolean {
  return route.pendingHolder?.employeeId === props.employeeId
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await RoutesService.list({ holderId: props.employeeId, limit: 100 })
    routes.value = res.data
  } catch {
    // The card is informational; an unreadable list just shows as empty.
    routes.value = []
  } finally {
    loading.value = false
  }
})
</script>
