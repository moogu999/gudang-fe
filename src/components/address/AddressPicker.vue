<template>
  <div class="flex flex-col gap-4">
    <!-- Address textarea -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.address') }}
      </label>
      <Textarea
        :model-value="modelValue.address"
        rows="2"
        class="w-full"
        :disabled="disabled"
        @update:model-value="emit('update:modelValue', { ...modelValue, address: $event as string })"
      />
    </div>

    <!-- Country -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.country') }}
      </label>
      <InfiniteSelect
        class="w-full"
        option-label="name"
        option-value="id"
        :fetch-fn="(q) => CountriesService.list(q)"
        :initial-option="initialCountry"
        :model-value="modelValue.countryId"
        :disabled="disabled"
        :placeholder="t('customers.labels.selectCountry')"
        @update:model-value="onCountryChange"
      />
    </div>

    <!-- Province -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.province') }}
      </label>
      <InfiniteSelect
        class="w-full"
        option-label="name"
        option-value="id"
        :fetch-fn="(q) => ProvincesService.list(q)"
        :initial-option="initialProvince"
        :custom-filters="provinceFilters"
        :model-value="modelValue.provinceId"
        :disabled="disabled || !modelValue.countryId"
        :placeholder="t('customers.labels.selectProvince')"
        @update:model-value="onProvinceChange"
      />
    </div>

    <!-- City -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.city') }}
      </label>
      <InfiniteSelect
        class="w-full"
        option-label="name"
        option-value="id"
        :fetch-fn="(q) => CitiesService.list(q)"
        :initial-option="initialCity"
        :custom-filters="cityFilters"
        :model-value="modelValue.cityId"
        :disabled="disabled || !modelValue.provinceId"
        :placeholder="t('customers.labels.selectCity')"
        @update:model-value="onCityChange"
      />
    </div>

    <!-- District -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.district') }}
      </label>
      <InfiniteSelect
        class="w-full"
        option-label="name"
        option-value="id"
        :fetch-fn="(q) => DistrictsService.list(q)"
        :initial-option="initialDistrict"
        :custom-filters="districtFilters"
        :model-value="modelValue.districtId"
        :disabled="disabled || !modelValue.cityId"
        :placeholder="t('customers.labels.selectDistrict')"
        @update:model-value="onDistrictChange"
      />
    </div>

    <!-- Sub District -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.subDistrict') }}
      </label>
      <InfiniteSelect
        class="w-full"
        option-label="name"
        option-value="id"
        :fetch-fn="(q) => SubDistrictsService.list(q)"
        :initial-option="initialSubDistrict"
        :custom-filters="subDistrictFilters"
        :model-value="modelValue.subDistrictId"
        :disabled="disabled || !modelValue.districtId"
        :placeholder="t('customers.labels.selectSubDistrict')"
        @update:model-value="
          emit('update:modelValue', { ...modelValue, subDistrictId: typeof $event === 'number' ? $event : null })
        "
      />
    </div>

    <!-- Zip Code -->
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label class="w-full text-sm font-semibold sm:text-base md:w-40">
        {{ t('customers.fields.zipCode') }}
      </label>
      <InputText
        :model-value="modelValue.zipCode"
        class="w-full"
        :disabled="disabled"
        @update:model-value="emit('update:modelValue', { ...modelValue, zipCode: $event as string })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CountriesService, ProvincesService, CitiesService, DistrictsService, SubDistrictsService } from '@/services'

const { t } = useI18n()

export interface AddressValue {
  address?: string
  countryId?: number | null
  provinceId?: number | null
  cityId?: number | null
  districtId?: number | null
  subDistrictId?: number | null
  zipCode?: string
  latitude?: string | null
  longitude?: string | null
}

interface Props {
  modelValue: AddressValue
  disabled?: boolean
  initialCountry?: { id: number; name: string }
  initialProvince?: { id: number; name: string }
  initialCity?: { id: number; name: string }
  initialDistrict?: { id: number; name: string }
  initialSubDistrict?: { id: number; name: string }
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: AddressValue]
}>()

const provinceFilters = computed(() =>
  props.modelValue.countryId
    ? [{ filterBy: 'countryId', filterOperator: 'eq', filterValue: props.modelValue.countryId }]
    : [],
)

const cityFilters = computed(() =>
  props.modelValue.provinceId
    ? [{ filterBy: 'provinceId', filterOperator: 'eq', filterValue: props.modelValue.provinceId }]
    : [],
)

const districtFilters = computed(() =>
  props.modelValue.cityId
    ? [{ filterBy: 'cityId', filterOperator: 'eq', filterValue: props.modelValue.cityId }]
    : [],
)

const subDistrictFilters = computed(() =>
  props.modelValue.districtId
    ? [{ filterBy: 'districtId', filterOperator: 'eq', filterValue: props.modelValue.districtId }]
    : [],
)

function toId(val: unknown): number | null {
  return typeof val === 'number' ? val : null
}

function onCountryChange(val: unknown) {
  emit('update:modelValue', {
    ...props.modelValue,
    countryId: toId(val),
    provinceId: null,
    cityId: null,
    districtId: null,
    subDistrictId: null,
  })
}

function onProvinceChange(val: unknown) {
  emit('update:modelValue', {
    ...props.modelValue,
    provinceId: toId(val),
    cityId: null,
    districtId: null,
    subDistrictId: null,
  })
}

function onCityChange(val: unknown) {
  emit('update:modelValue', {
    ...props.modelValue,
    cityId: toId(val),
    districtId: null,
    subDistrictId: null,
  })
}

function onDistrictChange(val: unknown) {
  emit('update:modelValue', {
    ...props.modelValue,
    districtId: toId(val),
    subDistrictId: null,
  })
}
</script>
