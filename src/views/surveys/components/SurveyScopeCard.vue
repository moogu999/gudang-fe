<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-3">
        <div>
          <h2 class="text-base font-semibold">{{ t('surveys.scope.title') }}</h2>
          <p class="text-sm text-stone-500">
            {{ t('surveys.scope.subtitle', { level: levelLabel }) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2" data-testid="scope-chips">
          <Chip
            v-if="scopeAll"
            :label="t('surveys.scope.all')"
            class="bg-primary-100 text-sm"
            data-testid="scope-all-chip"
          />
          <Chip
            v-for="value in values"
            :key="value.id"
            :removable="!readonly"
            :class="['text-sm', value.isActive && !value.deleted ? '' : 'opacity-60']"
            @remove="removeValue(value.id)"
          >
            <span>{{ chipLabel(value) }}</span>
          </Chip>
          <span v-if="!scopeAll && values.length === 0" class="text-sm text-stone-400">
            {{ t('surveys.scope.empty') }}
          </span>
        </div>

        <div v-if="!readonly" class="flex flex-wrap items-center gap-2">
          <MultiSelect
            :model-value="[]"
            :options="availableOptions"
            option-label="name"
            option-value="id"
            :placeholder="t('surveys.scope.add')"
            :loading="loading"
            :disabled="scopeAll"
            filter
            :show-toggle-all="false"
            display="chip"
            class="min-w-56"
            data-testid="scope-add"
            @update:model-value="onPicked"
          />
          <Button
            type="button"
            :label="t('surveys.scope.all')"
            :severity="scopeAll ? 'primary' : 'secondary'"
            :outlined="!scopeAll"
            size="small"
            data-testid="scope-all-toggle"
            @click="toggleAll"
          />
        </div>

        <small v-if="error" class="text-red-500">{{ error }}</small>
        <small class="text-surface-500">
          {{ t('surveys.scope.help', { level: levelLabel }) }}
        </small>

        <hr class="border-stone-200" />

        <div>
          <h2 class="text-base font-semibold">{{ t('surveys.scope.teamsTitle') }}</h2>
          <p class="text-sm text-stone-500">{{ t('surveys.scope.teamsSubtitle') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2" data-testid="team-chips">
          <Chip
            v-for="team in salesTeams"
            :key="team.id"
            :removable="!readonly"
            :class="['text-sm', team.isActive ? '' : 'opacity-60']"
            @remove="removeTeam(team.id)"
          >
            <span>{{ team.code }} {{ team.name }}</span>
            <Tag
              v-if="!team.isActive"
              :value="t('surveys.scope.inactive')"
              severity="secondary"
              class="ml-1"
            />
          </Chip>
          <span v-if="salesTeams.length === 0" class="text-sm text-stone-400">
            {{ t('surveys.scope.allTeams') }}
          </span>
        </div>
        <div v-if="!readonly">
          <Button
            type="button"
            :label="t('surveys.scope.addTeam')"
            icon="pi pi-plus"
            severity="secondary"
            outlined
            size="small"
            :disabled="!branchId"
            data-testid="team-add"
            @click="isTeamPickerShown = true"
          />
        </div>

        <SurveySalesTeamPickerDialog
          v-if="isTeamPickerShown && branchId"
          :branch-id="branchId"
          :exclude-ids="salesTeams.map((x) => x.id)"
          :toast-group="toastGroup"
          @close="isTeamPickerShown = false"
          @select="onTeamsPicked"
        />
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Tag from 'primevue/tag'
import MultiSelect from 'primevue/multiselect'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import {
  CustomerCategoriesService,
  CustomerChannelsService,
  CustomerOutletTypesService,
} from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonErrorToast } from '@/services/toast'
import type { Base } from '@/types/api.type'
import type { SurveySalesTeamRef, SurveyScopeLevel, SurveyScopeValue } from '@/types/survey.type'
import { scopeLevelLabelKey } from '../surveyHelpers'
import SurveySalesTeamPickerDialog from './SurveySalesTeamPickerDialog.vue'

interface MasterRow {
  id: number
  name: string
  isActive: boolean
}

const props = defineProps<{
  level: SurveyScopeLevel
  branchId?: number
  readonly?: boolean
  error?: string
  toastGroup: string
}>()

const scopeAll = defineModel<boolean>('scopeAll', { required: true })
const values = defineModel<SurveyScopeValue[]>('values', { required: true })
const salesTeams = defineModel<SurveySalesTeamRef[]>('salesTeams', { required: true })

const { t } = useI18n()
const toast = useToast()

const isTeamPickerShown = ref(false)

function onTeamsPicked(teams: SurveySalesTeamRef[]) {
  const have = new Set(salesTeams.value.map((x) => x.id))
  salesTeams.value = [...salesTeams.value, ...teams.filter((x) => !have.has(x.id))]
  isTeamPickerShown.value = false
}

function removeTeam(id: number) {
  salesTeams.value = salesTeams.value.filter((x) => x.id !== id)
}

const levelLabel = computed(() => t(scopeLevelLabelKey(props.level)))

const options = ref<MasterRow[]>([])
const loading = ref(false)

function listerFor(level: SurveyScopeLevel): (q: string) => Promise<Base<MasterRow>> {
  if (level === 'outlet_type') return (q) => CustomerOutletTypesService.list(q)
  if (level === 'channel') return (q) => CustomerChannelsService.list(q)
  return (q) => CustomerCategoriesService.list(q)
}

async function loadOptions() {
  const level = props.level
  loading.value = true
  try {
    const query = new GenericQueryBuilder().withPagination(1, 500).build()
    const res = await listerFor(level)(query)
    if (level !== props.level) return
    options.value = res.data
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

// Inactive options already saved stay; new ones must be active.
const availableOptions = computed(() => {
  const chosen = new Set(values.value.map((v) => v.id))
  return options.value.filter((o) => o.isActive && !chosen.has(o.id))
})

function chipLabel(value: SurveyScopeValue): string {
  if (value.deleted) return `${value.name} ${t('surveys.scope.deleted')}`
  if (!value.isActive) return `${value.name} ${t('surveys.scope.inactive')}`
  return value.name
}

function onPicked(ids: number[]) {
  if (ids.length === 0) return
  const picked = options.value
    .filter((o) => ids.includes(o.id))
    .map((o) => ({ id: o.id, name: o.name, isActive: o.isActive, deleted: false }))
  values.value = [...values.value, ...picked]
  // "All" and values exclude each other: adding a value turns All off.
  scopeAll.value = false
}

function removeValue(id: number) {
  values.value = values.value.filter((v) => v.id !== id)
}

function toggleAll() {
  scopeAll.value = !scopeAll.value
  // Picking All clears the values.
  if (scopeAll.value) values.value = []
}

watch(() => props.level, loadOptions, { immediate: true })
</script>
