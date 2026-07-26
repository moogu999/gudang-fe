<template>
  <div>
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="identity">{{ t('customers.sections.identity') }}</Tab>
        <Tab value="location">{{ t('customers.sections.location') }}</Tab>
        <Tab value="ship-to">{{ t('customers.sections.shipTo') }}</Tab>
        <Tab value="contact">{{ t('customers.sections.contact') }}</Tab>
        <Tab value="tax">{{ t('customers.sections.tax') }}</Tab>
        <Tab value="banking">{{ t('customers.sections.banking') }}</Tab>
        <Tab value="operational">{{ t('customers.sections.operational') }}</Tab>
      </TabList>
      <TabPanels>
        <!-- ─── Section: Identity ───────────────────────────── -->
        <TabPanel value="identity">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.identity') }}
              </h2>
            </template>
            <template #content>
              <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
                <!-- Code -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.code') }}
                  </label>
                  <div class="flex w-full flex-col gap-1">
                    <div v-if="mode === 'add'" class="mb-1 flex gap-2">
                      <Button
                        type="button"
                        :label="t('customers.codeMode.auto')"
                        :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                        size="small"
                        :disabled="!hasDefaultSeries || numberSeriesLoading || disabled"
                        @click="codeMode = 'auto'"
                      />
                      <Button
                        type="button"
                        :label="t('customers.codeMode.manual')"
                        :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
                        size="small"
                        :disabled="disabled"
                        @click="codeMode = 'manual'"
                      />
                    </div>
                    <div v-if="codeMode === 'auto'" class="flex flex-col gap-1">
                      <InputText
                        :value="numberSeriesLoading ? '' : previewCode"
                        :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
                        readonly
                        class="w-full"
                      />
                      <small class="text-stone-500">{{
                        t('customers.codeMode.assignedOnSave')
                      }}</small>
                    </div>
                    <InputText v-else v-model="formData.code" :disabled="disabled" class="w-full" />
                    <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
                  </div>
                </div>

                <!-- Name -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.name') }}
                    <span class="ml-0.5 text-red-500">*</span>
                  </label>
                  <div class="flex w-full flex-col gap-1">
                    <InputText v-model="formData.name" :disabled="disabled" class="w-full" />
                    <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
                  </div>
                </div>

                <!-- Owner Name -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.ownerName') }}
                  </label>
                  <InputText v-model="formData.ownerName" :disabled="disabled" class="w-full" />
                </div>

                <!-- Outlet Type -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.outletType') }}
                    <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                  </label>
                  <div class="flex w-full flex-col gap-1">
                    <InfiniteSelect
                      class="w-full"
                      option-label="name"
                      option-value="id"
                      :fetch-fn="(q) => CustomerOutletTypesService.list(q)"
                      :initial-option="initialOutletType"
                      :model-value="formData.outletTypeId ?? null"
                      :disabled="disabled"
                      :placeholder="t('customers.labels.selectOutletType')"
                      @update:model-value="
                        formData.outletTypeId = typeof $event === 'number' ? $event : null
                      "
                    />
                    <small v-if="errors.outletTypeId" class="text-red-500">{{
                      errors.outletTypeId
                    }}</small>
                  </div>
                </div>

                <!-- Channel -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.channel') }}
                    <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                  </label>
                  <div class="flex w-full flex-col gap-1">
                    <InfiniteSelect
                      class="w-full"
                      option-label="name"
                      option-value="id"
                      :fetch-fn="(q) => CustomerChannelsService.list(q)"
                      :initial-option="initialChannel"
                      :model-value="formData.channelId ?? null"
                      :disabled="disabled"
                      :placeholder="t('customers.labels.selectChannel')"
                      @update:model-value="
                        formData.channelId = typeof $event === 'number' ? $event : null
                      "
                    />
                    <small v-if="errors.channelId" class="text-red-500">{{
                      errors.channelId
                    }}</small>
                  </div>
                </div>

                <!-- Category -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.category') }}
                    <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                  </label>
                  <div class="flex w-full flex-col gap-1">
                    <InfiniteSelect
                      class="w-full"
                      option-label="name"
                      option-value="id"
                      :fetch-fn="(q) => CustomerCategoriesService.list(q)"
                      :initial-option="initialCategory"
                      :model-value="formData.categoryId ?? null"
                      :disabled="disabled"
                      :placeholder="t('customers.labels.selectCategory')"
                      @update:model-value="
                        formData.categoryId = typeof $event === 'number' ? $event : null
                      "
                    />
                    <small v-if="errors.categoryId" class="text-red-500">{{
                      errors.categoryId
                    }}</small>
                  </div>
                </div>

                <!-- Is Active -->
                <div class="flex items-center gap-3">
                  <Checkbox
                    v-model="formData.isActive"
                    :binary="true"
                    :disabled="disabled"
                    input-id="isActive"
                  />
                  <label for="isActive" class="text-sm font-medium">{{
                    t('customers.fields.active')
                  }}</label>
                </div>
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>

        <!-- ─── Section: Location (main address) ──────────── -->
        <TabPanel value="location">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.location') }}
              </h2>
            </template>
            <template #content>
              <div class="px-4 pb-4 sm:px-6 sm:pb-6">
                <AddressPicker
                  v-model="mainAddress"
                  :disabled="disabled"
                  :initial-country="initialCountry"
                  :initial-province="initialProvince"
                  :initial-city="initialCity"
                  :initial-district="initialDistrict"
                  :initial-sub-district="initialSubDistrict"
                />

                <!-- Area (city) -->
                <div class="mt-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                    {{ t('customers.fields.area') }}
                  </label>
                  <InfiniteSelect
                    class="w-full"
                    option-label="name"
                    option-value="id"
                    :fetch-fn="(q) => CitiesService.list(q)"
                    :initial-option="initialArea"
                    :model-value="formData.areaId ?? null"
                    :disabled="disabled"
                    :placeholder="t('customers.labels.selectCity')"
                    @update:model-value="
                      formData.areaId = typeof $event === 'number' ? $event : null
                    "
                  />
                </div>

                <!-- Latitude / Longitude -->
                <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold">{{
                      t('customers.fields.latitude')
                    }}</label>
                    <InputText v-model="formData.latitude" :disabled="disabled" class="w-full" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold">{{
                      t('customers.fields.longitude')
                    }}</label>
                    <InputText v-model="formData.longitude" :disabled="disabled" class="w-full" />
                  </div>
                </div>
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>

        <!-- ─── Section: Ship-To & Delivery ─────────────── -->
        <TabPanel value="ship-to">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.shipTo') }}
              </h2>
            </template>
            <template #content>
              <div class="px-4 pb-4 sm:px-6 sm:pb-6">
                <ShipToSection
                  v-model="formData.addresses"
                  :disabled="disabled"
                  :errors="errors.addresses"
                />

                <!-- Billing & Partners -->
                <div class="mt-6 border-t border-stone-100 pt-5">
                  <p class="mb-4 text-xs font-semibold tracking-widest text-stone-400 uppercase">
                    {{ t('customers.sections.billingPartners') }}
                  </p>
                  <div class="flex flex-col gap-5">
                    <!-- Currency -->
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                      <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                        t('customers.fields.currency')
                      }}</label>
                      <InfiniteSelect
                        class="w-full"
                        option-label="code"
                        option-value="id"
                        :fetch-fn="(q) => CurrenciesService.list(q)"
                        :initial-option="initialCurrency"
                        :model-value="formData.currencyId ?? null"
                        :disabled="disabled"
                        :placeholder="t('customers.labels.selectCurrency')"
                        sort-by="code"
                        sort-operator="asc"
                        @update:model-value="
                          formData.currencyId = typeof $event === 'number' ? $event : null
                        "
                      />
                    </div>

                    <!-- Sell To -->
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                      <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                        t('customers.fields.sellTo')
                      }}</label>
                      <InfiniteSelect
                        class="w-full"
                        option-label="name"
                        option-value="id"
                        :fetch-fn="(q) => CustomersService.list(q)"
                        :initial-option="initialSellTo"
                        :model-value="formData.sellToId ?? null"
                        :disabled="disabled"
                        :placeholder="t('customers.labels.selectCustomer')"
                        @update:model-value="
                          formData.sellToId = typeof $event === 'number' ? $event : null
                        "
                      />
                    </div>

                    <!-- Deliver To -->
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                      <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                        t('customers.fields.deliverTo')
                      }}</label>
                      <InfiniteSelect
                        class="w-full"
                        option-label="name"
                        option-value="id"
                        :fetch-fn="(q) => CustomersService.list(q)"
                        :initial-option="initialDeliverTo"
                        :model-value="formData.deliverToId ?? null"
                        :disabled="disabled"
                        :placeholder="t('customers.labels.selectCustomer')"
                        @update:model-value="
                          formData.deliverToId = typeof $event === 'number' ? $event : null
                        "
                      />
                    </div>

                    <!-- Invoice To -->
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                      <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                        t('customers.fields.invoiceTo')
                      }}</label>
                      <InfiniteSelect
                        class="w-full"
                        option-label="name"
                        option-value="id"
                        :fetch-fn="(q) => CustomersService.list(q)"
                        :initial-option="initialInvoiceTo"
                        :model-value="formData.invoiceToId ?? null"
                        :disabled="disabled"
                        :placeholder="t('customers.labels.selectCustomer')"
                        @update:model-value="
                          formData.invoiceToId = typeof $event === 'number' ? $event : null
                        "
                      />
                    </div>

                    <!-- Join Invoice -->
                    <div class="flex items-center gap-3">
                      <Checkbox
                        v-model="formData.joinInvoice"
                        :binary="true"
                        :disabled="disabled"
                        input-id="joinInvoice"
                      />
                      <label for="joinInvoice" class="text-sm font-medium">{{
                        t('customers.fields.joinInvoice')
                      }}</label>
                    </div>

                    <!-- Collect To -->
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                      <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                        t('customers.fields.collectTo')
                      }}</label>
                      <InfiniteSelect
                        class="w-full"
                        option-label="name"
                        option-value="id"
                        :fetch-fn="(q) => CustomersService.list(q)"
                        :initial-option="initialCollectTo"
                        :model-value="formData.collectToId ?? null"
                        :disabled="disabled"
                        :placeholder="t('customers.labels.selectCustomer')"
                        @update:model-value="
                          formData.collectToId = typeof $event === 'number' ? $event : null
                        "
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>

        <!-- ─── Section: Contact ───────────────────────────── -->
        <TabPanel value="contact">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.contact') }}
              </h2>
            </template>
            <template #content>
              <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
                <!-- Phone -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                    t('customers.fields.phone')
                  }}</label>
                  <InputText v-model="formData.phone" :disabled="disabled" class="w-full" />
                </div>

                <!-- WhatsApp -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                    t('customers.fields.whatsappPhone')
                  }}</label>
                  <div class="flex w-full gap-2">
                    <InputText
                      v-model="formData.whatsappPhone"
                      :disabled="disabled"
                      class="flex-1"
                    />
                    <Button
                      v-if="!disabled && formData.phone"
                      type="button"
                      :label="t('customers.labels.autofillFromPhone')"
                      severity="secondary"
                      size="small"
                      @click="formData.whatsappPhone = formData.phone ?? ''"
                    />
                  </div>
                </div>

                <!-- Alt Phone -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                    t('customers.fields.phoneAlt')
                  }}</label>
                  <InputText v-model="formData.phoneAlt" :disabled="disabled" class="w-full" />
                </div>

                <!-- Email -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                    t('customers.fields.email')
                  }}</label>
                  <InputText
                    v-model="formData.email"
                    type="email"
                    :disabled="disabled"
                    class="w-full"
                  />
                </div>
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>

        <!-- ─── Section: Tax & Legal ───────────────────────── -->
        <TabPanel value="tax">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.tax') }}
              </h2>
            </template>
            <template #content>
              <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
                <!-- Taxable (PKP) -->
                <div class="flex items-center gap-3">
                  <Checkbox
                    v-model="formData.taxable"
                    :binary="true"
                    :disabled="disabled"
                    input-id="taxable"
                  />
                  <label for="taxable" class="text-sm font-medium">{{
                    t('customers.fields.taxable')
                  }}</label>
                </div>

                <template v-if="formData.taxable">
                  <!-- NIK Owner -->
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                    <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                      {{ t('customers.fields.nikOwner') }}
                      <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                    </label>
                    <div class="flex w-full flex-col gap-1">
                      <InputText v-model="formData.nikOwner" :disabled="disabled" class="w-full" />
                      <small v-if="errors.nikOwner" class="text-red-500">{{
                        errors.nikOwner
                      }}</small>
                    </div>
                  </div>

                  <!-- NPWP -->
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                    <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                      {{ t('customers.fields.npwp') }}
                      <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                    </label>
                    <div class="flex w-full flex-col gap-1">
                      <InputText v-model="formData.npwp" :disabled="disabled" class="w-full" />
                      <small v-if="errors.npwp" class="text-red-500">{{ errors.npwp }}</small>
                    </div>
                  </div>

                  <!-- NPWP Name -->
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                    <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                      {{ t('customers.fields.npwpName') }}
                      <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                    </label>
                    <div class="flex w-full flex-col gap-1">
                      <InputText v-model="formData.npwpName" :disabled="disabled" class="w-full" />
                      <small v-if="errors.npwpName" class="text-red-500">{{
                        errors.npwpName
                      }}</small>
                    </div>
                  </div>

                  <!-- NPWP Address -->
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                    <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                      {{ t('customers.fields.npwpAddress') }}
                      <span v-if="!isDraftMode" class="ml-0.5 text-red-500">*</span>
                    </label>
                    <div class="flex w-full flex-col gap-1">
                      <Textarea
                        v-model="formData.npwpAddress"
                        :disabled="disabled"
                        rows="2"
                        class="w-full"
                      />
                      <small v-if="errors.npwpAddress" class="text-red-500">{{
                        errors.npwpAddress
                      }}</small>
                    </div>
                  </div>
                </template>

                <!-- SIUP / NIB -->
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <label class="w-full text-sm font-semibold sm:text-base md:w-40">{{
                    t('customers.fields.siupNib')
                  }}</label>
                  <InputText v-model="formData.siupNib" :disabled="disabled" class="w-full" />
                </div>
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>

        <!-- ─── Section: Banking ───────────────────────────── -->
        <TabPanel value="banking">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.banking') }}
              </h2>
            </template>
            <template #content>
              <div class="px-4 pb-4 sm:px-6 sm:pb-6">
                <BankingSection
                  v-model="formData.bankAccounts"
                  :pays-with-giro="formData.paysWithGiro ?? false"
                  :disabled="disabled"
                  @update:pays-with-giro="formData.paysWithGiro = $event"
                />
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>

        <!-- ─── Section: Operational ──────────────────────── -->
        <TabPanel value="operational">
          <ResponsiveCard>
            <template #header>
              <h2
                class="px-4 pt-4 text-xs font-semibold tracking-widest text-stone-500 uppercase sm:px-6"
              >
                {{ t('customers.sections.operational') }}
              </h2>
            </template>
            <template #content>
              <div class="px-4 pb-4 sm:px-6 sm:pb-6">
                <OperationalSection v-model="formData.operatingHours" :disabled="disabled" />
              </div>
            </template>
          </ResponsiveCard>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- ─── Action buttons ─────────────────────────────── -->
    <div v-if="!disabled" class="mt-4 flex justify-end gap-2">
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isLoading"
        @click="emit('cancel')"
      />
      <Button
        type="button"
        :label="isLoading ? '' : t('customers.saveDraft')"
        :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
        severity="secondary"
        :disabled="isLoading"
        @click="onSaveDraft"
      />
      <Button
        type="button"
        :label="isLoading ? '' : t('customers.submitCustomer')"
        :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
        :disabled="isLoading"
        @click="onSubmit"
      />
    </div>
    <div v-else class="mt-4 flex justify-end gap-2">
      <Button type="button" :label="t('common.actions.close')" @click="emit('cancel')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, type PropType, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import AddressPicker, { type AddressValue } from '@/components/address/AddressPicker.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ShipToSection from './components/ShipToSection.vue'
