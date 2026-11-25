<template>
  <Dialog
    :visible="true"
    :header="t('routes.handover.title', { code: route.code, name: route.name })"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '40rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-4 text-sm text-stone-600">
      {{
        t('routes.handover.subtitle', { n: route.customerCount, team: route.salesTeam.code }, route.customerCount)
      }}
    </p>

    <div class="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div class="flex-1 rounded-md border p-3" data-testid="current-holder">
        <div class="text-xs text-stone-500 uppercase">{{ t('routes.handover.current') }}</div>
        <template v-if="route.holder">
          <div class="font-semibold">{{ route.holder.name }}</div>
          <div class="text-xs text-stone-500">{{ route.holder.nip }}</div>
        </template>
        <div v-else class="text-amber-600">{{ t('routes.noSalesman') }}</div>
      </div>
      <i class="pi pi-arrow-right self-center text-stone-400 max-sm:rotate-90" />
      <div class="flex-1">
        <label for="newHolder" class="text-xs text-stone-500 uppercase">{{
          t('routes.handover.new')
        }}</label>
        <Select
          v-model="selected"
          input-id="newHolder"
          :options="options"
          option-label="label"
          option-value="value"
          :placeholder="t('routes.handover.selectSalesman')"
          :loading="loadingMembers"
          filter
          class="w-full"
          data-testid="holder-select"
        />
        <small class="text-surface-500">{{
          t('routes.handover.onlyMembers', { team: route.salesTeam.code })
        }}</small>
      </div>
    </div>

    <div class="mb-3 flex flex-col gap-1">
      <label for="handoverDate" class="text-sm font-semibold">{{
        t('routes.handover.effectiveDate')
      }}</label>
      <DatePicker
        v-model="effectiveDate"
        input-id="handoverDate"
        :min-date="minDate"
        date-format="yy-mm-dd"
        show-icon
        fluid
        class="w-full"
      />
      <small class="text-stone-500">{{ t('routes.handover.dateHint') }}</small>
    </div>

    <Message v-if="route.pendingHolder" severity="info" size="small" class="mb-3">
      {{
        t('routes.handover.replacesPending', {
          name: route.pendingHolder.name,
          date: route.pendingHolder.startDate,
        })
      }}
    </Message>

    <Message v-if="loadWarning" severity="warn" size="small" class="mb-3" data-testid="load-warning">
      {{ loadWarning }}
    </Message>

    <Message v-if="errorText" severity="error" size="small" data-testid="handover-error">
      {{ errorText }}
    </Message>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t('routes.handover.confirm')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="selected === undefined || !effectiveDate || isSaving"
        data-testid="confirm-handover"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { RoutesService, SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { Route, SalesmanLoadItem } from '@/types'
import { fromApiDate, toApiDate, tomorrowIso } from '../routeHelpers'
import { holderIneligibleReason, routeErrorCode, translateRouteError } from '../routeErrors'

const props = defineProps<{ route: Route; toastGroup: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { t } = useI18n()
const toast = useToast()

/** Stands for "remove the salesman" in the select. */
const REMOVE = -1

const minDate = fromApiDate(tomorrowIso())
const effectiveDate = ref<Date | null>(minDate)
const selected = ref<number | undefined>()
const isSaving = ref(false)
const loadingMembers = ref(false)
const errorText = ref('')
const members = ref<{ id: number; name: string; nip?: string | null }[]>([])
const hints = ref<Map<number, SalesmanLoadItem>>(new Map())
const loadWarning = ref('')

const options = computed(() => [
  ...members.value.map((m) => {
    const hint = hints.value.get(m.id)
    const base = m.nip ? `${m.name} · ${m.nip}` : m.name
    return {
      label: hint ? `${base} (${t('routes.handover.hint', { routes: hint.routes, customers: hint.customers })})` : base,
      value: m.id,
    }
  }),
  { label: t('routes.handover.removeSalesman'), value: REMOVE },
])

onMounted(async () => {
  loadingMembers.value = true
  try {
    const all = await SalesTeamsService.listMembers(props.route.salesTeam.id)
    members.value = all
      .filter((m) => m.isCurrent && m.employee.id !== props.route.holder?.employeeId)
      .map((m) => ({ id: m.employee.id, name: m.employee.name, nip: m.employee.nip }))
    const loads = await RoutesService.salesmanLoadBulk(
      props.route.branch.id,
      members.value.map((m) => m.id),
    ).catch(() => [])
    hints.value = new Map(loads.map((l) => [l.employeeId, l]))
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    loadingMembers.value = false
  }
})

// The worst day after the handover, as a sentence; never blocks the save.
watch(selected, async (employeeId) => {
  loadWarning.value = ''
  errorText.value = ''
  if (employeeId === undefined || employeeId === REMOVE) return
  const member = members.value.find((m) => m.id === employeeId)
  try {
    const [after, current] = await Promise.all([
      RoutesService.salesmanLoad(props.route.branch.id, employeeId, {
        includeRouteId: props.route.id,
      }),
      RoutesService.salesmanLoad(props.route.branch.id, employeeId),
    ])
    let worst: { week: number; bit: number; value: number } | null = null
    after.grid.forEach((row, week) =>
      row.forEach((value, bit) => {
        if (value > after.maxVisitsPerDay && (!worst || value > worst.value)) {
          worst = { week, bit, value }
        }
      }),
    )
    const cell = worst as { week: number; bit: number; value: number } | null
    if (!cell || selected.value !== employeeId) return
    const before = current.grid[cell.week]?.[cell.bit] ?? 0
    loadWarning.value = t('routes.handover.loadWarning', {
      name: member?.name ?? '',
      day: `${t(`calendar.weekdaysShort.${cell.bit}`)} W${cell.week + 1}`,
      after: cell.value,
      current: before,
      route: cell.value - before,
      max: after.maxVisitsPerDay,
    })
  } catch {
    // The warning is advice; a failed read just leaves it out.
  }
})

async function onConfirm() {
  if (selected.value === undefined || !effectiveDate.value) return
  isSaving.value = true
  errorText.value = ''
  try {
    await RoutesService.handover(props.route.id, {
      employeeId: selected.value === REMOVE ? null : selected.value,
      effectiveDate: toApiDate(effectiveDate.value),
    })
    toast.add(commonSuccessToast(t('routes.messages.handoverSaved'), props.toastGroup))
    emit('changed')
    emit('close')
  } catch (e) {
    const reason = holderIneligibleReason(e)
    if (routeErrorCode(e) === 'ROUTE_HOLDER_NOT_ELIGIBLE' && reason) {
      errorText.value = t(`routes.handover.ineligible.${reason}`)
    } else {
      toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
    }
  } finally {
    isSaving.value = false
  }
}

</script>
