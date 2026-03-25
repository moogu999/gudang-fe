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
        <label for="levelOrder" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('uomGroups.levels.fields.levelOrder')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber id="levelOrder" name="levelOrder" :disabled="true" class="w-full" />
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="uomId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('uomGroups.levels.fields.uom')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="uomId"
            name="uomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UnitOfMeasurementsService.list(query)"
            :initial-option="initialUom"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <Message v-if="$form.uomId?.invalid" severity="error" size="small" variant="simple">{{
            $form.uomId.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="qtyPerParent" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('uomGroups.levels.fields.qtyPerParent')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            id="qtyPerParent"
            name="qtyPerParent"
            :disabled="isLevelOne"
            :placeholder="isLevelOne ? t('uomGroups.levels.qtyPerParentLevel1Hint') : ''"
            :min="1"
            class="w-full"
          />
          <Message
            v-if="$form.qtyPerParent?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.qtyPerParent.error.message }}</Message
          >
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
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { UomConversionLevelsService, UnitOfMeasurementsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type { UomConversionLevel } from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  level: {
    type: Object as PropType<UomConversionLevel>,
  },
  uomGroupId: {
    type: Number,
    required: true,
  },
  nextLevelOrder: {
    type: Number,
    required: true,
  },
})

const emits = defineEmits(['close'])

const initialUom = ref()

const currentLevelOrder = computed(() =>
  props.mode === DialogMode.EDIT
    ? (props.level?.levelOrder ?? props.nextLevelOrder)
    : props.nextLevelOrder,
)

const isLevelOne = computed(() => currentLevelOrder.value === 1)

onBeforeMount(() => {
  if (props.mode !== DialogMode.EDIT || !props.level) {
    initialValues.levelOrder = props.nextLevelOrder
    return
  }

  initialValues.levelOrder = props.level.levelOrder
  initialValues.uomId = props.level.uomId
  initialValues.qtyPerParent = props.level.qtyPerParent ?? undefined

  if (props.level.uom) {
    initialUom.value = {
      id: props.level.uomId,
      name: props.level.uom.name,
    }
  }
})

const toastGroup = 'uomConversionLevelDialog'
const toast = useToast()

const initialValues = reactive({
  levelOrder: props.nextLevelOrder,
  uomId: undefined as number | undefined,
  qtyPerParent: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      uomId: z.number({ required_error: t('uomGroups.levels.validation.uomRequired') }),
      qtyPerParent: isLevelOne.value
        ? z.number().optional().nullable()
        : z
            .number({ required_error: t('uomGroups.levels.validation.qtyPerParentRequired') })
            .int()
            .positive(t('uomGroups.levels.validation.qtyPerParentPositive')),
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
      await addLevel(event)
    } else {
      await editLevel(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addLevel(event: FormSubmitEvent) {
  await UomConversionLevelsService.create({
    uomGroupId: props.uomGroupId,
    levelOrder: currentLevelOrder.value,
    uomId: event.states.uomId.value,
    qtyPerParent: isLevelOne.value ? null : event.states.qtyPerParent.value,
  })

  toast.add(commonSuccessToast(t('uomGroups.levels.messages.levelCreated'), toastGroup))
}

async function editLevel(event: FormSubmitEvent) {
  await UomConversionLevelsService.update(props.level!.id, {
    uomId: event.states.uomId.value,
    qtyPerParent: isLevelOne.value ? null : event.states.qtyPerParent.value,
  })

  toast.add(commonSuccessToast(t('uomGroups.levels.messages.levelUpdated'), toastGroup))
}
</script>
