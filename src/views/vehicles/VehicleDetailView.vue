<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <!-- Header -->
    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        aria-label="Back"
        @click="router.back()"
      />
      <h1 class="flex-1 text-base font-semibold sm:text-lg md:text-2xl">
        {{
          mode === 'add' ? t('vehicles.addVehicle') : (vehicle?.plateNumber ?? t('vehicles.title'))
        }}
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="isLoadingData" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else>
      <Form
        ref="formRef"
        v-slot="$form"
        :initial-values="initialValues"
        :resolver="resolver"
        @submit="onFormSubmit"
      >
        <!-- Section: Identitas -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('vehicles.sections.identity') }}
            </h2>
          </template>
          <template #content>
            <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
              <!-- Plate Number -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="plateNumber" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.plateNumber') }}
                  <span class="text-red-500">*</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-1">
                  <InputText
                    id="plateNumber"
                    name="plateNumber"
                    class="w-full"
                    autocomplete="off"
                  />
                  <Message
                    v-if="$form.plateNumber?.invalid"
                    severity="error"
                    size="small"
                    variant="simple"
                  >
                    {{ $form.plateNumber.error.message }}
                  </Message>
                </div>
              </div>

              <!-- Vehicle Type -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label
                  for="vehicleTypeId"
                  class="w-full text-sm font-semibold sm:text-base md:w-40"
                >
                  {{ t('vehicles.fields.vehicleType') }}
                  <span class="text-red-500">*</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-1">
                  <InfiniteSelect
                    id="vehicleTypeId"
                    name="vehicleTypeId"
                    option-label="name"
                    option-value="id"
                    :fetch-fn="(q) => VehicleTypesService.list(q)"
                    :initial-option="initialVehicleType"
                    :placeholder="t('vehicles.labels.selectType')"
                    sort-by="sortOrder"
                    sort-operator="asc"
                  />
                  <Message
                    v-if="$form.vehicleTypeId?.invalid"
                    severity="error"
                    size="small"
                    variant="simple"
                  >
                    {{ $form.vehicleTypeId.error.message }}
                  </Message>
                </div>
              </div>

              <!-- Brand / Model -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="brandModel" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.brandModel') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText id="brandModel" name="brandModel" class="w-full" autocomplete="off" />
              </div>

              <!-- Color -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="color" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.color') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText id="color" name="color" class="w-full" autocomplete="off" />
              </div>

              <!-- Year -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="year" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.year') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputNumber
                  id="year"
                  name="year"
                  class="w-full"
                  :use-grouping="false"
                  :min="1900"
                  :max="2100"
                />
              </div>

              <!-- Chassis Number -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label
                  for="chassisNumber"
                  class="w-full text-sm font-semibold sm:text-base md:w-40"
                >
                  {{ t('vehicles.fields.chassisNumber') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="chassisNumber"
                  name="chassisNumber"
                  class="w-full"
                  autocomplete="off"
                />
              </div>

              <!-- Engine Number -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="engineNumber" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.engineNumber') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="engineNumber"
                  name="engineNumber"
                  class="w-full"
                  autocomplete="off"
                />
              </div>

              <!-- Ownership -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="ownership" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.ownership') }}
                  <span class="text-red-500">*</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-1">
                  <Select
                    id="ownership"
                    name="ownership"
                    :options="ownershipOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                  />
                  <Message
                    v-if="$form.ownership?.invalid"
                    severity="error"
                    size="small"
                    variant="simple"
                  >
                    {{ $form.ownership.error.message }}
                  </Message>
                </div>
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Section: Kapasitas Muatan -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('vehicles.sections.capacity') }}
            </h2>
          </template>
          <template #content>
            <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
              <!-- Cargo Type -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="cargoType" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.cargoType') }}
                  <span class="text-red-500">*</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-1">
                  <Select
                    id="cargoType"
                    name="cargoType"
                    :options="cargoTypeOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                  />
                  <Message
                    v-if="$form.cargoType?.invalid"
                    severity="error"
                    size="small"
                    variant="simple"
                  >
                    {{ $form.cargoType.error.message }}
                  </Message>
                </div>
              </div>

              <!-- Capacity kg -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="capacityKg" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.capacityKg') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="capacityKg"
                  name="capacityKg"
                  class="w-full"
                  autocomplete="off"
                  placeholder="0.00"
                />
              </div>

              <!-- Volume m3 -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="volumeM3" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.volumeM3') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="volumeM3"
                  name="volumeM3"
                  class="w-full"
                  autocomplete="off"
                  placeholder="0.00"
                />
              </div>

              <!-- Cargo dimensions -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.bakLength') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="bakLengthM"
                  name="bakLengthM"
                  class="w-full"
                  autocomplete="off"
                  placeholder="0.00"
                />
              </div>

              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.bakWidth') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="bakWidthM"
                  name="bakWidthM"
                  class="w-full"
                  autocomplete="off"
                  placeholder="0.00"
                />
              </div>

              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.bakHeight') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputText
                  id="bakHeightM"
                  name="bakHeightM"
                  class="w-full"
                  autocomplete="off"
                  placeholder="0.00"
                />
              </div>

              <!-- Next service km -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label
                  for="nextServiceKm"
                  class="w-full text-sm font-semibold sm:text-base md:w-40"
                >
                  {{ t('vehicles.fields.nextServiceKm') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <InputNumber
                  id="nextServiceKm"
                  name="nextServiceKm"
                  class="w-full"
                  :use-grouping="false"
                  :min="0"
                />
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Section: Dokumen Legal -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('vehicles.sections.documents') }}
            </h2>
          </template>
          <template #content>
            <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
              <!-- STNK -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  STNK
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-2">
                  <DatePicker
                    id="stnkExpiry"
                    name="stnkExpiry"
                    class="w-full"
                    date-format="dd/mm/yy"
                    show-icon
                    :placeholder="t('vehicles.fields.stnkExpiry')"
                  />
                  <div class="flex flex-col gap-1">
                    <div
                      v-if="stnkFile && !stnkUpload.pendingFile.value"
                      class="flex items-center gap-2 text-sm"
                    >
                      <a
                        :href="stnkUpload.buildUrl(stnkFile.url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate text-blue-600 underline"
                        >{{ stnkFile.originalName }}</a
                      >
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        size="small"
                        :aria-label="t('vehicles.labels.removeFile')"
                        @click="removeStnkFile"
                      />
                    </div>
                    <div
                      v-if="stnkUpload.pendingFile.value"
                      class="flex items-center gap-2 text-sm"
                    >
                      <i class="pi pi-file text-stone-400" />
                      <span class="truncate">{{ stnkUpload.pendingFile.value.name }}</span>
                      <Button
                        icon="pi pi-times"
                        severity="secondary"
                        text
                        size="small"
                        :aria-label="t('common.actions.cancel')"
                        @click="stnkUpload.clearPending()"
                      />
                    </div>
                    <div v-if="!stnkFile || stnkUpload.pendingFile.value !== null">
                      <label class="inline-flex cursor-pointer">
                        <Button
                          as="span"
                          :label="
                            stnkFile
                              ? t('vehicles.labels.replaceFile')
                              : t('vehicles.labels.uploadStnk')
                          "
                          icon="pi pi-upload"
                          size="small"
                          severity="secondary"
                          outlined
                        />
                        <input
                          ref="stnkInputRef"
                          type="file"
                          class="hidden"
                          accept=".pdf,image/*"
                          @change="onStnkFileChange"
                        />
                      </label>
                    </div>
                    <p v-if="stnkUpload.error.value" class="text-sm text-red-500">
                      {{ stnkUpload.error.value }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- BPKB -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.bpkb') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-1">
                  <div
                    v-if="bpkbFile && !bpkbUpload.pendingFile.value"
                    class="flex items-center gap-2 text-sm"
                  >
                    <a
                      :href="bpkbUpload.buildUrl(bpkbFile.url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="truncate text-blue-600 underline"
                      >{{ bpkbFile.originalName }}</a
                    >
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      size="small"
                      :aria-label="t('vehicles.labels.removeFile')"
                      @click="removeBpkbFile"
                    />
                  </div>
                  <div v-if="bpkbUpload.pendingFile.value" class="flex items-center gap-2 text-sm">
                    <i class="pi pi-file text-stone-400" />
                    <span class="truncate">{{ bpkbUpload.pendingFile.value.name }}</span>
                    <Button
                      icon="pi pi-times"
                      severity="secondary"
                      text
                      size="small"
                      :aria-label="t('common.actions.cancel')"
                      @click="bpkbUpload.clearPending()"
                    />
                  </div>
                  <div v-if="!bpkbFile || bpkbUpload.pendingFile.value !== null">
                    <label class="inline-flex cursor-pointer">
                      <Button
                        as="span"
                        :label="
                          bpkbFile
                            ? t('vehicles.labels.replaceFile')
                            : t('vehicles.labels.uploadBpkb')
                        "
                        icon="pi pi-upload"
                        size="small"
                        severity="secondary"
                        outlined
                      />
                      <input
                        ref="bpkbInputRef"
                        type="file"
                        class="hidden"
                        accept=".pdf,image/*"
                        @change="onBpkbFileChange"
                      />
                    </label>
                  </div>
                  <p v-if="bpkbUpload.error.value" class="text-sm text-red-500">
                    {{ bpkbUpload.error.value }}
                  </p>
                </div>
              </div>

              <!-- Insurance -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.insuranceExpiry') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('vehicles.labels.optional')
                  }}</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-2">
                  <DatePicker
                    id="insuranceExpiry"
                    name="insuranceExpiry"
                    class="w-full"
                    date-format="dd/mm/yy"
                    show-icon
                    :placeholder="t('vehicles.fields.insuranceExpiry')"
                  />
                  <div class="flex flex-col gap-1">
                    <div
                      v-if="insuranceFile && !insuranceUpload.pendingFile.value"
                      class="flex items-center gap-2 text-sm"
                    >
                      <a
                        :href="insuranceUpload.buildUrl(insuranceFile.url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate text-blue-600 underline"
                        >{{ insuranceFile.originalName }}</a
                      >
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        size="small"
                        :aria-label="t('vehicles.labels.removeFile')"
                        @click="removeInsuranceFile"
                      />
                    </div>
                    <div
                      v-if="insuranceUpload.pendingFile.value"
                      class="flex items-center gap-2 text-sm"
                    >
                      <i class="pi pi-file text-stone-400" />
                      <span class="truncate">{{ insuranceUpload.pendingFile.value.name }}</span>
                      <Button
                        icon="pi pi-times"
                        severity="secondary"
                        text
                        size="small"
                        :aria-label="t('common.actions.cancel')"
                        @click="insuranceUpload.clearPending()"
                      />
                    </div>
                    <div v-if="!insuranceFile || insuranceUpload.pendingFile.value !== null">
                      <label class="inline-flex cursor-pointer">
                        <Button
                          as="span"
                          :label="
                            insuranceFile
                              ? t('vehicles.labels.replaceFile')
                              : t('vehicles.labels.uploadInsurance')
                          "
                          icon="pi pi-upload"
                          size="small"
                          severity="secondary"
                          outlined
                        />
                        <input
                          ref="insuranceInputRef"
                          type="file"
                          class="hidden"
                          accept=".pdf,image/*"
                          @change="onInsuranceFileChange"
                        />
                      </label>
                    </div>
                    <p v-if="insuranceUpload.error.value" class="text-sm text-red-500">
                      {{ insuranceUpload.error.value }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Section: Status -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('vehicles.sections.statusSection') }}
            </h2>
          </template>
          <template #content>
            <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label for="status" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('vehicles.fields.status') }}
                  <span class="text-red-500">*</span>
                </label>
                <div class="flex w-full flex-auto flex-col gap-2">
                  <Select
                    id="status"
                    name="status"
                    :options="statusOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                  />

                  <!-- Status quick-action buttons in view mode -->
                  <div v-if="mode === 'view' && vehicle" class="mt-1 flex flex-wrap gap-2">
                    <Button
                      v-if="vehicle.status === 'available'"
                      :label="t('vehicles.labels.markService')"
                      icon="pi pi-wrench"
                      severity="warn"
                      outlined
                      size="small"
                      :loading="isStatusUpdating"
                      @click="updateStatus('service')"
                    />
                    <Button
                      v-if="vehicle.status === 'service'"
                      :label="t('vehicles.labels.markAvailable')"
                      icon="pi pi-check-circle"
                      severity="success"
                      outlined
                      size="small"
                      :loading="isStatusUpdating"
                      @click="updateStatus('available')"
                    />
                    <Button
                      v-if="vehicle.status !== 'inactive'"
                      :label="t('vehicles.labels.deactivate')"
                      icon="pi pi-ban"
                      severity="danger"
                      outlined
                      size="small"
                      :loading="isStatusUpdating"
                      @click="updateStatus('inactive')"
                    />
                    <Button
                      v-if="vehicle.status === 'inactive'"
                      :label="t('vehicles.labels.activate')"
                      icon="pi pi-play-circle"
                      severity="success"
                      outlined
                      size="small"
                      :loading="isStatusUpdating"
                      @click="updateStatus('available')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Submit -->
        <div class="flex justify-end gap-2">
          <Button
            type="submit"
            :label="isLoading ? '' : t('common.actions.save')"
            :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
            :disabled="isLoading"
          />
        </div>
      </Form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { VehiclesService, VehicleTypesService, FilesService } from '@/services'
