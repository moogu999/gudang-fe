export type PromoType = 'per_transaction' | 'period_based'
export type TargetKind = 'invoice' | 'product' | 'label'
export type QualifierKind = 'products' | 'labels'
export type ThresholdKind = 'min_qty' | 'min_amount'
export type MeasureKind = 'total_qty' | 'total_amount'
export type RewardType = 'discount' | 'bonus'
export type BonusKind = 'fixed' | 'customer_choice'
export type DiscountType = 'flat' | 'percentage'
export type ResetCycle = 'end_of_period' | 'after_redemption' | 'never'
export type VoucherApplyOn = 'next_transaction'

export type PromotionDiscountTier = {
  id: number
  minQty?: string | null
  minAmount?: string | null
  discountType: DiscountType
  value: string
  isMultiplicative?: boolean | null
  targetKind: TargetKind
  targetProductId?: number | null
  targetLabelOptionId?: number | null
  targetProduct?: { code: string; name: string } | null
  targetLabel?: { name: string } | null
}

export type PromotionFixedBonusTierItem = {
  id: number
  productId: number
  qty: string
  product?: PromotionGroupProductInfo | null
}

export type PromotionFixedBonusTier = {
  id: number
  minQty?: string | null
  minAmount?: string | null
  items: PromotionFixedBonusTierItem[]
  isMultiplicative?: boolean | null
  targetKind: TargetKind
  targetProductId?: number | null
  targetLabelOptionId?: number | null
  targetProduct?: { code: string; name: string } | null
  targetLabel?: { name: string } | null
}

export type PromotionCustomerChoicePoolItem = {
  id: number
  productId: number
  bonusAmount: string
  product?: PromotionGroupProductInfo | null
}

export type PromotionCustomerChoice = {
  id: number
  pickableCount: number
  poolItems: PromotionCustomerChoicePoolItem[]
}

export type PromotionReward = {
  id: number
  rewardType: RewardType
  bonusKind?: BonusKind | null
  discountTiers?: PromotionDiscountTier[]
  fixedBonusTiers?: PromotionFixedBonusTier[]
  customerChoice?: PromotionCustomerChoice | null
}

export type PromotionGroupProductInfo = {
  code: string
  name: string
  smallestUomSymbol?: string | null
}

export type PromotionGroupProduct = {
  id: number
  productId: number
  mandatory?: boolean | null
  minQty?: string | null
  minAmount?: string | null
  product?: PromotionGroupProductInfo | null
}

export type PromotionGroupLabel = {
  id: number
  productLabelOptionId: number
  mandatory?: boolean | null
  minQty?: string | null
  minAmount?: string | null
}

export type GroupPeriodSettings = {
  id?: number
  resetCycle: ResetCycle
  voucherApplyOn: VoucherApplyOn
  voucherValidityDays: number
  voucherMinRedeemAmount: string | null
  voucherStackable: boolean
}

export type PromotionVoucherTier = {
  id?: number
  sortOrder?: number
  minQty?: string | null
  minAmount?: string | null
  voucherDiscountType: DiscountType
  voucherValue: string
}

export type PromotionGroup = {
  id: number
  qualifierKind: QualifierKind
  thresholdKind: ThresholdKind
  measureKind?: MeasureKind | null
  products?: PromotionGroupProduct[]
  labels?: PromotionGroupLabel[]
  reward?: PromotionReward | null
  periodSettings?: GroupPeriodSettings | null
  voucherTiers?: PromotionVoucherTier[]
}

export type PromotionCurrency = {
  id: number
  code: string
  symbol?: string | null
}

export type Promotion = {
  id: number
  code: string
  description?: string
  currencyId: number
  currency?: PromotionCurrency | null
  promoType: PromoType
  startDate: string
  endDate?: string | null
  active: boolean
  groups: PromotionGroup[]
  createdAt: string
  updatedAt?: string | null
}

export type PromotionListItem = {
  id: number
  code: string
  description?: string
  currencyId: number
  promoType: PromoType
  startDate: string
  endDate?: string | null
  active: boolean
  createdAt: string
  updatedAt?: string | null
}

export type CreateDiscountTierDto = {
  minQty?: string | null
  minAmount?: string | null
  discountType: DiscountType
  value: string
  isMultiplicative: boolean
  targetKind: TargetKind
  targetProductId?: number | null
  targetLabelOptionId?: number | null
}

export type CreateFixedBonusTierItemDto = {
  productId: number
  qty: string
}

export type CreateFixedBonusTierDto = {
  minQty?: string | null
  minAmount?: string | null
  items: CreateFixedBonusTierItemDto[]
  isMultiplicative: boolean
  targetKind: TargetKind
  targetProductId?: number | null
  targetLabelOptionId?: number | null
}

export type CreateCustomerChoicePoolItemDto = {
  productId: number
  bonusAmount: string
}

export type CreateCustomerChoiceDto = {
  pickableCount: number
  poolItems: CreateCustomerChoicePoolItemDto[]
}

export type CreateRewardDto = {
  rewardType: RewardType
  bonusKind?: BonusKind | null
  discountTiers?: CreateDiscountTierDto[]
  fixedBonusTiers?: CreateFixedBonusTierDto[]
  customerChoice?: CreateCustomerChoiceDto | null
}

export type CreateGroupProductDto = {
  productId: number
  mandatory?: boolean | null
  minQty?: string | null
  minAmount?: string | null
}

export type CreateGroupLabelDto = {
  productLabelOptionId: number
  mandatory?: boolean | null
  minQty?: string | null
  minAmount?: string | null
}

export type CreateGroupPeriodSettingsDto = {
  resetCycle: ResetCycle
  voucherApplyOn: VoucherApplyOn
  voucherValidityDays: number
  voucherMinRedeemAmount: string | null
  voucherStackable: boolean
}

export type CreateVoucherTierDto = {
  minQty?: string | null
  minAmount?: string | null
  voucherDiscountType: DiscountType
  voucherValue: string
}

export type CreateGroupDto = {
  qualifierKind: QualifierKind
  thresholdKind: ThresholdKind
  measureKind?: MeasureKind | null
  products?: CreateGroupProductDto[]
  labels?: CreateGroupLabelDto[]
  reward?: CreateRewardDto
  periodSettings?: CreateGroupPeriodSettingsDto | null
  voucherTiers?: CreateVoucherTierDto[]
}

export type CreatePromotionDto = {
  code: string
  description?: string
  currencyId: number
  promoType: PromoType
  startDate: string
  endDate?: string | null
  active?: boolean
  groups: CreateGroupDto[]
}
