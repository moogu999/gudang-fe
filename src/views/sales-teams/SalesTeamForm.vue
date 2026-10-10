<template>
  <ResponsiveCard>
    <template #content>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
          <!-- Code -->
          <div class="flex flex-col gap-1">
            <label for="code" class="text-sm font-semibold">{{ t('salesTeams.form.code') }}</label>
            <div class="flex w-full flex-col gap-1">
              <template v-if="mode === 'add'">
                <div class="mb-1 flex gap-2">
                  <Button
                    type="button"
                    :label="t('salesTeams.form.codeAuto')"
                    :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                    size="small"
                    :disabled="!hasDefaultSeries || numberSeriesLoading"
                    @click="codeMode = 'auto'"
                  />
                  <Button
                    type="button"
                    :label="t('salesTeams.form.codeManual')"
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
                  <small class="text-surface-500">{{
                    t('salesTeams.form.codeAssignedOnSave')
                  }}</small>
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
              <InputText v-else :value="team?.code" readonly class="w-full font-mono" />
              <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
            </div>
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-1">
            <label for="name" class="text-sm font-semibold">
              {{ t('salesTeams.form.name') }}<span class="ml-0.5 text-red-500">*</span>
            </label>
            <div class="flex w-full flex-col gap-1">
              <InputText
                id="name"
                v-model="name"
                autocomplete="off"
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
              {{ t('salesTeams.form.branch') }}<span class="ml-0.5 text-red-500">*</span>
            </label>
            <div class="flex w-full flex-col gap-1">
              <InfiniteSelect
                v-if="mode === 'add'"
                v-model="branchId"
                :fetch-fn="fetchBranches"
                :option-label="branchLabel"
                option-value="id"
                :placeholder="t('salesTeams.form.selectBranch')"
                class="w-full"
                @update:model-value="onBranchChange"
              />
              <InputText
                v-else
                :value="team ? branchLabel(team.branch) : ''"
                readonly
                class="w-full"
              />
              <small v-if="mode === 'edit'" class="text-surface-500">{{
                t('salesTeams.form.branchLocked')
              }}</small>
              <small v-if="errors.branchId" class="text-red-500">{{ errors.branchId }}</small>
            </div>
          </div>

          <!-- Supervisor -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">
              {{ t('salesTeams.form.supervisor') }}<span class="ml-0.5 text-red-500">*</span>
            </label>
            <div class="flex w-full flex-col gap-1">
              <InfiniteSelect
                v-if="supervisorTypeId && branchId"
                :key="`supervisor-${branchId}`"
                v-model="supervisorEmployeeId"
                :fetch-fn="fetchSupervisors"
                :custom-filters="supervisorFilters(supervisorTypeId, branchId)"
                :option-label="employeeLabel"
                option-value="id"
                :initial-option="initialSupervisorCleared ? undefined : initialSupervisor"
                :disabled="readonly"
                :placeholder="t('salesTeams.form.selectSupervisor')"
                class="w-full"
              />
              <Select
                v-else
                disabled
                :options="[]"
                :placeholder="
                  supervisorTypeMissing
                    ? t('salesTeams.form.supervisorTypeMissing')
                    : t('salesTeams.form.selectBranchFirst')
                "
                class="w-full"
              />
              <Message v-if="savedSupervisorInvalid" severity="warn" size="small" variant="simple">
                {{ t('salesTeams.form.supervisorInvalid', { name: base?.supervisor.name ?? '' }) }}
              </Message>
              <small v-if="errors.supervisorEmployeeId" class="text-red-500">{{
                errors.supervisorEmployeeId
              }}</small>
            </div>
          </div>

          <!-- Channel -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('salesTeams.form.channel') }}</label>
            <div class="flex w-full flex-col gap-1">
              <InfiniteSelect
                v-model="customerChannelId"
                :fetch-fn="(q) => CustomerChannelsService.list(q)"
                :custom-filters="activeChannelFilters"
                :option-label="channelLabel"
                option-value="id"
                :initial-option="initialChannel"
                :disabled="readonly"
                :placeholder="t('salesTeams.form.selectChannel')"
                sort-by="name"
                sort-operator="asc"
                show-clear
                class="w-full"
              />
            </div>
          </div>
        </div>

        <Message v-if="mode === 'add' && source" severity="info" size="small" variant="simple">
          {{ t('salesTeams.duplicate.copyNote', { n: source.skuCount }) }}
        </Message>
        <Message v-else-if="mode === 'add'" severity="info" size="small" variant="simple">
          {{ t('salesTeams.form.tabsAfterSave') }}
        </Message>

        <div
          v-if="!readonly || (mode === 'edit' && lastChanged)"
          class="flex flex-wrap items-center justify-end gap-2"
        >
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
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CustomerChannelsService, EmployeesService } from '@/services'
import { useNumberSeries } from '@/composables'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import type { Base } from '@/types/api.type'
import type {
  CreateSalesTeamRequest,
  SalesTeam,
  SalesTeamEmployeeLite,
} from '@/types/salesTeam.type'
import {
  findSalesSupervisorTypeId,
  supervisorFilters,
  userBranchesFetcher,
} from './salesTeamHelpers'

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    team?: SalesTeam
    /** Add mode only: the team being duplicated, whose header prefills the form. */
    source?: SalesTeam
    isLoading?: boolean
    readonly?: boolean
  }>(),
  { team: undefined, source: undefined, isLoading: false, readonly: false },
)

