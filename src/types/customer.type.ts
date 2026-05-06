import type { CurrencyLite } from './currency.type'

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
  name: string
  isActive: boolean
  sellToId: number | null
  sellTo: CustomerLite
  deliverToId: number | null
  deliverTo: CustomerLite
  invoiceToId: number | null
  invoiceTo: CustomerLite
  joinInvoice: boolean
  collectToId: number | null
  collectTo: CustomerLite
  areaId: number | null
  area: CityLite
  currencyId?: number | null
  currency?: CurrencyLite
  taxable: boolean
  address?: string
  countryId?: number | null
  country?: CountryLite
  provinceId?: number | null
  province?: ProvinceLite
  cityId?: number
  city?: CityLite
  districtId?: number | null
  district?: DistrictLite
  subDistrictId?: number | null
  subDistrict?: SubDistrictLite
  zipCode?: string
  longitude?: number
  latitude?: number
  createdAt?: string
  createdBy?: number
  createdByUser?: {
    email: string
  }
  updatedAt?: string
  updatedBy?: number
  labels?: CustomerLabelValue[]
}

export type CreateCustomerDto = {
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
