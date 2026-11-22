import { CATEGORIES } from '../data/categories';
import {
  ISOLATED_TEST_BANNER_REQUESTS,
  ISOLATED_TEST_CAMPAIGNS,
  ISOLATED_TEST_TRANSACTIONS,
  ISOLATED_TEST_WALLET,
  TEST_MERCHANT_ID,
} from '../data/adsTestFixtures';
import type { Product } from '../types/product';
import type {
  AdCampaignStatus,
  AdPackage,
  AdPlacementId,
  AdPlacementInfo,
  AdWalletAccount,
  AdWalletSystemConfig,
  BannerDestinationType,
  BannerUploadValidationConfig,
  CampaignActionPermissions,
  CampaignDailyMetric,
  CampaignPaymentSource,
  CampaignPerformanceSummary,
  CuratedCollectionOption,
  HomepageBannerRequest,
  ProductAdEligibilityCheck,
  Promotion,
  PromotionStatus,
  SponsoredCampaign,
  WalletTransaction,
} from '../types/promotion';
import { getProductPriceDisplay, getProductStock } from './productStorage';
import { SalesStorage } from './salesStorage';
import { SettingsStorage } from './settingsStorage';

const SYSTEM_PACKAGES_KEY = 'errandify_ads_system_packages_v1';
const WALLET_CONFIG_KEY = 'errandify_ads_wallet_config_v1';
const TEST_MODE_KEY = 'errandify_ads_test_fixture_mode_v1';

const getCampaignsStorageKey = (merchantId: string) =>
  `errandify_ads_campaigns_v1_${merchantId}`;
const getWalletStorageKey = (merchantId: string) =>
  `errandify_ads_wallet_v1_${merchantId}`;
const getWalletTxStorageKey = (merchantId: string) =>
  `errandify_ads_wallet_tx_v1_${merchantId}`;
const getBannersStorageKey = (merchantId: string) =>
  `errandify_ads_banners_v1_${merchantId}`;

export const AUTHENTICATED_MERCHANT_ID = TEST_MERCHANT_ID;

export const AD_PLACEMENTS: AdPlacementInfo[] = [
  {
    id: 'search_results',
    name: 'Search Results',
    shortLabel: 'Search Results',
    whereItAppears:
      'Appears within relevant ErrandMarket search results when shoppers search for matching products.',
    visibilityBenefit:
      'Increases product visibility to high-intent shoppers actively searching for items in your product category or keyword group.',
    placementRulesNote:
      'Labelled "Sponsored". Matched by search relevance and rotated fairly among eligible campaigns. Does not occupy the first search result slot or guarantee a specific position, views, or sales.',
    badgeLabel: 'Sponsored',
  },
  {
    id: 'category_page',
    name: 'Category Page',
    shortLabel: 'Category Page',
    whereItAppears:
      'Appears within the relevant category product listings when shoppers browse that category.',
    visibilityBenefit:
      'Highlights your product to shoppers comparing items inside your product category.',
    placementRulesNote:
      'Labelled "Sponsored". Rotated fairly within the category listing feed. Sponsored placement provides additional visibility and does not guarantee order volume.',
    badgeLabel: 'Sponsored',
  },
  {
    id: 'home_featured',
    name: 'Home Featured',
    shortLabel: 'Home Featured',
    whereItAppears:
      'Appears in the Featured product section on the ErrandMarket homepage.',
    visibilityBenefit:
      'Introduces your product on the main marketplace home screen for broad shopper discovery.',
    placementRulesNote:
      'Labelled "Sponsored". Rotated fairly among approved Home Featured campaigns. Only the product is shown (merchant identity, shop number, and market location remain hidden).',
    badgeLabel: 'Sponsored',
  },
];

/**
 * Default system-configured package catalog exposed by the backend configuration service.
 * Note: Package durations and prices are retrieved dynamically from system storage rather than hardcoded in UI components.
 */
export const DEFAULT_SYSTEM_AD_PACKAGES: AdPackage[] = [
  {
    id: 'pkg-search-3d',
    placement: 'search_results',
    name: 'Search Results — 3-Day Package',
    durationDays: 3,
    price: 3500,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement in relevant shopper search results for 3 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-search-7d',
    placement: 'search_results',
    name: 'Search Results — 7-Day Package',
    durationDays: 7,
    price: 7500,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement in relevant shopper search results for 7 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-search-14d',
    placement: 'search_results',
    name: 'Search Results — 14-Day Package',
    durationDays: 14,
    price: 14000,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement in relevant shopper search results for 14 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-cat-3d',
    placement: 'category_page',
    name: 'Category Page — 3-Day Package',
    durationDays: 3,
    price: 3500,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement inside your product category page for 3 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-cat-7d',
    placement: 'category_page',
    name: 'Category Page — 7-Day Package',
    durationDays: 7,
    price: 7500,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement inside your product category page for 7 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-cat-14d',
    placement: 'category_page',
    name: 'Category Page — 14-Day Package',
    durationDays: 14,
    price: 14000,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement inside your product category page for 14 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-home-3d',
    placement: 'home_featured',
    name: 'Home Featured — 3-Day Package',
    durationDays: 3,
    price: 6000,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement in the ErrandMarket Homepage Featured section for 3 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-home-7d',
    placement: 'home_featured',
    name: 'Home Featured — 7-Day Package',
    durationDays: 7,
    price: 12000,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement in the ErrandMarket Homepage Featured section for 7 days.',
    isActive: true,
    isSystemConfigured: true,
  },
  {
    id: 'pkg-home-14d',
    placement: 'home_featured',
    name: 'Home Featured — 14-Day Package',
    durationDays: 14,
    price: 22000,
    currency: 'NGN',
    description:
      'Fixed-price sponsored placement in the ErrandMarket Homepage Featured section for 14 days.',
    isActive: true,
    isSystemConfigured: true,
  },
];

export const CURATED_COLLECTIONS: CuratedCollectionOption[] = [
  {
    id: 'col-weekend-bulk',
    name: 'Weekend Market Essentials',
    description: 'Staple grains, cooking oils, and bulk household provisions.',
  },
  {
    id: 'col-fresh-pantry',
    name: 'Fresh Farm & Pantry Picks',
    description: 'Daily kitchen ingredients and packaged food essentials.',
  },
  {
    id: 'col-everyday-style',
    name: 'Everyday Fashion & Footwear',
    description: 'Apparel, footwear, and wardrobe staples for men and women.',
  },
  {
    id: 'col-home-kitchen',
    name: 'Home & Kitchen Upgrades',
    description: 'Cookware, appliances, and home care essentials.',
  },
];

function formatLedgerTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const base = new Date(dateStr);
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    return fallback.toISOString().split('T')[0];
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
}

function containsProhibitedContactInfo(text: string): boolean {
  if (!text) return false;
  // Detect Nigerian phone numbers (+234..., 080..., 081..., 090..., 070...), WhatsApp mentions, or social handles
  const phoneRegex = /(\+?234\s?\d{3}|\b0[789][01]\d)\s?\d{3}\s?\d{4}\b/;
  const whatsappOrHandleRegex = /\b(whatsapp|call\s+me|dm\s+us|instagram\.com|t\.me)\b/i;
  return phoneRegex.test(text) || whatsappOrHandleRegex.test(text);
}

/**
 * Evaluates whether a product meets the 5 documented advertising eligibility requirements:
 * 1. Merchant account must be verified and active.
 * 2. Product must be active (published).
 * 3. Product must be in stock.
 * 4. Product must be approved.
 * 5. Product must meet applicable product image and listing standards.
 */
