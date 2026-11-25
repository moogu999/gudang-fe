<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog :group="confirmGroup" />

    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">{{ t('visitRules.title') }}</h1>
        <p class="mt-1 text-sm text-stone-500" data-testid="subtitle">
          <template v-if="data">
            {{
              data.lastChangedAt
                ? t('visitRules.lastChanged', {
                    company: data.company.name,
                    by: data.lastChangedBy ?? '—',
                    at: dayjs(data.lastChangedAt).format(DateFormat.DATE_TIME),
                  })
                : t('visitRules.neverChanged', { company: data.company.name })
            }}
          </template>
          <template v-else>{{ t('visitRules.subtitle') }}</template>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Select
          v-if="companies.length > 1"
          :model-value="companyId"
          :options="companies"
          option-label="name"
          option-value="id"
          :placeholder="t('visitRules.selectCompany')"
          class="min-w-48"
          data-testid="company-select"
          @update:model-value="onCompanyChange"
        />
        <Button
          type="button"
          icon="pi pi-search"
          severity="secondary"
          outlined
          :label="t('visitRules.actions.checkSalesman')"
          data-testid="check-salesman"
          @click="isDrawerShown = true"
        />
      </div>
    </div>

    <p v-if="!isLoadingCompanies && companies.length === 0" class="text-sm text-stone-500">
      {{ t('visitRules.noCompanies') }}
    </p>

    <ResponsiveCard v-else-if="companyId">
      <template #content>
        <Tabs :value="tab" lazy @update:value="onTabChange">
          <TabList>
            <Tab value="default">{{ t('visitRules.tabs.default') }}</Tab>
            <Tab value="teams">
              <span class="flex items-center gap-2">
                {{ t('visitRules.tabs.teams') }}
                <Badge v-if="teamsWithOverrides > 0" :value="teamsWithOverrides" severity="warn" />
              </span>
            </Tab>
            <Tab value="history">{{ t('visitRules.tabs.history') }}</Tab>
          </TabList>
          <TabPanels>
            <!-- Default -->
            <TabPanel value="default">
              <div v-if="isLoading && !data" class="flex justify-center py-8">
                <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
              </div>
              <div v-else-if="data" class="flex flex-col gap-5">
                <div v-if="canWrite" class="flex justify-end gap-2">
                  <Button
                    type="button"
                    severity="secondary"
                    size="small"
                    :label="t('visitRules.actions.cancel')"
                    :disabled="!isDirty || isSaving"
                    data-testid="cancel-default"
                    @click="resetWorking"
                  />
                  <Button
                    type="button"
                    size="small"
                    :label="t('visitRules.actions.save')"
                    :loading="isSaving"
                    :disabled="!isDirty || errorKeys.length > 0"
                    data-testid="save-default"
                    @click="save"
                  />
                </div>

                <VisitRuleTable
                  v-model="values"
                  mode="company"
                  :rows="data.rules"
                  :readonly="!canWrite"
                  :error-keys="errorKeys"
                />

                <ExemptReasonsPicker
                  v-model="exemptIds"
                  :saved="data.exemptReasons"
                  :rules="data.rules"
                  :readonly="!canWrite"
                  :toast-group="toastGroup"
                />

                <Message severity="info" size="small">{{
                  t('visitRules.surveyOptionalNote')
                }}</Message>
              </div>
            </TabPanel>

            <!-- Team overrides -->
            <TabPanel value="teams">
              <TeamOverridePanel
                :company-id="companyId"
                :can-write="canWrite"
                :toast-group="toastGroup"
                :initial-team-id="initialTeamId"
                @saved="onTeamSaved"
                @update:dirty="(v: boolean) => (teamDirty = v)"
                @update:team-id="onTeamIdChange"
              />
            </TabPanel>

            <!-- History -->
            <TabPanel value="history">
              <VisitRuleHistoryTab
                :company-id="companyId"
                :styles="ruleStyles"
                :reload-key="historyKey"
                :toast-group="toastGroup"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </ResponsiveCard>

    <CheckSalesmanDrawer v-model:visible="isDrawerShown" :has-unsaved="anyDirty" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { usePermissions } from '@/composables'
