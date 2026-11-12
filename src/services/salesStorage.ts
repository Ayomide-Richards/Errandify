import { OrderStorage } from './orderStorage';
import { formatNaira } from './productStorage';
import type { Order } from '../types/order';
import type {
  DateRangeWindow,
  FinancialOverviewMetrics,
  MerchantFeeConfig,
  MerchantSettlementSchedule,
  PeriodComparisonInsight,
  ProductSalesPerformanceItem,
  ReportingPeriodPreset,
  SalesChartBucket,
  SalesTransaction,
  SettlementRecord,
  SettlementStatus,
  TransactionStatus,
} from '../types/sales';

export const MERCHANT_TIMEZONE = 'Africa/Lagos';
export const MERCHANT_TIMEZONE_LABEL = 'WAT (UTC+01:00)';

const FEE_CONFIG_STORAGE_KEY = 'errandify_merchant_fee_config_v1';
const SETTLEMENT_SCHEDULE_STORAGE_KEY = 'errandify_merchant_settlement_schedule_v1';
const SETTLEMENTS_STORAGE_KEY = 'errandify_merchant_settlements_v1';
const TX_META_STORAGE_KEY = 'errandify_merchant_tx_meta_v1';

export interface TransactionMetadataOverride {
  status?: TransactionStatus;
  refundedAmount?: number;
  merchantFeeAmount?: number;
  merchantFeeLabel?: string;
  settlementId?: string;
  settlementStatus?: SettlementStatus | 'unsettled';
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  successful: 'Successful',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
};

export const REPORTING_PERIOD_LABELS: Record<ReportingPeriodPreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year',
  custom: 'Custom Date Range',
};

/**
 * Default merchant commission/fee config.
 * Because the project does not define a universal commission percentage or fee rule,
 * `isConfigured` defaults to `false` so no fabricated deductions are shown.
 */
const DEFAULT_FEE_CONFIG: MerchantFeeConfig = {
  isConfigured: false,
  commissionPercentage: null,
  fixedFeePerTransaction: null,
  feeCapAmount: null,
  description:
    'No merchant commission or platform deduction rule is currently configured for this store.',
};

/**
 * Default merchant settlement schedule.
 * No payout schedule is fabricated when none is configured on the backend.
 */
const DEFAULT_SETTLEMENT_SCHEDULE: MerchantSettlementSchedule = {
  isConfigured: false,
};

/**
 * Extracts calendar parts (year, month 1-12, day 1-31, hour 0-23) in the merchant's timezone (Africa/Lagos).
 */
export function getMerchantTzParts(dateInput: Date | string | number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
} {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      year: 2026,
      month: 11,
      day: 10,
      hour: 12,
      dateKey: '2026-11-10',
      monthKey: '2026-11',
    };
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MERCHANT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year')?.value || 2026);
  const month = Number(parts.find((p) => p.type === 'month')?.value || 11);
  const day = Number(parts.find((p) => p.type === 'day')?.value || 10);
  const rawHour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const hour = rawHour === 24 ? 0 : rawHour;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return {
    year,
    month,
    day,
    hour,
    dateKey: `${year}-${mm}-${dd}`,
    monthKey: `${year}-${mm}`,
  };
}

/**
 * Constructs a Date object representing a specific wall-clock time in Africa/Lagos (+01:00).
 */
export function createMerchantTzDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  const ss = String(second).padStart(2, '0');
  const mmm = String(ms).padStart(3, '0');
  return new Date(`${year}-${mm}-${dd}T${hh}:${min}:${ss}.${mmm}+01:00`);
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: MERCHANT_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDayLabel(date: Date, short = true): string {
  return date.toLocaleDateString('en-US', {
    timeZone: MERCHANT_TIMEZONE,
    month: 'short',
    day: 'numeric',
    ...(short ? {} : { weekday: 'short', year: 'numeric' }),
  });
}

/**
 * Determines the reference timestamp anchored to the store's latest recorded order/transaction
 * (defaulting to Nov 10, 2026 in WAT if no orders exist).
 */