export function evaluateProductAdEligibility(
  product: Product & {
    merchantId?: string;
    approvalStatus?: 'approved' | 'pending' | 'rejected';
  },
  options?: {
    authenticatedMerchantId?: string;
    merchantAccountVerified?: boolean;
    merchantAccountActive?: boolean;
  }
): ProductAdEligibilityCheck {
  const authMerchantId =
    options?.authenticatedMerchantId || AUTHENTICATED_MERCHANT_ID;
  const settings = SettingsStorage.getSettings();

  const merchantVerifiedAndActive =
    options?.merchantAccountVerified !== undefined &&
    options?.merchantAccountActive !== undefined
      ? options.merchantAccountVerified && options.merchantAccountActive
      : Boolean(settings.cacRegistration?.registrationNumber) &&
        Boolean(settings.businessName?.trim());

  const reasons: string[] = [];

  if (product.merchantId && product.merchantId !== authMerchantId) {
    reasons.push(
      'This product belongs to another merchant account and cannot be promoted by your store.'
    );
  }

  if (!merchantVerifiedAndActive) {
    reasons.push(
      'Your merchant account must be verified and active before creating sponsored campaigns.'
    );
  }

  const productIsActive = Boolean(product.isPublished);
  if (!productIsActive) {
    reasons.push(
      'Product is currently unpublished (inactive). Publish the product first to promote it.'
    );
  }

  const totalStock = getProductStock(product);
  const productInStock = totalStock > 0;
  if (!productInStock) {
    reasons.push(
      'Product is out of stock (0 units available). Restock the product before promoting.'
    );
  }

  const productIsApproved =
    product.approvalStatus === undefined ||
    product.approvalStatus === 'approved';
  if (!productIsApproved) {
    reasons.push(
      `Product listing is currently ${product.approvalStatus} and must be approved before promotion.`
    );
  }

  const hasValidImage =
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    Boolean(product.images[0]?.url?.trim());
  const hasValidDescription =
    Boolean(product.name?.trim()) &&
    Boolean(product.description?.trim()) &&
    product.description.trim().length >= 10;
  const hasProhibitedContent =
    containsProhibitedContactInfo(product.name) ||
    containsProhibitedContactInfo(product.description);

  const meetsListingStandards =
    hasValidImage && hasValidDescription && !hasProhibitedContent;

  if (!hasValidImage) {
    reasons.push(
      'Product is missing a clear primary product image required by listing standards.'
    );
  }
  if (!hasValidDescription) {
    reasons.push(
      'Product listing requires a complete title and accurate description.'
    );
  }
  if (hasProhibitedContent) {
    reasons.push(
      'Product listing contains phone numbers, WhatsApp contacts, or external handles prohibited in sponsored ads.'
    );
  }

  return {
    productId: product.id,
    isEligible:
      reasons.length === 0 &&
      merchantVerifiedAndActive &&
      productIsActive &&
      productInStock &&
      productIsApproved &&
      meetsListingStandards,
    merchantVerifiedAndActive,
    productIsActive,
    productInStock,
    productIsApproved,
    meetsListingStandards,
    reasons,
  };
}

export function computeCampaignPermissions(
  status: AdCampaignStatus,
  fundsState: SponsoredCampaign['fundsState'],
  price: number,
  productEligibleForResume = true,
  paymentSource: CampaignPaymentSource = 'ad_wallet'
): CampaignActionPermissions {
  const destinationLabel =
    paymentSource === 'sales_earnings'
      ? 'Available Sales Earnings'
      : 'Ad Wallet Available Balance';

  if (status === 'draft') {
    return {
      canPause: false,
      canResume: false,
      canCancel: true,
      canSubmitDraft: true,
      cancellationPolicyNote:
        'This draft campaign has not been submitted and no funds are held.',
      refundableHoldAmount: 0,
    };
  }

  if (status === 'pending_review') {
    return {
      canPause: false,
      canResume: false,
      canCancel: true,
      canSubmitDraft: false,
      cancellationPolicyNote:
        fundsState === 'held'
          ? `This campaign is awaiting review and has not started. Cancelling now will immediately release the held funds (₦${price.toLocaleString()}) back to your ${destinationLabel}.`
          : 'This campaign has not started. Cancelling will close the submission.',
      refundableHoldAmount: fundsState === 'held' ? price : 0,
    };
  }

  if (status === 'scheduled') {
    return {
      canPause: false,
      canResume: false,
      canCancel: true,
      canSubmitDraft: false,
      cancellationPolicyNote:
        fundsState === 'held'
          ? `This campaign is scheduled for a future start date. Cancelling before the start date will release the held funds (₦${price.toLocaleString()}) back to your ${destinationLabel}.`
          : 'Cancelling before the scheduled start date will stop the campaign from going live.',
      refundableHoldAmount: fundsState === 'held' ? price : 0,
    };
  }

  if (status === 'live') {
    return {
      canPause: true,
      canResume: false,
      canCancel: true,
      canSubmitDraft: false,
      cancellationPolicyNote:
        'This campaign is already Live and the package fee has been charged. Cancelling will permanently end the campaign; post-start refund rules depend on platform policy.',
      refundableHoldAmount: 0,
    };
  }

  if (status === 'paused') {
    return {
      canPause: false,
      canResume: productEligibleForResume,
      resumeDisabledReason: productEligibleForResume
        ? undefined
        : 'Product is currently out of stock or inactive. Restock and publish the product to resume this campaign.',
      canCancel: true,
      canSubmitDraft: false,
      cancellationPolicyNote:
        'This paused campaign had already started. Cancelling will permanently end the campaign; post-start refund rules depend on platform policy.',
      refundableHoldAmount: 0,
    };
  }

  return {
    canPause: false,
    canResume: false,
    canCancel: false,
    canSubmitDraft: false,
    cancellationPolicyNote: `Campaigns with status "${status}" cannot be modified or cancelled.`,
    refundableHoldAmount: 0,
  };
}

export function computePerformanceSummaryFromDaily(
  dailyMetrics: CampaignDailyMetric[],
  campaignPrice: number,
  status: AdCampaignStatus
): CampaignPerformanceSummary {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    const reasonByStatus: Record<AdCampaignStatus, string> = {
      draft: 'Draft campaign has not been submitted yet.',
      pending_review:
        'This campaign is Pending Review and has not started serving ads yet.',
      scheduled:
        'This campaign is Approved / Scheduled for a future start date. Daily metrics will be aggregated once it goes Live.',
      live: 'Campaign is Live. Daily aggregated metrics will appear after the first daily reporting cycle completes.',
      paused:
        'No daily performance records were captured before the campaign was paused.',
      completed: 'No daily performance records were captured for this campaign.',
      rejected:
        'This campaign did not pass review and never served impressions.',
      cancelled:
        'This campaign was cancelled before any daily performance metrics were recorded.',
      suspended:
        'No daily performance records are available for this suspended campaign.',
    };

    return {
      hasData: false,
      unavailableReason: reasonByStatus[status],
      impressions: 0,
      taps: 0,
      tapRate: 0,
      addToCarts: 0,
      orders: 0,
      orderValue: 0,
      costPerOrder: null,
      dailyMetrics: [],
    };
  }

  const impressions = dailyMetrics.reduce((sum, d) => sum + d.impressions, 0);
  const taps = dailyMetrics.reduce((sum, d) => sum + d.taps, 0);
  const addToCarts = dailyMetrics.reduce((sum, d) => sum + d.addToCarts, 0);
  const orders = dailyMetrics.reduce((sum, d) => sum + d.orders, 0);
  const orderValue = dailyMetrics.reduce((sum, d) => sum + d.orderValue, 0);

  const tapRate =
    impressions > 0 ? Number(((taps / impressions) * 100).toFixed(2)) : 0;
  const costPerOrder =
    orders > 0 ? Math.round(campaignPrice / orders) : null;

  return {
    hasData: true,
    lastAggregatedAt: new Date().toISOString(),
    impressions,
    taps,
    tapRate,
    addToCarts,
    orders,
    orderValue,
    costPerOrder,
    dailyMetrics,
  };
}

