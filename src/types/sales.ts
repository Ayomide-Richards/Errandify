import type { OrderItem } from './order';

export type SalesSubTab = 'overview' | 'transactions' | 'settlements';

export type ReportingPeriodPreset =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

/**
 * Payment status of a customer order transaction.
 */
export type PaymentStatus = 'confirmed' | 'pending' | 'failed' | 'refunded';

/**
 * Status of the merchant's funds for an order across the escrow and settlement lifecycle:
 * - 'in_escrow': Order has been paid for, but customer delivery confirmation code has not yet been verified.
 * - 'awaiting_settlement': Delivery has been confirmed via customer code, and funds are ready for or currently in an automatic settlement.
 * - 'settled': Funds have been successfully paid to the merchant through a completed settlement.
 * - 'refunded': The relevant order amount has been refunded.
 */
export type FundsStatus =
  | 'in_escrow'
  | 'awaiting_settlement'
  | 'settled'
  | 'refunded';

/**
 * Status of an automatic combined merchant settlement.
 */
export type SettlementStatus = 'processing' | 'paid' | 'failed';

export interface DateRangeWindow {
  preset: ReportingPeriodPreset;
  startDate: Date;
  endDate: Date;
  label: string;
  formattedRange: string;
  timezoneLabel: string;
}

/**
 * Individual customer order transaction and its payment, escrow, delivery confirmation,
 * and automatic settlement state.
 *
 * Business rules:
 * - Merchants receive the full amount they listed their products for (adjusted for merchant product/promotion discounts).
 * - Errandify's customer-facing charge is never deducted from merchant earnings.
 * - Funds remain in escrow ('in_escrow') until the runner verifies the customer's delivery confirmation code.
 * - 'Picked Up' in the Orders section only indicates runner collection, not delivery completion.
 */
export interface SalesTransaction {
  id: string;
  sourceOrderId: string;
  customerName: string;
  itemSummary: string;
  items: OrderItem[];
  dateTime: string;
  createdAt: string; // ISO 8601 timestamp
  paymentStatus: PaymentStatus;
  paymentConfirmedAt?: string;
  fundsStatus: FundsStatus;
  orderStatusLabel?: string;
  runnerName?: string;
  handedOverAt?: string;
  deliveryConfirmed: boolean;
  deliveryConfirmedAt?: string;
  productSubtotal: number; // Product subtotal before discounts
  productDiscountAmount: number;
  promotionDiscountAmount: number;
  promotionName?: string;
  totalDiscounts: number; // productDiscountAmount + promotionDiscountAmount
  orderValue: number; // Product Subtotal - Applicable Product Discounts
  refundedAmount: number;
  netAmount: number; // Effective merchant earnings after applicable refunds
  settlementId?: string;
  settlementStatus?: SettlementStatus;
}

export interface SettlementIncludedOrder {
  transactionId: string;
  orderId: string;
  customerName: string;
  itemSummary: string;
  orderDate: string;
  createdAt: string;
  deliveryConfirmedAt?: string;
  orderAmount: number;
}

/**
 * Represents an automatic merchant settlement or merchant-initiated withdrawal
 * with a 72-hour processing period before bank deposit.
 */
export interface SettlementRecord {
  id: string;
  recordType?: 'merchant_withdrawal' | 'combined_settlement';
  settlementDate: string; // Human-readable date
  createdAt: string; // ISO 8601 timestamp
  requestedAt?: string; // ISO 8601 timestamp when withdrawal was initiated
  processingDate?: string; // Human-readable request / processing start date & time
  expectedPayoutAt?: string; // ISO 8601 timestamp (requestedAt + 72 hours)
  expectedPayoutDate?: string; // Human-readable expected payout date & time (after 72h)
  processingHours?: number; // 72-hour processing period
  paidAt?: string; // ISO 8601 timestamp when deposited
  paidDate?: string; // Human-readable date & time when deposited
  settlementAmount: number;
  status: SettlementStatus;
  transactionIds: string[];
  orders: SettlementIncludedOrder[];
  bankName?: string;
  maskedAccountNumber?: string;
  accountName?: string;
  transactionReference?: string;
  failureReason?: string;
  idempotencyKey?: string;
}