import { useFileUpload } from '@/composables/useFileUpload'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import type { Vehicle, VehicleStatus } from '@/types/vehicle.type'
import type { FileRecord } from '@/types/file.type'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const toastGroup = 'vehicleDetail'

const props = defineProps<{
  mode: 'add' | 'view'
  id?: number
}>()

// State
const isLoadingData = ref(false)
const isLoading = ref(false)
const isStatusUpdating = ref(false)
const vehicle = ref<Vehicle | null>(null)
const formRef = ref()

// Initial options for InfiniteSelect
const initialVehicleType = ref()

// Existing document files
const stnkFile = ref<FileRecord | null>(null)
const bpkbFile = ref<FileRecord | null>(null)
const insuranceFile = ref<FileRecord | null>(null)

// File input refs
const stnkInputRef = ref<HTMLInputElement | null>(null)
const bpkbInputRef = ref<HTMLInputElement | null>(null)
const insuranceInputRef = ref<HTMLInputElement | null>(null)

// File upload composables
const stnkUpload = useFileUpload({
  ownerType: 'vehicle',
  category: 'stnk',
  cardinality: 'single',
  accept: '.pdf,image/*',
})
const bpkbUpload = useFileUpload({
  ownerType: 'vehicle',
  category: 'bpkb',
  cardinality: 'single',
  accept: '.pdf,image/*',
})
const insuranceUpload = useFileUpload({
  ownerType: 'vehicle',
  category: 'insurance',
  cardinality: 'single',
  accept: '.pdf,image/*',
})

