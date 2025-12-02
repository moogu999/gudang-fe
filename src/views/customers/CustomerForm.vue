<template>
  <Form v-slot="$form" :initial-values="initialValues" :resolver="resolver" @submit="onFormSubmit">
    <!-- Name -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.name') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputText
          id="name"
          name="name"
          autocomplete="off"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
        <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">
          {{ $form.name.error.message }}
        </Message>
      </div>
    </div>

    <!-- Currency -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="currencyId" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.currency') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InfiniteSelect
          id="currencyId"
          name="currencyId"
          option-label="code"
          option-value="id"
          :fetch-fn="(query) => CurrenciesService.list(query)"
          :disabled="mode === DialogMode.VIEW"
          :placeholder="t('customers.labels.selectCurrency')"
          :initial-option="initialCurrency"
          sort-by="code"
          sort-operator="asc"
        />
        <Message v-if="$form.currencyId?.invalid" severity="error" size="small" variant="simple">
          {{ $form.currencyId.error.message }}
        </Message>
      </div>
    </div>

    <!-- Taxable -->
    <div class="mb-4 flex flex-row items-center gap-2 md:items-start md:gap-4">
      <label for="taxable" class="text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.taxable') }}
      </label>
      <div class="flex flex-auto flex-col gap-1">
        <Checkbox id="taxable" name="taxable" :binary="true" :disabled="mode === DialogMode.VIEW" />
        <Message v-if="$form.taxable?.invalid" severity="error" size="small" variant="simple">
          {{ $form.taxable.error.message }}
        </Message>
      </div>
    </div>

    <!-- Address -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="address" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.address') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <Textarea
          id="address"
          name="address"
          rows="3"
          autocomplete="off"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
        <Message v-if="$form.address?.invalid" severity="error" size="small" variant="simple">
          {{ $form.address.error.message }}
        </Message>
      </div>
    </div>

    <!-- Country -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="countryId" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.country') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InfiniteSelect
          v-model="selectedCountryId"
          id="countryId"
          name="countryId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => CountriesService.list(query)"
          :disabled="mode === DialogMode.VIEW"
          :placeholder="t('customers.labels.selectCountry')"
          :initial-option="initialCountry"
          sort-by="name"
          sort-operator="asc"
        />
        <Message v-if="$form.countryId?.invalid" severity="error" size="small" variant="simple">
          {{ $form.countryId.error.message }}
        </Message>
      </div>
    </div>

    <!-- Province -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="provinceId" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.province') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InfiniteSelect
          v-model="selectedProvinceId"
          id="provinceId"
          name="provinceId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => ProvincesService.list(query)"
          :disabled="mode === DialogMode.VIEW || !selectedCountryId"
          :placeholder="t('customers.labels.selectProvince')"
          :initial-option="initialProvince"
          :custom-filters="provinceFilters"
          sort-by="name"
          sort-operator="asc"
        />
        <Message v-if="$form.provinceId?.invalid" severity="error" size="small" variant="simple">
          {{ $form.provinceId.error.message }}
        </Message>
      </div>
    </div>

    <!-- City -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="cityId" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.city') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InfiniteSelect
          v-model="selectedCityId"
          id="cityId"
          name="cityId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => CitiesService.list(query)"
          :disabled="mode === DialogMode.VIEW || !selectedProvinceId"
          :placeholder="t('customers.labels.selectCity')"
          :initial-option="initialCity"
          :custom-filters="cityFilters"
          sort-by="name"
          sort-operator="asc"
        />
        <Message v-if="$form.cityId?.invalid" severity="error" size="small" variant="simple">
          {{ $form.cityId.error.message }}
        </Message>
      </div>
    </div>

    <!-- District -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="districtId" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.district') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InfiniteSelect
          v-model="selectedDistrictId"
          id="districtId"
          name="districtId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => DistrictsService.list(query)"
          :disabled="mode === DialogMode.VIEW || !selectedCityId"
          :placeholder="t('customers.labels.selectDistrict')"
          :initial-option="initialDistrict"
          :custom-filters="districtFilters"
          sort-by="name"
          sort-operator="asc"
        />
        <Message v-if="$form.districtId?.invalid" severity="error" size="small" variant="simple">
          {{ $form.districtId.error.message }}
        </Message>
      </div>
    </div>

    <!-- Sub District -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="subDistrictId" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.subDistrict') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InfiniteSelect
          v-model="selectedSubDistrictId"
          id="subDistrictId"
          name="subDistrictId"
          option-label="name"
          option-value="id"
          :fetch-fn="(query) => SubDistrictsService.list(query)"
          :disabled="mode === DialogMode.VIEW || !selectedDistrictId"
          :placeholder="t('customers.labels.selectSubDistrict')"
          :initial-option="initialSubDistrict"
          :custom-filters="subDistrictFilters"
          sort-by="name"
          sort-operator="asc"
        />
        <Message v-if="$form.subDistrictId?.invalid" severity="error" size="small" variant="simple">
          {{ $form.subDistrictId.error.message }}
        </Message>
      </div>
    </div>

    <!-- Zip Code -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="zipCode" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.zipCode') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputText
          id="zipCode"
          name="zipCode"
          autocomplete="off"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
        <Message v-if="$form.zipCode?.invalid" severity="error" size="small" variant="simple">
          {{ $form.zipCode.error.message }}
        </Message>
      </div>
    </div>

    <!-- Longitude -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="longitude" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.longitude') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputNumber
          id="longitude"
          name="longitude"
          mode="decimal"
          :min-fraction-digits="0"
          :max-fraction-digits="8"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
        <Message v-if="$form.longitude?.invalid" severity="error" size="small" variant="simple">
          {{ $form.longitude.error.message }}
        </Message>
      </div>
    </div>

    <!-- Latitude -->
    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="latitude" class="w-full text-sm font-semibold sm:text-base md:w-32">
        {{ t('customers.fields.latitude') }}
      </label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputNumber
          id="latitude"
          name="latitude"
          mode="decimal"
          :min-fraction-digits="0"
          :max-fraction-digits="8"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
        <Message v-if="$form.latitude?.invalid" severity="error" size="small" variant="simple">
          {{ $form.latitude.error.message }}
        </Message>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2" v-if="mode !== DialogMode.VIEW">
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isLoading"
        @click="handleCancel"
      />
      <Button
        type="submit"
        :label="!isLoading ? t('common.actions.save') : ''"
        :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
        :disabled="isLoading"
      />
    </div>
    <div class="flex justify-end gap-2" v-else>
      <Button type="button" :label="t('common.actions.close')" @click="handleCancel" />
    </div>
  </Form>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref, watch, type Ref } from 'vue'
