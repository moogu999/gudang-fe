<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <form @submit.prevent="onSubmit">
      <!-- Branch -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('salesmanTargetConfigs.fields.branch') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            v-model="branchId"
            :option-label="branchLabel"
            option-value="id"
            :fetch-fn="fetchBranches"
            :placeholder="t('salesmanTargetConfigs.labels.selectBranch')"
            class="w-full"
          />
          <InputText v-else :value="props.config?.branchName" disabled class="w-full" />
          <small v-if="branchError" class="text-red-500">{{ branchError }}</small>
        </div>
      </div>

      <!-- Level -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('salesmanTargetConfigs.fields.targetLevel') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <SelectButton
            v-model="targetLevel"
            :options="levelOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW"
          />
          <small class="text-surface-500">{{ t('salesmanTargetConfigs.labels.levelHint') }}</small>
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
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DialogMode from '@/constants/dialogMode'
import { SalesmanTargetConfigService } from '@/services'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import { userBranchesFetcher } from '@/views/sales-teams/salesTeamHelpers'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { SalesmanTargetConfig, TargetLevel } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  config: {
    type: Object as PropType<SalesmanTargetConfig>,
    default: undefined,
  },
})

const emit = defineEmits(['close'])

const toastGroup = 'salesmanTargetConfigDialog'
const isLoading = ref(false)

// Local refs, not form state: a SelectButton doesn't repaint on programmatic writes.
const branchId = ref<number | undefined>(undefined)
const targetLevel = ref<TargetLevel>(props.config?.targetLevel ?? 'category')
const branchError = ref('')

const levelOptions = computed(() => [
  { label: t('salesmanTargetConfigs.levels.category'), value: 'category' as TargetLevel },
  { label: t('salesmanTargetConfigs.levels.product'), value: 'product' as TargetLevel },
])

// The API only serves the caller's branches.
const fetchBranches = userBranchesFetcher(useAuthStore().branchIds)

async function onSubmit() {
  const target = props.mode === DialogMode.ADD ? branchId.value : props.config?.branchId
  branchError.value = target ? '' : t('salesmanTargetConfigs.validation.branchRequired')
  if (!target) return

  isLoading.value = true
  try {
    await SalesmanTargetConfigService.upsert(target, { targetLevel: targetLevel.value })
    const message =
      props.mode === DialogMode.ADD
        ? t('salesmanTargetConfigs.messages.created')
        : t('salesmanTargetConfigs.messages.updated')
    toast.add(commonSuccessToast(message, toastGroup))
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
