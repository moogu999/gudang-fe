<template>
  <ResponsiveCard>
    <template #content>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
          <!-- Code -->
          <div class="flex flex-col gap-1">
            <label for="code" class="text-sm font-semibold">{{ t('routes.form.code') }}</label>
            <div class="flex w-full flex-col gap-1">
              <template v-if="mode === 'add'">
                <div class="mb-1 flex gap-2">
                  <Button
                    type="button"
                    :label="t('routes.form.codeAuto')"
                    :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                    size="small"
                    :disabled="!hasDefaultSeries || numberSeriesLoading"
                    @click="codeMode = 'auto'"
                  />
                  <Button
                    type="button"
                    :label="t('routes.form.codeManual')"
                    :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
                    size="small"
                    @click="codeMode = 'manual'"
                  />
                </div>
                <template v-if="codeMode === 'auto'">
                  <InputText
                    :value="numberSeriesLoading ? '' : previewCode"
                    :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
                    readonly
                    class="w-full font-mono"
                  />
                  <small class="text-surface-500">{{ t('routes.form.codeAssignedOnSave') }}</small>
                </template>
                <InputText
                  v-else
                  id="code"
                  v-model="code"
                  autocomplete="off"
                  class="w-full font-mono"
                  :invalid="!!errors.code"
                />
              </template>
              <InputText v-else :value="route?.code" readonly class="w-full font-mono" />
              <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
            </div>
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-1">
            <label for="name" class="text-sm font-semibold">
              {{ t('routes.form.name') }}<span class="ml-0.5 text-red-500">*</span>
            </label>
            <div class="flex w-full flex-col gap-1">
              <InputText
                id="name"
                v-model="name"
                autocomplete="off"
                maxlength="100"
                :disabled="readonly"
                :invalid="!!errors.name"
                class="w-full"
              />
              <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
            </div>
          </div>

          <!-- Branch -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">
              {{ t('routes.form.branch') }}<span class="ml-0.5 text-red-500">*</span>
            </label>
            <div class="flex w-full flex-col gap-1">
              <InfiniteSelect
                v-if="mode === 'add'"
                v-model="branchId"
                :fetch-fn="fetchBranches"
                :option-label="branchLabel"
                option-value="id"
                :placeholder="t('routes.form.selectBranch')"
                class="w-full"
                @update:model-value="onBranchChange"
              />
              <InputText
                v-else
                :value="route ? branchLabel(route.branch) : ''"
                readonly
                class="w-full"
              />
              <small v-if="mode === 'edit'" class="text-surface-500">{{
                t('routes.form.branchLocked')
              }}</small>
              <small v-if="errors.branchId" class="text-red-500">{{ errors.branchId }}</small>
            </div>
          </div>

          <!-- Sales team -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">
              {{ t('routes.form.team') }}<span class="ml-0.5 text-red-500">*</span>
            </label>
            <div class="flex w-full flex-col gap-1">
              <Select
                v-model="salesTeamId"
                :options="teamOptions"
                option-label="label"
                option-value="value"
                :placeholder="
                  branchId ? t('routes.form.selectTeam') : t('routes.form.selectBranchFirst')
                "
                :disabled="readonly || teamLocked || !branchId"
                :invalid="!!errors.salesTeamId"
                filter
                class="w-full"
                data-testid="team-select"
                @update:model-value="onTeamChange"
              />
              <small v-if="teamLocked" class="text-surface-500">{{ t('routes.form.teamLocked') }}</small>
              <small v-if="errors.salesTeamId" class="text-red-500">{{ errors.salesTeamId }}</small>
            </div>
          </div>

          <!-- Salesman -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('routes.form.salesman') }}</label>
            <div class="flex w-full flex-col gap-1">
              <template v-if="mode === 'add'">
                <Select
                  v-model="employeeId"
                  :options="memberOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="
                    salesTeamId ? t('routes.form.selectSalesman') : t('routes.form.selectTeamFirst')
                  "
                  :disabled="!salesTeamId"
                  show-clear
                  filter
                  class="w-full"
                  data-testid="salesman-select"
                />
                <small class="text-surface-500">{{ t('routes.form.salesmanStartsTomorrow') }}</small>
              </template>
              <div v-else class="flex flex-wrap items-center gap-2">
                <InputText :value="holderText" readonly class="min-w-0 flex-1" />
                <Button
                  v-if="!readonly"
                  type="button"
                  :label="t('routes.menu.changeSalesman')"
                  icon="pi pi-user-edit"
                  size="small"
                  severity="secondary"
                  :disabled="!route?.isActive"
                  data-testid="change-salesman"
                  @click="emit('changeSalesman')"
                />
              </div>
              <small v-if="showPendingNote && route?.pendingHolder" class="text-amber-600">
                {{
                  route.holder
                    ? t('routes.pendingHolder', {
                        name: route.pendingHolder.name,
                        date: route.pendingHolder.startDate,
                      })
                    : t('routes.startsOn', { date: route.pendingHolder.startDate })
                }}
              </small>
            </div>
          </div>

          <!-- Supervisor (read only) -->
          <div v-if="mode === 'edit'" class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('routes.form.supervisor') }}</label>
            <InputText :value="supervisorName" readonly class="w-full" />
            <small class="text-surface-500">{{ t('routes.form.supervisorHint') }}</small>
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-1 md:col-span-2">
            <label for="description" class="text-sm font-semibold">{{
              t('routes.form.description')
            }}</label>
            <Textarea
              id="description"
              v-model="description"
              rows="2"
              maxlength="255"
              auto-resize
              :disabled="readonly"
              class="w-full"
            />
          </div>
        </div>

        <Message v-if="mode === 'add'" severity="info" size="small" variant="simple">
          {{ t('routes.form.createInfo') }}
        </Message>

        <div v-if="!readonly || (mode === 'edit' && lastChanged)" class="flex flex-wrap items-center justify-end gap-2">
          <p v-if="mode === 'edit' && lastChanged" class="mr-auto text-xs text-stone-500">
            {{ lastChanged }}
          </p>
          <template v-if="!readonly">
            <Button
              type="button"
              :label="t('common.actions.cancel')"
              severity="secondary"
              :disabled="isLoading"
              @click="emit('cancel')"
            />
            <Button
              type="submit"
              :label="!isLoading ? t('common.actions.save') : ''"
              :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
              :disabled="isLoading"
            />
          </template>
        </div>
      </form>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { RoutesService, SalesTeamsService } from '@/services'