import BankingSection from './components/BankingSection.vue'
import OperationalSection from './components/OperationalSection.vue'
import {
  CurrenciesService,
  CitiesService,
  CustomersService,
  CustomerOutletTypesService,
  CustomerChannelsService,
  CustomerCategoriesService,
} from '@/services'
import { useNumberSeries } from '@/composables'
import type {
  Customer,
  CustomerAddress,
  CustomerBankAccount,
  CustomerOperatingHour,
  CreateCustomerV1Dto,
} from '@/types/customer.type'

const { t } = useI18n()

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps({
  mode: {
    type: String as PropType<'add' | 'edit'>,
    default: 'add',
  },
  customer: {
    type: Object as PropType<Customer>,
    default: undefined,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  saveDraft: [dto: CreateCustomerV1Dto]
  submit: [dto: CreateCustomerV1Dto]
  cancel: []
}>()

// ─── Number series (code generation) ─────────────────────────────────────────

const {
  codeMode,
  previewCode,
  seriesId: numberSeriesId,
  loading: numberSeriesLoading,
  hasDefaultSeries,
  generateCode,
} = useNumberSeries('customers', {
  initialMode: props.mode === 'add' ? undefined : 'manual',
})

// ─── Form state ───────────────────────────────────────────────────────────────

function defaultOperatingHours(): CustomerOperatingHour[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    dayOfWeek: day,
    isClosed: false,
  }))
}

