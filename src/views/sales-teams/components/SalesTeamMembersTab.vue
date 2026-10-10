<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="includeHistory" input-id="showHistory" data-testid="show-history" />
        <label for="showHistory" class="text-sm">{{ t('salesTeams.members.showHistory') }}</label>
      </div>
      <div v-if="canWrite" class="ml-auto flex items-center gap-2">
        <small v-if="!team.isActive" class="text-stone-500">{{
          t('salesTeams.members.inactiveTeam')
        }}</small>
        <Button
          v-else
          :label="t('salesTeams.members.add')"
          icon="pi pi-user-plus"
          size="small"
          data-testid="add-member"
          @click="isAddDialogShown = true"
        />
      </div>
    </div>

    <DataTable
      :value="members"
      data-key="membershipId"
      :loading="loading"
      :row-class="(m: SalesTeamMember) => (m.isCurrent ? '' : 'opacity-60')"
      class="text-sm"
    >
      <Column :header="t('salesTeams.members.columns.salesman')">
        <template #body="{ data }">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600"
            >
              {{ initials(data.employee.name) }}
            </div>
            <div>
              <div class="flex items-center gap-2 font-medium">
                {{ data.employee.name }}
                <Tag
                  v-if="!data.employee.isActive"
                  :value="t('salesTeams.members.inactiveEmployee')"
                  severity="secondary"
                />
              </div>
              <div v-if="data.employee.nip" class="text-xs text-stone-500">
                {{ data.employee.nip }}
              </div>
            </div>
          </div>
        </template>
      </Column>
      <Column :header="t('salesTeams.members.columns.mode')">
        <template #body="{ data }">{{ modeLabel(data.employee.employeeType?.name) }}</template>
      </Column>
      <Column :header="t('salesTeams.members.columns.joined')">
        <template #body="{ data }">{{ formatDate(data.startDate) }}</template>
      </Column>
      <Column :header="t('salesTeams.members.columns.left')">
        <template #body="{ data }">{{ data.endDate ? formatDate(data.endDate) : '—' }}</template>
      </Column>
      <Column v-if="canWrite" :header="t('common.labels.actions')">
        <template #body="{ data }">
          <Button
            v-if="data.isCurrent"
            :label="t('salesTeams.members.end')"
            icon="pi pi-sign-out"
            severity="secondary"
            size="small"
            outlined
            data-testid="end-member"
            @click="endingMember = data"
          />
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('salesTeams.members.empty') }}</div>
      </template>
    </DataTable>

    <SalesTeamAddMemberDialog
      v-if="isAddDialogShown"
      :team="team"
      :toast-group="toastGroup"
      @close="isAddDialogShown = false"
      @added="onChanged"
    />

    <SalesTeamEndMemberDialog
      v-if="endingMember"
      :team-id="team.id"
      :member="endingMember"
      :toast-group="toastGroup"
      @close="endingMember = undefined"
      @ended="onChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import DateFormat from '@/constants/dateFormat'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import type { SalesTeam, SalesTeamMember } from '@/types/salesTeam.type'
import SalesTeamAddMemberDialog from './SalesTeamAddMemberDialog.vue'
import SalesTeamEndMemberDialog from './SalesTeamEndMemberDialog.vue'

const props = defineProps<{
  team: SalesTeam
  canWrite: boolean
  toastGroup: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()

const members = ref<SalesTeamMember[]>([])
const includeHistory = ref(false)
const loading = ref(false)
const isAddDialogShown = ref(false)
const endingMember = ref<SalesTeamMember | undefined>()

async function fetchMembers() {
  loading.value = true
  try {
    members.value = await SalesTeamsService.listMembers(props.team.id, includeHistory.value)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

watch(includeHistory, fetchMembers)
onMounted(fetchMembers)

async function onChanged() {
  await fetchMembers()
  emit('changed')
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

function modeLabel(typeName: string | undefined): string {
  if (typeName === EMPLOYEE_TYPE_NAMES.SALESMAN) return t('salesTeams.members.mode.Salesman')
  if (typeName === EMPLOYEE_TYPE_NAMES.CANVASS) return t('salesTeams.members.mode.Canvass')
  return typeName ?? '—'
}

function formatDate(date: string): string {
  return dayjs(date).format(DateFormat.DATE)
}
</script>
