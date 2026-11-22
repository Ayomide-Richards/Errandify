import {
  AdsBackendService,
  computePerformanceSummaryFromDaily,
  evaluateProductAdEligibility,
} from '../services/promotionStorage';
import { ProductStorage } from '../services/productStorage';
import { SalesStorage } from '../services/salesStorage';
import { SettingsStorage } from '../services/settingsStorage';

// Mock localStorage in memory for verification
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
  key: () => null,
  length: 0,
};
(globalThis as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

console.log('--- RUNNING ADVERTISING & PROMOTIONS VERIFICATION SUITE ---');

// Initialize default merchant settings and products
SettingsStorage.resetSettings();
ProductStorage.resetToDefault();
AdsBackendService.resetToCleanLiveWorkspace();
AdsBackendService.resetSystemAdvertisingPackages();

const products = ProductStorage.getProducts();
const ofadaRice = products.find((p) => p.id === 'prod-001')!; // Published, in stock (22)
const unpublishedGino = products.find((p) => p.id === 'prod-002')!; // Unpublished
const outOfStockSugar = products.find((p) => p.id === 'prod-008')!; // Out of stock (0)
const classicSneakers = products.find((p) => p.id === 'prod-005')!; // Published with options

// 1. Verify clean production state has zero hardcoded sample campaigns or transactions
assert(
  AdsBackendService.isTestFixtureModeEnabled() === false &&
    AdsBackendService.getCampaigns().length === 0 &&
    AdsBackendService.getWalletTransactions().length === 0 &&
    AdsBackendService.getBannerRequests().length === 0 &&
    AdsBackendService.getWalletAccount().availableBalance === 0 &&
    AdsBackendService.getWalletAccount().heldBalance === 0,
  '1. Clean live workspace starts with 0 hardcoded campaigns, 0 wallet transactions, and ₦0 balances'
);

// 2. Verify Product Advertising Eligibility Rules
const ofadaElig = evaluateProductAdEligibility(ofadaRice);
assert(
  ofadaElig.isEligible === true && ofadaElig.reasons.length === 0,
  '2a. Active, approved, in-stock product with valid image (Ofada rice 50kg) is eligible for promotion'
);

const unpublishedElig = evaluateProductAdEligibility(unpublishedGino);
assert(
  unpublishedElig.isEligible === false &&
    unpublishedElig.productIsActive === false &&
    unpublishedElig.reasons.some((r) => r.includes('unpublished')),
  `2b. Unpublished product (Gino tomato paste) is ineligible with reason: "${unpublishedElig.reasons[0]}"`
);

const outOfStockElig = evaluateProductAdEligibility(outOfStockSugar);
assert(
  outOfStockElig.isEligible === false &&
    outOfStockElig.productInStock === false &&
    outOfStockElig.reasons.some((r) => r.includes('out of stock')),
  `2c. Out-of-stock product (Dangote Sugar) is ineligible with reason: "${outOfStockElig.reasons[0]}"`
);

const foreignMerchantElig = evaluateProductAdEligibility({
  ...ofadaRice,
  merchantId: 'merch-other-999',
});
assert(
  foreignMerchantElig.isEligible === false &&
    foreignMerchantElig.reasons.some((r) =>
      r.includes('another merchant account')
    ),
  '2d. Products belonging to another merchant are rejected by eligibility checks'
);

const contactSpamElig = evaluateProductAdEligibility({
  ...ofadaRice,
  description: 'Best rice in Lagos! WhatsApp us on 08031234567 for direct orders.',
});
assert(
  contactSpamElig.isEligible === false &&
    contactSpamElig.meetsListingStandards === false,
  '2e. Product listings containing phone numbers or WhatsApp contact details are marked ineligible'
);

// 3. Verify Placements and System-Configured Packages (including empty state when none exist)
const placements = AdsBackendService.getPlacements();
assert(
  placements.length === 3 &&
    placements.map((p) => p.id).join(',') ===
      'search_results,category_page,home_featured',
  '3a. All 3 sponsored placements (Search Results, Category Page, Home Featured) are available'
);

const searchPackages = AdsBackendService.getAdvertisingPackages('search_results');
assert(
  searchPackages.length > 0 &&
    searchPackages.every((p) => p.placement === 'search_results' && p.price > 0),
  '3b. System-configured packages are returned dynamically for Search Results'
);

// Verify empty packages state when system has no packages configured for a placement
AdsBackendService.setSystemAdvertisingPackages([]);
assert(
  AdsBackendService.getAdvertisingPackages('search_results').length === 0,
  '3c. Returns empty package list (without inventing options) when no packages are configured by the system'
);
AdsBackendService.resetSystemAdvertisingPackages();

// 4. Verify Ad Wallet Top-Up via Paystack (Server Verification, Failure Handling & Idempotency)
let unverifiedBlocked = false;
try {
  AdsBackendService.verifyAndRecordPaystackTopUp({
    amount: 20000,
    reference: 'PSK-UNVERIFIED-001',
    serverVerified: false,
    paymentOutcome: 'success',
  });
} catch {
  unverifiedBlocked = true;
}
assert(
  unverifiedBlocked &&
    AdsBackendService.getWalletAccount().availableBalance === 0,
  '4a. Client-only redirect without server-side payment verification is rejected and does not credit wallet'
);

const failedTopUp = AdsBackendService.verifyAndRecordPaystackTopUp({
  amount: 20000,
  reference: 'PSK-FAILED-001',
  serverVerified: true,
  paymentOutcome: 'failed',
});
assert(
  failedTopUp.wallet.availableBalance === 0 &&
    failedTopUp.transaction.status === 'failed',
  '4b. Failed Paystack payment is recorded as failed without increasing Available Balance'
);

const successTopUp = AdsBackendService.verifyAndRecordPaystackTopUp({
  amount: 25000,
  reference: 'PSK-VERIFIED-001',
  serverVerified: true,
  paymentOutcome: 'success',
});
assert(
  successTopUp.wallet.availableBalance === 25000 &&
    successTopUp.transaction.status === 'completed' &&
    successTopUp.transaction.type === 'top_up',
  '4c. Server-verified Paystack top-up credits Available Balance (₦25,000) and records a completed Top-up ledger entry'
);

const duplicateTopUp = AdsBackendService.verifyAndRecordPaystackTopUp({
  amount: 25000,
  reference: 'PSK-VERIFIED-001',
  serverVerified: true,
  paymentOutcome: 'success',
});
assert(
  duplicateTopUp.deduplicated === true &&
    duplicateTopUp.wallet.availableBalance === 25000,
  '4d. Retrying the same Paystack reference is deduplicated and does not double-credit the wallet'
);

// 5. Verify Campaign Submission, Insufficient Funds Check, Hold Placement & Idempotency
const expensiveHomePkg = AdsBackendService.getAdvertisingPackages(
  'home_featured'
).find((p) => p.price === 22000)!;
const search7dPkg = AdsBackendService.getAdvertisingPackages(
  'search_results'
).find((p) => p.price === 7500)!;

// Submit first campaign (₦22,000 placed on hold -> Available becomes ₦3,000, Held becomes ₦22,000)
const sub1 = AdsBackendService.submitSponsoredCampaign({
  product: ofadaRice,
  placement: 'home_featured',
  packageId: expensiveHomePkg.id,
  startMode: 'immediate',
  idempotencyKey: 'idem-campaign-001',
});
assert(
  sub1.campaign.status === 'pending_review' &&
    sub1.campaign.fundsState === 'held' &&
    sub1.wallet.availableBalance === 3000 &&
    sub1.wallet.heldBalance === 22000 &&
    sub1.holdTransaction.type === 'hold' &&
    sub1.holdTransaction.amount === 22000,
  '5a. Submitting a campaign places the package price (₦22,000) on Hold in the Ad Wallet, sets status to Pending Review, and records a Hold transaction'
);

// Retry with same idempotencyKey -> no duplicate campaign or hold
const sub1Retry = AdsBackendService.submitSponsoredCampaign({
  product: ofadaRice,
  placement: 'home_featured',
  packageId: expensiveHomePkg.id,
  startMode: 'immediate',
  idempotencyKey: 'idem-campaign-001',
});
assert(
  sub1Retry.deduplicated === true &&
    AdsBackendService.getWalletAccount().availableBalance === 3000 &&
    AdsBackendService.getWalletAccount().heldBalance === 22000 &&
    AdsBackendService.getCampaigns().length === 1,
  '5b. Retrying campaign submission with the same idempotencyKey does not create a duplicate campaign or duplicate hold'
);

// Attempt to purchase a ₦7,500 campaign when Available Balance is ₦3,000 (even though Held Balance is ₦22,000!)
let insufficientFundsBlocked = false;
try {
  AdsBackendService.submitSponsoredCampaign({
    product: classicSneakers,
    placement: 'search_results',
    packageId: search7dPkg.id,
    startMode: 'immediate',
  });
} catch {
  insufficientFundsBlocked = true;
}
assert(
  insufficientFundsBlocked,
  '5c. Campaign purchase is blocked when Available Balance (₦3,000) is less than package price (₦7,500) — Held Balance (₦22,000) is never treated as available funds'
);

// 6. Verify Rejection Releases Held Funds Back to Available Balance
const rejectRes = AdsBackendService.processAdminCampaignReview({
  campaignId: sub1.campaign.id,
  decision: 'rejected',
  rejectionReason: 'Primary image needs clearer packaging view.',
  adminNote: 'Please upload a clearer photo and resubmit.',
});
assert(
  rejectRes.campaign.status === 'rejected' &&
    rejectRes.campaign.fundsState === 'released' &&
    rejectRes.campaign.reviewOutcome?.rejectionReason ===
      'Primary image needs clearer packaging view.' &&
    rejectRes.wallet.availableBalance === 25000 &&
    rejectRes.wallet.heldBalance === 0 &&
    rejectRes.transaction?.type === 'release',
  '6. Rejecting a Pending Review campaign releases the ₦22,000 hold back to Available Balance (₦25,000) and records a Release ledger transaction'
);

// 7. Verify Future-Dated Campaign Approval ('scheduled') and Pre-Start Cancellation Hold Release
const futureDateStr = '2026-12-01';
const subFuture = AdsBackendService.submitSponsoredCampaign({
  product: classicSneakers,
  placement: 'search_results',
  packageId: search7dPkg.id,
  startMode: 'future',
  startDate: futureDateStr,
});
const approvedFuture = AdsBackendService.processAdminCampaignReview({
  campaignId: subFuture.campaign.id,
  decision: 'approved',
  referenceDateStr: '2026-11-15',
});
assert(
  approvedFuture.campaign.status === 'scheduled' &&
    approvedFuture.campaign.fundsState === 'held' &&
    approvedFuture.wallet.availableBalance === 17500 &&
    approvedFuture.wallet.heldBalance === 7500,
  '7a. Approving a campaign with a future start date sets status to Approved / Scheduled while keeping the funds held'
);

const cancelScheduled = AdsBackendService.cancelCampaign(
  approvedFuture.campaign.id
);
assert(
  cancelScheduled.campaign.status === 'cancelled' &&
    cancelScheduled.campaign.fundsState === 'released' &&
    cancelScheduled.wallet.availableBalance === 25000 &&
    cancelScheduled.wallet.heldBalance === 0 &&
    cancelScheduled.releaseTransaction?.type === 'release',
  '7b. Cancelling a Scheduled campaign before its start date releases the held funds (₦7,500) back to Available Balance'
);

// 8. Verify Immediate Campaign Approval -> Live Charges Held Funds, plus Pause & Resume Controls
const subLive = AdsBackendService.submitSponsoredCampaign({
  product: ofadaRice,
  placement: 'search_results',
  packageId: search7dPkg.id,
  startMode: 'immediate',
});
const approvedLive = AdsBackendService.processAdminCampaignReview({
  campaignId: subLive.campaign.id,
  decision: 'approved',
  referenceDateStr: subLive.campaign.startDate,
});
assert(
  approvedLive.campaign.status === 'live' &&
    approvedLive.campaign.fundsState === 'charged' &&
    approvedLive.wallet.availableBalance === 17500 &&
    approvedLive.wallet.heldBalance === 0 &&
    approvedLive.transaction?.type === 'charge' &&
    approvedLive.transaction?.amount === 7500,
  '8a. When an approved campaign goes Live, the held amount (₦7,500) is charged and a Charge ledger transaction is recorded'
);

const pausedCamp = AdsBackendService.pauseCampaign(approvedLive.campaign.id);
assert(
  pausedCamp.status === 'paused' &&
    pausedCamp.permissions.canResume === true &&
    pausedCamp.permissions.canPause === false,
  '8b. Live campaign can be paused by the merchant'
);

const resumedCamp = AdsBackendService.resumeCampaign(
  pausedCamp.id,
  products
);
assert(
  resumedCamp.status === 'live' &&
    resumedCamp.permissions.canPause === true &&
    resumedCamp.permissions.canResume === false,
  '8c. Paused campaign can be resumed to Live when product remains eligible'
);

// 9. Verify Daily Aggregated Performance Calculation
const perfSummary = computePerformanceSummaryFromDaily(
  [
    {
      date: '2026-11-14',
      label: 'Nov 14',
      impressions: 500,
      taps: 25,
      addToCarts: 8,
      orders: 3,
      orderValue: 135000,
    },
    {
      date: '2026-11-15',
      label: 'Nov 15',
      impressions: 500,
      taps: 25,
      addToCarts: 7,
      orders: 2,
      orderValue: 90000,
    },
  ],
  7500,
  'live'
);
assert(
  perfSummary.hasData === true &&
    perfSummary.impressions === 1000 &&
    perfSummary.taps === 50 &&
    perfSummary.tapRate === 5 &&
    perfSummary.addToCarts === 15 &&
    perfSummary.orders === 5 &&
    perfSummary.orderValue === 225000 &&
    perfSummary.costPerOrder === 1500,
  '9. Daily performance metrics aggregate Impressions (1,000), Taps (50), Tap Rate (5%), Add-to-Carts (15), Orders (5), Order Value (₦225,000), and Cost per Order (₦1,500) accurately'
);

// 10. Verify Homepage Banner Requests Validation & Tracking
let invalidBannerDestBlocked = false;
try {
  AdsBackendService.submitBannerRequest({
    advertisingGoal: 'Visit our storefront at Shop 14 Balogun Market',
    preferredStartDate: '2026-11-20',
    preferredEndDate: '2026-11-27',
    destinationType: 'storefront' as any,
    destinationId: 'store-xyz',
    bannerImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    bannerImageFileName: 'banner.png',
    productsCatalog: products,
  });
} catch {
  invalidBannerDestBlocked = true;
}
assert(
  invalidBannerDestBlocked,
  '10a. Banner requests linking to merchant storefronts or profiles are rejected'
);

const validBannerReq = AdsBackendService.submitBannerRequest({
  advertisingGoal: 'Promote 50kg Ofada Rice for festive kitchen prep',
  preferredStartDate: '2026-11-20',
  preferredEndDate: '2026-11-27',
  destinationType: 'product',
  destinationId: ofadaRice.id,
  bannerImageUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  bannerImageFileName: 'ofada-banner.png',
  bannerImageMimeType: 'image/png',
  productsCatalog: products,
});
assert(
  validBannerReq.status === 'pending_review' &&
    validBannerReq.destinationLabel === 'Product: Ofada rice (50kg)' &&
    AdsBackendService.getBannerRequests().length === 1,
  '10b. Valid homepage banner request is saved and tracked under Banner Requests'
);

// 11. Verify Isolated Test Fixtures Mode can be loaded and cleared cleanly
AdsBackendService.loadIsolatedTestFixtures();
assert(
  AdsBackendService.isTestFixtureModeEnabled() === true &&
    AdsBackendService.getCampaigns().length === 5 &&
    AdsBackendService.getCampaigns().every((c) => c.isTestFixture === true),
  '11. Isolated test fixtures are explicitly flagged with isTestFixture: true and can be loaded on demand'
);
AdsBackendService.resetToCleanLiveWorkspace();
SalesStorage.resetSalesAndWithdrawals();

// 12. Verify Promotions Payment via Sales Earnings vs Ad Wallet (Priority, Shortfall, Escrow/Withdrawal Protection, and Ledgers)
// Initial eligible Available Sales Earnings = ₦61,500 (from delivered order ord-1004; ₦372,350 in escrow and ₦59,000 pending withdrawal are excluded)
const initialOpts = AdsBackendService.evaluatePromotionPaymentOptions(7500);
assert(
  initialOpts.availableSalesEarnings === 61500 &&
    initialOpts.canPayWithSalesEarnings === true &&
    initialOpts.recommendedPaymentSource === 'sales_earnings',
  '12a. When merchant has eligible Available Sales Earnings (₦61,500 >= ₦7,500), Sales Earnings is recommended as Priority 1 payment source'
);

// Merchant pays for a ₦7,500 campaign directly from Sales Earnings
const salesFundedSub = AdsBackendService.submitSponsoredCampaign({
  product: ofadaRice,
  placement: 'search_results',
  packageId: search7dPkg.id,
  startMode: 'immediate',
  paymentSource: 'sales_earnings',
  idempotencyKey: 'idem-sales-promo-001',
});
assert(
  salesFundedSub.campaign.paymentSource === 'sales_earnings' &&
    salesFundedSub.campaign.fundsState === 'held' &&
    salesFundedSub.holdTransaction.paymentSource === 'sales_earnings' &&
    SalesStorage.getEarningsBalanceSummary().availableEarnings === 54000 && // 61,500 - 7,500
    SalesStorage.getEarningsBalanceSummary().promotionSpendFromEarnings === 7500 &&
    AdsBackendService.getWalletAccount().availableBalance === 0,
  '12b. Paying for a ₦7,500 promotion from Sales Earnings reserves ₦7,500 from Available Sales Earnings (now ₦54,000), records paymentSource="sales_earnings" on campaign and ledgers, and leaves Ad Wallet untouched'
);

// Retrying same Sales Earnings campaign submission is deduplicated (no double charge!)
const salesFundedRetry = AdsBackendService.submitSponsoredCampaign({
  product: ofadaRice,
  placement: 'search_results',
  packageId: search7dPkg.id,
  startMode: 'immediate',
  paymentSource: 'sales_earnings',
  idempotencyKey: 'idem-sales-promo-001',
});
assert(
  salesFundedRetry.deduplicated === true &&
    SalesStorage.getEarningsBalanceSummary().availableEarnings === 54000,
  '12c. Duplicate campaign submission with paymentSource="sales_earnings" is deduplicated without double-charging Sales Earnings'
);

// Approving the Sales Earnings-funded campaign to Live finalizes the charge without deducting a second time
const approvedSalesCamp = AdsBackendService.processAdminCampaignReview({
  campaignId: salesFundedSub.campaign.id,
  decision: 'approved',
  referenceDateStr: salesFundedSub.campaign.startDate,
});
assert(
  approvedSalesCamp.campaign.status === 'live' &&
    approvedSalesCamp.campaign.fundsState === 'charged' &&
    approvedSalesCamp.campaign.paymentSource === 'sales_earnings' &&
    approvedSalesCamp.transaction?.paymentSource === 'sales_earnings' &&
    SalesStorage.getEarningsBalanceSummary().availableEarnings === 54000 &&
    SalesStorage.getEarningsBalanceSummary().promotionChargedFromEarnings === 7500,
  '12d. Approving a Sales Earnings-funded campaign to Live finalizes the charge in Sales Earnings ledger without double-deducting'
);

// Now merchant requests a withdrawal of ₦45,000 from their remaining ₦54,000 Available Sales Earnings -> leaves ₦9,000 Available Sales Earnings
SalesStorage.requestWithdrawal({
  amount: 45000,
  idempotencyKey: 'idem-wdr-for-promo-test',
});
assert(
  SalesStorage.getEarningsBalanceSummary().availableEarnings === 9000,
  '12e. Requesting a ₦45,000 withdrawal reduces Available Sales Earnings from ₦54,000 to ₦9,000 (funds reserved for pending withdrawal cannot be spent on promotions)'
);

// Evaluate payment options for a ₦22,000 package when Available Sales Earnings is ₦9,000 (Insufficient Sales Earnings -> Shortfall ₦13,000)
const shortfallOpts = AdsBackendService.evaluatePromotionPaymentOptions(22000);
assert(
  shortfallOpts.availableSalesEarnings === 9000 &&
    shortfallOpts.canPayWithSalesEarnings === false &&
    shortfallOpts.hasPartialSalesEarnings === true &&
    shortfallOpts.salesEarningsShortfall === 13000 &&
    shortfallOpts.recommendedPaymentSource === 'ad_wallet',
  '12f. When Available Sales Earnings (₦9,000) cannot cover full campaign cost (₦22,000), evaluatePromotionPaymentOptions reports exact shortfall (₦13,000) and recommends Ad Wallet without combining balances'
);

// Attempting to force-pay the ₦22,000 campaign from Sales Earnings (₦9,000) is blocked by the backend (even though ₦372,350 is in escrow and ₦104,000 is in pending withdrawals!)
let insufficientSalesEarningsBlocked = false;
try {
  AdsBackendService.submitSponsoredCampaign({
    product: classicSneakers,
    placement: 'home_featured',
    packageId: expensiveHomePkg.id,
    startMode: 'immediate',
    paymentSource: 'sales_earnings',
  });
} catch {
  insufficientSalesEarningsBlocked = true;
}
assert(
  insufficientSalesEarningsBlocked &&
    SalesStorage.getEarningsBalanceSummary().availableEarnings === 9000,
  '12g. Backend blocks paying for a ₦22,000 campaign from Sales Earnings when only ₦9,000 is available — pending withdrawals and unreleased escrow orders can never be spent'
);

// Withdraw the remaining ₦9,000 so Available Sales Earnings is ₦0, then top up Ad Wallet and fund the promotion through Ad Wallet
SalesStorage.requestWithdrawal({
  amount: 9000,
  idempotencyKey: 'idem-wdr-clear-remaining',
});
const zeroSalesOpts = AdsBackendService.evaluatePromotionPaymentOptions(7500);
assert(
  zeroSalesOpts.availableSalesEarnings === 0 &&
    zeroSalesOpts.canPayWithSalesEarnings === false &&
    zeroSalesOpts.recommendedPaymentSource === 'ad_wallet',
  '12h. When merchant has ₦0 Available Sales Earnings, payment defaults to Ad Wallet'
);

AdsBackendService.verifyAndRecordPaystackTopUp({
  amount: 15000,
  reference: 'PSK-AD-WALLET-FALLBACK-001',
  serverVerified: true,
  paymentOutcome: 'success',
});
const walletFundedSub = AdsBackendService.submitSponsoredCampaign({
  product: classicSneakers,
  placement: 'search_results',
  packageId: search7dPkg.id,
  startMode: 'immediate',
  paymentSource: 'ad_wallet',
  idempotencyKey: 'idem-wallet-promo-001',
});
assert(
  walletFundedSub.campaign.paymentSource === 'ad_wallet' &&
    walletFundedSub.holdTransaction.paymentSource === 'ad_wallet' &&
    walletFundedSub.wallet.availableBalance === 7500 &&
    walletFundedSub.wallet.heldBalance === 7500 &&
    SalesStorage.getEarningsBalanceSummary().availableEarnings === 0,
  '12i. Merchant with ₦0 Available Sales Earnings successfully funds promotion through Ad Wallet with paymentSource="ad_wallet" recorded on campaign and transaction history'
);

AdsBackendService.resetToCleanLiveWorkspace();
SalesStorage.resetSalesAndWithdrawals();

console.log('--- ALL ADVERTISING & PROMOTIONS SCENARIOS VERIFIED ---');