function dispatchAdsUpdate() {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('errandify:ads-updated'));
    }
  } catch {
    // Ignore in headless test environment
  }
}

export const AdsBackendService = {
  getAuthenticatedMerchantId(): string {
    return AUTHENTICATED_MERCHANT_ID;
  },

  /**
   * Controls whether isolated test fixtures (`isTestFixture: true`) are loaded into the merchant workspace.
   */
  isTestFixtureModeEnabled(): boolean {
    try {
      const val = localStorage.getItem(TEST_MODE_KEY);
      // Default to false for clean production separation unless enabled
      return val === 'true';
    } catch {
      return false;
    }
  },

  loadIsolatedTestFixtures(merchantId: string = AUTHENTICATED_MERCHANT_ID): void {
    localStorage.setItem(TEST_MODE_KEY, 'true');
    localStorage.setItem(
      getWalletStorageKey(merchantId),
      JSON.stringify({ ...ISOLATED_TEST_WALLET, merchantId })
    );
    localStorage.setItem(
      getCampaignsStorageKey(merchantId),
      JSON.stringify(
        ISOLATED_TEST_CAMPAIGNS.map((c) => ({ ...c, merchantId }))
      )
    );
    localStorage.setItem(
      getWalletTxStorageKey(merchantId),
      JSON.stringify(
        ISOLATED_TEST_TRANSACTIONS.map((tx) => ({ ...tx, merchantId }))
      )
    );
    localStorage.setItem(
      getBannersStorageKey(merchantId),
      JSON.stringify(
        ISOLATED_TEST_BANNER_REQUESTS.map((b) => ({ ...b, merchantId }))
      )
    );
    dispatchAdsUpdate();
  },

  resetToCleanLiveWorkspace(merchantId: string = AUTHENTICATED_MERCHANT_ID): void {
    localStorage.setItem(TEST_MODE_KEY, 'false');
    const cleanWallet: AdWalletAccount = {
      merchantId,
      availableBalance: 0,
      heldBalance: 0,
      promotionalBalance: 0,
      currency: 'NGN',
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      getWalletStorageKey(merchantId),
      JSON.stringify(cleanWallet)
    );
    localStorage.setItem(getCampaignsStorageKey(merchantId), JSON.stringify([]));
    localStorage.setItem(getWalletTxStorageKey(merchantId), JSON.stringify([]));
    localStorage.setItem(getBannersStorageKey(merchantId), JSON.stringify([]));
    dispatchAdsUpdate();
  },

  // --- Placements & Packages ---
  getPlacements(): AdPlacementInfo[] {
    return AD_PLACEMENTS;
  },

  getAdvertisingPackages(placement?: AdPlacementId): AdPackage[] {
    try {
      const raw = localStorage.getItem(SYSTEM_PACKAGES_KEY);
      const allPackages: AdPackage[] = raw
        ? JSON.parse(raw)
        : DEFAULT_SYSTEM_AD_PACKAGES;
      const active = allPackages.filter((pkg) => pkg.isActive);
      return placement
        ? active.filter((pkg) => pkg.placement === placement)
        : active;
    } catch {
      return placement
        ? DEFAULT_SYSTEM_AD_PACKAGES.filter((p) => p.placement === placement)
        : DEFAULT_SYSTEM_AD_PACKAGES;
    }
  },

  setSystemAdvertisingPackages(packages: AdPackage[]): void {
    localStorage.setItem(SYSTEM_PACKAGES_KEY, JSON.stringify(packages));
    dispatchAdsUpdate();
  },

  resetSystemAdvertisingPackages(): void {
    localStorage.removeItem(SYSTEM_PACKAGES_KEY);
    dispatchAdsUpdate();
  },

  // --- Wallet Configuration & Balances ---
  getWalletSystemConfig(): AdWalletSystemConfig {
    try {
      const raw = localStorage.getItem(WALLET_CONFIG_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {
      paystackConfigured: false,
      verificationArchitecture: 'server_webhook_verified',
      minimumTopUpAmount: null, // Open decision in owners' document unless configured by backend
      vatPolicyNote: null, // Open decision in owners' document unless configured by backend
    };
  },

  setWalletSystemConfig(config: Partial<AdWalletSystemConfig>): AdWalletSystemConfig {
    const current = this.getWalletSystemConfig();
    const updated: AdWalletSystemConfig = {
      ...current,
      ...config,
    };
    localStorage.setItem(WALLET_CONFIG_KEY, JSON.stringify(updated));
    dispatchAdsUpdate();
    return updated;
  },

  getWalletAccount(
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): AdWalletAccount {
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error(
        'Unauthorized: Cannot access another merchant Ad Wallet.'
      );
    }
    try {
      const stored = localStorage.getItem(getWalletStorageKey(merchantId));
      if (!stored) {
        const initial: AdWalletAccount = {
          merchantId,
          availableBalance: 0,
          heldBalance: 0,
          promotionalBalance: 0,
          currency: 'NGN',
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          getWalletStorageKey(merchantId),
          JSON.stringify(initial)
        );
        return initial;
      }
      return JSON.parse(stored);
    } catch {
      return {
        merchantId,
        availableBalance: 0,
        heldBalance: 0,
        promotionalBalance: 0,
        currency: 'NGN',
        updatedAt: new Date().toISOString(),
      };
    }
  },

  saveWalletAccount(
    account: AdWalletAccount,
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): void {
    if (account.merchantId !== merchantId) {
      throw new Error('Unauthorized wallet account mutation.');
    }
    localStorage.setItem(
      getWalletStorageKey(merchantId),
      JSON.stringify({
        ...account,
        updatedAt: new Date().toISOString(),
      })
    );
  },

  getWalletTransactions(
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): WalletTransaction[] {
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error(
        'Unauthorized: Cannot access another merchant wallet ledger.'
      );
    }
    try {
      const stored = localStorage.getItem(getWalletTxStorageKey(merchantId));
      if (!stored) return [];
      const list: WalletTransaction[] = JSON.parse(stored);
      return list
        .map((tx) => ({
          ...tx,
          paymentSource:
            tx.paymentSource ||
            (tx.fundingSource === 'sales_earnings'
              ? 'sales_earnings'
              : 'ad_wallet'),
        }))
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    } catch {
      return [];
    }
  },

  appendWalletTransaction(
    tx: Omit<WalletTransaction, 'id' | 'timestamp' | 'formattedDate'>,
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): WalletTransaction {
    if (tx.merchantId !== merchantId) {
      throw new Error('Unauthorized ledger write.');
    }
    const nowIso = new Date().toISOString();
    const record: WalletTransaction = {
      ...tx,
      id: `wtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      formattedDate: formatLedgerTimestamp(nowIso),
    };
    const existing = this.getWalletTransactions(merchantId);
    const updated = [record, ...existing];
    localStorage.setItem(
      getWalletTxStorageKey(merchantId),
      JSON.stringify(updated)
    );
    return record;
  },

  /**
   * Processes a Paystack Ad Wallet top-up ONLY after server-side payment verification.
   * Rejects client-only redirect confirmations and deduplicates by payment reference.
   */
  verifyAndRecordPaystackTopUp(payload: {
    merchantId?: string;
    amount: number;
    reference: string;
    serverVerified: boolean;
    paymentOutcome: 'success' | 'failed';
  }): {
    wallet: AdWalletAccount;
    transaction: WalletTransaction;
    deduplicated: boolean;
  } {
    const merchantId = payload.merchantId || AUTHENTICATED_MERCHANT_ID;
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error('Unauthorized merchant wallet top-up request.');
    }

    if (!payload.reference || !payload.reference.trim()) {
      throw new Error('Payment reference is required for verification.');
    }

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      throw new Error('Top-up amount must be greater than ₦0.');
    }

    const walletConfig = this.getWalletSystemConfig();
    if (
      walletConfig.minimumTopUpAmount !== null &&
      payload.amount < walletConfig.minimumTopUpAmount
    ) {
      throw new Error(
        `Top-up amount must be at least ₦${walletConfig.minimumTopUpAmount.toLocaleString()} as configured by the system.`
      );
    }

    if (!payload.serverVerified) {
      throw new Error(
        'Top-up cannot be marked successful from a frontend redirect alone. Server-side Paystack verification is required.'
      );
    }

    // Idempotency check by reference
    const existingTxs = this.getWalletTransactions(merchantId);
    const existingByRef = existingTxs.find(
      (t) => t.reference === payload.reference.trim() && t.type === 'top_up'
    );
    if (existingByRef) {
      return {
        wallet: this.getWalletAccount(merchantId),
        transaction: existingByRef,
        deduplicated: true,
      };
    }

    const wallet = this.getWalletAccount(merchantId);

    if (payload.paymentOutcome === 'failed') {
      const failedTx = this.appendWalletTransaction(
        {
          merchantId,
          type: 'top_up',
          description: 'Ad Wallet Top-Up via Paystack (Payment Failed)',
          reference: payload.reference.trim(),
          amount: Math.round(payload.amount),
          balanceImpact: 'credit',
          fundingSource: 'available',
          paymentSource: 'ad_wallet',
          status: 'failed',
        },
        merchantId
      );
      dispatchAdsUpdate();
      return {
        wallet,
        transaction: failedTx,
        deduplicated: false,
      };
    }

    const updatedWallet: AdWalletAccount = {
      ...wallet,
      availableBalance: wallet.availableBalance + Math.round(payload.amount),
      updatedAt: new Date().toISOString(),
    };
    this.saveWalletAccount(updatedWallet, merchantId);

    const completedTx = this.appendWalletTransaction(
      {
        merchantId,
        type: 'top_up',
        description: 'Ad Wallet Top-Up via Paystack (Server Verified)',
        reference: payload.reference.trim(),
        amount: Math.round(payload.amount),
        balanceImpact: 'credit',
        fundingSource: 'available',
        paymentSource: 'ad_wallet',
        status: 'completed',
      },
      merchantId
    );

    dispatchAdsUpdate();
    return {
      wallet: updatedWallet,
      transaction: completedTx,
      deduplicated: false,
    };
  },

  // --- Campaigns ---
  getCampaigns(
    merchantId: string = AUTHENTICATED_MERCHANT_ID,
    productsCatalog?: Product[]
  ): SponsoredCampaign[] {
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error(
        'Unauthorized: Cannot access another merchant advertising campaigns.'
      );
    }
    try {
      const stored = localStorage.getItem(getCampaignsStorageKey(merchantId));
      if (!stored) return [];
      const list: SponsoredCampaign[] = JSON.parse(stored);
      return list
        .map((c) => {
          const matchedProduct = productsCatalog?.find(
            (p) => p.id === c.productId
          );
          const productStillEligible = matchedProduct
            ? evaluateProductAdEligibility(matchedProduct).isEligible
            : true;
          const resolvedSource: CampaignPaymentSource =
            c.paymentSource || 'ad_wallet';
          return {
            ...c,
            paymentSource: resolvedSource,
            permissions: computeCampaignPermissions(
              c.status,
              c.fundsState,
              c.price,
              productStillEligible,
              resolvedSource
            ),
          };
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch {
      return [];
    }
  },

  getCampaignById(
    campaignId: string,
    merchantId: string = AUTHENTICATED_MERCHANT_ID,
    productsCatalog?: Product[]
  ): SponsoredCampaign | undefined {
    return this.getCampaigns(merchantId, productsCatalog).find(
      (c) => c.id === campaignId
    );
  },

  saveCampaigns(
    campaigns: SponsoredCampaign[],
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): void {
    for (const c of campaigns) {
      if (c.merchantId !== merchantId) {
        throw new Error('Unauthorized campaign write across merchant boundary.');
      }
    }
    localStorage.setItem(
      getCampaignsStorageKey(merchantId),
      JSON.stringify(campaigns)
    );
  },

  /**
   * Saves a campaign as a Draft without placing wallet funds on hold.
   */
  saveDraftCampaign(payload: {
    merchantId?: string;
    product: Product & { merchantId?: string };
    placement: AdPlacementId;
    packageId: string;
    startMode: 'immediate' | 'future';
    startDate: string;
  }): SponsoredCampaign {
    const merchantId = payload.merchantId || AUTHENTICATED_MERCHANT_ID;
    if (
      payload.product.merchantId &&
      payload.product.merchantId !== merchantId
    ) {
      throw new Error(
        'Unauthorized: Cannot create a campaign for another merchant product.'
      );
    }

    const pkg = this.getAdvertisingPackages(payload.placement).find(
      (p) => p.id === payload.packageId
    );
    if (!pkg) {
      throw new Error('Selected advertising package is not available.');
    }

    const placementInfo = AD_PLACEMENTS.find(
      (pl) => pl.id === payload.placement
    );
    if (!placementInfo) {
      throw new Error('Invalid advertising placement.');
    }

    const nowIso = new Date().toISOString();
    const startStr =
      payload.startMode === 'immediate'
        ? nowIso.split('T')[0]
        : payload.startDate;
    const endStr = addDaysToDateStr(startStr, pkg.durationDays);
    const priceDisplay = getProductPriceDisplay(payload.product);

    const draft: SponsoredCampaign = {
      id: `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      merchantId,
      productId: payload.product.id,
      productName: payload.product.name,
      productImage: payload.product.images?.[0]?.url || '',
      productCategory: payload.product.category,
      productSellingPrice: priceDisplay.min,
      placement: payload.placement,
      placementName: placementInfo.name,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      price: pkg.price,
      startMode: payload.startMode,
      startDate: startStr,
      endDate: endStr,
      status: 'draft',
      paymentSource: 'ad_wallet',
      fundsState: 'none',
      createdAt: nowIso,
      updatedAt: nowIso,
      performance: computePerformanceSummaryFromDaily([], pkg.price, 'draft'),
      permissions: computeCampaignPermissions('draft', 'none', pkg.price),
    };

    const existing = this.getCampaigns(merchantId);
    this.saveCampaigns([draft, ...existing], merchantId);
    dispatchAdsUpdate();
    return draft;
  },

  /**
   * Evaluates payment source eligibility, available balances, and shortfalls
   * for purchasing a promotion of `packagePrice`:
   * 1. Priority 1: Pay directly from eligible available sales earnings if `availableSalesEarnings >= packagePrice`.
   * 2. Priority 2: If no eligible sales earnings are available (`availableSalesEarnings === 0`), fund through Ad Wallet.
   * 3. Priority 3: If `0 < availableSalesEarnings < packagePrice`, reports the available sales earnings and exact shortfall,
   *    and directs payment through the Ad Wallet without combining or partially charging balances.
   */
  evaluatePromotionPaymentOptions(
    packagePrice: number,
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): {
    packagePrice: number;
    availableSalesEarnings: number;
    canPayWithSalesEarnings: boolean;
    hasPartialSalesEarnings: boolean;
    salesEarningsShortfall: number;
    awaitingReleaseInEscrow: number;
    pendingWithdrawals: number;
    availableAdWallet: number;
    heldAdWallet: number;
    canPayWithAdWallet: boolean;
    adWalletShortfall: number;
    recommendedPaymentSource: CampaignPaymentSource;
  } {
    const earnings = SalesStorage.getEarningsBalanceSummary();
    const wallet = this.getWalletAccount(merchantId);
    const price = Math.max(0, Math.round(Number(packagePrice) || 0));

    const availableSalesEarnings = earnings.availableEarnings;
    const canPayWithSalesEarnings =
      price > 0 && availableSalesEarnings >= price;
    const hasPartialSalesEarnings =
      price > 0 &&
      availableSalesEarnings > 0 &&
      availableSalesEarnings < price;
    const salesEarningsShortfall = Math.max(0, price - availableSalesEarnings);

    const availableAdWallet = wallet.availableBalance;
    const canPayWithAdWallet = price > 0 && availableAdWallet >= price;
    const adWalletShortfall = Math.max(0, price - availableAdWallet);

    const recommendedPaymentSource: CampaignPaymentSource =
      canPayWithSalesEarnings ? 'sales_earnings' : 'ad_wallet';

    return {
      packagePrice: price,
      availableSalesEarnings,
      canPayWithSalesEarnings,
      hasPartialSalesEarnings,
      salesEarningsShortfall,
      awaitingReleaseInEscrow: earnings.awaitingReleaseInEscrow,
      pendingWithdrawals: earnings.pendingWithdrawals,
      availableAdWallet,
      heldAdWallet: wallet.heldBalance,
      canPayWithAdWallet,
      adWalletShortfall,
      recommendedPaymentSource,
    };
  },

  /**
   * Submits a Sponsored Product Campaign:
   * 1. Validates merchant ownership, product eligibility, package, and start date.
   * 2. Validates the selected payment source ('sales_earnings' or 'ad_wallet'):
   *    - Never allows pending withdrawals, funds reserved for another transaction, or unreleased escrow orders to be spent.
   *    - Never silently combines balances when Sales Earnings cannot cover the full campaign cost.
   * 3. Reserves/holds the package price from the selected payment source.
   * 4. Records an immutable transaction in the relevant ledgers with `paymentSource`.
   * 5. Sets campaign status to 'pending_review'.
   */
  submitSponsoredCampaign(payload: {
    merchantId?: string;
    product: Product & {
      merchantId?: string;
      approvalStatus?: 'approved' | 'pending' | 'rejected';
    };
    placement: AdPlacementId;
    packageId: string;
    startMode: 'immediate' | 'future';
    startDate?: string;
    paymentSource?: CampaignPaymentSource;
    idempotencyKey?: string;
    draftCampaignId?: string;
  }): {
    campaign: SponsoredCampaign;
    wallet: AdWalletAccount;
    holdTransaction: WalletTransaction;
    deduplicated: boolean;
  } {
    const merchantId = payload.merchantId || AUTHENTICATED_MERCHANT_ID;
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error('Unauthorized merchant campaign submission.');
    }

    const paymentSource: CampaignPaymentSource =
      payload.paymentSource || 'ad_wallet';

    // Check idempotency key to prevent duplicate campaign submissions or duplicate charges/holds
    const existingCampaigns = this.getCampaigns(merchantId);
    if (payload.idempotencyKey) {
      const duplicate = existingCampaigns.find(
        (c) => c.idempotencyKey === payload.idempotencyKey
      );
      if (duplicate) {
        const holdTx =
          this.getWalletTransactions(merchantId).find(
            (tx) =>
              tx.relatedCampaignId === duplicate.id && tx.type === 'hold'
          ) || this.getWalletTransactions(merchantId)[0];
        return {
          campaign: duplicate,
          wallet: this.getWalletAccount(merchantId),
          holdTransaction: holdTx,
          deduplicated: true,
        };
      }
    }

    // 1. Validate product eligibility and merchant ownership
    const eligibility = evaluateProductAdEligibility(payload.product, {
      authenticatedMerchantId: merchantId,
    });
    if (!eligibility.isEligible) {
      throw new Error(
        `Product is not eligible for promotion: ${eligibility.reasons.join(' ')}`
      );
    }

    // 2. Validate placement and package
    const placementInfo = AD_PLACEMENTS.find(
      (pl) => pl.id === payload.placement
    );
    if (!placementInfo) {
      throw new Error('Please select a valid advertising placement.');
    }

    const availablePackages = this.getAdvertisingPackages(payload.placement);
    const pkg = availablePackages.find((p) => p.id === payload.packageId);
    if (!pkg) {
      throw new Error(
        'Selected advertising package is not available for this placement.'
      );
    }

    // 3. Validate start date
    const todayStr = new Date().toISOString().split('T')[0];
    let resolvedStartDate = todayStr;
    if (payload.startMode === 'future') {
      if (!payload.startDate || payload.startDate < todayStr) {
        throw new Error(
          'Please select a valid future start date for your campaign.'
        );
      }
      resolvedStartDate = payload.startDate;
    }

    const nowIso = new Date().toISOString();
    const endDateStr = addDaysToDateStr(resolvedStartDate, pkg.durationDays);
    const priceDisplay = getProductPriceDisplay(payload.product);
    const campaignId =
      payload.draftCampaignId ||
      `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const campaignLabel = `${payload.product.name} — ${placementInfo.name}`;

    // 4. Validate and reserve funds from the chosen paymentSource
    let updatedWallet = this.getWalletAccount(merchantId);

    if (paymentSource === 'sales_earnings') {
      // Reserve from Eligible Available Sales Earnings (validates availableEarnings >= pkg.price on backend)
      SalesStorage.reserveSalesEarningsForPromotion({
        merchantId,
        campaignId,
        campaignName: campaignLabel,
        productId: payload.product.id,
        productName: payload.product.name,
        placementName: placementInfo.name,
        packageName: pkg.name,
        amount: pkg.price,
        idempotencyKey: payload.idempotencyKey,
      });
    } else {
      // Reserve from Ad Wallet Available Balance (Held Balance is never available!)
      if (updatedWallet.availableBalance < pkg.price) {
        const shortfall = pkg.price - updatedWallet.availableBalance;
        throw new Error(
          `Insufficient Available Balance in your Ad Wallet. Package price is ₦${pkg.price.toLocaleString()}, Available Balance is ₦${updatedWallet.availableBalance.toLocaleString()} (need ₦${shortfall.toLocaleString()} more). Please top up your Ad Wallet before submitting.`
        );
      }

      updatedWallet = {
        ...updatedWallet,
        availableBalance: updatedWallet.availableBalance - pkg.price,
        heldBalance: updatedWallet.heldBalance + pkg.price,
        updatedAt: nowIso,
      };
      this.saveWalletAccount(updatedWallet, merchantId);
    }

    const newCampaign: SponsoredCampaign = {
      id: campaignId,
      merchantId,
      productId: payload.product.id,
      productName: payload.product.name,
      productImage: payload.product.images?.[0]?.url || '',
      productCategory: payload.product.category,
      productSellingPrice: priceDisplay.min,
      placement: payload.placement,
      placementName: placementInfo.name,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      price: pkg.price,
      startMode: payload.startMode,
      startDate: resolvedStartDate,
      endDate: endDateStr,
      status: 'pending_review',
      paymentSource,
      fundsState: 'held',
      submittedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      performance: computePerformanceSummaryFromDaily(
        [],
        pkg.price,
        'pending_review'
      ),
      permissions: computeCampaignPermissions(
        'pending_review',
        'held',
        pkg.price,
        true,
        paymentSource
      ),
      idempotencyKey: payload.idempotencyKey,
    };

    const filteredExisting = payload.draftCampaignId
      ? existingCampaigns.filter((c) => c.id !== payload.draftCampaignId)
      : existingCampaigns;
    this.saveCampaigns([newCampaign, ...filteredExisting], merchantId);

    // 6. Record immutable HOLD ledger transaction with explicit paymentSource
    const holdTx = this.appendWalletTransaction(
      {
        merchantId,
        type: 'hold',
        description:
          paymentSource === 'sales_earnings'
            ? `Promotion payment reserved from Sales Earnings for campaign awaiting review (${pkg.name})`
            : `Funds placed on hold in Ad Wallet for campaign awaiting review (${pkg.name})`,
        reference:
          paymentSource === 'sales_earnings'
            ? `ERN-HLD-${campaignId.toUpperCase()}`
            : `HLD-${campaignId.toUpperCase()}`,
        amount: pkg.price,
        balanceImpact: 'hold_reserve',
        fundingSource:
          paymentSource === 'sales_earnings' ? 'sales_earnings' : 'available',
        paymentSource,
        status: 'completed',
        relatedCampaignId: campaignId,
        relatedCampaignName: campaignLabel,
      },
      merchantId
    );

    dispatchAdsUpdate();
    return {
      campaign: newCampaign,
      wallet: updatedWallet,
      holdTransaction: holdTx,
      deduplicated: false,
    };
  },

  /**
   * Backend lifecycle handler for when the Errandify team approves or rejects a Pending Review campaign.
   * - If rejected: releases the held funds back to the original payment source (Sales Earnings or Ad Wallet) and records a 'release' transaction.
   * - If approved with future start date: transitions to 'scheduled' ('Approved / Scheduled'), keeping funds held until start.
   * - If approved and start date has arrived: transitions to 'live' and finalizes the charge from the original payment source ('charge' transaction).
   */
  processAdminCampaignReview(payload: {
    campaignId: string;
    merchantId?: string;
    decision: 'approved' | 'rejected';
    rejectionReason?: string;
    adminNote?: string;
    referenceDateStr?: string;
  }): {
    campaign: SponsoredCampaign;
    wallet: AdWalletAccount;
    transaction?: WalletTransaction;
  } {
    const merchantId = payload.merchantId || AUTHENTICATED_MERCHANT_ID;
    const campaigns = this.getCampaigns(merchantId);
    const idx = campaigns.findIndex((c) => c.id === payload.campaignId);
    if (idx === -1) {
      throw new Error('Campaign not found.');
    }

    const campaign = campaigns[idx];
    if (campaign.status !== 'pending_review') {
      throw new Error(
        `Only Pending Review campaigns can be reviewed (current status: ${campaign.status}).`
      );
    }

    const paymentSource: CampaignPaymentSource =
      campaign.paymentSource || 'ad_wallet';
    const nowIso = new Date().toISOString();
    const todayStr = payload.referenceDateStr || nowIso.split('T')[0];
    let wallet = this.getWalletAccount(merchantId);

    if (payload.decision === 'rejected') {
      if (paymentSource === 'sales_earnings') {
        SalesStorage.releaseSalesEarningsPromotionHold(
          campaign.id,
          'Campaign did not pass review'
        );
      } else {
        wallet = {
          ...wallet,
          heldBalance: Math.max(0, wallet.heldBalance - campaign.price),
          availableBalance: wallet.availableBalance + campaign.price,
          updatedAt: nowIso,
        };
        this.saveWalletAccount(wallet, merchantId);
      }

      const releaseTx = this.appendWalletTransaction(
        {
          merchantId,
          type: 'release',
          description:
            paymentSource === 'sales_earnings'
              ? `Reserved Sales Earnings released after campaign review rejection`
              : `Held Ad Wallet funds released after campaign review rejection`,
          reference:
            paymentSource === 'sales_earnings'
              ? `ERN-REL-${campaign.id.toUpperCase()}`
              : `REL-${campaign.id.toUpperCase()}`,
          amount: campaign.price,
          balanceImpact: 'hold_release',
          fundingSource:
            paymentSource === 'sales_earnings' ? 'sales_earnings' : 'available',
          paymentSource,
          status: 'completed',
          relatedCampaignId: campaign.id,
          relatedCampaignName: `${campaign.productName} — ${campaign.placementName}`,
        },
        merchantId
      );

      const rejectedCampaign: SponsoredCampaign = {
        ...campaign,
        paymentSource,
        status: 'rejected',
        fundsState: 'released',
        updatedAt: nowIso,
        reviewOutcome: {
          reviewedAt: nowIso,
          decision: 'rejected',
          rejectionReason:
            payload.rejectionReason ||
            'Product listing did not meet advertising review requirements.',
          adminNote: payload.adminNote,
        },
        performance: computePerformanceSummaryFromDaily(
          [],
          campaign.price,
          'rejected'
        ),
        permissions: computeCampaignPermissions(
          'rejected',
          'released',
          campaign.price,
          true,
          paymentSource
        ),
      };

      campaigns[idx] = rejectedCampaign;
      this.saveCampaigns(campaigns, merchantId);
      dispatchAdsUpdate();

      return {
        campaign: rejectedCampaign,
        wallet,
        transaction: releaseTx,
      };
    }

    // Approved! Check if startDate is in the future or has arrived
    const isFutureStart = campaign.startDate > todayStr;
    if (isFutureStart) {
      const scheduledCampaign: SponsoredCampaign = {
        ...campaign,
        paymentSource,
        status: 'scheduled',
        fundsState: 'held',
        updatedAt: nowIso,
        reviewOutcome: {
          reviewedAt: nowIso,
          decision: 'approved',
          adminNote: payload.adminNote,
        },
        performance: computePerformanceSummaryFromDaily(
          [],
          campaign.price,
          'scheduled'
        ),
        permissions: computeCampaignPermissions(
          'scheduled',
          'held',
          campaign.price,
          true,
          paymentSource
        ),
      };
      campaigns[idx] = scheduledCampaign;
      this.saveCampaigns(campaigns, merchantId);
      dispatchAdsUpdate();
      return {
        campaign: scheduledCampaign,
        wallet,
      };
    }

    // Start date has arrived -> transition to Live and convert Hold into Charge!
    if (paymentSource === 'sales_earnings') {
      SalesStorage.finalizeSalesEarningsPromotionCharge(campaign.id);
    } else {
      wallet = {
        ...wallet,
        heldBalance: Math.max(0, wallet.heldBalance - campaign.price),
        updatedAt: nowIso,
      };
      this.saveWalletAccount(wallet, merchantId);
    }

    const chargeTx = this.appendWalletTransaction(
      {
        merchantId,
        type: 'charge',
        description:
          paymentSource === 'sales_earnings'
            ? `Campaign approved and went Live — package fee charged from Sales Earnings (${campaign.packageName})`
            : `Campaign approved and went Live — held package fee charged from Ad Wallet (${campaign.packageName})`,
        reference:
          paymentSource === 'sales_earnings'
            ? `ERN-CHG-${campaign.id.toUpperCase()}`
            : `CHG-${campaign.id.toUpperCase()}`,
        amount: campaign.price,
        balanceImpact: 'debit',
        fundingSource:
          paymentSource === 'sales_earnings' ? 'sales_earnings' : 'available',
        paymentSource,
        status: 'completed',
        relatedCampaignId: campaign.id,
        relatedCampaignName: `${campaign.productName} — ${campaign.placementName}`,
      },
      merchantId
    );

    const liveCampaign: SponsoredCampaign = {
      ...campaign,
      paymentSource,
      status: 'live',
      fundsState: 'charged',
      updatedAt: nowIso,
      reviewOutcome: {
        reviewedAt: nowIso,
        decision: 'approved',
        adminNote: payload.adminNote,
      },
      performance: computePerformanceSummaryFromDaily(
        campaign.performance.dailyMetrics,
        campaign.price,
        'live'
      ),
      permissions: computeCampaignPermissions(
        'live',
        'charged',
        campaign.price,
        true,
        paymentSource
      ),
    };

    campaigns[idx] = liveCampaign;
    this.saveCampaigns(campaigns, merchantId);
    dispatchAdsUpdate();

    return {
      campaign: liveCampaign,
      wallet,
      transaction: chargeTx,
    };
  },

  /**
   * Transitions an Approved / Scheduled campaign to Live when its start date arrives,
   * finalizing the held funds charge from the campaign's payment source.
   */
  activateScheduledCampaign(
    campaignId: string,
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): {
    campaign: SponsoredCampaign;
    wallet: AdWalletAccount;
    chargeTransaction: WalletTransaction;
  } {
    const campaigns = this.getCampaigns(merchantId);
    const idx = campaigns.findIndex((c) => c.id === campaignId);
    if (idx === -1) throw new Error('Campaign not found.');

    const campaign = campaigns[idx];
    if (campaign.status !== 'scheduled') {
      throw new Error('Only Approved / Scheduled campaigns can be activated to Live.');
    }

    const paymentSource: CampaignPaymentSource =
      campaign.paymentSource || 'ad_wallet';
    const nowIso = new Date().toISOString();
    let wallet = this.getWalletAccount(merchantId);

    if (paymentSource === 'sales_earnings') {
      SalesStorage.finalizeSalesEarningsPromotionCharge(campaign.id);
    } else {
      wallet = {
        ...wallet,
        heldBalance: Math.max(0, wallet.heldBalance - campaign.price),
        updatedAt: nowIso,
      };
      this.saveWalletAccount(wallet, merchantId);
    }

    const chargeTx = this.appendWalletTransaction(
      {
        merchantId,
        type: 'charge',
        description:
          paymentSource === 'sales_earnings'
            ? `Scheduled campaign started and went Live — payment finalized from Sales Earnings`
            : `Scheduled campaign started and went Live — held Ad Wallet funds charged`,
        reference:
          paymentSource === 'sales_earnings'
            ? `ERN-CHG-${campaign.id.toUpperCase()}`
            : `CHG-${campaign.id.toUpperCase()}`,
        amount: campaign.price,
        balanceImpact: 'debit',
        fundingSource:
          paymentSource === 'sales_earnings' ? 'sales_earnings' : 'available',
        paymentSource,
        status: 'completed',
        relatedCampaignId: campaign.id,
        relatedCampaignName: `${campaign.productName} — ${campaign.placementName}`,
      },
      merchantId
    );

    const liveCampaign: SponsoredCampaign = {
      ...campaign,
      paymentSource,
      status: 'live',
      fundsState: 'charged',
      updatedAt: nowIso,
      performance: computePerformanceSummaryFromDaily(
        campaign.performance.dailyMetrics,
        campaign.price,
        'live'
      ),
      permissions: computeCampaignPermissions(
        'live',
        'charged',
        campaign.price,
        true,
        paymentSource
      ),
    };

    campaigns[idx] = liveCampaign;
    this.saveCampaigns(campaigns, merchantId);
    dispatchAdsUpdate();

    return {
      campaign: liveCampaign,
      wallet,
      chargeTransaction: chargeTx,
    };
  },

  /**
   * Pauses a currently Live campaign.
   */
  pauseCampaign(
    campaignId: string,
    reason?: string,
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): SponsoredCampaign {
    const campaigns = this.getCampaigns(merchantId);
    const idx = campaigns.findIndex((c) => c.id === campaignId);
    if (idx === -1) throw new Error('Campaign not found.');

    const campaign = campaigns[idx];
    if (!campaign.permissions.canPause || campaign.status !== 'live') {
      throw new Error(
        `Campaign cannot be paused in its current status (${campaign.status}).`
      );
    }

    const paymentSource: CampaignPaymentSource =
      campaign.paymentSource || 'ad_wallet';
    const nowIso = new Date().toISOString();
    const updated: SponsoredCampaign = {
      ...campaign,
      paymentSource,
      status: 'paused',
      pauseReason: reason || 'Paused by merchant.',
      updatedAt: nowIso,
      permissions: computeCampaignPermissions(
        'paused',
        campaign.fundsState,
        campaign.price,
        true,
        paymentSource
      ),
    };

    campaigns[idx] = updated;
    this.saveCampaigns(campaigns, merchantId);
    dispatchAdsUpdate();
    return updated;
  },

  /**
   * Resumes a Paused campaign if allowed and product remains eligible.
   */
  resumeCampaign(
    campaignId: string,
    productsCatalog?: Product[],
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): SponsoredCampaign {
    const campaigns = this.getCampaigns(merchantId, productsCatalog);
    const idx = campaigns.findIndex((c) => c.id === campaignId);
    if (idx === -1) throw new Error('Campaign not found.');

    const campaign = campaigns[idx];
    if (campaign.status !== 'paused') {
      throw new Error(
        `Only Paused campaigns can be resumed (current status: ${campaign.status}).`
      );
    }
    if (!campaign.permissions.canResume) {
      throw new Error(
        campaign.permissions.resumeDisabledReason ||
          'This campaign cannot currently be resumed.'
      );
    }

    const paymentSource: CampaignPaymentSource =
      campaign.paymentSource || 'ad_wallet';
    const nowIso = new Date().toISOString();
    const updated: SponsoredCampaign = {
      ...campaign,
      paymentSource,
      status: 'live',
      pauseReason: undefined,
      updatedAt: nowIso,
      permissions: computeCampaignPermissions(
        'live',
        campaign.fundsState,
        campaign.price,
        true,
        paymentSource
      ),
    };

    campaigns[idx] = updated;
    this.saveCampaigns(campaigns, merchantId);
    dispatchAdsUpdate();
    return updated;
  },

  /**
   * Cancels a campaign:
   * - If cancelled BEFORE start ('pending_review' or 'scheduled' with held funds), releases held funds back to the original payment source (Sales Earnings or Ad Wallet) and records a 'release' transaction.
   * - If cancelled AFTER start ('live' or 'paused'), ends the campaign without inventing unconfirmed refund formulas.
   */
  cancelCampaign(
    campaignId: string,
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): {
    campaign: SponsoredCampaign;
    wallet: AdWalletAccount;
    releaseTransaction?: WalletTransaction;
  } {
    const campaigns = this.getCampaigns(merchantId);
    const idx = campaigns.findIndex((c) => c.id === campaignId);
    if (idx === -1) throw new Error('Campaign not found.');

    const campaign = campaigns[idx];
    if (!campaign.permissions.canCancel) {
      throw new Error(
        `This campaign cannot be cancelled in its current status (${campaign.status}).`
      );
    }

    const paymentSource: CampaignPaymentSource =
      campaign.paymentSource || 'ad_wallet';
    const nowIso = new Date().toISOString();
    let wallet = this.getWalletAccount(merchantId);
    let releaseTx: WalletTransaction | undefined;
    let nextFundsState = campaign.fundsState;

    const isPreStartHold =
      (campaign.status === 'pending_review' ||
        campaign.status === 'scheduled') &&
      campaign.fundsState === 'held';

    if (isPreStartHold) {
      if (paymentSource === 'sales_earnings') {
        SalesStorage.releaseSalesEarningsPromotionHold(
          campaign.id,
          'Pre-start campaign cancellation'
        );
      } else {
        wallet = {
          ...wallet,
          heldBalance: Math.max(0, wallet.heldBalance - campaign.price),
          availableBalance: wallet.availableBalance + campaign.price,
          updatedAt: nowIso,
        };
        this.saveWalletAccount(wallet, merchantId);
      }
      nextFundsState = 'released';

      releaseTx = this.appendWalletTransaction(
        {
          merchantId,
          type: 'release',
          description:
            paymentSource === 'sales_earnings'
              ? `Reserved Sales Earnings released after pre-start campaign cancellation`
              : `Held Ad Wallet funds released after pre-start campaign cancellation`,
          reference:
            paymentSource === 'sales_earnings'
              ? `ERN-REL-CANC-${campaign.id.toUpperCase()}`
              : `REL-CANC-${campaign.id.toUpperCase()}`,
          amount: campaign.price,
          balanceImpact: 'hold_release',
          fundingSource:
            paymentSource === 'sales_earnings' ? 'sales_earnings' : 'available',
          paymentSource,
          status: 'completed',
          relatedCampaignId: campaign.id,
          relatedCampaignName: `${campaign.productName} — ${campaign.placementName}`,
        },
        merchantId
      );
    }

    const destinationLabel =
      paymentSource === 'sales_earnings'
        ? 'Available Sales Earnings'
        : 'Ad Wallet';

    const cancelledCampaign: SponsoredCampaign = {
      ...campaign,
      paymentSource,
      status: 'cancelled',
      fundsState: nextFundsState,
      cancellationNote: isPreStartHold
        ? `Cancelled before campaign start. Held funds (₦${campaign.price.toLocaleString()}) were released back to your ${destinationLabel}.`
        : 'Cancelled by merchant after campaign start.',
      updatedAt: nowIso,
      permissions: computeCampaignPermissions(
        'cancelled',
        nextFundsState,
        campaign.price,
        true,
        paymentSource
      ),
    };

    campaigns[idx] = cancelledCampaign;
    this.saveCampaigns(campaigns, merchantId);
    dispatchAdsUpdate();

    return {
      campaign: cancelledCampaign,
      wallet,
      releaseTransaction: releaseTx,
    };
  },

  // --- Homepage Banner Requests (Phase 1) ---
  getCuratedCollections(): CuratedCollectionOption[] {
    return CURATED_COLLECTIONS;
  },

  getBannerUploadConfig(): BannerUploadValidationConfig {
    return {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxFileSizeBytes: null, // Open decision in owners' document; do not invent arbitrary byte limits
      dimensionSpecificationNote:
        'Final homepage banner dimensions and file size limits are determined with the Errandify team during creative review.',
    };
  },

  getBannerRequests(
    merchantId: string = AUTHENTICATED_MERCHANT_ID
  ): HomepageBannerRequest[] {
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error(
        'Unauthorized: Cannot access another merchant banner requests.'
      );
    }
    try {
      const stored = localStorage.getItem(getBannersStorageKey(merchantId));
      if (!stored) return [];
      const list: HomepageBannerRequest[] = JSON.parse(stored);
      return list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  submitBannerRequest(payload: {
    merchantId?: string;
    advertisingGoal: string;
    preferredStartDate: string;
    preferredEndDate: string;
    destinationType: BannerDestinationType;
    destinationId: string;
    bannerImageUrl: string;
    bannerImageFileName: string;
    bannerImageMimeType?: string;
    productsCatalog?: Product[];
  }): HomepageBannerRequest {
    const merchantId = payload.merchantId || AUTHENTICATED_MERCHANT_ID;
    if (merchantId !== AUTHENTICATED_MERCHANT_ID) {
      throw new Error('Unauthorized merchant banner request submission.');
    }

    const goal = payload.advertisingGoal.trim();
    if (!goal) {
      throw new Error('Please describe your advertising goal for the banner.');
    }
    if (containsProhibitedContactInfo(goal)) {
      throw new Error(
        'Advertising goal cannot include phone numbers, WhatsApp numbers, social handles, or external contact details.'
      );
    }

    if (!payload.preferredStartDate || !payload.preferredEndDate) {
      throw new Error(
        'Please specify both preferred start and end dates for your banner request.'
      );
    }
    if (payload.preferredEndDate < payload.preferredStartDate) {
      throw new Error(
        'Preferred end date cannot be earlier than the preferred start date.'
      );
    }

    const allowedDestinations: BannerDestinationType[] = [
      'product',
      'category',
      'curated_collection',
    ];
    if (!allowedDestinations.includes(payload.destinationType)) {
      throw new Error(
        'Invalid link destination. Banners may only link to an eligible Product, Category, or Curated Collection (never a storefront, merchant profile, shop number, or external contact link).'
      );
    }

    if (!payload.destinationId || !payload.destinationId.trim()) {
      throw new Error(
        'Please select a valid destination for shoppers who tap the banner.'
      );
    }

    let destinationLabel = '';
    if (payload.destinationType === 'product') {
      const product = payload.productsCatalog?.find(
        (p) => p.id === payload.destinationId
      );
      if (!product) {
        throw new Error(
          'Selected product destination was not found in your store catalog.'
        );
      }
      const eligibility = evaluateProductAdEligibility(product, {
        authenticatedMerchantId: merchantId,
      });
      if (!eligibility.isEligible) {
        throw new Error(
          `Selected product cannot be used as a banner destination: ${eligibility.reasons.join(' ')}`
        );
      }
      destinationLabel = `Product: ${product.name}`;
    } else if (payload.destinationType === 'category') {
      const cat = CATEGORIES.find(
        (c) => c.id === payload.destinationId || c.name === payload.destinationId
      );
      if (!cat) {
        throw new Error('Please select a valid ErrandMarket product category.');
      }
      destinationLabel = `Category: ${cat.name}`;
    } else if (payload.destinationType === 'curated_collection') {
      const col = CURATED_COLLECTIONS.find(
        (c) => c.id === payload.destinationId
      );
      if (!col) {
        throw new Error('Please select a valid curated collection.');
      }
      destinationLabel = `Curated Collection: ${col.name}`;
    }

    if (!payload.bannerImageUrl || !payload.bannerImageUrl.trim()) {
      throw new Error(
        'Please upload a proposed banner image or creative file.'
      );
    }

    const uploadConfig = this.getBannerUploadConfig();
    if (
      payload.bannerImageMimeType &&
      !uploadConfig.allowedMimeTypes.includes(payload.bannerImageMimeType)
    ) {
      throw new Error(
        'Unsupported banner image format. Please upload a PNG, JPG, or WEBP image.'
      );
    }

    const nowIso = new Date().toISOString();
    const request: HomepageBannerRequest = {
      id: `bnr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      merchantId,
      advertisingGoal: goal,
      preferredStartDate: payload.preferredStartDate,
      preferredEndDate: payload.preferredEndDate,
      destinationType: payload.destinationType,
      destinationId: payload.destinationId,
      destinationLabel,
      bannerImageUrl: payload.bannerImageUrl,
      bannerImageFileName:
        payload.bannerImageFileName || 'proposed-banner-creative.png',
      status: 'pending_review',
      teamFeedback:
        'Submitted to the Errandify team. Our team will review your creative, align on banner scheduling, and update your request status here.',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const existing = this.getBannerRequests(merchantId);
    localStorage.setItem(
      getBannersStorageKey(merchantId),
      JSON.stringify([request, ...existing])
    );
    dispatchAdsUpdate();
    return request;
  },
};

// Minimal legacy compatibility stub so historical order calculations in orderStorage.ts remain intact
export function getPromotionStatus(promo: Promotion): PromotionStatus {
  if (!promo.isActive) return 'inactive';
  const now = new Date().getTime();
  const start = new Date(promo.startDate).getTime();
  const end = new Date(promo.endDate).getTime();
  if (now > end) return 'expired';
  if (now < start) return 'scheduled';
  return 'active';
}

export const PromotionStorage = {
  getPromotions(): Promotion[] {
    return [];
  },
};