const formData = reactive({
  code: '',
  name: '',
  ownerName: '',
  outletTypeId: null as number | null,
  channelId: null as number | null,
  categoryId: null as number | null,
  isActive: true,
  // Location
  address: '',
  countryId: null as number | null,
  provinceId: null as number | null,
  cityId: null as number | null,
  districtId: null as number | null,
  subDistrictId: null as number | null,
  zipCode: '',
  latitude: '',
  longitude: '',
  areaId: null as number | null,
  // Business relations
  currencyId: null as number | null,
  sellToId: null as number | null,
  deliverToId: null as number | null,
  invoiceToId: null as number | null,
  joinInvoice: false,
  collectToId: null as number | null,
  // Contact
  phone: '',
  whatsappPhone: '',
  phoneAlt: '',
  email: '',
  // Tax
  taxable: false,
  nikOwner: '',
  npwp: '',
  npwpName: '',
  npwpAddress: '',
  siupNib: '',
  // Banking
  paysWithGiro: false,
  // Child arrays
  addresses: [] as CustomerAddress[],
  bankAccounts: [] as CustomerBankAccount[],
  operatingHours: defaultOperatingHours(),
})

// ─── Initial options for InfiniteSelect ──────────────────────────────────────

const initialOutletType = ref<{ id: number; name: string } | undefined>(undefined)
const initialChannel = ref<{ id: number; name: string } | undefined>(undefined)
const initialCategory = ref<{ id: number; name: string } | undefined>(undefined)
const initialCurrency = ref<{ id: number; code: string } | undefined>(undefined)
const initialArea = ref<{ id: number; name: string } | undefined>(undefined)
const initialSellTo = ref<{ id: number; name: string } | undefined>(undefined)
const initialDeliverTo = ref<{ id: number; name: string } | undefined>(undefined)
const initialInvoiceTo = ref<{ id: number; name: string } | undefined>(undefined)
const initialCollectTo = ref<{ id: number; name: string } | undefined>(undefined)
const initialCountry = ref<{ id: number; name: string } | undefined>(undefined)
const initialProvince = ref<{ id: number; name: string } | undefined>(undefined)
const initialCity = ref<{ id: number; name: string } | undefined>(undefined)
const initialDistrict = ref<{ id: number; name: string } | undefined>(undefined)
const initialSubDistrict = ref<{ id: number; name: string } | undefined>(undefined)

