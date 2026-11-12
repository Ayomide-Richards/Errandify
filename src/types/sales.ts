import type { OrderItem } from './order';

export type SalesSubTab = 'overview' | 'transactions' | 'settlements' | 'reports';

export type ReportingPeriodPreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export type TransactionStatus =
  | 'successful'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type SettlementStatus = 'pending' | 'processing' | 'paid' | 'failed';

export type ReportCategory =
  | 'sales_report'
  | 'transaction_report'
  | 'earnings_report'
  | 'product_performance_report';

export interface DateRangeWindow {
  preset: ReportingPeriodPreset;
  startDate: Date;
  endDate: Date;
  label: string;
  formattedRange: string;
  timezoneLabel: string;
}

/**
 * Represents the merchant's configured commission and fee structure.
 * If no commission or fee arrangement is configured in the project/backend,
 * `isConfigured` is false and no fabricated deductions are applied.
 */
export interface MerchantFeeConfig {
  isConfigured: boolean;
  commissionPercentage: number | null;
  fixedFeePerTransaction: number | null;
  feeCapAmount?: number | null;
  description: string;
}

/**
 * Represents the merchant's scheduled payout configuration.
 * Only populated when an actual settlement schedule is configured.
 */
export interface MerchantSettlementSchedule {
  isConfigured: boolean;
  frequencyLabel?: string;
  nextScheduledDateIso?: string;
  nextScheduledFormatted?: string;
}

/**
 * Financial transaction record derived from actual merchant orders and payment confirmations.
 * Does not expose order numbers/references or sensitive customer contact details in merchant tables.
 */
export interface SalesTransaction {
  id: string;
  sourceOrderId: string;
  customerName: string;
  itemSummary: string;
  items: OrderItem[];
  dateTime: string;
  createdAt: string; // ISO 8601 timestamp
  status: TransactionStatus;
  grossAmount: number; // Product subtotal before discounts
  productDiscountAmount: number;
  promotionDiscountAmount: number;
  promotionName?: string;
  totalDiscounts: number; // productDiscountAmount + promotionDiscountAmount
  merchantFeeAmount: number; // Applicable merchant-side fee/commission (0 when unconfigured)
  merchantFeeLabel?: string;
  refundedAmount: number; // Actual refunded amount for refunded or partially_refunded transactions
  netAmount: number; // Effective net earnings from this transaction
  settlementId?: string;
  settlementStatus?: SettlementStatus | 'unsettled';
}

export interface SettlementActivityItem {
  id: string;
  status: SettlementStatus;
  title: string;
  description?: string;
  timestamp: string;
  formattedTime: string;
}

export interface SettlementRecord {
  id: string;
  settlementDate: string; // Human-readable date
  createdAt: string; // ISO 8601 timestamp
  periodStartIso: string;
  periodEndIso: string;
  settlementPeriodLabel: string;
  grossAmount: number;
  totalDiscounts: number;
  merchantFees: number;
  totalDeductions: number; // totalDiscounts + merchantFees
  netSettlementAmount: number;
  status: SettlementStatus;
  transactionIds: string[];
  payoutReference?: string;
  payoutMethodLabel?: string;
  failureReason?: string;
  activityLog: SettlementActivityItem[];
}

export interface FinancialOverviewMetrics {
  grossSales: number;
  productDiscounts: number;
  promotionDiscounts: number;
  totalDiscounts: number;
  feesAndCommissions: number;
  isFeeConfigAvailable: boolean;
  refundedTotal: number;
  netEarnings: number;
  pendingSettlement: number;
  totalSettled: number;
  qualifyingOrderCount: number;
  averageOrderValue: number;
}

export interface SalesChartBucket {
  key: string;
  label: string;
  fullLabel: string;
  grossSales: number;
  discounts: number;
  fees: number;
  netSales: number;
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
  grossSalesValue: number;
  productDiscountsApplied: number;
  promotionDiscountsAllocated: number;
  totalDiscounts: number;
  netSalesValue: number;
}

export interface PeriodComparisonInsight {
  hasSufficientHistoricalData: boolean;
  currentPeriodNetSales: number;
  previousPeriodNetSales: number;
  currentPeriodOrders: number;
  previousPeriodOrders: number;
  percentageChange: number | null;
  previousPeriodLabel: string;
  reasonIfUnavailable?: string;
}

export type TransactionSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'net_desc'
  | 'net_asc'
  | 'gross_desc'
  | 'gross_asc';

export interface TransactionFiltersState {
  search: string;
  status: 'all' | TransactionStatus;
  periodPreset: 'all' | ReportingPeriodPreset;
  customFrom: string;
  customTo: string;
  minAmount: string;
  maxAmount: string;
  sortBy: TransactionSortOption;
}

