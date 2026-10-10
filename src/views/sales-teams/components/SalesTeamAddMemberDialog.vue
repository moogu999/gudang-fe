<template>
  <Dialog
    :visible="!moveCandidate"
    :header="t('salesTeams.addMember.title', { code: team.code })"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '32rem' }"
    @update:visible="(v: boolean) => !v && !moveCandidate && emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('salesTeams.addMember.employee') }}</label>
        <InfiniteSelect
          v-model="candidate"
          :fetch-fn="(q: string) => SalesTeamsService.memberCandidatesForSelect(team.id, q)"
          :option-label="candidateLabel"
          :placeholder="t('salesTeams.addMember.selectEmployee')"
          class="w-full"
          data-testid="candidate-select"
        />
        <small v-if="candidate?.currentTeam" class="text-amber-600">
          {{ t('salesTeams.addMember.currentlyIn', { code: candidate.currentTeam.code }) }}
        </small>
      </div>

      <div class="flex flex-col gap-1">
        <label for="memberStartDate" class="text-sm font-semibold">{{
          t('salesTeams.addMember.effectiveDate')
        }}</label>
        <DatePicker
          v-model="startDate"
          input-id="memberStartDate"
          :max-date="maxDate"
          date-format="yy-mm-dd"
          show-icon
          fluid
          class="w-full"
        />
        <small class="text-stone-500">{{ t('salesTeams.addMember.effectiveDateHint') }}</small>
      </div>
    </div>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t('salesTeams.addMember.submit')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="!candidate || !startDate || isSaving"
        data-testid="submit-member"
        @click="onSubmit"
      />
    </template>
  </Dialog>

  <SalesTeamMoveMemberDialog
    v-if="moveCandidate"
    :team="team"
    :candidate="moveCandidate"
    :initial-date="startDate ?? today()"
    :toast-group="toastGroup"
    @close="onMoveClosed"
    @moved="onMoved"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import HttpStatus from '@/constants/httpStatus'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import { ApiError } from '@/types/api.type'
import type { MemberCandidate, SalesTeam } from '@/types/salesTeam.type'
import { toApiDate, today } from '../salesTeamHelpers'
import SalesTeamMoveMemberDialog from './SalesTeamMoveMemberDialog.vue'

const props = defineProps<{
  team: Pick<SalesTeam, 'id' | 'code' | 'name' | 'skuCount'>
  toastGroup: string
}>()

const emit = defineEmits<{ close: []; added: [] }>()

const { t } = useI18n()
const toast = useToast()

const candidate = ref<MemberCandidate | null>(null)
// Memberships can't start in the future.
const maxDate = today()
const startDate = ref<Date | null>(today())
const isSaving = ref(false)
/** Set while the move confirmation is open. */
const moveCandidate = ref<MemberCandidate | null>(null)

function candidateLabel(c: MemberCandidate): string {
  const typeName = c.employee.employeeType?.name
  const mode =
    typeName === EMPLOYEE_TYPE_NAMES.SALESMAN
      ? t('salesTeams.members.mode.Salesman')
      : typeName === EMPLOYEE_TYPE_NAMES.CANVASS
        ? t('salesTeams.members.mode.Canvass')
        : typeName
  const parts = [c.employee.name, c.employee.nip, mode].filter(Boolean).join(' · ')
  return c.currentTeam
    ? `${parts} (${t('salesTeams.addMember.currentlyIn', { code: c.currentTeam.code })})`
    : parts
}

/** Re-reads one candidate, e.g. after someone else put them in a team meanwhile. */
async function refetchCandidate(employeeId: number, term: string): Promise<MemberCandidate | null> {
  const params = new URLSearchParams({ q: term, limit: '50' })
  const res = await SalesTeamsService.memberCandidates(props.team.id, params.toString())
  return res.data.find((c) => c.employee.id === employeeId) ?? null
}

async function onSubmit() {
  if (!candidate.value || !startDate.value) return
  // In another team now: confirm the move first.
  if (candidate.value.currentTeam) {
    moveCandidate.value = candidate.value
    return
  }

  isSaving.value = true
  try {
    await SalesTeamsService.addMember(props.team.id, {
      employeeId: candidate.value.employee.id,
      startDate: toApiDate(startDate.value),
      move: false,
    })
    toast.add(
      commonSuccessToast(
        t('salesTeams.messages.memberAdded', { name: candidate.value.employee.name }),
        props.toastGroup,
      ),
    )
    emit('added')
    emit('close')
  } catch (e) {
    // They joined another team after the list loaded: offer the move instead.
    if (e instanceof ApiError && e.status === HttpStatus.CONFLICT) {
      const fresh = await refetchCandidate(
        candidate.value.employee.id,
        candidate.value.employee.nip || candidate.value.employee.name,
      ).catch(() => null)
      if (fresh?.currentTeam) {
        candidate.value = fresh
        moveCandidate.value = fresh
        return
      }
    }
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isSaving.value = false
  }
}

function onMoveClosed() {
  moveCandidate.value = null
}

function onMoved() {
  emit('added')
  emit('close')
}
</script>
