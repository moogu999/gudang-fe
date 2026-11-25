<template>
  <Dialog
    :visible="true"
    :header="t('routes.add.title', { code: route.code })"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '62vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('routes.add.search')"
          data-testid="option-search"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
      <Select
        v-model="outletTypeId"
        :options="outletTypes"
        option-label="name"
        option-value="id"
        :placeholder="t('routes.add.allTypes')"
        show-clear
        filter
        class="min-w-48"
        @update:model-value="fetchPage(0)"
      />
    </div>

    <Message v-if="conflictText" severity="error" size="small" class="mb-3" data-testid="add-conflict">
      {{ conflictText }}
    </Message>

    <DataTable
      :value="rows"
      data-key="id"
      lazy
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :loading="loading"
      scrollable
      scroll-height="38vh"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
    >
      <Column header-style="width: 3rem">
        <template #body="{ data }">
          <Checkbox
            binary
            :model-value="selected.has(data.id)"
            :disabled="!isSelectable(data)"
            :aria-label="data.name"
            :data-testid="`pick-${data.id}`"
            @update:model-value="toggle(data)"
          />
        </template>
      </Column>
      <Column field="code" :header="t('routes.add.columns.code')" class="font-mono" />
      <Column field="name" :header="t('routes.add.columns.name')" />
      <Column :header="t('routes.add.columns.customerType')">
        <template #body="{ data }">{{ data.outletType ?? '—' }}</template>
      </Column>
      <Column header-style="width: 2.5rem">
        <template #body="{ data }">
          <i
            class="pi pi-map-marker"
            :class="hasLocation(data) ? 'text-[var(--p-primary-500)]' : 'text-stone-300'"
            :title="hasLocation(data) ? t('routes.add.hasLocation') : t('routes.add.noLocation')"
          />
        </template>
      </Column>
      <Column :header="t('routes.add.columns.status')">
        <template #body="{ data }">
          <span v-if="data.inThisRoute" class="text-stone-500">{{ t('routes.add.inThisRoute') }}</span>
          <div v-else-if="data.teamRoute" class="flex flex-col items-start gap-1">
            <span class="text-red-600" data-testid="team-route-block">
              {{
                t('routes.add.inTeamRoute', {
                  code: data.teamRoute.routeCode,
                  name: data.teamRoute.routeName,
                  salesman: data.teamRoute.holderName ?? t('routes.noSalesman'),
                })
              }}
            </span>
            <Button
              v-if="canMove"
              type="button"
              size="small"
              text
              :label="t('routes.add.moveHere')"
              :data-testid="`move-${data.id}`"
              @click="emit('move', data)"
            />
          </div>
          <div v-else-if="data.otherTeamRoutes.length" class="text-xs text-stone-500">
            <div v-for="(other, i) in data.otherTeamRoutes" :key="i">
              {{
                t('routes.add.alsoIn', {
                  route: other.routeCode,
                  team: other.teamCode,
                  salesman: other.holderName ?? t('routes.noSalesman'),
                })
              }}
            </div>
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
      </template>
    </DataTable>

    <div class="mt-4 flex flex-col gap-2">
      <p class="text-sm font-semibold">{{ t('routes.add.scheduleTitle') }}</p>
      <WeekdayChips v-if="frequency !== 'CUSTOM'" v-model="mask" :allow-sunday="allowSunday" />
      <div class="flex flex-wrap items-center gap-3">
        <Select
          v-model="frequency"
          :options="frequencyOptions"
          option-label="label"
          option-value="value"
          class="w-56"
        />
        <Select
          v-if="frequency === 'F1'"
          v-model="f1Week"
          :options="weekOptions"
          option-label="label"
          option-value="value"
          class="w-24"
        />
      </div>
      <small v-if="frequency === 'CUSTOM'" class="text-stone-500">{{
        t('routes.add.customHint')
      }}</small>
      <small class="text-stone-500">{{ t('routes.add.teamRule') }}</small>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <span class="text-sm">{{ t('routes.add.selected', { n: selected.size }) }}</span>
        <div class="flex gap-2">
          <Button
            :label="t('common.actions.cancel')"
            severity="secondary"
            :disabled="saving"
            @click="emit('close')"
          />
          <Button
            :label="t('routes.add.add', { n: selected.size }, selected.size)"
            icon="pi pi-plus"
            :loading="saving"
            :disabled="selected.size === 0 || mask === 0"
            data-testid="add-customers"
            @click="onAdd"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import WeekdayChips from '@/components/calendar/WeekdayChips.vue'
