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
        <label for="email" class="w-24 font-semibold">Email</label>
        <div class="flex flex-auto flex-col gap-1">
          <InputText id="email" name="email" autocomplete="off" />
          <Message v-if="$form.email?.invalid" severity="error" size="small" variant="simple">{{
            $form.email.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex items-start gap-4">
        <label for="password" class="w-24 font-semibold">Password</label>
        <div class="flex flex-auto flex-col gap-1">
          <Password
            id="password"
            name="password"
            :pt="{
              pcInputText: {
                root: '!grow',
              },
            }"
            toggle-mask
          />
          <Message v-if="$form.password?.invalid" severity="error" size="small" variant="simple">{{
            $form.password.error.message
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
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { reactive } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { UsersService } from '@/services/users.service'
import { ref } from 'vue'
import Password from 'primevue/password'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'

const emits = defineEmits(['close'])

// Auth
const authStore = useAuthStore()

// Toast
const toastGroup = 'userDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  email: '',
  password: '',
})

const resolver = zodResolver(
  z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/\d/, 'Password must contain at least one number.')
      .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&).'),
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
    await UsersService.create({
      email: event.states.email.value,
      password: event.states.password.value,
      createdBy: authStore.userId!,
    })

    toast.add(commonSuccessToast('User is created.', toastGroup))

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
