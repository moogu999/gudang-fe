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
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-24">{{ t('roles.fields.name') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="name" name="name" autocomplete="off" :disabled="mode === DialogMode.VIEW" class="w-full" />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="description" class="w-full text-sm font-semibold sm:text-base md:w-24">{{ t('roles.fields.description') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Textarea
            id="description"
            name="description"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.description?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.description.error.message }}</Message
          >
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
        <Tab value="0">{{ t('roles.tabs.permissions') }}</Tab>
      </TabList>

      <TabPanels>
        <PermissionsTab :roleId="role!.id" />
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
import { RolesService } from '@/services/roles.service'
import { ref } from 'vue'
import DialogMode from '@/constants/dialogMode'
import type { Role } from '@/types/role.type'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import PermissionsTab from '@/views/roles/PermissionsTab.vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  role: {
    type: Object as PropType<Role>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.role) {
    return
  }

  initialValues.name = props.role?.name
  initialValues.description = props.role?.description
})

// Toast
const toastGroup = 'roleDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  name: '',
  description: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, { message: t('roles.validation.nameRequired') }),
      description: z
        .string()
        .min(10, { message: t('roles.validation.descriptionMinLength') })
        .max(50, { message: t('roles.validation.descriptionMaxLength') }),
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
      await addRole(event)
    } else {
      await editRole(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addRole(event: FormSubmitEvent) {
  await RolesService.create({
    name: event.states.name.value,
    description: event.states.description.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('roles.messages.roleCreated'), toastGroup))
}

async function editRole(event: FormSubmitEvent) {
  await RolesService.update(props.role!.id, {
    name: event.states.name.value,
    description: event.states.description.value,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('roles.messages.roleUpdated'), toastGroup))
}
</script>