import Message from 'primevue/message'
import {
  CurrenciesService,
  CountriesService,
  ProvincesService,
  CitiesService,
  DistrictsService,
  SubDistrictsService,
} from '@/services'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import type { Customer } from '@/types/customer.type'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  customer: {
    type: Object as PropType<Customer>,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emits = defineEmits<{
  submit: [event: FormSubmitEvent]
  cancel: []
}>()

// Initial options for dropdowns
const initialCurrency = ref()
const initialCountry = ref()
const initialProvince = ref()
const initialCity = ref()
const initialDistrict = ref()
const initialSubDistrict = ref()

// Selected values for cascading dropdowns
const selectedCountryId = ref<number | undefined>(undefined)
const selectedProvinceId = ref<number | undefined>(undefined)
const selectedCityId = ref<number | undefined>(undefined)
const selectedDistrictId = ref<number | undefined>(undefined)
const selectedSubDistrictId = ref<number | undefined>(undefined)

// Computed filters for cascading dropdowns
const provinceFilters = computed(() => {
  if (!selectedCountryId.value) return []
  return [
    {
      filterBy: 'countryId',
      filterOperator: FilterOperator.EQUAL,
      filterValue: selectedCountryId.value,
    },
  ]
})

const cityFilters = computed(() => {
  if (!selectedProvinceId.value) return []
  return [
    {
      filterBy: 'provinceId',
      filterOperator: FilterOperator.EQUAL,
      filterValue: selectedProvinceId.value,
    },
  ]
})

const districtFilters = computed(() => {
  if (!selectedCityId.value) return []
  return [
    { filterBy: 'cityId', filterOperator: FilterOperator.EQUAL, filterValue: selectedCityId.value },
  ]
})

const subDistrictFilters = computed(() => {
  if (!selectedDistrictId.value) return []
  return [
    {
      filterBy: 'districtId',
      filterOperator: FilterOperator.EQUAL,
      filterValue: selectedDistrictId.value,
    },
  ]
})

// Form initial values
const initialValues = reactive({
  name: '',
  currencyId: undefined as number | undefined,
  taxable: false,
  address: '',
  countryId: undefined as number | undefined,
  provinceId: undefined as number | undefined,
  cityId: undefined as number | undefined,
  districtId: undefined as number | undefined,
  subDistrictId: undefined as number | undefined,
  zipCode: '',
  longitude: undefined as number | undefined,
  latitude: undefined as number | undefined,
})

if (props.customer && (props.mode === DialogMode.EDIT || props.mode === DialogMode.VIEW)) {
  selectedCountryId.value = props.customer.countryId
  selectedProvinceId.value = props.customer.provinceId
  selectedCityId.value = props.customer.cityId
  selectedDistrictId.value = props.customer.districtId
  selectedSubDistrictId.value = props.customer.subDistrictId
}

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.customer) {
    return
  }

  // Populate form with existing customer data
  initialValues.name = props.customer.name
  initialValues.currencyId = props.customer.currencyId
  initialValues.taxable = props.customer.taxable
  initialValues.address = props.customer.address || ''
  initialValues.countryId = props.customer.countryId
  initialValues.provinceId = props.customer.provinceId
  initialValues.cityId = props.customer.cityId
  initialValues.districtId = props.customer.districtId
  initialValues.subDistrictId = props.customer.subDistrictId
  initialValues.zipCode = props.customer.zipCode || ''
  initialValues.longitude = props.customer.longitude
  initialValues.latitude = props.customer.latitude

  // Set initial options for dropdowns
  if (props.customer.currency) {
    initialCurrency.value = {
      id: props.customer.currencyId,
      code: props.customer.currency.code,
    }
  }

  if (props.customer.country) {
    initialCountry.value = {
      id: props.customer.countryId,
      name: props.customer.country.name,
    }
  }

  if (props.customer.province) {
    initialProvince.value = {
      id: props.customer.provinceId,
      name: props.customer.province.name,
    }
  }

  if (props.customer.city) {
    initialCity.value = {
      id: props.customer.cityId,
      name: props.customer.city.name,
    }
  }

  if (props.customer.district) {
    initialDistrict.value = {
      id: props.customer.districtId,
      name: props.customer.district.name,
    }
  }

  if (props.customer.subDistrict) {
    initialSubDistrict.value = {
      id: props.customer.subDistrictId,
      name: props.customer.subDistrict.name,
    }
  }
})