const emit = defineEmits<{
  submit: [body: CreateSalesTeamRequest]
  cancel: []
}>()

const { t } = useI18n()
const authStore = useAuthStore()

// Code: generated server-side when blank, so Auto just sends no code.
const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('sales_teams')
const code = ref('')

// The team being edited, or the one being duplicated.
const base = props.mode === 'edit' ? props.team : props.source

const name = ref(
  props.mode === 'edit'
    ? (props.team?.name ?? '')
    : props.source
      ? t('salesTeams.duplicate.namePrefix', { name: props.source.name })
      : '',
)
const branchId = ref<number | undefined>(
  base?.branch.id ?? authStore.primaryBranchId ?? authStore.branchIds[0],
)
const fetchBranches = userBranchesFetcher(authStore.branchIds)

// A supervisor deactivated, or retyped, after being picked stays on the team, but
// the next save needs a valid one, so it isn't preselected.
const savedSupervisorInvalid = computed(
  () =>
    !!base &&
    (!base.supervisor.isActive ||
      base.supervisor.employeeType?.name !== EMPLOYEE_TYPE_NAMES.SALES_SUPERVISOR),
)
const supervisorEmployeeId = ref<number | undefined>(
  base && !savedSupervisorInvalid.value ? base.supervisor.id : undefined,
)
const initialSupervisor = computed(() =>
  base && !savedSupervisorInvalid.value ? base.supervisor : undefined,
)

const supervisorTypeId = ref<number | undefined>()
const supervisorTypeMissing = ref(false)

onMounted(async () => {
  try {
    supervisorTypeId.value = await findSalesSupervisorTypeId()
  } catch {
    // Leaves the picker disabled; the placeholder explains why.
  }
  supervisorTypeMissing.value = !supervisorTypeId.value
})

function onBranchChange() {
  // Supervisors belong to one branch.
  supervisorEmployeeId.value = undefined
  initialSupervisorCleared.value = true
}
// Once the branch changes, the prefilled supervisor no longer applies.
const initialSupervisorCleared = ref(false)

const customerChannelId = ref<number | null>(base?.channel?.id ?? null)
const initialChannel = computed(() => base?.channel)
const activeChannelFilters = [
  { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

// What both the employee list and the saved supervisor have, so the latter can seed the picker.
type SupervisorOption = Pick<SalesTeamEmployeeLite, 'id' | 'name'> & { nip?: string | null }

function fetchSupervisors(query: string): Promise<Base<SupervisorOption>> {
  return EmployeesService.listForSelect(query)
}

function employeeLabel(e: SupervisorOption): string {
  return e.nip ? `${e.name} · ${e.nip}` : e.name
}

function channelLabel(c: { code?: string; name?: string }): string {
  return c.code && c.name ? `${c.code} - ${c.name}` : (c.name ?? c.code ?? '')
}

const lastChanged = computed(() => {
  const team = props.team
  if (!team) return ''
  const user = team.updatedBy?.name ?? team.createdBy?.name
  const at = team.updatedAt ?? team.createdAt
  if (!user || !at) return ''
  return t('salesTeams.form.lastChanged', {
    user,
    date: dayjs(at).format(DateFormat.DATE_TIME),
  })
})

const errors = reactive<Record<string, string>>({})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  if (props.mode === 'add' && codeMode.value === 'manual' && !code.value.trim()) {
    errors.code = t('salesTeams.validation.codeRequired')
  }
  if (!name.value.trim()) errors.name = t('salesTeams.validation.nameRequired')
  if (!branchId.value) errors.branchId = t('salesTeams.validation.branchRequired')
  if (!supervisorEmployeeId.value) {
    errors.supervisorEmployeeId = t('salesTeams.validation.supervisorRequired')
  }
  return Object.keys(errors).length === 0
}

function onSubmit() {
  if (!validate()) return
  emit('submit', {
    code: props.mode === 'add' && codeMode.value === 'manual' ? code.value.trim() : undefined,
    name: name.value.trim(),
    branchId: branchId.value!,
    supervisorEmployeeId: supervisorEmployeeId.value!,
    customerChannelId: customerChannelId.value ?? null,
    copyFromTeamId: props.mode === 'add' ? props.source?.id : undefined,
  })
}
</script>