// Populate form + initial options when customer prop is provided (edit mode)
watch(
  () => props.customer,
  (c) => {
    if (!c) return
    formData.code = c.code ?? ''
    formData.name = c.name ?? ''
    formData.ownerName = c.ownerName ?? ''
    formData.outletTypeId = c.outletTypeId ?? null
    formData.channelId = c.channelId ?? null
    formData.categoryId = c.categoryId ?? null
    formData.isActive = c.isActive ?? true
    formData.address = c.address ?? ''
    formData.countryId = c.countryId ?? null
    formData.provinceId = c.provinceId ?? null
    formData.cityId = c.cityId ?? null
    formData.districtId = c.districtId ?? null
    formData.subDistrictId = c.subDistrictId ?? null
    formData.zipCode = c.zipCode ?? ''
    formData.latitude = c.latitude ?? ''
    formData.longitude = c.longitude ?? ''
    formData.areaId = c.areaId ?? null
    formData.currencyId = c.currencyId ?? null
    formData.sellToId = c.sellToId ?? null
    formData.deliverToId = c.deliverToId ?? null
    formData.invoiceToId = c.invoiceToId ?? null
    formData.joinInvoice = c.joinInvoice ?? false
    formData.collectToId = c.collectToId ?? null
    formData.phone = c.phone ?? ''
    formData.whatsappPhone = c.whatsappPhone ?? ''
    formData.phoneAlt = c.phoneAlt ?? ''
    formData.email = c.email ?? ''
    formData.taxable = c.taxable ?? false
    formData.nikOwner = c.nikOwner ?? ''
    formData.npwp = c.npwp ?? ''
    formData.npwpName = c.npwpName ?? ''
    formData.npwpAddress = c.npwpAddress ?? ''
    formData.siupNib = c.siupNib ?? ''
    formData.paysWithGiro = c.paysWithGiro ?? false
    formData.addresses = c.addresses ? [...c.addresses] : []
    formData.bankAccounts = c.bankAccounts ? [...c.bankAccounts] : []
    formData.operatingHours =
      c.operatingHours && c.operatingHours.length > 0
        ? [...c.operatingHours]
        : defaultOperatingHours()

    // Initial options
    if (c.outletType) initialOutletType.value = { id: c.outletTypeId!, name: c.outletType.name }
    if (c.channel) initialChannel.value = { id: c.channelId!, name: c.channel.name }
    if (c.category) initialCategory.value = { id: c.categoryId!, name: c.category.name }
    if (c.currency) initialCurrency.value = { id: c.currencyId!, code: c.currency.code }
    if (c.area) initialArea.value = { id: c.areaId!, name: c.area.name }
    if (c.sellTo) initialSellTo.value = { id: c.sellToId!, name: c.sellTo.name }
    if (c.deliverTo) initialDeliverTo.value = { id: c.deliverToId!, name: c.deliverTo.name }
    if (c.invoiceTo) initialInvoiceTo.value = { id: c.invoiceToId!, name: c.invoiceTo.name }
    if (c.collectTo) initialCollectTo.value = { id: c.collectToId!, name: c.collectTo.name }
    if (c.country) initialCountry.value = { id: c.countryId!, name: c.country.name }
    if (c.province) initialProvince.value = { id: c.provinceId!, name: c.province.name }
    if (c.city) initialCity.value = { id: c.cityId!, name: c.city.name }
    if (c.district) initialDistrict.value = { id: c.districtId!, name: c.district.name }
    if (c.subDistrict) initialSubDistrict.value = { id: c.subDistrictId!, name: c.subDistrict.name }
  },
  { immediate: true },
)