import { useNumberSeries } from '@/composables'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import DateFormat from '@/constants/dateFormat'
import type { CreateRouteRequest, Route } from '@/types'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    route?: Route
    isLoading?: boolean
    readonly?: boolean
  }>(),
  { route: undefined, isLoading: false, readonly: false },
)

const emit = defineEmits<{
  submit: [body: CreateRouteRequest]
  cancel: []
  changeSalesman: []
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('routes')
const code = ref('')

const name = ref(props.route?.name ?? '')
const description = ref(props.route?.description ?? '')
const branchId = ref<number | undefined>(
  props.route?.branch.id ?? authStore.primaryBranchId ?? authStore.branchIds[0],
)
const salesTeamId = ref<number | undefined>(props.route?.salesTeam.id)
const employeeId = ref<number | undefined>()
const fetchBranches = userBranchesFetcher(authStore.branchIds)

const teamOptions = ref<{ label: string; value: number }[]>([])
const memberOptions = ref<{ label: string; value: number }[]>([])
const supervisorName = ref('')

// The team decides which customers fit, so it is fixed once the route holds any.
const teamLocked = computed(
  () =>
    props.mode === 'edit' &&
    !!props.route &&
    (props.route.customerCount > 0 || !!props.route.holder || !!props.route.pendingHolder),
)

// A salesman who starts tomorrow is the route's salesman already; only a later change is shown as pending.
const holderText = computed(
  () => props.route?.holder?.name ?? props.route?.pendingHolder?.name ?? t('routes.noSalesman'),
)
const showPendingNote = computed(
  () => props.mode === 'edit' && !!props.route?.pendingHolder,
)

async function loadTeams() {
  teamOptions.value = []
  if (!branchId.value) return
  const wanted = branchId.value
  const res = await SalesTeamsService.list(`branchId=${wanted}&status=active&limit=100`)
  if (wanted !== branchId.value) return
  const options = res.data.map((team) => ({ label: `${team.code} · ${team.name}`, value: team.id }))
  // A route kept on a team that has since been deactivated still shows it.
  if (props.route && !options.some((o) => o.value === props.route!.salesTeam.id)) {
    options.unshift({
      label: `${props.route.salesTeam.code} · ${props.route.salesTeam.name}`,
      value: props.route.salesTeam.id,
    })
  }
  teamOptions.value = options
}

async function loadMembers() {
  memberOptions.value = []
  employeeId.value = undefined
  if (props.mode !== 'add' || !salesTeamId.value || !branchId.value) return
  const wanted = salesTeamId.value
  const members = (await SalesTeamsService.listMembers(wanted)).filter((m) => m.isCurrent)
  const loads = await RoutesService.salesmanLoadBulk(
    branchId.value,
    members.map((m) => m.employee.id),
  ).catch(() => [])
  if (wanted !== salesTeamId.value) return
  const byEmployee = new Map(loads.map((l) => [l.employeeId, l]))
  memberOptions.value = members.map((m) => {
    const hint = byEmployee.get(m.employee.id)
    const base = m.employee.nip ? `${m.employee.name} · ${m.employee.nip}` : m.employee.name
    return {
      label: hint
        ? `${base} (${t('routes.handover.hint', { routes: hint.routes, customers: hint.customers })})`
        : base,
      value: m.employee.id,
    }
  })
}

async function loadSupervisor() {
  if (props.mode !== 'edit' || !props.route) return
  try {
    const team = await SalesTeamsService.get(props.route.salesTeam.id)
    supervisorName.value = team.supervisor.name
  } catch {
    supervisorName.value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadTeams().catch(() => undefined), loadSupervisor(), loadMembers().catch(() => undefined)])
})

