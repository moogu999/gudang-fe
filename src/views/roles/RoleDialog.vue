<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex items-start gap-4">
        <label for="name" class="w-24 font-semibold">Name</label>
        <div class="flex flex-auto flex-col gap-1">
          <InputText id="name" name="name" autocomplete="off" />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex items-start gap-4">
        <label for="description" class="w-24 font-semibold">Description</label>
        <div class="flex flex-auto flex-col gap-1">
          <Textarea id="description" name="description" autocomplete="off" />
          <Message
            v-if="$form.description?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.description.error.message }}</Message
          >
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        ></Button>
        <Button
          type="submit"
          :label="!isLoading ? 'Save' : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        ></Button>
      </div>
    </Form>

    <Tabs value="0" v-if="mode === DialogMode.EDIT">
      <TabList>
        <Tab value="0">Permissions</Tab>
      </TabList>

      <TabPanels>
        <PermissionsTab :roleId="role!.id" />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import ApiService from '@/services/api'
import ToastLife from '@/common/enum/toastLife'
import { ref } from 'vue'
import DialogMode from '@/common/enum/dialogMode'
import type { Role } from './role.type'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import PermissionsTab from '@/views/roles/PermissionsTab.vue'
import { commonErrorToast } from '@/services/toast'

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
  if (props.mode !== DialogMode.EDIT || !props.role) {
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

const resolver = zodResolver(
  z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    description: z
      .string()
      .min(10, { message: 'Min. description 10 characters.' })
      .max(50, { message: 'Max. description 50 characters.' }),
  }),
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
  await ApiService.post('/gen/v1/roles', {
    name: event.states.name.value,
    description: event.states.description.value,
    // @TODO update with user id
    createdBy: 1,
  })

  toast.add({
    severity: 'success',
    summary: 'Role is created.',
    life: ToastLife.TWO_SECONDS,
    group: toastGroup,
  })
}

async function editRole(event: FormSubmitEvent) {
  await ApiService.patch(`/gen/v1/roles/${props.role?.id}`, {
    name: event.states.name.value,
    description: event.states.description.value,
    // @TODO update with user id
    updatedBy: 1,
  })

  toast.add({
    severity: 'success',
    summary: 'Role is updated.',
    life: ToastLife.TWO_SECONDS,
    group: toastGroup,
  })
}
</script>