// ─── AddressPicker v-model bridge (main location) ────────────────────────────

const mainAddress = computed<AddressValue>({
  get: () => ({
    address: formData.address,
    countryId: formData.countryId,
    provinceId: formData.provinceId,
    cityId: formData.cityId,
    districtId: formData.districtId,
    subDistrictId: formData.subDistrictId,
    zipCode: formData.zipCode,
    latitude: formData.latitude || null,
    longitude: formData.longitude || null,
  }),
  set: (val) => {
    formData.address = val.address ?? ''
    formData.countryId = val.countryId ?? null
    formData.provinceId = val.provinceId ?? null
    formData.cityId = val.cityId ?? null
    formData.districtId = val.districtId ?? null
    formData.subDistrictId = val.subDistrictId ?? null
    formData.zipCode = val.zipCode ?? ''
    formData.latitude = val.latitude ?? ''
    formData.longitude = val.longitude ?? ''
  },
})

// ─── Validation ───────────────────────────────────────────────────────────────

const errors = reactive<Record<string, string>>({})
const isDraftMode = ref(false)
const activeTab = ref('identity')

function clearErrors() {
  for (const k of Object.keys(errors)) delete errors[k]
}

// The code column is NOT NULL and must be non-empty even for drafts, so a
// manually entered code is mandatory whenever it isn't generated from a series.
function validateCode(): void {
  const isAutoGenerated =
    props.mode === 'add' && codeMode.value === 'auto' && numberSeriesId.value !== null
  if (!isAutoGenerated && !formData.code.trim()) {
    errors.code = t('customers.validation.codeRequired')
  }
}