import { CompaniesService, VisitRulesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DateFormat from '@/constants/dateFormat'
import { ApiError } from '@/types/api.type'
import type { CompanyRules, VisitRuleStyle } from '@/types/visitRule.type'
import CheckSalesmanDrawer from './components/CheckSalesmanDrawer.vue'
import ExemptReasonsPicker from './components/ExemptReasonsPicker.vue'
import TeamOverridePanel from './components/TeamOverridePanel.vue'
import VisitRuleHistoryTab from './components/VisitRuleHistoryTab.vue'
import VisitRuleTable from './components/VisitRuleTable.vue'
import {
  buildCompanyPayload,
  companyValues,
  radiusErrorKeys,
  sameIds,
  sameValueMap,
  type ValueMap,
} from './visitRuleHelpers'

type TabKey = 'default' | 'teams' | 'history'
const TABS: TabKey[] = ['default', 'teams', 'history']

const { t, te } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const route = useRoute()
const router = useRouter()
const { canWrite } = usePermissions('/visit-rules')

const toastGroup = 'visitRules'
const confirmGroup = 'visitRulesConfirm'

const companies = ref<{ id: number; name: string }[]>([])
const isLoadingCompanies = ref(true)
const companyId = ref<number | undefined>(undefined)
const tab = ref<TabKey>('default')
const initialTeamId = ref<number | undefined>(undefined)

const data = ref<CompanyRules | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const values = ref<ValueMap>({})
const exemptIds = ref<number[]>([])
const teamDirty = ref(false)
const teamsWithOverrides = ref(0)
const historyKey = ref(0)
const isDrawerShown = ref(false)

const savedValues = computed<ValueMap>(() => (data.value ? companyValues(data.value.rules) : {}))
const savedExemptIds = computed(() => data.value?.exemptReasons.map((r) => r.id) ?? [])
const isDirty = computed(
  () =>
    !!data.value &&
    (!sameValueMap(values.value, savedValues.value) ||
      !sameIds(exemptIds.value, savedExemptIds.value)),
)
const anyDirty = computed(() => isDirty.value || teamDirty.value)
const errorKeys = computed(() =>
  data.value ? radiusErrorKeys(data.value.rules, values.value) : [],
)
const ruleStyles = computed(() => {
  const map: Record<string, VisitRuleStyle> = {}
  for (const r of data.value?.rules ?? []) map[r.key] = r.style
  return map
})

function toastError(e: unknown) {
  const err =
    e instanceof ApiError && e.code && te(`visitRules.errors.${e.code}`)
      ? new Error(t(`visitRules.errors.${e.code}`))
      : e
  toast.add(commonErrorToast(err, toastGroup))
}

function resetWorking() {
  values.value = { ...savedValues.value }
  exemptIds.value = [...savedExemptIds.value]
}

function setQuery(patch: Record<string, string | undefined>) {
  const query = { ...route.query }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete query[k]
    else query[k] = v
  }
  router.replace({ query })
}

/** Runs `go` straight away, or after the user agrees to drop unsaved edits. */
function guard(go: () => void) {
  if (!anyDirty.value) return go()
  confirm.require({
    group: confirmGroup,
    header: t('visitRules.unsavedTitle'),
    message: t('visitRules.unsavedMessage'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('visitRules.teams.discard'),
    rejectLabel: t('visitRules.actions.cancel'),
    accept: () => {
      teamDirty.value = false
      go()
    },
  })
}

async function loadCompany(id: number) {
  isLoading.value = true
  data.value = null
  try {
    const res = await VisitRulesService.getCompany(id)
    if (id !== companyId.value) return
    data.value = res
    resetWorking()
  } catch (e) {
    toastError(e)
  } finally {
    isLoading.value = false
  }
  loadTeamCount(id)
}

async function loadTeamCount(id: number) {
  try {
    const teams = await VisitRulesService.listTeams(id)
    if (id === companyId.value) {
      teamsWithOverrides.value = teams.filter((x) => x.overrideCount > 0).length
    }
  } catch {
    // The badge is a hint only.
  }
}

function onCompanyChange(id: number) {
  if (id === companyId.value) return
  guard(() => {
    companyId.value = id
    initialTeamId.value = undefined
    setQuery({ companyId: String(id), teamId: undefined })
    loadCompany(id)
    historyKey.value++
  })
}

function onTabChange(value: string | number) {
  const next = value as TabKey
  if (next === tab.value) return
  guard(() => {
    tab.value = next
    setQuery({ tab: next === 'default' ? undefined : next })
    if (next !== 'teams') setQuery({ teamId: undefined })
    resetWorking()
  })
}

function onTeamIdChange(id: number | undefined) {
  setQuery({ teamId: id ? String(id) : undefined })
}

function onTeamSaved(count: number) {
  teamsWithOverrides.value = count
  historyKey.value++
}

async function save() {
  if (!data.value || !companyId.value) return
  isSaving.value = true
  try {
    const res = await VisitRulesService.putCompany(
      companyId.value,
      buildCompanyPayload(data.value.rules, values.value, exemptIds.value),
    )
    data.value = res
    resetWorking()
    historyKey.value++
    toast.add(commonSuccessToast(t('visitRules.messages.saved'), toastGroup))
  } catch (e) {
    toastError(e)
  } finally {
    isSaving.value = false
  }
}

onBeforeRouteLeave((_to, _from, next) => {
  if (!anyDirty.value) return next()
  confirm.require({
    group: confirmGroup,
    header: t('visitRules.unsavedTitle'),
    message: t('visitRules.unsavedMessage'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.actions.leave'),
    rejectLabel: t('common.actions.stay'),
    accept: () => next(),
    reject: () => next(false),
  })
})

watch(anyDirty, (dirty) => {
  window.onbeforeunload = dirty ? () => true : null
})

onMounted(async () => {
  const queryTab = route.query.tab as TabKey | undefined
  if (queryTab && TABS.includes(queryTab)) tab.value = queryTab
  const queryTeam = Number(route.query.teamId)
  if (Number.isInteger(queryTeam) && queryTeam > 0) initialTeamId.value = queryTeam

  try {
    const res = await CompaniesService.list('limit=100&sortBy=name&sortOperator=asc')
    companies.value = res.data.map((c) => ({ id: c.id, name: c.name }))
  } catch (e) {
    toastError(e)
  } finally {
    isLoadingCompanies.value = false
  }

  const queried = Number(route.query.companyId)
  const chosen =
    companies.value.find((c) => c.id === queried) ??
    (companies.value.length === 1 ? companies.value[0] : undefined)
  const first = chosen ?? companies.value[0]
  if (first) {
    companyId.value = first.id
    await loadCompany(first.id)
  }
})
</script>
