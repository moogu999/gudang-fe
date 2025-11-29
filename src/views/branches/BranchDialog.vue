<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="code" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('branches.fields.code') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="code" name="code" autocomplete="off" :disabled="mode === DialogMode.VIEW" class="w-full" />
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('branches.fields.name') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="name" name="name" autocomplete="off" :disabled="mode === DialogMode.VIEW" class="w-full" />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="address" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('branches.fields.address') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Textarea
            id="address"
            name="address"
            rows="3"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.address?.invalid" severity="error" size="small" variant="simple">{{
            $form.address.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="cogsCalculationMethodId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('branches.fields.cogsCalculationMethod') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="cogsCalculationMethodId"
            name="cogsCalculationMethodId"
            option-label="code"
            option-value="id"
            :fetch-fn="(query) => CogsCalculationMethodsService.list(query)"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('branches.labels.selectCogsCalculationMethod')"
            :initial-option="initialCogsCalculationMethod"
            sort-by="code"
            sort-operator="asc"
          />
          <Message v-if="$form.cogsCalculationMethodId?.invalid" severity="error" size="small" variant="simple">{{
            $form.cogsCalculationMethodId.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-3 md:flex-row md:gap-6">
        <div class="flex items-center gap-2">
          <Checkbox
            id="openOnSaturday"
            name="openOnSaturday"
            :binary="true"
            :disabled="mode === DialogMode.VIEW"
          />
          <label for="openOnSaturday" class="cursor-pointer text-sm font-semibold sm:text-base">{{ t('branches.fields.openOnSaturday') }}</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox
            id="openOnSunday"
            name="openOnSunday"
            :binary="true"
            :disabled="mode === DialogMode.VIEW"
          />
          <label for="openOnSunday" class="cursor-pointer text-sm font-semibold sm:text-base">{{ t('branches.fields.openOnSunday') }}</label>
        </div>
      </div>

      <div class="flex justify-end gap-2" v-if="mode !== DialogMode.VIEW">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        ></Button>
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        ></Button>
      </div>
      <div class="flex justify-end gap-2" v-else>
        <Button type="button" :label="t('common.actions.close')" @click="handleClose"></Button>
      </div>
    </Form>

    <Tabs
      value="0"
      v-if="mode === DialogMode.EDIT || mode === DialogMode.VIEW"
      :pt="{
        tablist: 'flex-wrap gap-1 sm:gap-2',
        tab: 'text-sm sm:text-base',
      }"
    >
      <TabList>
        <Tab value="0">{{ t('branches.tabs.holidays') }}</Tab>
      </TabList>

      <TabPanels>
        <BranchHolidaysTab v-if="branch" :branch="branch" :mode="mode" :toast-group="toastGroup" />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { BranchesService, CogsCalculationMethodsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Branch } from '@/types/branch.type'
import BranchHolidaysTab from './BranchHolidaysTab.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  branch: {
    type: Object as PropType<Branch>,
  },
})

const emits = defineEmits(['close'])

// Initial COGS calculation method for the select dropdown
const initialCogsCalculationMethod = ref()

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.branch) {
    return
  }

  initialValues.code = props.branch.code
  initialValues.name = props.branch.name
  initialValues.address = props.branch.address || ''
  initialValues.openOnSaturday = props.branch.openOnSaturday
  initialValues.openOnSunday = props.branch.openOnSunday
  initialValues.cogsCalculationMethodId = props.branch.cogsCalculationMethodId

  // Set initial COGS calculation method for the dropdown
  if (props.branch.cogsCalculationMethodCode) {
    initialCogsCalculationMethod.value = {
      id: props.branch.cogsCalculationMethodId,
      code: props.branch.cogsCalculationMethodCode,
    }
  }
})

// Toast
const toastGroup = 'branchDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  code: '',
  name: '',
  address: '',
  openOnSaturday: false,
  openOnSunday: false,
  cogsCalculationMethodId: undefined as number | undefined,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      code: z.string().min(1, t('branches.validation.codeRequired')),
      name: z.string().min(1, t('branches.validation.nameRequired')),
      address: z.string().optional(),
      openOnSaturday: z.boolean().optional(),
      openOnSunday: z.boolean().optional(),
      cogsCalculationMethodId: z.number({ required_error: t('branches.validation.cogsCalculationMethodRequired') }),
    })
  )
)

function handleClose() {
  emits('close')
}

const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true

  try {
    if (props.mode === DialogMode.ADD) {
      await addBranch(event)
    } else {
      await editBranch(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addBranch(event: FormSubmitEvent) {
  await BranchesService.create({
    code: event.states.code.value,
    name: event.states.name.value,
    address: event.states.address.value || undefined,
    openOnSaturday: event.states.openOnSaturday.value || false,
    openOnSunday: event.states.openOnSunday.value || false,
    cogsCalculationMethodId: event.states.cogsCalculationMethodId.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('branches.messages.branchCreated'), toastGroup))
}

async function editBranch(event: FormSubmitEvent) {
  await BranchesService.update(props.branch!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    address: event.states.address.value || undefined,
    openOnSaturday: event.states.openOnSaturday.value || false,
    openOnSunday: event.states.openOnSunday.value || false,
    cogsCalculationMethodId: event.states.cogsCalculationMethodId.value,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('branches.messages.branchUpdated'), toastGroup))
}
</script>
