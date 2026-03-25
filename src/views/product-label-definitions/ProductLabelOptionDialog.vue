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
        <label for="value" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('productLabelDefinitions.options.fields.value')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="value" name="value" autocomplete="off" class="w-full" />
          <Message v-if="$form.value?.invalid" severity="error" size="small" variant="simple">{{
            $form.value.error.message
          }}</Message>
        </div>
      </div>

      <div class="flex justify-end gap-2">
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
    </Form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { ProductLabelOptionsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { ProductLabelOption } from '@/types'

const { t } = useI18n()

const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  option: {
    type: Object as PropType<ProductLabelOption>,
  },
  definitionId: {
    type: Number,
    required: true,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if (props.mode !== DialogMode.EDIT || !props.option) {
    return
  }

  initialValues.value = props.option.value
})

const toastGroup = 'productLabelOptionDialog'
const toast = useToast()

const initialValues = reactive({
  value: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      value: z.string().min(1, t('productLabelDefinitions.options.validation.valueRequired')),
    }),
  ),
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
      await addOption(event)
    } else {
      await editOption(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addOption(event: FormSubmitEvent) {
  await ProductLabelOptionsService.create({
    productLabelDefinitionId: props.definitionId,
    value: event.states.value.value,
    createdBy: authStore.userId!,
  })

  toast.add(
    commonSuccessToast(t('productLabelDefinitions.options.messages.optionCreated'), toastGroup),
  )
}

async function editOption(event: FormSubmitEvent) {
  await ProductLabelOptionsService.update(props.option!.id, {
    value: event.states.value.value,
    updatedBy: authStore.userId!,
  })

  toast.add(
    commonSuccessToast(t('productLabelDefinitions.options.messages.optionUpdated'), toastGroup),
  )
}
</script>
