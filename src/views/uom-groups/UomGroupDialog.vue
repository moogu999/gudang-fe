<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="deleteAcceptanceHandler" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('common.labels.name')
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

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="description" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('common.labels.description')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Textarea
            id="description"
            name="description"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            rows="3"
          />
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label
          for="defaultDisplayUomId"
          class="w-full text-sm font-semibold sm:text-base md:w-32"
          >{{ t('uomGroups.fields.defaultDisplayUom') }}</label
        >
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="defaultDisplayUomId"
            name="defaultDisplayUomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UnitOfMeasurementsService.list(query)"
            :initial-option="initialDefaultDisplayUom"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
          />
          <Message
            v-if="$form.defaultDisplayUomId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.defaultDisplayUomId.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex items-center gap-2">
          <Checkbox
            id="isActive"
            name="isActive"
            :binary="true"
            :disabled="mode === DialogMode.VIEW"
          />
          <label for="isActive" class="text-sm font-semibold sm:text-base">{{
            t('common.labels.active')
          }}</label>
        </div>
      </div>

      <!-- Conversion Levels Section (only in EDIT mode) -->
      <div v-if="mode === DialogMode.EDIT && props.uomGroup" class="mb-4">
        <Divider />

        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold sm:text-base md:text-lg">
            {{ t('uomGroups.levels.title') }}
          </h3>
          <Button
            :label="t('uomGroups.levels.addLevel')"
            icon="pi pi-plus"
            size="small"
            @click="addLevel"
          />
        </div>

        <DataTable
          :value="levels"
          :loading="isLoadingLevels"
          striped-rows
          responsive-layout="scroll"
          :empty-message="t('table.noResults')"
          class="text-sm"
        >
          <Column field="levelOrder" :header="t('uomGroups.levels.fields.levelOrder')" sortable />
          <Column field="uom.name" :header="t('uomGroups.levels.fields.uom')" />
          <Column field="uom.symbol" :header="t('uomGroups.levels.fields.symbol')" />
          <Column field="qtyPerParent" :header="t('uomGroups.levels.fields.qtyPerParent')">
            <template #body="{ data }">
              {{ data.qtyPerParent ?? '-' }}
            </template>
          </Column>
          <Column :header="t('common.labels.actions')" style="width: 8rem">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  @click="editLevel(data)"
                  text
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  @click="onDeleteLevelClick(data.id)"
                  text
                />
              </div>
            </template>
          </Column>
        </DataTable>
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

    <!-- Level Dialog -->
    <Dialog
      :header="levelDialogHeader"
      @hide="closeLevelDialog"
      v-model:visible="isLevelDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw',
      }"
      :style="{ width: '40vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
    >
      <UomConversionLevelDialog
        :mode="levelDialogMode"
        :level="selectedLevel"
        :uom-group-id="props.uomGroup?.id ?? 0"
        :next-level-order="levels.length + 1"
        @close="closeLevelDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { useToast } from 'primevue/usetoast'
import {
  UomGroupsService,
  UnitOfMeasurementsService,
  UomConversionLevelsService,
  GenericQueryBuilder,
} from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import { useConfirmDelete } from '@/composables'
import DialogMode from '@/constants/dialogMode'
import { FilterOperator } from '@/constants'
import type { UomGroup, UomConversionLevel } from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import UomConversionLevelDialog from './UomConversionLevelDialog.vue'

const { t } = useI18n()

const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  uomGroup: {
    type: Object as PropType<UomGroup>,
  },
})

const emits = defineEmits(['close'])

const initialDefaultDisplayUom = ref()

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.uomGroup) {
    return
  }

  initialValues.name = props.uomGroup.name
  initialValues.description = props.uomGroup.description ?? ''
  initialValues.isActive = props.uomGroup.isActive
  initialValues.defaultDisplayUomId = props.uomGroup.defaultDisplayUomId ?? undefined

  if (props.uomGroup.defaultDisplayUom) {
    initialDefaultDisplayUom.value = {
      id: props.uomGroup.defaultDisplayUomId,
      name: props.uomGroup.defaultDisplayUom.name,
    }
  }

  if (props.mode === DialogMode.EDIT) {
    loadLevels()
  }
})

const toastGroup = 'uomGroupDialog'
const toast = useToast()

const initialValues = reactive({
  name: '',
  description: '',
  isActive: true,
  defaultDisplayUomId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('uomGroups.validation.nameRequired')),
      description: z.string().optional(),
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
      await addUomGroup(event)
    } else {
      await editUomGroup(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addUomGroup(event: FormSubmitEvent) {
  await UomGroupsService.create({
    name: event.states.name.value,
    description: event.states.description.value || null,
    isActive: event.states.isActive.value,
    defaultDisplayUomId: event.states.defaultDisplayUomId.value ?? null,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('uomGroups.messages.uomGroupCreated'), toastGroup))
}

async function editUomGroup(event: FormSubmitEvent) {
  await UomGroupsService.update(props.uomGroup!.id, {
    name: event.states.name.value,
    description: event.states.description.value || null,
    isActive: event.states.isActive.value,
    defaultDisplayUomId: event.states.defaultDisplayUomId.value ?? null,
  })

  toast.add(commonSuccessToast(t('uomGroups.messages.uomGroupUpdated'), toastGroup))
}

// Levels management
const levels = ref<UomConversionLevel[]>([])
const isLoadingLevels = ref(false)

async function loadLevels() {
  if (!props.uomGroup?.id) return

  const query = new GenericQueryBuilder()
    .withFilter('uom_group_id', FilterOperator.EQUAL, props.uomGroup.id)
    .withSort('level_order', 'asc')
    .build()

  isLoadingLevels.value = true
  try {
    const response = await UomConversionLevelsService.list(query)
    levels.value = response.data
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingLevels.value = false
  }
}

// Level dialog
const isLevelDialogShown = ref(false)
const levelDialogMode = ref(DialogMode.ADD)
const selectedLevel = ref<UomConversionLevel | undefined>(undefined)

const levelDialogHeader = computed(() => {
  if (levelDialogMode.value === DialogMode.ADD) {
    return t('uomGroups.levels.addLevel')
  }
  return t('uomGroups.levels.editLevel')
})

function addLevel() {
  levelDialogMode.value = DialogMode.ADD
  selectedLevel.value = undefined
  isLevelDialogShown.value = true
}

function editLevel(level: UomConversionLevel) {
  levelDialogMode.value = DialogMode.EDIT
  selectedLevel.value = level
  isLevelDialogShown.value = true
}

async function closeLevelDialog() {
  isLevelDialogShown.value = false
  await loadLevels()
}

// Delete level confirmation
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: 'conversion level',
  onSuccess: async () => {
    await loadLevels()
  },
})

function onDeleteLevelClick(id: number) {
  confirmDelete(() => UomConversionLevelsService.delete(id))
}
</script>
