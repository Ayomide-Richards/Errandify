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
 * Represents an automatic merchant settlement combining eligible funds from multiple delivered orders.
 */
export interface SettlementRecord {
  id: string;
  settlementDate: string; // Human-readable date
  createdAt: string; // ISO 8601 timestamp
  processingDate?: string;
  paidDate?: string;
  settlementAmount: number;
  status: SettlementStatus;
  transactionIds: string[];
  orders: SettlementIncludedOrder[];
  bankName?: string;
  maskedAccountNumber?: string;
  accountName?: string;
  transactionReference?: string;
  failureReason?: string;
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
  processing: number;
  processingSettlementCount: number;
  processingOrderCount: number;
  readyForSettlement: number;
  readyForSettlementCount: number;
  successfullyPaid: number;
  paidSettlementCount: number;
  paidOrderCount: number;
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
