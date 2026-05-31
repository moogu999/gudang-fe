import type { CurrencyLite } from './currency.type'

// ─── Master types ────────────────────────────────────────────────────────────

export type RefLite = {
  id: number
  name: string
}

export type CustomerOutletType = {
  id: number
  code: string
  name: string
  description?: string
  isActive: boolean
}

export type CustomerChannel = {
  id: number
  code: string
  name: string
  description?: string
  isActive: boolean
}

export type CustomerCategory = {
  id: number
  code: string
  name: string
  description?: string
  isActive: boolean
}

export type VehicleAccess = {
  id: number
  code: string
  name: string
  sortOrder: number
  isActive: boolean
}

// ─── Child entity types ───────────────────────────────────────────────────────

export type CustomerAddress = {
  id?: number
  customerId?: number
  label?: string
  address?: string
  countryId?: number | null
  country?: RefLite
  provinceId?: number | null
  province?: RefLite
  cityId?: number | null
  city?: RefLite
  districtId?: number | null
  district?: RefLite
  subDistrictId?: number | null
  subDistrict?: RefLite
  zipCode?: string
  latitude?: string | null
  longitude?: string | null
  receivingHoursStart?: string
  receivingHoursEnd?: string
  vehicleAccessId?: number | null
  vehicleAccess?: RefLite
  picName?: string
  picPhone?: string
  isPrimary: boolean
  isDefaultShipping: boolean
  isTaxInvoiceAddress: boolean
}

export type CustomerBankAccount = {
  id?: number
  customerId?: number
  bankName: string
  accountNumber: string
  accountHolder: string
  isDefault: boolean
}

export type CustomerOperatingHour = {
  id?: number
  customerId?: number
  dayOfWeek: number // 0=Senin … 6=Minggu
  isClosed: boolean
  openStart?: string
  openEnd?: string
  receivingStart?: string
  receivingEnd?: string
}

// ─── Full customer ────────────────────────────────────────────────────────────

export type CustomerLabelDefinitionLite = {
  id: number
  name: string
}

export type CustomerLabelOptionLite = {
  id: number
  value: string
}

export type CustomerLabelValue = {
  id: number
  customerId: number
  labelDefinitionId: number
  labelOptionId: number
  definition?: CustomerLabelDefinitionLite
  option?: CustomerLabelOptionLite
}

export type CountryLite = {
  id: number
  name: string
}

export type ProvinceLite = {
  id: number
  name: string
}

export type CityLite = {
  id: number
  name: string
}

export type CustomerLite = {
  id: number
  code?: string
  name: string
}

export type DistrictLite = {
  id: number
  name: string
}

export type SubDistrictLite = {
  id: number
  name: string
}

export type Customer = {
  id: number
  code: string
  name: string
  ownerName?: string
  outletTypeId?: number | null
  outletType?: RefLite
  channelId?: number | null
  channel?: RefLite
  categoryId?: number | null
  category?: RefLite
  isActive: boolean
  sellToId?: number | null
  sellTo?: CustomerLite
  deliverToId?: number | null
  deliverTo?: CustomerLite
  invoiceToId?: number | null
  invoiceTo?: CustomerLite
  joinInvoice: boolean
  collectToId?: number | null
  collectTo?: CustomerLite
  areaId?: number | null
  area?: CityLite
  currencyId?: number | null
  currency?: CurrencyLite
  taxable: boolean
  address?: string
  countryId?: number | null
  country?: CountryLite
  provinceId?: number | null
  province?: ProvinceLite
  cityId?: number | null
  city?: CityLite
  districtId?: number | null
  district?: DistrictLite
  subDistrictId?: number | null
  subDistrict?: SubDistrictLite
  zipCode?: string
  longitude?: string | null
  latitude?: string | null
  // Contact
  phone?: string
  whatsappPhone?: string
  phoneAlt?: string
  email?: string
  // Tax & legal
  nikOwner?: string
  npwp?: string
  npwpName?: string
  npwpAddress?: string
  siupNib?: string
  // Banking
  paysWithGiro?: boolean
  isDraft?: boolean
  createdAt?: string
  createdBy?: number
  createdByUser?: {
    email: string
  }
  updatedAt?: string
  updatedBy?: number
  labels?: CustomerLabelValue[]
  // child entities (new API)
  addresses?: CustomerAddress[]
  bankAccounts?: CustomerBankAccount[]
  operatingHours?: CustomerOperatingHour[]
}

export type CreateCustomerDto = {
  code?: string
  name: string
  isActive: boolean
  currencyId?: number | null
  sellToId?: number
  deliverToId?: number | null
  invoiceToId?: number | null
  joinInvoice?: boolean
  collectToId?: number | null
  areaId?: number | null
  taxable: boolean
  address?: string
  countryId?: number | null
  provinceId?: number | null
  cityId?: number | null
  districtId?: number | null
  subDistrictId?: number | null
  zipCode?: string
  longitude?: number
  latitude?: number
  createdBy: number
}

export type UpdateCustomerDto = {
  code?: string
  name?: string
  isActive?: boolean
  currencyId?: number | null
  sellToId?: number | null
  deliverToId?: number | null
  invoiceToId?: number | null
  joinInvoice?: boolean
  collectToId?: number | null
  areaId?: number
  taxable?: boolean
  address?: string
  countryId?: number | null
  provinceId?: number | null
  cityId?: number | null
  districtId?: number | null
  subDistrictId?: number | null
  zipCode?: string
  longitude?: number
  latitude?: number
}

// ─── New V1 DTOs ──────────────────────────────────────────────────────────────

export type CustomerAddressDto = {
  id?: number
  label?: string
  address?: string
  countryId?: number | null
  provinceId?: number | null
  cityId?: number | null
  districtId?: number | null
  subDistrictId?: number | null
  zipCode?: string
  latitude?: string | null
  longitude?: string | null
  receivingHoursStart?: string
  receivingHoursEnd?: string
  vehicleAccessId?: number | null
  picName?: string
  picPhone?: string
  isPrimary: boolean
  isDefaultShipping: boolean
  isTaxInvoiceAddress: boolean
}

export type CustomerBankDto = {
  id?: number
  bankName: string
  accountNumber: string
  accountHolder: string
  isDefault: boolean
}

export type CustomerOperatingHourDto = {
  dayOfWeek: number
  isClosed: boolean
  openStart?: string
  openEnd?: string
  receivingStart?: string
  receivingEnd?: string
}

export type CreateCustomerV1Dto = {
  code?: string
  name: string
  ownerName?: string
  outletTypeId?: number | null
  channelId?: number | null
  categoryId?: number | null
  currencyId?: number | null
  areaId?: number | null
  joinInvoice?: boolean
  isActive?: boolean
  taxable?: boolean
  address?: string
  countryId?: number | null
  provinceId?: number | null
  cityId?: number | null
  districtId?: number | null
  subDistrictId?: number | null
  zipCode?: string
  latitude?: string | null
  longitude?: string | null
  sellToId?: number | null
  deliverToId?: number | null
  invoiceToId?: number | null
  collectToId?: number | null
  phone?: string
  whatsappPhone?: string
  phoneAlt?: string
  email?: string
  nikOwner?: string
  npwp?: string
  npwpName?: string
  npwpAddress?: string
  siupNib?: string
  paysWithGiro?: boolean
  isDraft: boolean
  addresses?: CustomerAddressDto[]
  bankAccounts?: CustomerBankDto[]
  operatingHours?: CustomerOperatingHourDto[]
}

export type UpdateCustomerV1Dto = Omit<CreateCustomerV1Dto, 'isDraft'> & { isDraft: boolean }