// Form initial values
const initialValues = reactive({
  plateNumber: '',
  vehicleTypeId: undefined as number | undefined,
  brandModel: '',
  color: '',
  year: undefined as number | undefined,
  chassisNumber: '',
  engineNumber: '',
  ownership: 'owned' as string,
  capacityKg: '',
  volumeM3: '',
  bakLengthM: '',
  bakWidthM: '',
  bakHeightM: '',
  cargoType: 'dry' as string,
  stnkExpiry: undefined as Date | undefined,
  insuranceExpiry: undefined as Date | undefined,
  nextServiceKm: undefined as number | undefined,
  status: 'available' as string,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      plateNumber: z.string().min(1, t('vehicles.validation.plateNumberRequired')),
      vehicleTypeId: z.number({ required_error: t('vehicles.validation.vehicleTypeRequired') }),
      brandModel: z.string().optional(),
      color: z.string().optional(),
      year: z.number().optional(),
      chassisNumber: z.string().optional(),
      engineNumber: z.string().optional(),
      ownership: z.string().min(1, t('vehicles.validation.ownershipRequired')),
      capacityKg: z.string().optional(),
      volumeM3: z.string().optional(),
      bakLengthM: z.string().optional(),
      bakWidthM: z.string().optional(),
      bakHeightM: z.string().optional(),
      cargoType: z.string().min(1, t('vehicles.validation.cargoTypeRequired')),
      stnkExpiry: z.unknown().optional(),
      insuranceExpiry: z.unknown().optional(),
      nextServiceKm: z.number().optional(),
      status: z.string(),
    }),
  ),
)

