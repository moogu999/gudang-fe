<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <form @submit.prevent="onSubmit">
      <!-- Branch -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('surveyConfigs.fields.branch') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            v-model="branchId"
            :option-label="branchLabel"
            option-value="id"
            :fetch-fn="fetchBranches"
            :placeholder="t('surveyConfigs.labels.selectBranch')"
            class="w-full"
          />
          <InputText v-else :value="props.config?.branchName" disabled class="w-full" />
          <small v-if="branchError" class="text-red-500">{{ branchError }}</small>
        </div>
      </div>

      <!-- Level -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('surveyConfigs.fields.scopeLevel') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <SelectButton
            v-model="scopeLevel"
            :options="levelOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW"
          />
          <small class="text-surface-500">{{ t('surveyConfigs.labels.levelHint') }}</small>
        </div>
      </div>

      <!-- Required mode -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('surveyConfigs.fields.requiredMode') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <SelectButton
            v-model="requiredMode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW"
          />
          <small class="text-surface-500">{{ t('surveyConfigs.labels.requiredModeHint') }}</small>
        </div>
      </div>

      <!-- Stock check qty default -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="stockCheckQtyDefault" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('surveyConfigs.fields.stockCheckQtyDefault') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <ToggleSwitch
            v-model="stockCheckQtyDefault"
            input-id="stockCheckQtyDefault"
            :disabled="mode === DialogMode.VIEW"
          />
          <small class="text-surface-500">{{ t('surveyConfigs.labels.qtyHint') }}</small>
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
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DialogMode from '@/constants/dialogMode'
import { SurveyConfigService } from '@/services'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { SurveyRequiredMode, SurveyScopeLevel, SurveyConfig } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  config: {
    type: Object as PropType<SurveyConfig>,
    default: undefined,
  },
})

const emit = defineEmits(['close'])

const toastGroup = 'surveyConfigDialog'
const isLoading = ref(false)

// Local refs, not form state: a SelectButton doesn't repaint on programmatic writes.
const branchId = ref<number | undefined>(undefined)
const scopeLevel = ref<SurveyScopeLevel>(props.config?.scopeLevel ?? 'outlet_type')
const requiredMode = ref<SurveyRequiredMode>(props.config?.requiredMode ?? 'block_checkout')
const stockCheckQtyDefault = ref(props.config?.stockCheckQtyDefault ?? false)
const branchError = ref('')

const modeOptions = computed(() => [
  { label: t('surveyConfigs.modes.block_checkout'), value: 'block_checkout' as SurveyRequiredMode },
  { label: t('surveyConfigs.modes.reminder'), value: 'reminder' as SurveyRequiredMode },
])

const levelOptions = computed(() => [
  { label: t('surveyConfigs.levels.outlet_type'), value: 'outlet_type' as SurveyScopeLevel },
  { label: t('surveyConfigs.levels.channel'), value: 'channel' as SurveyScopeLevel },
  { label: t('surveyConfigs.levels.category'), value: 'category' as SurveyScopeLevel },
])

// The API only serves the caller's branches.
const fetchBranches = userBranchesFetcher(useAuthStore().branchIds)

async function onSubmit() {
  const target = props.mode === DialogMode.ADD ? branchId.value : props.config?.branchId
  branchError.value = target ? '' : t('surveyConfigs.validation.branchRequired')
  if (!target) return

  isLoading.value = true
  try {
    await SurveyConfigService.upsert(target, {
      scopeLevel: scopeLevel.value,
      requiredMode: requiredMode.value,
      stockCheckQtyDefault: stockCheckQtyDefault.value,
    })
    const message =
      props.mode === DialogMode.ADD
        ? t('surveyConfigs.messages.created')
        : t('surveyConfigs.messages.updated')
    toast.add(commonSuccessToast(message, toastGroup))
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
