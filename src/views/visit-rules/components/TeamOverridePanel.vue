<template>
  <div class="flex flex-col gap-4 lg:flex-row">
    <ConfirmDialog :group="confirmGroup" />

    <!-- Team list -->
    <aside class="w-full shrink-0 lg:w-72">
      <Button
        v-if="canWrite"
        type="button"
        icon="pi pi-plus"
        size="small"
        class="mb-3 w-full"
        :label="t('visitRules.actions.addTeamOverride')"
        data-testid="add-team-override"
        @click="isAddShown = true"
      />
      <div v-if="loadingTeams" class="flex justify-center py-6">
        <i class="pi pi-spinner pi-spin text-stone-400" />
      </div>
      <p v-else-if="teams.length === 0" class="py-4 text-sm text-stone-500">
        {{ t('visitRules.teams.noTeams') }}
      </p>
      <ul v-else class="flex flex-col gap-1" data-testid="team-list">
        <li v-for="team in sortedTeams" :key="team.id">
          <button
            type="button"
            :class="[
              'w-full rounded-md border px-3 py-2 text-left',
              team.id === selectedId
                ? 'border-primary-500 bg-primary-50'
                : 'border-stone-200 hover:bg-stone-50',
            ]"
            :data-testid="`team-${team.id}`"
            @click="requestSelect(team.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium">{{ team.name }}</span>
              <Tag
                v-if="team.overrideCount > 0"
                severity="warn"
                :value="t('visitRules.teams.differ', { n: team.overrideCount })"
              />
              <Tag v-else severity="secondary" :value="t('visitRules.teams.followDefault')" />
            </div>
            <div class="text-xs text-stone-500">
              {{ team.code }} ·
              {{ t('visitRules.teams.members', { n: team.memberCount }, team.memberCount) }}
            </div>
          </button>
        </li>
      </ul>
    </aside>

    <!-- Editor -->
    <section class="min-w-0 flex-1">
      <p v-if="!selectedId" class="py-6 text-sm text-stone-500">
        {{ t('visitRules.teams.selectTeam') }}
      </p>
      <div v-else-if="loadingTeam && !team" class="flex justify-center py-8">
        <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
      </div>
      <div v-else-if="team" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">{{ team.team.name }}</h3>
            <p class="text-xs text-stone-500">{{ team.team.code }} · {{ team.team.branchName }}</p>
          </div>
          <div v-if="canWrite" class="flex gap-2">
            <Button
              type="button"
              severity="danger"
              outlined
              size="small"
              :label="t('visitRules.actions.resetAll')"
              :disabled="!hasSavedOverrides || saving"
              data-testid="reset-team"
              @click="confirmReset"
            />
            <Button
              type="button"
              severity="secondary"
              size="small"
              :label="t('visitRules.actions.cancel')"
              :disabled="!dirty || saving"
              @click="resetWorking"
            />
            <Button
              type="button"
              size="small"
              :label="t('visitRules.actions.save')"
              :loading="saving"
              :disabled="!dirty || errorKeys.length > 0"
              data-testid="save-team"
              @click="save"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="teamNote" class="text-sm font-semibold">{{
            t('visitRules.teams.noteLabel')
          }}</label>
          <InputText
            id="teamNote"
            v-model="note"
            :maxlength="NOTE_MAX"
            :disabled="!canWrite"
            :placeholder="t('visitRules.teams.notePlaceholder')"
          />
        </div>

        <Message
          v-for="row in pinned"
          :key="row.key"
          severity="warn"
          size="small"
          :data-testid="`pinned-${row.key}`"
        >
          {{
            t('visitRules.pinnedWarning', {
              rule: t(`visitRules.rules.${row.key}.name`),
              value: valueText(row),
              level: t(levelLabelKey(row.style, row.inherited.level)),
            })
          }}
        </Message>

        <VisitRuleTable
          v-model="overrides"
          mode="team"
          :rows="team.rules"
          :readonly="!canWrite"
          :error-keys="errorKeys"
        />
      </div>
    </section>

    <Dialog
      v-model:visible="isAddShown"
      modal
      :header="t('visitRules.teams.addTitle')"
      class="w-full max-w-md"
    >
      <p v-if="addable.length === 0" class="text-sm text-stone-500">
        {{ t('visitRules.teams.addEmpty') }}
      </p>
      <ul v-else class="flex max-h-80 flex-col gap-1 overflow-y-auto">
        <li v-for="team in addable" :key="team.id">
          <button
            type="button"
            class="w-full rounded-md border border-stone-200 px-3 py-2 text-left hover:bg-stone-50"
            :data-testid="`add-${team.id}`"
            @click="pickToAdd(team.id)"
          >
            <div class="font-medium">{{ team.name }}</div>
            <div class="text-xs text-stone-500">{{ team.code }} · {{ team.branchName }}</div>
          </button>
        </li>
      </ul>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { VisitRulesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { ApiError } from '@/types/api.type'
import type { TeamRuleRow, TeamRules, TeamSummary } from '@/types/visitRule.type'
import VisitRuleTable from './VisitRuleTable.vue'
import {
  NOTE_MAX,
  buildTeamPayload,
  levelLabelKey,
  pinnedRows,
  radiusErrorKeys,
  sameValueMap,
  shouldDeleteTeam,
  teamOverrides,
  type ValueMap,
} from '../visitRuleHelpers'

const props = defineProps<{
  companyId: number
  canWrite: boolean
  toastGroup: string
  /** The team to open on mount (from the URL). */
  initialTeamId?: number
}>()
const emit = defineEmits<{
  saved: [overrideTeamCount: number]
  'update:dirty': [dirty: boolean]
  'update:teamId': [id: number | undefined]
}>()

const { t, te } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'visitRuleTeamConfirm'

const teams = ref<TeamSummary[]>([])
const loadingTeams = ref(false)
const selectedId = ref<number | undefined>(props.initialTeamId)
const team = ref<TeamRules | null>(null)
const loadingTeam = ref(false)
const overrides = ref<ValueMap>({})
const note = ref('')
const saving = ref(false)
const isAddShown = ref(false)

const sortedTeams = computed(() => teams.value)
const addable = computed(() => teams.value.filter((x) => x.overrideCount === 0))

const savedOverrides = computed<ValueMap>(() => (team.value ? teamOverrides(team.value.rules) : {}))
const savedNote = computed(() => team.value?.note ?? '')
const hasSavedOverrides = computed(() => Object.keys(savedOverrides.value).length > 0)
const dirty = computed(
  () =>
    !!team.value &&
    (!sameValueMap(overrides.value, savedOverrides.value) ||
      note.value.trim() !== savedNote.value.trim()),
)
const errorKeys = computed(() =>
  team.value ? radiusErrorKeys(team.value.rules, overrides.value) : [],
)
const pinned = computed<TeamRuleRow[]>(() =>
  team.value ? pinnedRows(team.value.rules, overrides.value) : [],
)

watch(dirty, (v) => emit('update:dirty', v))
watch(selectedId, (id) => emit('update:teamId', id))

function valueText(row: TeamRuleRow): string {
  const label = t(levelLabelKey(row.style, row.inherited.level))
  return row.paramKind && row.inherited.level !== 'off' && row.inherited.radiusM != null
    ? `${label} · ${row.inherited.radiusM} ${t('visitRules.radius.unit')}`
    : label
}

function resetWorking() {
  overrides.value = { ...savedOverrides.value }
  note.value = savedNote.value
}

async function loadTeams() {
  loadingTeams.value = true
  try {
    teams.value = await VisitRulesService.listTeams(props.companyId)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loadingTeams.value = false
  }
}

async function loadTeam(id: number) {
  loadingTeam.value = true
  try {
    const res = await VisitRulesService.getTeam(id)
    if (id !== selectedId.value) return
    team.value = res
    resetWorking()
  } catch (e) {
    team.value = null
    toast.add(commonErrorToast(e, props.toastGroup))
    if (e instanceof ApiError && e.code === 'VISIT_RULE_TEAM_COMPANY_UNRESOLVED') {
      selectedId.value = undefined
      await loadTeams()
    }
  } finally {
    loadingTeam.value = false
  }
}

function select(id: number) {
  selectedId.value = id
  team.value = null
  loadTeam(id)
}

function requestSelect(id: number) {
  if (id === selectedId.value) return
  if (!dirty.value) return select(id)
  confirm.require({
    group: confirmGroup,
    header: t('visitRules.teams.dirtyTitle'),
    message: t('visitRules.teams.dirtyMessage'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('visitRules.teams.discard'),
    rejectLabel: t('visitRules.actions.cancel'),
    accept: () => select(id),
  })
}

function pickToAdd(id: number) {
  isAddShown.value = false
  requestSelect(id)
}

async function afterWrite(message: string) {
  toast.add(commonSuccessToast(message, props.toastGroup))
  await loadTeams()
  if (selectedId.value) await loadTeam(selectedId.value)
  emit('saved', teams.value.filter((x) => x.overrideCount > 0).length)
}

async function save() {
  if (!team.value || !selectedId.value) return
  saving.value = true
  try {
    if (shouldDeleteTeam(overrides.value, note.value)) {
      await VisitRulesService.deleteTeam(selectedId.value)
      await afterWrite(t('visitRules.messages.teamReset'))
    } else {
      await VisitRulesService.putTeam(
        selectedId.value,
        buildTeamPayload(team.value.rules, overrides.value, note.value),
      )
      await afterWrite(t('visitRules.messages.teamSaved'))
    }
  } catch (e) {
    toast.add(commonErrorToast(errorWithMessage(e), props.toastGroup))
    if (e instanceof ApiError && e.code === 'VISIT_RULE_TEAM_COMPANY_UNRESOLVED') await loadTeams()
  } finally {
    saving.value = false
  }
}

function errorWithMessage(e: unknown): unknown {
  if (e instanceof ApiError && e.code && te(`visitRules.errors.${e.code}`)) {
    return new Error(t(`visitRules.errors.${e.code}`))
  }
  return e
}

function confirmReset() {
  if (!team.value || !selectedId.value) return
  const id = selectedId.value
  confirm.require({
    group: confirmGroup,
    header: t('visitRules.teams.resetTitle'),
    message: t('visitRules.teams.resetConfirm', { team: team.value.team.name }),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('visitRules.teams.reset'),
    rejectLabel: t('visitRules.actions.cancel'),
    acceptProps: { severity: 'danger' },
    accept: async () => {
      saving.value = true
      try {
        await VisitRulesService.deleteTeam(id)
        await afterWrite(t('visitRules.messages.teamReset'))
      } catch (e) {
        toast.add(commonErrorToast(errorWithMessage(e), props.toastGroup))
      } finally {
        saving.value = false
      }
    },
  })
}

watch(
  () => props.companyId,
  async () => {
    selectedId.value = undefined
    team.value = null
    await loadTeams()
  },
)

onMounted(async () => {
  await loadTeams()
  if (selectedId.value) await loadTeam(selectedId.value)
})
</script>
