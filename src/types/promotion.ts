export type PromotionsInternalView =
  | 'promote'
  | 'my_campaigns'
  | 'ad_wallet'
  | 'banner_requests';

export type AdPlacementId =
  | 'search_results'
  | 'category_page'
  | 'home_featured';

export interface AdPlacementInfo {
  id: AdPlacementId;
  name: string;
  shortLabel: string;
  whereItAppears: string;
  visibilityBenefit: string;
  placementRulesNote: string;
  badgeLabel: 'Sponsored';
}

export interface AdPackage {
  id: string;
  placement: AdPlacementId;
  name: string;
  durationDays: number;
  price: number;
  currency: 'NGN';
  description: string;
  isActive: boolean;
  isSystemConfigured: boolean;
}

export interface ProductAdEligibilityCheck {
  productId: string;
  isEligible: boolean;
  merchantVerifiedAndActive: boolean;
  productIsActive: boolean;
  productInStock: boolean;
  productIsApproved: boolean;
  meetsListingStandards: boolean;
  reasons: string[];
}

export type AdCampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'scheduled'
  | 'live'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'suspended';

export type CampaignPaymentSource = 'sales_earnings' | 'ad_wallet';

export interface CampaignActionPermissions {
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  canSubmitDraft: boolean;
  pauseDisabledReason?: string;
  resumeDisabledReason?: string;
  cancelDisabledReason?: string;
  cancellationPolicyNote: string;
  refundableHoldAmount: number;
}

export interface CampaignDailyMetric {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Nov 10"
  impressions: number;
  taps: number;
  addToCarts: number;
  orders: number;
  orderValue: number;
}

export interface CampaignPerformanceSummary {
  hasData: boolean;
  unavailableReason?: string;
  lastAggregatedAt?: string;
  impressions: number;
  taps: number;
  tapRate: number; // Percentage (0 - 100)
  addToCarts: number;
  orders: number;
  orderValue: number;
  costPerOrder: number | null; // null when orders === 0
  dailyMetrics: CampaignDailyMetric[];
}

export interface SponsoredCampaign {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  productImage: string;
  productCategory: string;
  productSellingPrice: number;
  placement: AdPlacementId;
  placementName: string;
  packageId: string;
  packageName: string;
  durationDays: number;
  price: number;
  startMode: 'immediate' | 'future';
  startDate: string; // YYYY-MM-DD or ISO
  endDate: string; // YYYY-MM-DD or ISO
  status: AdCampaignStatus;
  paymentSource: CampaignPaymentSource;
  fundsState: 'none' | 'held' | 'charged' | 'released' | 'refunded';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  reviewOutcome?: {
    reviewedAt: string;
    decision: 'approved' | 'rejected' | 'suspended';
    rejectionReason?: string;
    adminNote?: string;
  };
  pauseReason?: string;
  cancellationNote?: string;
  performance: CampaignPerformanceSummary;
  permissions: CampaignActionPermissions;
  idempotencyKey?: string;
  isTestFixture?: boolean;
}

export type WalletTransactionType =
  | 'top_up'
  | 'hold'
  | 'release'
  | 'charge'
  | 'refund'
  | 'adjustment';

export type WalletTransactionStatus = 'completed' | 'pending' | 'failed';

export interface WalletTransaction {
  id: string;
  merchantId: string;
  timestamp: string;
  formattedDate: string;
  type: WalletTransactionType;
  description: string;
  reference: string;
  amount: number;
  balanceImpact: 'credit' | 'hold_reserve' | 'hold_release' | 'debit';
  fundingSource?: 'available' | 'promotional' | 'sales_earnings';
  paymentSource?: CampaignPaymentSource;
  status: WalletTransactionStatus;
  relatedCampaignId?: string;
  relatedCampaignName?: string;
  isTestFixture?: boolean;
}

export interface AdWalletAccount {
  merchantId: string;
  availableBalance: number;
  heldBalance: number;
  promotionalBalance: number;
  currency: 'NGN';
  updatedAt: string;
}

export interface AdWalletSystemConfig {
  paystackConfigured: boolean;
  paystackPublicKey?: string;
  verificationArchitecture: 'server_webhook_verified';
  minimumTopUpAmount: number | null; // null while open business decision unless configured by backend
  vatPolicyNote: string | null; // null while open business decision unless configured by backend
}

export type BannerDestinationType =
  | 'product'
  | 'category'
  | 'curated_collection';

export type BannerRequestStatus =
  | 'pending_review'
  | 'in_discussion'
  | 'changes_requested'
  | 'approved_scheduled'
  | 'live'
  | 'completed'
  | 'declined';

export interface CuratedCollectionOption {
  id: string;
  name: string;
  description: string;
}

export interface BannerUploadValidationConfig {
  allowedMimeTypes: string[];
  maxFileSizeBytes: number | null; // null while banner image specs remain open
  dimensionSpecificationNote: string;
}

export interface HomepageBannerRequest {
  id: string;
  merchantId: string;
  advertisingGoal: string;
  preferredStartDate: string;
  preferredEndDate: string;
  destinationType: BannerDestinationType;
  destinationId: string;
  destinationLabel: string;
  bannerImageUrl: string;
  bannerImageFileName: string;
  status: BannerRequestStatus;
  teamFeedback?: string;
  createdAt: string;
  updatedAt: string;
  isTestFixture?: boolean;
}

// Legacy compatibility types for historical order discount evaluation in orderStorage.ts
export type PromotionType =
  | 'percentage_discount'
  | 'fixed_discount'
  | 'minimum_purchase'
  | 'free_delivery'
  | 'custom';

export type PromotionStatus = 'scheduled' | 'active' | 'expired' | 'inactive';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: PromotionType;
  discountPercentage?: number;
  discountAmount?: number;
  minimumPurchaseAmount?: number;
  freeDeliveryThreshold?: number;
  customBenefit?: string;
  targetType: 'all_products' | 'selected_products' | 'selected_categories';
  applicableProductIds?: string[];
  applicableCategories?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  allowStackingWithProductDiscounts: boolean;
  createdAt: string;
  updatedAt: string;
}