// Watch for country changes and clear all lower levels
watch(selectedCountryId, (newValue, oldValue) => {
  if (newValue !== oldValue && oldValue !== undefined) {
    clearDependentFields([
      { ref: selectedProvinceId, formKey: 'provinceId' },
      { ref: selectedCityId, formKey: 'cityId' },
      { ref: selectedDistrictId, formKey: 'districtId' },
      { ref: selectedSubDistrictId, formKey: 'subDistrictId' },
    ])
  }
})

// Watch for province changes and clear lower levels
watch(selectedProvinceId, (newValue, oldValue) => {
  if (newValue !== oldValue && oldValue !== undefined) {
    clearDependentFields([
      { ref: selectedCityId, formKey: 'cityId' },
      { ref: selectedDistrictId, formKey: 'districtId' },
      { ref: selectedSubDistrictId, formKey: 'subDistrictId' },
    ])
  }
})

// Watch for city changes and clear lower levels
watch(selectedCityId, (newValue, oldValue) => {
  if (newValue !== oldValue && oldValue !== undefined) {
    clearDependentFields([
      { ref: selectedDistrictId, formKey: 'districtId' },
      { ref: selectedSubDistrictId, formKey: 'subDistrictId' },
    ])
  }
})

// Watch for district changes and clear sub-district
watch(selectedDistrictId, (newValue, oldValue) => {
  if (newValue !== oldValue && oldValue !== undefined) {
    clearDependentFields([{ ref: selectedSubDistrictId, formKey: 'subDistrictId' }])
  }
})

function clearDependentFields(
  fields: Array<{ ref: Ref<number | undefined>; formKey: keyof typeof initialValues }>,
) {
  fields.forEach(({ ref, formKey }) => {
    ref.value = undefined
    ;(initialValues[formKey] as number | undefined) = undefined
  })
}

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('customers.validation.nameRequired')),
      currencyId: z.number().nullish(),
      taxable: z.boolean(),
      address: z.string().nullish(),
      countryId: z.number().nullish(),
      provinceId: z.number().nullish(),
      cityId: z.number().nullish(),
      districtId: z.number().nullish(),
      subDistrictId: z.number().nullish(),
      zipCode: z.string().nullish(),
      longitude: z.number().nullish(),
      latitude: z.number().nullish(),
    }),
  ),
)

function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }
  emits('submit', event)
}

function handleCancel() {
  emits('cancel')
}
</script>
