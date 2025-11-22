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
        <label for="code" class="w-32 font-semibold">Code</label>
        <div class="flex flex-auto flex-col gap-1">
          <InputText id="code" name="code" autocomplete="off" />
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex items-start gap-4">
        <label for="name" class="w-32 font-semibold">Name</label>
        <div class="flex flex-auto flex-col gap-1">
          <InputText id="name" name="name" autocomplete="off" />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex items-start gap-4">
        <label for="address" class="w-32 font-semibold">Address</label>
        <div class="flex flex-auto flex-col gap-1">
          <Textarea id="address" name="address" rows="3" autocomplete="off" />
          <Message v-if="$form.address?.invalid" severity="error" size="small" variant="simple">{{
            $form.address.error.message
          }}</Message>
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
import { BranchesService } from '@/services/branches.service'
import { ref } from 'vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Branch } from '@/types/branch.type'

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

onBeforeMount(() => {
  if (props.mode !== DialogMode.EDIT || !props.branch) {
    return
  }

  initialValues.code = props.branch.code
  initialValues.name = props.branch.name
  initialValues.address = props.branch.address || ''
})

// Toast
const toastGroup = 'branchDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  code: '',
  name: '',
  address: '',
})

// Validation schema
const resolver = zodResolver(
  z.object({
    code: z.string().min(1, 'Code is required.'),
    name: z.string().min(1, 'Name is required.'),
    address: z.string().optional(),
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
    createdBy: authStore.email!,
  })

  toast.add(commonSuccessToast('Branch is created.', toastGroup))
}

async function editBranch(event: FormSubmitEvent) {
  await BranchesService.update(props.branch!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    address: event.states.address.value || undefined,
    updatedBy: authStore.email!,
  })

  toast.add(commonSuccessToast('Branch is updated.', toastGroup))
}
</script>
