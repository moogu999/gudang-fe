<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <form @submit.prevent="onSubmit">
      <!-- Branch -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('journeyPlanConfigs.fields.branch') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            v-model="branchId"
            :option-label="branchLabel"
            option-value="id"
            :fetch-fn="fetchBranches"
            :placeholder="t('journeyPlanConfigs.labels.selectBranch')"
            class="w-full"
            @update:model-value="onBranchPicked"
          />
          <InputText v-else :value="props.config?.branchName" disabled class="w-full" />
          <small v-if="branchError" class="text-red-500">{{ branchError }}</small>
        </div>
      </div>

      <!-- Cycle anchor -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="cycleAnchor" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('journeyPlanConfigs.fields.cycleAnchorDate') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <DatePicker
            v-model="anchor"
            input-id="cycleAnchor"
            date-format="yy-mm-dd"
            :disabled-days="[0, 2, 3, 4, 5, 6]"
            :disabled="mode === DialogMode.VIEW || anchorLocked"
            show-icon
            fluid
          />
          <small class="text-surface-500">
            {{
              anchorLocked
                ? t('journeyPlanConfigs.labels.anchorLocked')
                : t('journeyPlanConfigs.labels.anchorHint')
            }}
          </small>
        </div>
      </div>

      <!-- Horizon -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="horizonDays" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('journeyPlanConfigs.fields.horizonDays') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            v-model="horizonDays"
            input-id="horizonDays"
            :min="1"
            :max="14"
            :disabled="mode === DialogMode.VIEW"
            show-buttons
            fluid
          />
          <small class="text-surface-500">{{ t('journeyPlanConfigs.labels.horizonHint') }}</small>
        </div>
      </div>

      <!-- Max visits -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="maxVisits" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('journeyPlanConfigs.fields.maxVisitsPerDay') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            v-model="maxVisitsPerDay"
            input-id="maxVisits"
            :min="1"
            :max="200"
            :disabled="mode === DialogMode.VIEW"
            show-buttons
            fluid
          />
          <small class="text-surface-500">{{ t('journeyPlanConfigs.labels.maxVisitsHint') }}</small>
        </div>
      </div>

      <!-- Allow Sunday -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="allowSunday" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('journeyPlanConfigs.fields.allowSunday') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <ToggleSwitch
            v-model="allowSunday"
            input-id="allowSunday"
            :disabled="mode === DialogMode.VIEW"
          />
          <small class="text-surface-500">{{ t('journeyPlanConfigs.labels.sundayHint') }}</small>
        </div>
      </div>

      <!-- Custom reminder day -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="reminderDay" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('journeyPlanConfigs.fields.customReminderDay') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            v-model="customReminderDay"
            input-id="reminderDay"
            :min="1"
            :max="28"
            :disabled="mode === DialogMode.VIEW"
            show-buttons
            fluid
          />
          <small class="text-surface-500">{{ t('journeyPlanConfigs.labels.reminderHint') }}</small>
        </div>
      </div>

      <div v-if="mode !== DialogMode.VIEW" class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emit('close')"
        />
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isLoading"
        />
      </div>
      <div v-else class="flex justify-end gap-2">
        <Button type="button" :label="t('common.actions.close')" @click="emit('close')" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DialogMode from '@/constants/dialogMode'
import { JourneyPlanConfigService } from '@/services'
import { useAuthStore } from '@/stores'
import { ApiError } from '@/types/api.type'
import { branchLabel } from '@/utils/branchHelper'
import { fromApiDate, toApiDate } from '@/views/routes/routeHelpers'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { JourneyPlanConfig } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  config: {
    type: Object as PropType<JourneyPlanConfig>,
    default: undefined,
  },
})

const emit = defineEmits(['close'])

const toastGroup = 'journeyPlanConfigDialog'
const isLoading = ref(false)

const branchId = ref<number | undefined>(undefined)
const branchError = ref('')
const anchor = ref<Date | null>(
  props.config ? fromApiDate(props.config.cycleAnchorDate) : fromApiDate('2026-01-05'),
)
const horizonDays = ref(props.config?.horizonDays ?? 7)
const maxVisitsPerDay = ref(props.config?.maxVisitsPerDay ?? 18)
const allowSunday = ref(props.config?.allowSunday ?? false)
const customReminderDay = ref(props.config?.customReminderDay ?? 20)
const anchorLocked = ref(props.config?.anchorLocked ?? false)

// The API only serves the caller's branches.
const fetchBranches = userBranchesFetcher(useAuthStore().branchIds)

// A branch picked on Add may already have plans, which fixes its anchor; the effective
// config also supplies the branch's current values to start from.
async function onBranchPicked(id: unknown) {
  if (typeof id !== 'number') return
  try {
    const effective = await JourneyPlanConfigService.getMyBranch(id)
    anchor.value = fromApiDate(effective.cycleAnchorDate)
    horizonDays.value = effective.horizonDays
    maxVisitsPerDay.value = effective.maxVisitsPerDay
    allowSunday.value = effective.allowSunday
    customReminderDay.value = effective.customReminderDay
    anchorLocked.value = effective.anchorLocked ?? false
  } catch {
    // The defaults already on the form stand.
  }
}

const ERROR_KEYS: Record<string, string> = {
  JOURNEY_PLAN_ANCHOR_LOCKED: 'journeyPlanConfigs.errors.anchorLocked',
  JOURNEY_PLAN_ANCHOR_NOT_MONDAY: 'journeyPlanConfigs.errors.anchorNotMonday',
}

async function onSubmit() {
  const target = props.mode === DialogMode.ADD ? branchId.value : props.config?.branchId
  branchError.value = target ? '' : t('journeyPlanConfigs.validation.branchRequired')
  if (!target || !anchor.value) return

  isLoading.value = true
  try {
    await JourneyPlanConfigService.upsert(target, {
      cycleAnchorDate: toApiDate(anchor.value),
      horizonDays: horizonDays.value,
      maxVisitsPerDay: maxVisitsPerDay.value,
      allowSunday: allowSunday.value,
      customReminderDay: customReminderDay.value,
    })
    const message =
      props.mode === DialogMode.ADD
        ? t('journeyPlanConfigs.messages.created')
        : t('journeyPlanConfigs.messages.updated')
    toast.add(commonSuccessToast(message, toastGroup))
    emit('close')
  } catch (e) {
    const key = e instanceof ApiError && e.code ? ERROR_KEYS[e.code] : undefined
    toast.add(commonErrorToast(key ? new Error(t(key)) : e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