// Dropdown options
const ownershipOptions = computed(() => [
  { label: t('vehicles.options.ownership.owned'), value: 'owned' },
  { label: t('vehicles.options.ownership.leased'), value: 'leased' },
])

const cargoTypeOptions = computed(() => [
  { label: t('vehicles.options.cargoType.dry'), value: 'dry' },
  { label: t('vehicles.options.cargoType.chiller'), value: 'chiller' },
  { label: t('vehicles.options.cargoType.freezer'), value: 'freezer' },
  { label: t('vehicles.options.cargoType.mixed'), value: 'mixed' },
])

const statusOptions = computed(() => [
  { label: t('vehicles.options.status.available'), value: 'available' },
  { label: t('vehicles.options.status.service'), value: 'service' },
  { label: t('vehicles.options.status.inactive'), value: 'inactive' },
])

// Load vehicle data in view mode
async function loadVehicle() {
  if (!props.id) return
  isLoadingData.value = true
  try {
    const v = await VehiclesService.get(props.id)
    vehicle.value = v

    initialValues.plateNumber = v.plateNumber
    initialValues.vehicleTypeId = v.vehicleTypeId
    initialValues.brandModel = v.brandModel ?? ''
    initialValues.color = v.color ?? ''
    initialValues.year = v.year ?? undefined
    initialValues.chassisNumber = v.chassisNumber ?? ''
    initialValues.engineNumber = v.engineNumber ?? ''
    initialValues.ownership = v.ownership
    initialValues.capacityKg = v.capacityKg ?? ''
    initialValues.volumeM3 = v.volumeM3 ?? ''
    initialValues.bakLengthM = v.bakLengthM ?? ''
    initialValues.bakWidthM = v.bakWidthM ?? ''
    initialValues.bakHeightM = v.bakHeightM ?? ''
    initialValues.cargoType = v.cargoType
    initialValues.stnkExpiry = v.stnkExpiry ? new Date(v.stnkExpiry) : undefined
    initialValues.insuranceExpiry = v.insuranceExpiry ? new Date(v.insuranceExpiry) : undefined
    initialValues.nextServiceKm = v.nextServiceKm ?? undefined
    initialValues.status = v.status

    initialVehicleType.value = { id: v.vehicleTypeId, name: v.vehicleTypeName }

    await loadDocuments(props.id)
  } catch {
    toast.add(commonErrorToast(new Error('Failed to load vehicle'), toastGroup))
  } finally {
    isLoadingData.value = false
  }
}