function validateDraft(): boolean {
  clearErrors()
  validateCode()
  if (!formData.name.trim()) errors.name = t('customers.validation.nameRequired')
  return Object.keys(errors).length === 0
}

function validateFull(): boolean {
  clearErrors()
  validateCode()
  if (!formData.name.trim()) errors.name = t('customers.validation.nameRequired')
  if (!formData.outletTypeId) errors.outletTypeId = t('customers.validation.outletTypeRequired')
  if (!formData.channelId) errors.channelId = t('customers.validation.channelRequired')
  if (!formData.categoryId) errors.categoryId = t('customers.validation.categoryRequired')
  const hasPrimary = formData.addresses.some((a) => a.isPrimary)
  if (!hasPrimary) errors.addresses = t('customers.validation.primaryAddressRequired')
  if (formData.taxable) {
    if (!formData.nikOwner?.trim()) errors.nikOwner = t('customers.validation.nikOwnerRequired')
    if (!formData.npwp?.trim()) errors.npwp = t('customers.validation.npwpRequired')
    if (!formData.npwpName?.trim()) errors.npwpName = t('customers.validation.npwpNameRequired')
    if (!formData.npwpAddress?.trim())
      errors.npwpAddress = t('customers.validation.npwpAddressRequired')
  }
  return Object.keys(errors).length === 0
}

