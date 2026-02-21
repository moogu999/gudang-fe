import type { CurrencyLite } from './currency.type'

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
  sellToId: number
  sellTo: CustomerLite
  deliverToId: number
  deliverTo: CustomerLite
  invoiceToId: number
  invoiceTo: CustomerLite
  joinInvoice: boolean
  collectToId: number
  collectTo: CustomerLite
  areaId: number
  area: CityLite
  currencyId?: number
  currency?: CurrencyLite
  taxable: boolean
  address?: string
  countryId?: number
  country?: CountryLite
  provinceId?: number
  province?: ProvinceLite
  cityId?: number
  city?: CityLite
  districtId?: number
  district?: DistrictLite
  subDistrictId?: number
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
}

export type CreateCustomerDto = {
  name: string
  isActive: boolean
  currencyId?: number
  sellToId?: number
  deliverToId?: number
  invoiceToId?: number
  joinInvoice?: boolean
  collectToId?: number
  areaId?: number
  taxable: boolean
  address?: string
  countryId?: number
  provinceId?: number
  cityId?: number
  districtId?: number
  subDistrictId?: number
  zipCode?: string
  longitude?: number
  latitude?: number
  createdBy: number
}

export type UpdateCustomerDto = {
  name?: string
  isActive?: boolean
  currencyId?: number
  sellToId?: number
  deliverToId?: number
  invoiceToId?: number
  joinInvoice?: boolean
  collectToId?: number
  areaId?: number
  taxable?: boolean
  address?: string
  countryId?: number
  provinceId?: number
  cityId?: number
  districtId?: number
  subDistrictId?: number
  zipCode?: string
  longitude?: number
  latitude?: number
}