async function loadDocuments(vehicleId: number) {
  const [stnk, bpkb, insurance] = await Promise.all([
    FilesService.list({ ownerType: 'vehicle', ownerId: vehicleId, category: 'stnk' }),
    FilesService.list({ ownerType: 'vehicle', ownerId: vehicleId, category: 'bpkb' }),
    FilesService.list({ ownerType: 'vehicle', ownerId: vehicleId, category: 'insurance' }),
  ])
  stnkFile.value = stnk[0] ?? null
  bpkbFile.value = bpkb[0] ?? null
  insuranceFile.value = insurance[0] ?? null
}

onMounted(async () => {
  if (props.mode === 'view') {
    await loadVehicle()
  }
})

// File input handlers
function onStnkFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) stnkUpload.selectFile(file)
  if (stnkInputRef.value) stnkInputRef.value.value = ''
}

function onBpkbFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) bpkbUpload.selectFile(file)
  if (bpkbInputRef.value) bpkbInputRef.value.value = ''
}

function onInsuranceFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) insuranceUpload.selectFile(file)
  if (insuranceInputRef.value) insuranceInputRef.value.value = ''
}

async function removeStnkFile() {
  if (!stnkFile.value) return
  await stnkUpload.remove(stnkFile.value.id)
  stnkFile.value = null
}

async function removeBpkbFile() {
  if (!bpkbFile.value) return
  await bpkbUpload.remove(bpkbFile.value.id)
  bpkbFile.value = null
}

async function removeInsuranceFile() {
  if (!insuranceFile.value) return
  await insuranceUpload.remove(insuranceFile.value.id)
  insuranceFile.value = null
}

async function flushPendingDocs(vehicleId: number) {
  if (stnkUpload.pendingFile.value) {
    if (stnkFile.value) await stnkUpload.remove(stnkFile.value.id)
    const rec = await stnkUpload.upload(vehicleId)
    if (rec) stnkFile.value = rec
  }
  if (bpkbUpload.pendingFile.value) {
    if (bpkbFile.value) await bpkbUpload.remove(bpkbFile.value.id)
    const rec = await bpkbUpload.upload(vehicleId)
    if (rec) bpkbFile.value = rec
  }
  if (insuranceUpload.pendingFile.value) {
    if (insuranceFile.value) await insuranceUpload.remove(insuranceFile.value.id)
    const rec = await insuranceUpload.upload(vehicleId)
    if (rec) insuranceFile.value = rec
  }
}