// ─── Build DTO ────────────────────────────────────────────────────────────────

async function buildDto(isDraft: boolean): Promise<CreateCustomerV1Dto> {
  let code = formData.code || undefined
  if (props.mode === 'add' && codeMode.value === 'auto' && numberSeriesId.value !== null) {
    code = await generateCode()
  }

  return {
    code,
    name: formData.name,
    ownerName: formData.ownerName || undefined,
    outletTypeId: formData.outletTypeId,
    channelId: formData.channelId,
    categoryId: formData.categoryId,
    isActive: formData.isActive,
    address: formData.address || undefined,
    countryId: formData.countryId,
    provinceId: formData.provinceId,
    cityId: formData.cityId,
    districtId: formData.districtId,
    subDistrictId: formData.subDistrictId,
    zipCode: formData.zipCode || undefined,
    latitude: formData.latitude || null,
    longitude: formData.longitude || null,
    areaId: formData.areaId,
    currencyId: formData.currencyId,
    sellToId: formData.sellToId,
    deliverToId: formData.deliverToId,
    invoiceToId: formData.invoiceToId,
    joinInvoice: formData.joinInvoice,
    collectToId: formData.collectToId,
    phone: formData.phone || undefined,
    whatsappPhone: formData.whatsappPhone || undefined,
    phoneAlt: formData.phoneAlt || undefined,
    email: formData.email || undefined,
    taxable: formData.taxable,
    nikOwner: formData.taxable ? formData.nikOwner || undefined : undefined,
    npwp: formData.taxable ? formData.npwp || undefined : undefined,
    npwpName: formData.taxable ? formData.npwpName || undefined : undefined,
    npwpAddress: formData.taxable ? formData.npwpAddress || undefined : undefined,
    siupNib: formData.siupNib || undefined,
    paysWithGiro: formData.paysWithGiro,
    isDraft,
    addresses: formData.addresses.map((a) => ({
      id: a.id,
      label: a.label || undefined,
      address: a.address || undefined,
      countryId: a.countryId,
      provinceId: a.provinceId,
      cityId: a.cityId,
      districtId: a.districtId,
      subDistrictId: a.subDistrictId,
      zipCode: a.zipCode || undefined,
      latitude: a.latitude,
      longitude: a.longitude,
      receivingHoursStart: a.receivingHoursStart || undefined,
      receivingHoursEnd: a.receivingHoursEnd || undefined,
      vehicleAccessId: a.vehicleAccessId,
      picName: a.picName || undefined,
      picPhone: a.picPhone || undefined,
      isPrimary: a.isPrimary,
      isDefaultShipping: a.isDefaultShipping,
      isTaxInvoiceAddress: a.isTaxInvoiceAddress,
    })),
    bankAccounts: formData.bankAccounts.map((b) => ({
      id: b.id,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountHolder: b.accountHolder,
      isDefault: b.isDefault,
    })),
    operatingHours: formData.operatingHours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      isClosed: h.isClosed,
      openStart: h.openStart,
      openEnd: h.openEnd,
      receivingStart: h.receivingStart,
      receivingEnd: h.receivingEnd,
    })),
  }
}

// ─── Save handlers ────────────────────────────────────────────────────────────

async function onSaveDraft() {
  isDraftMode.value = true
  if (!validateDraft()) return
  const dto = await buildDto(true)
  emit('saveDraft', dto)
}

async function onSubmit() {
  isDraftMode.value = false
  if (!validateFull()) {
    // Scroll to first error section
    const firstErrKey = Object.keys(errors)[0]
    if (firstErrKey) {
      const sectionMap: Record<string, string> = {
        name: 'identity',
        outletTypeId: 'identity',
        channelId: 'identity',
        categoryId: 'identity',
        addresses: 'ship-to',
        nikOwner: 'tax',
        npwp: 'tax',
        npwpName: 'tax',
        npwpAddress: 'tax',
      }
      activeTab.value = sectionMap[firstErrKey] ?? 'identity'
    }
    return
  }
  const dto = await buildDto(false)
  emit('submit', dto)
}

// Expose for parent access
defineExpose({ codeMode, numberSeriesId })
</script>
