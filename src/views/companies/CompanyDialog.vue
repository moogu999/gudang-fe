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
        <label for="code" class="w-full font-semibold md:w-32">{{ t('companies.fields.code') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="code" name="code" autocomplete="off" :disabled="mode === DialogMode.VIEW" class="w-full" />
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full font-semibold md:w-32">{{ t('companies.fields.name') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="name" name="name" autocomplete="off" :disabled="mode === DialogMode.VIEW" class="w-full" />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="address" class="w-full font-semibold md:w-32">{{ t('companies.fields.address') }}</label>
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
        <label for="taxId" class="w-full font-semibold md:w-32">{{ t('companies.fields.taxId') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="taxId" name="taxId" autocomplete="off" :disabled="mode === DialogMode.VIEW" class="w-full" />
          <Message v-if="$form.taxId?.invalid" severity="error" size="small" variant="simple">{{
            $form.taxId.error.message
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

    <Tabs value="0" v-if="mode === DialogMode.EDIT || mode === DialogMode.VIEW">
      <TabList>
        <Tab value="0">{{ t('companies.tabs.branches') }}</Tab>
      </TabList>

      <TabPanels>
        <BranchesTab :companyId="company!.id" />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { CompaniesService } from '@/services/companies.service'
import { ref } from 'vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Company } from '@/types/company.type'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import BranchesTab from '@/views/companies/BranchesTab.vue'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  company: {
    type: Object as PropType<Company>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.company) {
    return
  }

  initialValues.code = props.company.code
  initialValues.name = props.company.name
  initialValues.address = props.company.address || ''
  initialValues.taxId = props.company.taxId || ''
})

// Toast
const toastGroup = 'companyDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  code: '',
  name: '',
  address: '',
  taxId: '',
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      code: z.string().min(1, t('companies.validation.codeRequired')),
      name: z.string().min(1, t('companies.validation.nameRequired')),
      address: z.string().optional(),
      taxId: z.string().optional(),
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
      await addCompany(event)
    } else {
      await editCompany(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addCompany(event: FormSubmitEvent) {
  await CompaniesService.create({
    code: event.states.code.value,
    name: event.states.name.value,
    address: event.states.address.value || undefined,
    taxId: event.states.taxId.value || undefined,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('companies.messages.companyCreated'), toastGroup))
}

async function editCompany(event: FormSubmitEvent) {
  await CompaniesService.update(props.company!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    address: event.states.address.value || undefined,
    taxId: event.states.taxId.value || undefined,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('companies.messages.companyUpdated'), toastGroup))
}
</script>