import { CustomerOutletTypesService, RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { Frequency, Route, RouteCustomerOption } from '@/types'
import { routeErrorCode, teamRouteConflicts, translateRouteError } from '../routeErrors'

const props = defineProps<{
  route: Route
  allowSunday: boolean
  /** Moving needs the write permission; the dialog itself is write-only already. */
  canMove: boolean
  toastGroup: string
}>()
const emit = defineEmits<{ close: []; added: []; move: [option: RouteCustomerOption] }>()

const { t } = useI18n()
const toast = useToast()

const pageSize = 10
const rows = ref<RouteCustomerOption[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const outletTypeId = ref<number | undefined>()
const outletTypes = ref<{ id: number; name: string }[]>([])
const conflictText = ref('')

// The selection survives paging, so customers can be picked across pages.
const selected = ref(new Map<number, RouteCustomerOption>())

const mask = ref(props.route.visitDays || 1)
const frequency = ref<Frequency | 'CUSTOM'>('F4')
const f1Week = ref(1)

const frequencyOptions = computed(() => [
  { label: t('routes.pattern.F4'), value: 'F4' as Frequency },
  { label: t('routes.pattern.F2_ODD'), value: 'F2_ODD' as Frequency },
  { label: t('routes.pattern.F2_EVEN'), value: 'F2_EVEN' as Frequency },
  { label: t('routes.pattern.F1'), value: 'F1' as Frequency },
  { label: t('routes.pattern.CUSTOM'), value: 'CUSTOM' as const },
])
const weekOptions = [1, 2, 3, 4].map((w) => ({ label: `W${w}`, value: w }))

function isSelectable(option: RouteCustomerOption): boolean {
  return !option.inThisRoute && !option.teamRoute
}

function hasLocation(option: RouteCustomerOption): boolean {
  return !!option.latitude && !!option.longitude
}

function toggle(option: RouteCustomerOption) {
  const next = new Map(selected.value)
  if (next.has(option.id)) next.delete(option.id)
  else next.set(option.id, option)
  selected.value = next
}

async function fetchPage(nextPage: number) {
  loading.value = true
  try {
    const res = await RoutesService.customerOptions(props.route.id, {
      search: search.value.trim() || undefined,
      outletTypeId: outletTypeId.value,
      limit: pageSize,
      offset: nextPage * pageSize,
    })
    rows.value = res.data
    total.value = res.meta.total
    page.value = nextPage
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  saving.value = true
  conflictText.value = ''
  try {
    const pattern =
      frequency.value === 'CUSTOM'
        ? { patternType: 'custom' as const, customDates: [] }
        : {
            patternType: 'cycle' as const,
            daysMask: mask.value,
            frequency: frequency.value,
            f1Week: frequency.value === 'F1' ? f1Week.value : undefined,
          }
    await RoutesService.addCustomers(
      props.route.id,
      [...selected.value.keys()].map((customerId) => ({ customerId, pattern })),
    )
    toast.add(
      commonSuccessToast(t('routes.messages.customersAdded', { n: selected.value.size }, selected.value.size), props.toastGroup),
    )
    emit('added')
    emit('close')
  } catch (e) {
    const conflicts = teamRouteConflicts(e)
    if (routeErrorCode(e) === 'ROUTE_CUSTOMER_IN_TEAM_ROUTE' && conflicts.length > 0) {
      // Someone else put a customer into a route of the team after the list loaded.
      const first = conflicts[0]
      conflictText.value = t('routes.errors.customerInTeamRouteNamed', {
        route: `${first.routeCode} ${first.routeName}`,
        salesman: first.holderName ?? t('routes.noSalesman'),
      })
      await fetchPage(page.value)
      const next = new Map(selected.value)
      for (const c of conflicts) next.delete(c.customerId)
      selected.value = next
    } else {
      toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchPage(0)
  try {
    const res = await CustomerOutletTypesService.list('limit=100')
    outletTypes.value = res.data.map((o) => ({ id: o.id, name: o.name }))
  } catch {
    // Non-critical: the type filter just stays empty.
  }
})
</script>