/**
 * Tracks a promotion campaign payment funded directly from the merchant's
 * eligible available sales earnings.
 */
export interface SalesEarningsPromotionRecord {
  id: string;
  merchantId: string;
  campaignId: string;
  campaignName: string;
  productId: string;
  productName: string;
  placementName: string;
  packageName: string;
  amount: number;
  state: 'held' | 'charged' | 'released';
  paymentSource: 'sales_earnings';
  reference: string;
  createdAt: string;
  updatedAt: string;
  formattedDate: string;
  idempotencyKey?: string;
}

/**
 * Immutable financial ledger entry for Sales & Earnings movements
 * (withdrawals requested, withdrawals paid after 72h, promotion payments from earnings, and released holds).
 */
export interface SalesFinancialLedgerEntry {
  id: string;
  timestamp: string;
  formattedDate: string;
  type:
    | 'withdrawal_requested'
    | 'withdrawal_paid'
    | 'promotion_hold'
    | 'promotion_charge'
    | 'promotion_release';
  description: string;
  reference: string;
  amount: number;
  direction: 'debit' | 'credit' | 'neutral';
  status: 'processing' | 'completed' | 'released' | 'failed';
  paymentSource: 'sales_earnings';
  relatedWithdrawalId?: string;
  relatedCampaignId?: string;
  relatedCampaignName?: string;
  expectedPayoutDate?: string;
  bankSummary?: string;
}

/**
 * Authoritative summary of merchant sales earnings, escrow holdings,
 * 72-hour pending withdrawals, paid withdrawals, and promotion payments from earnings.
 */
export interface EarningsBalanceSummary {
  totalConfirmedSales: number;
  awaitingReleaseInEscrow: number;
  inEscrowOrderCount: number;
  totalReleasedFromEscrow: number;
  releasedOrderCount: number;
  availableEarnings: number;
  pendingWithdrawals: number;
  pendingWithdrawalCount: number;
  successfullyPaidWithdrawals: number;
  paidWithdrawalCount: number;
  promotionSpendFromEarnings: number;
  promotionHeldFromEarnings: number;
  promotionChargedFromEarnings: number;
  bankDetails: {
    bankName: string;
    maskedAccountNumber: string;
    accountName: string;
  };
}

export interface OverviewSummaryMetrics {
  totalSales: number;
  awaitingRelease: number;
  awaitingSettlement: number;
  released: number;
  totalOrders: number;
  inEscrowOrderCount: number;
  awaitingSettlementOrderCount: number;
  releasedOrderCount: number;
  refundedTotal: number;
}

export interface SettlementSummaryMetrics {
  awaitingRelease: number;
  awaitingReleaseCount: number;
  availableEarnings: number;
  availableOrderCount: number;
  processing: number;
  processingSettlementCount: number;
  processingOrderCount: number;
  readyForSettlement: number;
  readyForSettlementCount: number;
  successfullyPaid: number;
  paidSettlementCount: number;
  paidOrderCount: number;
  promotionSpendFromEarnings: number;
}

export interface SalesChartBucket {
  key: string;
  label: string;
  fullLabel: string;
  salesAmount: number;
  orderCount: number;
}

export interface ProductSalesPerformanceItem {
  productKey: string;
  productId?: string;
  productName: string;
  unit?: string;
  image?: string;
  ordersCount: number;
  quantitySold: number;
  salesValue: number;
}

export type TransactionSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc';

export interface TransactionFiltersState {
  search: string;
  paymentStatus: 'all' | PaymentStatus;
  fundsStatus: 'all' | FundsStatus;
  periodPreset: 'all' | ReportingPeriodPreset;
  customFrom: string;
  customTo: string;
  sortBy: TransactionSortOption;
}
