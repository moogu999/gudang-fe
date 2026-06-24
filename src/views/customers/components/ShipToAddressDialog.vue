<template>
  <Dialog
    :visible="visible"
    :header="mode === 'add' ? t('customers.labels.addAddress') : t('customers.labels.editAddress')"
    modal
    :breakpoints="{ '960px': '85vw', '640px': '95vw' }"
    :style="{ width: '60vw' }"
    :pt="{ header: 'text-base sm:text-lg' }"
    @update:visible="emit('hide')"
  >
    <div class="flex flex-col gap-4 pt-2">
      <!-- Label -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-40">
          {{ t('customers.fields.label') }}
          <span class="ml-0.5 text-red-500">*</span>
        </label>
        <div class="flex w-full flex-col gap-1">
          <InputText v-model="form.label" class="w-full" />
          <small v-if="labelError" class="text-red-500">{{ labelError }}</small>
        </div>
      </div>

      <!-- Address Picker (region cascade) -->
      <AddressPicker
        v-model="addressValue"
        :initial-country="initialCountry"
        :initial-province="initialProvince"
        :initial-city="initialCity"
        :initial-district="initialDistrict"
        :initial-sub-district="initialSubDistrict"
      />

      <!-- Receiving hours -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-40">
          {{ t('customers.operationalHours.receiving') }}
        </label>
        <div class="flex items-center gap-2">
          <InputText v-model="form.receivingHoursStart" type="time" class="w-28 text-sm" />
          <span class="text-stone-400">–</span>
          <InputText v-model="form.receivingHoursEnd" type="time" class="w-28 text-sm" />
        </div>
      </div>

      <!-- Vehicle Access -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-40">
          {{ t('customers.fields.vehicleAccess') }}
        </label>
        <InfiniteSelect
          class="w-full"
          option-label="name"
          option-value="id"
          :fetch-fn="(q) => VehicleAccessesService.list(q)"
          :initial-option="initialVehicleAccess"
          :model-value="form.vehicleAccessId ?? null"
          :placeholder="t('customers.labels.selectVehicleAccess')"
          sort-by="sortOrder"
          sort-operator="asc"
          @update:model-value="form.vehicleAccessId = typeof $event === 'number' ? $event : null"
        />
      </div>

      <!-- PIC Name -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-40">
          {{ t('customers.fields.picName') }}
        </label>
        <InputText v-model="form.picName" class="w-full" />
      </div>

      <!-- PIC Phone -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-40">
          {{ t('customers.fields.picPhone') }}
        </label>
        <InputText v-model="form.picPhone" class="w-full" />
      </div>

      <!-- Flags -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <Checkbox v-model="form.isPrimary" :binary="true" input-id="addrPrimary" />
          <label for="addrPrimary" class="text-sm">{{ t('customers.fields.isPrimary') }}</label>
        </div>
        <div class="flex items-center gap-3">
          <Checkbox v-model="form.isDefaultShipping" :binary="true" input-id="addrDefaultShip" />
          <label for="addrDefaultShip" class="text-sm">{{
            t('customers.fields.isDefaultShipping')
          }}</label>
        </div>
        <div class="flex items-center gap-3">
          <Checkbox v-model="form.isTaxInvoiceAddress" :binary="true" input-id="addrTaxInvoice" />
          <label for="addrTaxInvoice" class="text-sm">{{
            t('customers.fields.isTaxInvoiceAddress')
          }}</label>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('hide')" />
        <Button :label="t('common.actions.save')" @click="onSave" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import AddressPicker, { type AddressValue } from '@/components/address/AddressPicker.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { VehicleAccessesService } from '@/services'
import type { CustomerAddress } from '@/types/customer.type'

const { t } = useI18n()

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  modelValue?: CustomerAddress
}

const props = defineProps<Props>()

const emit = defineEmits<{
  hide: []
  save: [value: CustomerAddress]
}>()

const form = reactive<CustomerAddress>({
  label: '',
  address: '',
  countryId: null,
  provinceId: null,
  cityId: null,
  districtId: null,
  subDistrictId: null,
  zipCode: '',
  latitude: null,
  longitude: null,
  receivingHoursStart: '',
  receivingHoursEnd: '',
  vehicleAccessId: null,
  picName: '',
  picPhone: '',
  isPrimary: false,
  isDefaultShipping: false,
  isTaxInvoiceAddress: false,
})

const initialCountry = ref<{ id: number; name: string } | undefined>(undefined)
const initialProvince = ref<{ id: number; name: string } | undefined>(undefined)
const initialCity = ref<{ id: number; name: string } | undefined>(undefined)
const initialDistrict = ref<{ id: number; name: string } | undefined>(undefined)
const initialSubDistrict = ref<{ id: number; name: string } | undefined>(undefined)
const initialVehicleAccess = ref<{ id: number; name: string } | undefined>(undefined)

const addressValue = computed<AddressValue>({
  get: () => ({
    address: form.address,
    countryId: form.countryId,
    provinceId: form.provinceId,
    cityId: form.cityId,
    districtId: form.districtId,
    subDistrictId: form.subDistrictId,
    zipCode: form.zipCode,
    latitude: form.latitude,
    longitude: form.longitude,
  }),
  set: (val) => {
    form.address = val.address
    form.countryId = val.countryId ?? null
    form.provinceId = val.provinceId ?? null
    form.cityId = val.cityId ?? null
    form.districtId = val.districtId ?? null
    form.subDistrictId = val.subDistrictId ?? null
    form.zipCode = val.zipCode
    form.latitude = val.latitude ?? null
    form.longitude = val.longitude ?? null
  },
})

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    labelError.value = ''
    const src = props.modelValue
    form.id = src?.id
    form.label = src?.label ?? ''
    form.address = src?.address ?? ''
    form.countryId = src?.countryId ?? null
    form.provinceId = src?.provinceId ?? null
    form.cityId = src?.cityId ?? null
    form.districtId = src?.districtId ?? null
    form.subDistrictId = src?.subDistrictId ?? null
    form.zipCode = src?.zipCode ?? ''
    form.latitude = src?.latitude ?? null
    form.longitude = src?.longitude ?? null
    form.receivingHoursStart = src?.receivingHoursStart ?? ''
    form.receivingHoursEnd = src?.receivingHoursEnd ?? ''
    form.vehicleAccessId = src?.vehicleAccessId ?? null
    form.picName = src?.picName ?? ''
    form.picPhone = src?.picPhone ?? ''
    form.isPrimary = src?.isPrimary ?? false
    form.isDefaultShipping = src?.isDefaultShipping ?? false
    form.isTaxInvoiceAddress = src?.isTaxInvoiceAddress ?? false

    initialCountry.value = src?.country ? { id: src.countryId!, name: src.country.name } : undefined
    initialProvince.value = src?.province
      ? { id: src.provinceId!, name: src.province.name }
      : undefined
    initialCity.value = src?.city ? { id: src.cityId!, name: src.city.name } : undefined
    initialDistrict.value = src?.district
      ? { id: src.districtId!, name: src.district.name }
      : undefined
    initialSubDistrict.value = src?.subDistrict
      ? { id: src.subDistrictId!, name: src.subDistrict.name }
      : undefined
    initialVehicleAccess.value = src?.vehicleAccess
      ? { id: src.vehicleAccessId!, name: src.vehicleAccess.name }
      : undefined
  },
)

const labelError = ref('')

function onSave() {
  labelError.value = form.label?.trim() ? '' : t('common.messages.required')
  if (labelError.value) return
  emit('save', { ...form })
}
</script>
