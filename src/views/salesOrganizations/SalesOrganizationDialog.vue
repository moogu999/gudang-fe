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
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('salesOrganizations.fields.name')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="name"
            name="name"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
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
        <Tab value="0">{{ t('salesOrganizations.tabs.branches') }}</Tab>
      </TabList>

      <TabPanels>
        <BranchesTab :sales-organization-id="salesOrganization!.id" />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { SalesOrganizationsService } from '@/services/salesOrganizations.service'
import { ref } from 'vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { SalesOrganization } from '@/types/salesOrganization.type'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import BranchesTab from '@/views/salesOrganizations/BranchesTab.vue'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  salesOrganization: {
    type: Object as PropType<SalesOrganization>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.salesOrganization) {
    return
  }

  initialValues.name = props.salesOrganization.name
})

// Toast
const toastGroup = 'salesOrganizationDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  name: '',
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('salesOrganizations.validation.nameRequired')),
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
      await addSalesOrganization(event)
    } else {
      await editSalesOrganization(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addSalesOrganization(event: FormSubmitEvent) {
  await SalesOrganizationsService.create({
    name: event.states.name.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('salesOrganizations.messages.salesOrganizationCreated'), toastGroup))
}

async function editSalesOrganization(event: FormSubmitEvent) {
  await SalesOrganizationsService.update(props.salesOrganization!.id, {
    name: event.states.name.value,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('salesOrganizations.messages.salesOrganizationUpdated'), toastGroup))
}
</script>
