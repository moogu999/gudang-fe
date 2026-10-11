<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <form @submit.prevent="onSubmit">
      <!-- Branch -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('mustSellListConfigs.fields.branch') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            v-model="branchId"
            :option-label="branchLabel"
            option-value="id"
            :fetch-fn="fetchBranches"
            :placeholder="t('mustSellListConfigs.labels.selectBranch')"
            class="w-full"
          />
          <InputText v-else :value="props.config?.branchName" disabled class="w-full" />
          <small v-if="branchError" class="text-red-500">{{ branchError }}</small>
        </div>
      </div>

      <!-- Level -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('mustSellListConfigs.fields.scopeLevel') }}
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
          <small class="text-surface-500">{{ t('mustSellListConfigs.labels.levelHint') }}</small>
        </div>
      </div>

      <!-- Reason required -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="reasonRequired" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('mustSellListConfigs.fields.reasonRequired') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <ToggleSwitch
            v-model="reasonRequired"
            input-id="reasonRequired"
            :disabled="mode === DialogMode.VIEW"
          />
          <small class="text-surface-500">{{ t('mustSellListConfigs.labels.reasonHint') }}</small>
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
import { MustSellListConfigService } from '@/services'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { MslScopeLevel, MustSellListConfig } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  config: {
    type: Object as PropType<MustSellListConfig>,
    default: undefined,
  },
})

const emit = defineEmits(['close'])

const toastGroup = 'salesmanTargetConfigDialog'
const isLoading = ref(false)

// Local refs, not form state: a SelectButton doesn't repaint on programmatic writes.
const branchId = ref<number | undefined>(undefined)
const scopeLevel = ref<MslScopeLevel>(props.config?.scopeLevel ?? 'outlet_type')
const reasonRequired = ref(props.config?.reasonRequired ?? true)
const branchError = ref('')

const levelOptions = computed(() => [
  { label: t('mustSellListConfigs.levels.outlet_type'), value: 'outlet_type' as MslScopeLevel },
  { label: t('mustSellListConfigs.levels.channel'), value: 'channel' as MslScopeLevel },
  { label: t('mustSellListConfigs.levels.category'), value: 'category' as MslScopeLevel },
])

// The API only serves the caller's branches.
const fetchBranches = userBranchesFetcher(useAuthStore().branchIds)

async function onSubmit() {
  const target = props.mode === DialogMode.ADD ? branchId.value : props.config?.branchId
  branchError.value = target ? '' : t('mustSellListConfigs.validation.branchRequired')
  if (!target) return

  isLoading.value = true
  try {
    await MustSellListConfigService.upsert(target, {
      scopeLevel: scopeLevel.value,
      reasonRequired: reasonRequired.value,
    })
    const message =
      props.mode === DialogMode.ADD
        ? t('mustSellListConfigs.messages.created')
        : t('mustSellListConfigs.messages.updated')
    toast.add(commonSuccessToast(message, toastGroup))
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