function onBranchChange() {
  // Teams belong to one branch.
  salesTeamId.value = undefined
  employeeId.value = undefined
  memberOptions.value = []
  loadTeams()
}

function onTeamChange() {
  loadMembers().catch(() => undefined)
}

const lastChanged = computed(() => {
  const route = props.route
  if (!route) return ''
  const user = route.updatedByName ?? route.createdByName
  const at = route.updatedAt ?? route.createdAt
  if (!user || !at) return ''
  return t('routes.form.lastChanged', { user, date: dayjs(at).format(DateFormat.DATE_TIME) })
})

const errors = reactive<Record<string, string>>({})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  if (props.mode === 'add' && codeMode.value === 'manual' && !code.value.trim()) {
    errors.code = t('routes.validation.codeRequired')
  }
  if (!name.value.trim()) errors.name = t('routes.validation.nameRequired')
  if (!branchId.value) errors.branchId = t('routes.validation.branchRequired')
  if (!salesTeamId.value) errors.salesTeamId = t('routes.validation.teamRequired')
  return Object.keys(errors).length === 0
}

function onSubmit() {
  if (!validate()) return
  emit('submit', {
    code: props.mode === 'add' && codeMode.value === 'manual' ? code.value.trim() : undefined,
    name: name.value.trim(),
    description: description.value.trim() || null,
    branchId: branchId.value!,
    salesTeamId: salesTeamId.value!,
    employeeId: props.mode === 'add' ? (employeeId.value ?? null) : undefined,
  })
}

/** Lets the view put a server-side field error (e.g. a duplicate name) under its input. */
function setFieldError(field: 'code' | 'name' | 'salesTeamId', message: string) {
  errors[field] = message
}

defineExpose({ setFieldError })
</script>