// Utility: convert Date to ISO date string
function toISODate(val: unknown): string | undefined {
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return undefined
}

// Status quick action
async function updateStatus(status: VehicleStatus) {
  if (!props.id || !vehicle.value) return
  isStatusUpdating.value = true
  try {
    await VehiclesService.update(props.id, { status, updatedBy: authStore.userId! })
    vehicle.value = { ...vehicle.value, status }
    // Sync form select
    const states = formRef.value?.states
    if (states?.status) states.status.value = status
    toast.add(commonSuccessToast(t('vehicles.messages.statusUpdated'), toastGroup))
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isStatusUpdating.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  isLoading.value = true
  try {
    const s = event.states
    const plateNumber: string = s.plateNumber?.value ?? ''
    const vehicleTypeId: number = s.vehicleTypeId?.value
    const ownership: string = s.ownership?.value ?? 'owned'
    const cargoType: string = s.cargoType?.value ?? 'dry'
    const status: string = s.status?.value ?? 'available'

    const orEmpty = (v: unknown): string | undefined => {
      const str = (v as string | undefined) ?? ''
      return str.trim() || undefined
    }

    if (props.mode === 'add') {
      const created = await VehiclesService.create({
        plateNumber,
        vehicleTypeId,
        brandModel: orEmpty(s.brandModel?.value),
        color: orEmpty(s.color?.value),
        year: (s.year?.value as number | undefined) || undefined,
        chassisNumber: orEmpty(s.chassisNumber?.value),
        engineNumber: orEmpty(s.engineNumber?.value),
        ownership: ownership as 'owned' | 'leased',
        capacityKg: orEmpty(s.capacityKg?.value),
        volumeM3: orEmpty(s.volumeM3?.value),
        bakLengthM: orEmpty(s.bakLengthM?.value),
        bakWidthM: orEmpty(s.bakWidthM?.value),
        bakHeightM: orEmpty(s.bakHeightM?.value),
        cargoType: cargoType as 'dry' | 'chiller' | 'freezer' | 'mixed',
        stnkExpiry: toISODate(s.stnkExpiry?.value),
        insuranceExpiry: toISODate(s.insuranceExpiry?.value),
        nextServiceKm: (s.nextServiceKm?.value as number | undefined) || undefined,
        status: status as VehicleStatus,
        createdBy: authStore.userId!,
      })
      await flushPendingDocs(created.id)
      toast.add(commonSuccessToast(t('vehicles.messages.vehicleCreated'), toastGroup))
      // Back to the list, replacing the create form so Back doesn't reopen it
      setTimeout(() => router.replace('/vehicles'), 800)
    } else {
      await VehiclesService.update(props.id!, {
        plateNumber,
        vehicleTypeId,
        brandModel: orEmpty(s.brandModel?.value) ?? null,
        color: orEmpty(s.color?.value) ?? null,
        year: (s.year?.value as number | undefined) || null,
        chassisNumber: orEmpty(s.chassisNumber?.value) ?? null,
        engineNumber: orEmpty(s.engineNumber?.value) ?? null,
        ownership: ownership as 'owned' | 'leased',
        capacityKg: orEmpty(s.capacityKg?.value) ?? null,
        volumeM3: orEmpty(s.volumeM3?.value) ?? null,
        bakLengthM: orEmpty(s.bakLengthM?.value) ?? null,
        bakWidthM: orEmpty(s.bakWidthM?.value) ?? null,
        bakHeightM: orEmpty(s.bakHeightM?.value) ?? null,
        cargoType: cargoType as 'dry' | 'chiller' | 'freezer' | 'mixed',
        stnkExpiry: toISODate(s.stnkExpiry?.value) ?? null,
        insuranceExpiry: toISODate(s.insuranceExpiry?.value) ?? null,
        nextServiceKm: (s.nextServiceKm?.value as number | undefined) || null,
        status: status as VehicleStatus,
        updatedBy: authStore.userId!,
      })
      await flushPendingDocs(props.id!)
      // Refresh vehicle in memory
      vehicle.value = await VehiclesService.get(props.id!)
      toast.add(commonSuccessToast(t('vehicles.messages.vehicleUpdated'), toastGroup))
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