export function getReferenceDate(transactions?: SalesTransaction[]): Date {
  const fallback = new Date('2026-11-10T18:00:00.000+01:00');
  const list = transactions ?? SalesStorage.getTransactions();
  if (list.length === 0) return fallback;

  const validTimes = list
    .map((tx) => new Date(tx.createdAt).getTime())
    .filter((t) => !isNaN(t));

  if (validTimes.length === 0) return fallback;
  return new Date(Math.max(...validTimes));
}

/**
 * Resolves a reporting period preset (or custom range) into exact start/end Date bounds in Africa/Lagos timezone.
 */
export function resolveReportingPeriodWindow(
  preset: ReportingPeriodPreset,
  customFrom?: string,
  customTo?: string,
  referenceDate?: Date
): DateRangeWindow {
  const ref = referenceDate || getReferenceDate();
  const { year, month, day } = getMerchantTzParts(ref);

  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case 'today': {
      startDate = createMerchantTzDate(year, month, day, 0, 0, 0, 0);
      endDate = createMerchantTzDate(year, month, day, 23, 59, 59, 999);
      break;
    }
    case 'yesterday': {
      const todayStart = createMerchantTzDate(year, month, day, 0, 0, 0, 0);
      const yest = new Date(todayStart.getTime() - 12 * 60 * 60 * 1000);
      const yp = getMerchantTzParts(yest);
      startDate = createMerchantTzDate(yp.year, yp.month, yp.day, 0, 0, 0, 0);
      endDate = createMerchantTzDate(yp.year, yp.month, yp.day, 23, 59, 59, 999);
      break;
    }
    case 'last_7_days': {
      endDate = createMerchantTzDate(year, month, day, 23, 59, 59, 999);
      const todayStart = createMerchantTzDate(year, month, day, 0, 0, 0, 0);
      const sixDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
      const sp = getMerchantTzParts(sixDaysAgo);
      startDate = createMerchantTzDate(sp.year, sp.month, sp.day, 0, 0, 0, 0);
      break;
    }
    case 'last_30_days': {
      endDate = createMerchantTzDate(year, month, day, 23, 59, 59, 999);
      const todayStart = createMerchantTzDate(year, month, day, 0, 0, 0, 0);
      const twentyNineDaysAgo = new Date(
        todayStart.getTime() - 29 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      );
      const sp = getMerchantTzParts(twentyNineDaysAgo);
      startDate = createMerchantTzDate(sp.year, sp.month, sp.day, 0, 0, 0, 0);
      break;
    }
    case 'this_month': {
      startDate = createMerchantTzDate(year, month, 1, 0, 0, 0, 0);
      const nextMonthYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      const firstOfNextMonth = createMerchantTzDate(nextMonthYear, nextMonth, 1, 0, 0, 0, 0);
      endDate = new Date(firstOfNextMonth.getTime() - 1);
      break;
    }
    case 'last_month': {
      const prevMonthYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      startDate = createMerchantTzDate(prevMonthYear, prevMonth, 1, 0, 0, 0, 0);
      const firstOfThisMonth = createMerchantTzDate(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(firstOfThisMonth.getTime() - 1);
      break;
    }
    case 'this_year': {
      startDate = createMerchantTzDate(year, 1, 1, 0, 0, 0, 0);
      endDate = createMerchantTzDate(year, 12, 31, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (customFrom) {
        const [fy, fm, fd] = customFrom.split('-').map(Number);
        startDate = createMerchantTzDate(fy, fm, fd, 0, 0, 0, 0);
      } else {
        startDate = createMerchantTzDate(year, month, 1, 0, 0, 0, 0);
      }
      if (customTo) {
        const [ty, tm, td] = customTo.split('-').map(Number);
        endDate = createMerchantTzDate(ty, tm, td, 23, 59, 59, 999);
      } else {
        endDate = createMerchantTzDate(year, month, day, 23, 59, 59, 999);
      }
      if (endDate.getTime() < startDate.getTime()) {
        const temp = startDate;
        startDate = createMerchantTzDate(
          getMerchantTzParts(endDate).year,
          getMerchantTzParts(endDate).month,
          getMerchantTzParts(endDate).day,
          0,
          0,
          0,
          0
        );
        endDate = createMerchantTzDate(
          getMerchantTzParts(temp).year,
          getMerchantTzParts(temp).month,
          getMerchantTzParts(temp).day,
          23,
          59,
          59,
          999
        );
      }
      break;
    }
  }

  const startLabel = formatShortDate(startDate);
  const endLabel = formatShortDate(endDate);
  const formattedRange =
    startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;

  return {
    preset,
    startDate,
    endDate,
    label: REPORTING_PERIOD_LABELS[preset],
    formattedRange,
    timezoneLabel: MERCHANT_TIMEZONE_LABEL,
  };
}

/**
 * Calculates applicable merchant fee for a given post-discount order amount based on actual MerchantFeeConfig.
 * Returns 0 when no fee config is active.
 */
export function calculateMerchantFee(
  postDiscountAmount: number,
  feeConfig: MerchantFeeConfig
): { amount: number; label?: string } {
  if (!feeConfig.isConfigured || postDiscountAmount <= 0) {
    return { amount: 0, label: undefined };
  }

  let fee = 0;
  const parts: string[] = [];

  if (
    typeof feeConfig.commissionPercentage === 'number' &&
    feeConfig.commissionPercentage > 0
  ) {
    fee += Math.round((postDiscountAmount * feeConfig.commissionPercentage) / 100);
    parts.push(`${feeConfig.commissionPercentage}% commission`);
  }

  if (
    typeof feeConfig.fixedFeePerTransaction === 'number' &&
    feeConfig.fixedFeePerTransaction > 0
  ) {
    fee += feeConfig.fixedFeePerTransaction;
    parts.push(`${formatNaira(feeConfig.fixedFeePerTransaction)} flat fee`);
  }

  if (
    typeof feeConfig.feeCapAmount === 'number' &&
    feeConfig.feeCapAmount > 0 &&
    fee > feeConfig.feeCapAmount
  ) {
    fee = feeConfig.feeCapAmount;
    parts.push(`capped at ${formatNaira(feeConfig.feeCapAmount)}`);
  }

  return {
    amount: Math.min(postDiscountAmount, Math.max(0, fee)),
    label: parts.length > 0 ? parts.join(' + ') : undefined,
  };
}

/**
 * Converts an Order record into a canonical SalesTransaction using actual prices, discounts,
 * backend payment confirmation status, and fee/settlement records.
 */
export function mapOrderToTransaction(
  order: Order,
  feeConfig: MerchantFeeConfig,
  metaMap: Record<string, TransactionMetadataOverride>,
  settlements: SettlementRecord[]
): SalesTransaction {
  const txId = `tx-${order.id}`;
  const override = metaMap[order.id] || metaMap[txId] || {};

  // Calculate gross product value from actual order items
  const grossAmount =
    order.items && order.items.length > 0
      ? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      : order.subtotal || 0;

  // Calculate product-level discounts from actual order items
  const productDiscountAmount =
    order.items && order.items.length > 0
      ? order.items.reduce((sum, item) => {
          if (
            typeof item.discountPrice === 'number' &&
            item.discountPrice > 0 &&
            item.discountPrice < item.price
          ) {
            return sum + (item.price - item.discountPrice) * item.quantity;
          }
          return sum;
        }, 0)
      : order.productDiscountTotal || 0;

  const promotionDiscountAmount = order.promotionDiscountAmount || 0;
  const totalDiscounts = Math.min(
    grossAmount,
    productDiscountAmount + promotionDiscountAmount
  );
  const postDiscountOrderValue = Math.max(0, grossAmount - totalDiscounts);

  // Determine transaction status from actual backend payment confirmation & recorded overrides
  const hasBackendConfirmationEvent =
    order.paymentConfirmed === true &&
    (!order.activityLog ||
      order.activityLog.length === 0 ||
      order.activityLog.some((e) =>
        e.description?.toLowerCase().includes('payment confirmed')
      ) ||
      order.paymentConfirmed === true);

  const status: TransactionStatus =
    override.status ?? (hasBackendConfirmationEvent ? 'successful' : 'pending');

  // Determine applicable merchant fees (0 when unconfigured)
  const computedFee = calculateMerchantFee(postDiscountOrderValue, feeConfig);
  const merchantFeeAmount =
    typeof override.merchantFeeAmount === 'number'
      ? override.merchantFeeAmount
      : status === 'failed' || status === 'pending' || status === 'refunded'
      ? 0
      : computedFee.amount;

  const merchantFeeLabel = override.merchantFeeLabel ?? computedFee.label;

  // Handle full or partial refunds accurately
  const refundedAmount =
    status === 'refunded'
      ? postDiscountOrderValue
      : status === 'partially_refunded'
      ? Math.min(
          postDiscountOrderValue,
          Math.max(0, override.refundedAmount || 0)
        )
      : 0;

  // Net transaction amount
  const netAmount =
    status === 'refunded' || status === 'failed'
      ? 0
      : Math.max(
          0,
          postDiscountOrderValue - merchantFeeAmount - refundedAmount
        );

  // Match against actual settlement records to prevent double-counting
  const linkedSettlement = settlements.find(
    (s) =>
      s.transactionIds.includes(txId) || s.transactionIds.includes(order.id)
  );

  const settlementId = override.settlementId ?? linkedSettlement?.id;
  const settlementStatus: SettlementStatus | 'unsettled' =
    override.settlementStatus ??
    (linkedSettlement ? linkedSettlement.status : 'unsettled');

  return {
    id: txId,
    sourceOrderId: order.id,
    customerName: order.customerName,
    itemSummary: order.itemSummary,
    items: order.items,
    dateTime: order.dateTime,
    createdAt: order.createdAt,
    status,
    grossAmount,
    productDiscountAmount,
    promotionDiscountAmount,
    promotionName: order.promotionName,
    totalDiscounts,
    merchantFeeAmount,
    merchantFeeLabel,
    refundedAmount,
    netAmount,
    settlementId,
    settlementStatus,
  };
}

/**
 * Filters transactions that fall within a DateRangeWindow.
 */
export function filterTransactionsByWindow(
  transactions: SalesTransaction[],
  window: DateRangeWindow
): SalesTransaction[] {
  const startMs = window.startDate.getTime();
  const endMs = window.endDate.getTime();
  return transactions.filter((tx) => {
    const t = new Date(tx.createdAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });
}

/**
 * Filters settlement records that fall within a DateRangeWindow.
 */
export function filterSettlementsByWindow(
  settlements: SettlementRecord[],
  window: DateRangeWindow
): SettlementRecord[] {
  const startMs = window.startDate.getTime();
  const endMs = window.endDate.getTime();
  return settlements.filter((s) => {
    const t = new Date(s.createdAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });
}

/**
 * Single source of truth financial calculation engine used across
 * Overview, Transactions, Settlements, and Reports.
 *
 * Rules enforced:
 * - Only 'successful' and 'partially_refunded' transactions count toward Gross Sales, Discounts, Fees, and Net Earnings.
 * - 'pending', 'failed', and fully 'refunded' transactions are never counted as successful sales.
 * - For 'partially_refunded' transactions, the actual `refundedAmount` is deducted from Net Earnings.
 * - Delivery fees and customer service fees are never included or deducted.
 * - Pending or processing settlements are never counted as Total Settled.
 * - Settlement totals never double-count transactions across settlement periods.
 */
export function calculateFinancialMetrics(
  periodTransactions: SalesTransaction[],
  periodSettlements: SettlementRecord[],
  feeConfig: MerchantFeeConfig
): FinancialOverviewMetrics {
  const qualifyingTransactions = periodTransactions.filter(
    (tx) => tx.status === 'successful' || tx.status === 'partially_refunded'
  );

  let grossSales = 0;
  let productDiscounts = 0;
  let promotionDiscounts = 0;
  let totalDiscounts = 0;
  let feesAndCommissions = 0;
  let refundedTotal = 0;
  let netEarnings = 0;

  // Track which qualifying transactions are already covered by a PAID settlement
  const paidSettlementIds = new Set(
    periodSettlements.filter((s) => s.status === 'paid').map((s) => s.id)
  );
  const settledTxIds = new Set<string>();
  for (const s of periodSettlements) {
    if (s.status === 'paid') {
      s.transactionIds.forEach((id) => settledTxIds.add(id));
    }
  }

  let settledFromTransactions = 0;
  let pendingFromTransactions = 0;

  for (const tx of qualifyingTransactions) {
    grossSales += tx.grossAmount;
    productDiscounts += tx.productDiscountAmount;
    promotionDiscounts += tx.promotionDiscountAmount;
    totalDiscounts += tx.totalDiscounts;
    feesAndCommissions += tx.merchantFeeAmount;
    refundedTotal += tx.refundedAmount;
    netEarnings += tx.netAmount;

    const isPaidSettled =
      tx.settlementStatus === 'paid' ||
      (tx.settlementId && paidSettlementIds.has(tx.settlementId)) ||
      settledTxIds.has(tx.id) ||
      settledTxIds.has(tx.sourceOrderId);

    if (isPaidSettled) {
      settledFromTransactions += tx.netAmount;
    } else {
      pendingFromTransactions += tx.netAmount;
    }
  }

  // Also check if there are standalone paid settlements in the period whose transactions weren't in periodTransactions
  const standalonePaidSettlements = periodSettlements.filter(
    (s) =>
      s.status === 'paid' &&
      !qualifyingTransactions.some(
        (tx) =>
          tx.settlementId === s.id ||
          s.transactionIds.includes(tx.id) ||
          s.transactionIds.includes(tx.sourceOrderId)
      )
  );

  const additionalSettled = standalonePaidSettlements.reduce(
    (sum, s) => sum + s.netSettlementAmount,
    0
  );

  const totalSettled = settledFromTransactions + additionalSettled;
  const pendingSettlement = pendingFromTransactions;
  const qualifyingOrderCount = qualifyingTransactions.length;
  const averageOrderValue =
    qualifyingOrderCount > 0
      ? Math.round(netEarnings / qualifyingOrderCount)
      : 0;

  return {
    grossSales,
    productDiscounts,
    promotionDiscounts,
    totalDiscounts,
    feesAndCommissions,
    isFeeConfigAvailable:
      feeConfig.isConfigured || feesAndCommissions > 0,
    refundedTotal,
    netEarnings,
    pendingSettlement,
    totalSettled,
    qualifyingOrderCount,
    averageOrderValue,
  };
}

/**
 * Generates time-bucketed chart data for the selected reporting period in Africa/Lagos timezone.
 * - Today / Yesterday (or custom <= 2 days): 3-hour time intervals across the day
 * - Last 7 Days / Last 30 Days / This Month / Last Month (or custom <= 45 days): Daily intervals
 * - This Year (or custom > 45 days): Monthly intervals
 */
export function buildSalesChartBuckets(
  periodTransactions: SalesTransaction[],
  window: DateRangeWindow
): SalesChartBucket[] {
  const qualifying = periodTransactions.filter(
    (tx) => tx.status === 'successful' || tx.status === 'partially_refunded'
  );

  const spanDays = Math.max(
    1,
    Math.round(
      (window.endDate.getTime() - window.startDate.getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );

  // 1. Hourly buckets for single-day periods (Today / Yesterday)
  if (
    window.preset === 'today' ||
    window.preset === 'yesterday' ||
    spanDays <= 1
  ) {
    const blocks = [
      { startHour: 0, endHour: 2, label: '12am', full: '12:00 AM – 02:59 AM' },
      { startHour: 3, endHour: 5, label: '3am', full: '03:00 AM – 05:59 AM' },
      { startHour: 6, endHour: 8, label: '6am', full: '06:00 AM – 08:59 AM' },
      { startHour: 9, endHour: 11, label: '9am', full: '09:00 AM – 11:59 AM' },
      { startHour: 12, endHour: 14, label: '12pm', full: '12:00 PM – 02:59 PM' },
      { startHour: 15, endHour: 17, label: '3pm', full: '03:00 PM – 05:59 PM' },
      { startHour: 18, endHour: 20, label: '6pm', full: '06:00 PM – 08:59 PM' },
      { startHour: 21, endHour: 23, label: '9pm', full: '09:00 PM – 11:59 PM' },
    ];

    const dateFormatted = formatShortDate(window.startDate);

    return blocks.map((b) => {
      const matching = qualifying.filter((tx) => {
        const parts = getMerchantTzParts(tx.createdAt);
        return parts.hour >= b.startHour && parts.hour <= b.endHour;
      });

      return {
        key: `hr-${b.startHour}`,
        label: b.label,
        fullLabel: `${dateFormatted}, ${b.full}`,
        grossSales: matching.reduce((s, t) => s + t.grossAmount, 0),
        discounts: matching.reduce((s, t) => s + t.totalDiscounts, 0),
        fees: matching.reduce((s, t) => s + t.merchantFeeAmount, 0),
        netSales: matching.reduce((s, t) => s + t.netAmount, 0),
        orderCount: matching.length,
      };
    });
  }

  // 2. Monthly buckets for This Year or > 45 days custom ranges
  if (window.preset === 'this_year' || spanDays > 45) {
    const startParts = getMerchantTzParts(window.startDate);
    const endParts = getMerchantTzParts(window.endDate);
    const buckets: SalesChartBucket[] = [];

    let curY = startParts.year;
    let curM = startParts.month;

    while (
      curY < endParts.year ||
      (curY === endParts.year && curM <= endParts.month)
    ) {
      const monthDate = createMerchantTzDate(curY, curM, 1, 12, 0, 0);
      const shortMonth = monthDate.toLocaleDateString('en-US', {
        timeZone: MERCHANT_TIMEZONE,
        month: 'short',
      });
      const fullMonth = monthDate.toLocaleDateString('en-US', {
        timeZone: MERCHANT_TIMEZONE,
        month: 'long',
        year: 'numeric',
      });
      const monthKey = `${curY}-${String(curM).padStart(2, '0')}`;

      const matching = qualifying.filter(
        (tx) => getMerchantTzParts(tx.createdAt).monthKey === monthKey
      );

      buckets.push({
        key: monthKey,
        label: shortMonth,
        fullLabel: fullMonth,
        grossSales: matching.reduce((s, t) => s + t.grossAmount, 0),
        discounts: matching.reduce((s, t) => s + t.totalDiscounts, 0),
        fees: matching.reduce((s, t) => s + t.merchantFeeAmount, 0),
        netSales: matching.reduce((s, t) => s + t.netAmount, 0),
        orderCount: matching.length,
      });

      if (curM === 12) {
        curY += 1;
        curM = 1;
      } else {
        curM += 1;
      }
    }

    return buckets;
  }

  // 3. Daily buckets for Last 7 Days, Last 30 Days, This Month, Last Month, or <= 45-day custom ranges
  const buckets: SalesChartBucket[] = [];
  const startParts = getMerchantTzParts(window.startDate);
  let cursor = createMerchantTzDate(
    startParts.year,
    startParts.month,
    startParts.day,
    12,
    0,
    0
  );
  const endMs = window.endDate.getTime();

  while (cursor.getTime() <= endMs) {
    const parts = getMerchantTzParts(cursor);
    const matching = qualifying.filter(
      (tx) => getMerchantTzParts(tx.createdAt).dateKey === parts.dateKey
    );

    buckets.push({
      key: parts.dateKey,
      label: formatDayLabel(cursor, true),
      fullLabel: formatDayLabel(cursor, false),
      grossSales: matching.reduce((s, t) => s + t.grossAmount, 0),
      discounts: matching.reduce((s, t) => s + t.totalDiscounts, 0),
      fees: matching.reduce((s, t) => s + t.merchantFeeAmount, 0),
      netSales: matching.reduce((s, t) => s + t.netAmount, 0),
      orderCount: matching.length,
    });

    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return buckets;
}

/**
 * Aggregates product-level sales performance across qualifying transactions.
 * Reconciles product-level gross sales, product discounts, allocated promotion discounts, and net sales value.
 */
export function calculateProductPerformance(
  periodTransactions: SalesTransaction[]
): ProductSalesPerformanceItem[] {
  const qualifying = periodTransactions.filter(
    (tx) => tx.status === 'successful' || tx.status === 'partially_refunded'
  );

  const map = new Map<
    string,
    {
      productKey: string;
      productId?: string;
      productName: string;
      unit?: string;
      image?: string;
      orderIds: Set<string>;
      quantitySold: number;
      grossSalesValue: number;
      productDiscountsApplied: number;
      promotionDiscountsAllocated: number;
    }
  >();

  for (const tx of qualifying) {
    const txPostProductDiscountTotal = tx.items.reduce((sum, item) => {
      const effectiveUnit =
        typeof item.discountPrice === 'number' &&
        item.discountPrice > 0 &&
        item.discountPrice < item.price
          ? item.discountPrice
          : item.price;
      return sum + effectiveUnit * item.quantity;
    }, 0);

    for (const item of tx.items) {
      const key = item.productId || item.name.toLowerCase();
      const lineGross = item.price * item.quantity;
      const hasDiscount =
        typeof item.discountPrice === 'number' &&
        item.discountPrice > 0 &&
        item.discountPrice < item.price;
      const lineProductDiscount = hasDiscount
        ? (item.price - item.discountPrice!) * item.quantity
        : 0;
      const lineAfterProdDiscount = lineGross - lineProductDiscount;

      // Proportionally allocate order-level promotion discount to items in the order
      const linePromoDiscount =
        tx.promotionDiscountAmount > 0 && txPostProductDiscountTotal > 0
          ? Math.round(
              (tx.promotionDiscountAmount * lineAfterProdDiscount) /
                txPostProductDiscountTotal
            )
          : 0;

      const existing = map.get(key);
      if (existing) {
        existing.orderIds.add(tx.id);
        existing.quantitySold += item.quantity;
        existing.grossSalesValue += lineGross;
        existing.productDiscountsApplied += lineProductDiscount;
        existing.promotionDiscountsAllocated += linePromoDiscount;
      } else {
        map.set(key, {
          productKey: key,
          productId: item.productId,
          productName: item.name,
          unit: item.unit,
          image: item.image,
          orderIds: new Set([tx.id]),
          quantitySold: item.quantity,
          grossSalesValue: lineGross,
          productDiscountsApplied: lineProductDiscount,
          promotionDiscountsAllocated: linePromoDiscount,
        });
      }
    }
  }

  return Array.from(map.values())
    .map((entry) => {
      const totalDiscounts =
        entry.productDiscountsApplied + entry.promotionDiscountsAllocated;
      return {
        productKey: entry.productKey,
        productId: entry.productId,
        productName: entry.productName,
        unit: entry.unit,
        image: entry.image,
        ordersCount: entry.orderIds.size,
        quantitySold: entry.quantitySold,
        grossSalesValue: entry.grossSalesValue,
        productDiscountsApplied: entry.productDiscountsApplied,
        promotionDiscountsAllocated: entry.promotionDiscountsAllocated,
        totalDiscounts,
        netSalesValue: Math.max(0, entry.grossSalesValue - totalDiscounts),
      };
    })
    .sort((a, b) => b.netSalesValue - a.netSalesValue);
}

/**
 * Computes sales trend comparison against the immediately preceding equivalent period.
 * Strictly checks whether actual historical transaction records exist in the prior equivalent period.
 * Never fabricates percentage growth or trends when historical data is absent.
 */
export function calculatePeriodComparison(
  allTransactions: SalesTransaction[],
  currentWindow: DateRangeWindow
): PeriodComparisonInsight {
  const durationMs =
    currentWindow.endDate.getTime() - currentWindow.startDate.getTime() + 1;
  const prevEnd = new Date(currentWindow.startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

  const prevWindow: DateRangeWindow = {
    preset: currentWindow.preset,
    startDate: prevStart,
    endDate: prevEnd,
    label: 'Previous Period',
    formattedRange: `${formatShortDate(prevStart)} – ${formatShortDate(prevEnd)}`,
    timezoneLabel: MERCHANT_TIMEZONE_LABEL,
  };

  const currentQualifying = filterTransactionsByWindow(
    allTransactions,
    currentWindow
  ).filter(
    (tx) => tx.status === 'successful' || tx.status === 'partially_refunded'
  );

  const previousQualifying = filterTransactionsByWindow(
    allTransactions,
    prevWindow
  ).filter(
    (tx) => tx.status === 'successful' || tx.status === 'partially_refunded'
  );

  const currentPeriodNetSales = currentQualifying.reduce(
    (s, t) => s + t.netAmount,
    0
  );
  const previousPeriodNetSales = previousQualifying.reduce(
    (s, t) => s + t.netAmount,
    0
  );

  if (previousQualifying.length === 0 || previousPeriodNetSales === 0) {
    return {
      hasSufficientHistoricalData: false,
      currentPeriodNetSales,
      previousPeriodNetSales: 0,
      currentPeriodOrders: currentQualifying.length,
      previousPeriodOrders: 0,
      percentageChange: null,
      previousPeriodLabel: prevWindow.formattedRange,
      reasonIfUnavailable: `No recorded transactions exist in the preceding equivalent period (${prevWindow.formattedRange}) to compute a verified percentage trend.`,
    };
  }

  const percentageChange = Number(
    (
      ((currentPeriodNetSales - previousPeriodNetSales) /
        previousPeriodNetSales) *
      100
    ).toFixed(1)
  );

  return {
    hasSufficientHistoricalData: true,
    currentPeriodNetSales,
    previousPeriodNetSales,
    currentPeriodOrders: currentQualifying.length,
    previousPeriodOrders: previousQualifying.length,
    percentageChange,
    previousPeriodLabel: prevWindow.formattedRange,
  };
}

/**
 * Escapes a value for safe CSV export.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates a UTF-8 CSV string from column headers and row arrays.
 */
export function buildCsvContent(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

export const SalesStorage = {
  getFeeConfig(): MerchantFeeConfig {
    try {
      const stored = localStorage.getItem(FEE_CONFIG_STORAGE_KEY);
      if (!stored) return DEFAULT_FEE_CONFIG;
      return JSON.parse(stored);
    } catch {
      return DEFAULT_FEE_CONFIG;
    }
  },

  saveFeeConfig(config: MerchantFeeConfig): void {
    try {
      localStorage.setItem(FEE_CONFIG_STORAGE_KEY, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('errandify:sales-updated'));
    } catch (e) {
      console.error('Failed to save fee config', e);
    }
  },

  getSettlementSchedule(): MerchantSettlementSchedule {
    try {
      const stored = localStorage.getItem(SETTLEMENT_SCHEDULE_STORAGE_KEY);
      if (!stored) return DEFAULT_SETTLEMENT_SCHEDULE;
      return JSON.parse(stored);
    } catch {
      return DEFAULT_SETTLEMENT_SCHEDULE;
    }
  },

  saveSettlementSchedule(schedule: MerchantSettlementSchedule): void {
    try {
      localStorage.setItem(
        SETTLEMENT_SCHEDULE_STORAGE_KEY,
        JSON.stringify(schedule)
      );
      window.dispatchEvent(new CustomEvent('errandify:sales-updated'));
    } catch (e) {
      console.error('Failed to save settlement schedule', e);
    }
  },

  getSettlements(): SettlementRecord[] {
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      if (!stored) return [];
      const parsed: SettlementRecord[] = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveSettlements(settlements: SettlementRecord[]): void {
    try {
      localStorage.setItem(
        SETTLEMENTS_STORAGE_KEY,
        JSON.stringify(settlements)
      );
      window.dispatchEvent(new CustomEvent('errandify:sales-updated'));
    } catch (e) {
      console.error('Failed to save settlements', e);
    }
  },

  getTransactionMetadataMap(): Record<string, TransactionMetadataOverride> {
    try {
      const stored = localStorage.getItem(TX_META_STORAGE_KEY);
      if (!stored) return {};
      return JSON.parse(stored);
    } catch {
      return {};
    }
  },

  saveTransactionMetadataMap(
    map: Record<string, TransactionMetadataOverride>
  ): void {
    try {
      localStorage.setItem(TX_META_STORAGE_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent('errandify:sales-updated'));
    } catch (e) {
      console.error('Failed to save transaction metadata', e);
    }
  },

  /**
   * Returns all merchant transactions derived directly from actual store orders,
   * fee configuration, and settlement records.
   */
  getTransactions(): SalesTransaction[] {
    const orders = OrderStorage.getOrders();
    const feeConfig = this.getFeeConfig();
    const metaMap = this.getTransactionMetadataMap();
    const settlements = this.getSettlements();

    return orders
      .map((order) =>
        mapOrderToTransaction(order, feeConfig, metaMap, settlements)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },
};

