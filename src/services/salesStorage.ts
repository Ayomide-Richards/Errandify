import { OrderStorage } from './orderStorage';
import { SettingsStorage } from './settingsStorage';
import type { Order } from '../types/order';
import type {
  DateRangeWindow,
  EarningsBalanceSummary,
  FundsStatus,
  OverviewSummaryMetrics,
  PaymentStatus,
  ProductSalesPerformanceItem,
  ReportingPeriodPreset,
  SalesChartBucket,
  SalesEarningsPromotionRecord,
  SalesFinancialLedgerEntry,
  SalesTransaction,
  SettlementIncludedOrder,
  SettlementRecord,
  SettlementStatus,
  SettlementSummaryMetrics,
} from '../types/sales';

export const MERCHANT_TIMEZONE = 'Africa/Lagos';
export const MERCHANT_TIMEZONE_LABEL = 'WAT (UTC+01:00)';

export const WITHDRAWAL_PROCESSING_HOURS = 72;
export const WITHDRAWAL_PROCESSING_MS =
  WITHDRAWAL_PROCESSING_HOURS * 60 * 60 * 1000;

const SETTLEMENTS_STORAGE_KEY = 'errandify_merchant_settlements_v3';
const TX_META_STORAGE_KEY = 'errandify_merchant_tx_meta_v3';
const PROMO_EARNINGS_STORAGE_KEY = 'errandify_merchant_promo_earnings_v1';
const SALES_LEDGER_STORAGE_KEY = 'errandify_merchant_sales_ledger_v1';

// In-memory mutex lock to prevent concurrent balance race conditions
let isSalesOperationLocked = false;
function acquireSalesLock(): void {
  if (isSalesOperationLocked) {
    throw new Error(
      'Another financial transaction is currently being processed. Please wait and try again.'
    );
  }
  isSalesOperationLocked = true;
}
function releaseSalesLock(): void {
  isSalesOperationLocked = false;
}

export interface TransactionMetadataOverride {
  paymentStatus?: PaymentStatus;
  refundedAmount?: number;
  deliveryConfirmed?: boolean;
  deliveryConfirmedAt?: string;
  settlementId?: string;
  settlementStatus?: SettlementStatus;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const FUNDS_STATUS_LABELS: Record<FundsStatus, string> = {
  in_escrow: 'In Escrow',
  awaiting_settlement: 'Awaiting Settlement',
  settled: 'Settled',
  refunded: 'Refunded',
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
};

export const REPORTING_PERIOD_LABELS: Record<ReportingPeriodPreset, string> = {
  today: 'Today',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom Range',
};

/**
 * Merchant bank account details collected during merchant onboarding.
 */
export const MERCHANT_ONBOARDED_BANK = {
  bankName: 'Guaranty Trust Bank (GTBank)',
  maskedAccountNumber: '****4821',
  accountName: 'XYZ Limited',
};

/**
 * Supplemental completed order records demonstrating the full payment, escrow,
 * runner delivery confirmation (customer code verification), refund, and combined-settlement lifecycle
 * without altering the active Orders management queue.
 */
const HISTORICAL_DELIVERED_ORDERS: Order[] = [
  {
    id: 'ord-1004',
    orderNumber: '#ER-1004',
    itemSummary: 'Ofada rice (50kg), Mama Gold Pure Vegetable Oil (5L)',
    customerName: 'Ngozi Eze',
    dateTime: 'Nov 08, 2026, 11:20 AM',
    createdAt: '2026-11-08T11:20:00.000Z',
    status: 'picked_up',
    statusLabel: 'Picked Up',
    subtotal: 63500,
    productDiscountTotal: 2000,
    promotionDiscountAmount: 0,
    totalAmount: 61500,
    runnerName: 'Sadiq Ibrahim (Runner #R-12)',
    runnerVehicle: 'Delivery Van · LND-883-XJ',
    handedOverAt: 'Nov 08, 2026, 12:05 PM',
    paymentConfirmed: true,
    stockDeducted: true,
    items: [
      {
        id: 'item-1004-1',
        productId: 'prod-001',
        name: 'Ofada rice (50kg)',
        unit: 'Bag',
        price: 45000,
        quantity: 1,
        image:
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'item-1004-2',
        productId: 'prod-006',
        name: 'Mama Gold Pure Vegetable Oil (5L)',
        unit: 'Litre (L)',
        price: 18500,
        discountPrice: 16500,
        quantity: 1,
        image:
          'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      },
    ],
    activityLog: [],
  },
  {
    id: 'ord-1002',
    orderNumber: '#ER-1002',
    itemSummary: 'Prestige Non-Stick Cookware Set (7 Pcs)',
    customerName: 'Damilola Ojo',
    dateTime: 'Nov 07, 2026, 01:40 PM',
    createdAt: '2026-11-07T13:40:00.000Z',
    status: 'picked_up',
    statusLabel: 'Picked Up',
    subtotal: 62000,
    productDiscountTotal: 0,
    promotionDiscountAmount: 3000,
    promotionName: '₦3,000 Off Large Orders (₦20,000+)',
    totalAmount: 59000,
    runnerName: 'Tunde Bakare (Runner #R-41)',
    runnerVehicle: 'Dispatch Box Bike · LAG-492-QA',
    handedOverAt: 'Nov 07, 2026, 02:20 PM',
    paymentConfirmed: true,
    stockDeducted: true,
    items: [
      {
        id: 'item-1002-1',
        productId: 'prod-009',
        name: 'Prestige Non-Stick Cookware Set (7 Pcs)',
        unit: 'Unit',
        price: 62000,
        quantity: 1,
        image:
          'https://images.unsplash.com/photo-1584990347449-39908cfad171?auto=format&fit=crop&w=600&q=80',
      },
    ],
    activityLog: [],
  },
  {
    id: 'ord-1001',
    orderNumber: '#ER-1001',
    itemSummary: 'Unisex Cotton Polo Shirt (Navy Blue / L)',
    customerName: 'Bisi Adeyemi',
    dateTime: 'Nov 06, 2026, 04:10 PM',
    createdAt: '2026-11-06T16:10:00.000Z',
    status: 'new_order',
    statusLabel: 'New Order',
    subtotal: 25000,
    productDiscountTotal: 0,
    promotionDiscountAmount: 0,
    totalAmount: 25000,
    paymentConfirmed: true,
    stockDeducted: false,
    items: [
      {
        id: 'item-1001-1',
        productId: 'prod-007',
        combinationId: 'cb-p3',
        name: 'Unisex Cotton Polo Shirt',
        selectedOptionsLabel: 'Colour: Navy Blue · Size: L',
        unit: 'Piece',
        price: 12500,
        quantity: 2,
        image:
          'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=600&q=80',
      },
    ],
    activityLog: [],
  },
  {
    id: 'ord-0995',
    orderNumber: '#ER-0995',
    itemSummary: 'Gino tomato paste, Palm oil (5kg)',
    customerName: 'Ibrahim Musa',
    dateTime: 'Nov 04, 2026, 12:30 PM',
    createdAt: '2026-11-04T12:30:00.000Z',
    status: 'picked_up',
    statusLabel: 'Picked Up',
    subtotal: 90000,
    productDiscountTotal: 0,
    promotionDiscountAmount: 9000,
    promotionName: 'Weekend Groceries 10% Off',
    totalAmount: 81000,
    runnerName: 'Emeka Nwosu (Runner #R-18)',
    runnerVehicle: 'Dispatch Box Bike · KJA-214-BA',
    handedOverAt: 'Nov 04, 2026, 01:15 PM',
    paymentConfirmed: true,
    stockDeducted: true,
    items: [
      {
        id: 'item-0995-1',
        productId: 'prod-002',
        name: 'Gino tomato paste',
        unit: 'Carton',
        price: 45000,
        quantity: 1,
        image:
          'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'item-0995-2',
        productId: 'prod-003',
        name: 'Palm oil (5kg)',
        unit: 'Kilogram (kg)',
        price: 45000,
        quantity: 1,
        image:
          'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      },
    ],
    activityLog: [],
  },
];

/**
 * Default delivery-confirmation and refund states:
 * - Note that `ord-1005` (Gbenga Adeleke) is 'Picked Up' in Orders, but delivery is NOT yet confirmed
 *   (runner has not yet entered customer's confirmation code), so its funds remain 'in_escrow'.
 * - `ord-1004` (₦61,500) has verified customer delivery confirmation code and is NOT yet withdrawn,
 *   so its ₦61,500 represents Eligible Available Earnings ready for merchant withdrawal or promotion payment.
 * - `ord-1002` (₦59,000) has verified customer delivery confirmation code and is currently in a
 *   72-hour pending withdrawal `set-2026-1109` ('processing').
 * - `ord-0998` and `ord-0995` have verified customer delivery confirmation codes and are included in
 *   completed payout `set-2026-1106` ('paid'), so their funds are 'settled'.
 * - `ord-1001` was refunded ('refunded').
 */
const DEFAULT_TX_METADATA: Record<string, TransactionMetadataOverride> = {
  'ord-1004': {
    paymentStatus: 'confirmed',
    deliveryConfirmed: true,
    deliveryConfirmedAt: 'Nov 08, 2026, 12:45 PM',
  },
  'ord-1002': {
    paymentStatus: 'confirmed',
    deliveryConfirmed: true,
    deliveryConfirmedAt: 'Nov 07, 2026, 03:10 PM',
    settlementId: 'set-2026-1109',
    settlementStatus: 'processing',
  },
  'ord-1001': {
    paymentStatus: 'refunded',
    refundedAmount: 25000,
    deliveryConfirmed: false,
  },
  'ord-0998': {
    paymentStatus: 'confirmed',
    deliveryConfirmed: true,
    deliveryConfirmedAt: 'Nov 05, 2026, 03:50 PM',
    settlementId: 'set-2026-1106',
    settlementStatus: 'paid',
  },
  'ord-0995': {
    paymentStatus: 'confirmed',
    deliveryConfirmed: true,
    deliveryConfirmedAt: 'Nov 04, 2026, 02:05 PM',
    settlementId: 'set-2026-1106',
    settlementStatus: 'paid',
  },
};

/**
 * Default withdrawals and combined settlements:
 * - `set-2026-1109`: Pending withdrawal in 72-hour processing period (`ord-1002` = ₦59,000),
 *   requested Nov 09, 2026, 09:00 AM -> expected payout Nov 12, 2026, 09:00 AM.
 * - `set-2026-1106`: Paid withdrawal/settlement combining 2 delivered orders (`ord-0998` + `ord-0995` = ₦116,000).
 */
const DEFAULT_SETTLEMENTS: SettlementRecord[] = [
  {
    id: 'set-2026-1109',
    recordType: 'merchant_withdrawal',
    settlementDate: 'Nov 09, 2026',
    createdAt: '2026-11-09T09:00:00.000Z',
    requestedAt: '2026-11-09T09:00:00.000Z',
    processingDate: 'Nov 09, 2026, 09:00 AM',
    expectedPayoutAt: '2026-11-12T09:00:00.000Z',
    expectedPayoutDate: 'Nov 12, 2026, 09:00 AM',
    processingHours: 72,
    paidDate: undefined,
    settlementAmount: 59000,
    status: 'processing',
    transactionIds: ['ord-1002'],
    orders: [],
    bankName: MERCHANT_ONBOARDED_BANK.bankName,
    maskedAccountNumber: MERCHANT_ONBOARDED_BANK.maskedAccountNumber,
    accountName: MERCHANT_ONBOARDED_BANK.accountName,
    transactionReference: undefined,
  },
  {
    id: 'set-2026-1106',
    recordType: 'combined_settlement',
    settlementDate: 'Nov 06, 2026',
    createdAt: '2026-11-06T14:18:00.000Z',
    requestedAt: '2026-11-03T14:18:00.000Z',
    processingDate: 'Nov 03, 2026, 02:18 PM',
    expectedPayoutAt: '2026-11-06T14:18:00.000Z',
    expectedPayoutDate: 'Nov 06, 2026, 02:18 PM',
    processingHours: 72,
    paidAt: '2026-11-06T14:18:00.000Z',
    paidDate: 'Nov 06, 2026, 02:18 PM',
    settlementAmount: 116000,
    status: 'paid',
    transactionIds: ['ord-0998', 'ord-0995'],
    orders: [],
    bankName: MERCHANT_ONBOARDED_BANK.bankName,
    maskedAccountNumber: MERCHANT_ONBOARDED_BANK.maskedAccountNumber,
    accountName: MERCHANT_ONBOARDED_BANK.accountName,
    transactionReference: 'NIP-GTB-20261106-884120',
  },
];

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
    case 'last_7_days': {
      endDate = createMerchantTzDate(year, month, day, 23, 59, 59, 999);
      const todayStart = createMerchantTzDate(year, month, day, 0, 0, 0, 0);
      const sixDaysAgo = new Date(
        todayStart.getTime() - 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      );
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
      const firstOfNextMonth = createMerchantTzDate(
        nextMonthYear,
        nextMonth,
        1,
        0,
        0,
        0,
        0
      );
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
 * Converts an Order record into a canonical SalesTransaction using actual listed product prices,
 * merchant product/promotion discounts, payment confirmation status, runner delivery confirmation
 * (customer confirmation code verification), and combined settlement records.
 *
 * Strictly enforces:
 * - No merchant commission or platform fee deductions.
 * - Order status 'picked_up' does NOT automatically mark deliveryConfirmed = true.
 * - A transaction is only 'settled' when its linked settlement has status 'paid'.
 */
export function mapOrderToTransaction(
  order: Order,
  metaMap: Record<string, TransactionMetadataOverride>,
  settlements: SettlementRecord[]
): SalesTransaction {
  const txId = `tx-${order.id}`;
  const override = metaMap[order.id] || metaMap[txId] || {};

  // Calculate product subtotal from merchant's listed item prices
  const productSubtotal =
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
    productSubtotal,
    productDiscountAmount + promotionDiscountAmount
  );

  // Order Value = Product Subtotal − Applicable Product Discounts
  const orderValue = Math.max(0, productSubtotal - totalDiscounts);

  // Determine Payment Status
  const paymentStatus: PaymentStatus =
    override.paymentStatus ??
    (order.paymentConfirmed === true ? 'confirmed' : 'pending');

  // Handle refunds accurately
  const refundedAmount =
    paymentStatus === 'refunded'
      ? override.refundedAmount !== undefined
        ? Math.min(orderValue, Math.max(0, override.refundedAmount))
        : orderValue
      : override.refundedAmount
      ? Math.min(orderValue, Math.max(0, override.refundedAmount))
      : 0;

  // Effective merchant earnings from this transaction (no platform fees deducted)
  const netAmount =
    paymentStatus === 'refunded' ||
    paymentStatus === 'failed' ||
    paymentStatus === 'pending'
      ? 0
      : Math.max(0, orderValue - refundedAmount);

  // Match against actual combined settlement records
  const linkedSettlement = settlements.find(
    (s) =>
      s.transactionIds.includes(txId) || s.transactionIds.includes(order.id)
  );

  const settlementId = override.settlementId ?? linkedSettlement?.id;
  const settlementStatus: SettlementStatus | undefined =
    linkedSettlement?.status ?? override.settlementStatus;

  // Delivery completion is strictly separate from merchant 'Picked Up' status.
  // It is only true when customer confirmation code verification is recorded.
  const deliveryConfirmed =
    paymentStatus === 'confirmed' && override.deliveryConfirmed === true;

  // Determine Funds Status based on payment, escrow, delivery confirmation, and settlement state
  let fundsStatus: FundsStatus;
  if (paymentStatus === 'refunded') {
    fundsStatus = 'refunded';
  } else if (
    paymentStatus === 'Confirmed'.toLowerCase() ||
    paymentStatus === 'confirmed'
  ) {
    if (!deliveryConfirmed) {
      fundsStatus = 'in_escrow';
    } else if (settlementStatus === 'paid') {
      fundsStatus = 'settled';
    } else {
      // Delivery is confirmed; funds are either waiting for or currently in an automatic settlement
      fundsStatus = 'awaiting_settlement';
    }
  } else {
    fundsStatus = 'in_escrow';
  }

  return {
    id: txId,
    sourceOrderId: order.id,
    customerName: order.customerName,
    itemSummary: order.itemSummary,
    items: order.items,
    dateTime: order.dateTime,
    createdAt: order.createdAt,
    paymentStatus,
    paymentConfirmedAt:
      paymentStatus === 'confirmed' ? order.dateTime : undefined,
    fundsStatus,
    orderStatusLabel: order.statusLabel,
    runnerName: order.runnerName,
    handedOverAt: order.handedOverAt,
    deliveryConfirmed,
    deliveryConfirmedAt: deliveryConfirmed
      ? override.deliveryConfirmedAt
      : undefined,
    productSubtotal,
    productDiscountAmount,
    promotionDiscountAmount,
    promotionName: order.promotionName,
    totalDiscounts,
    orderValue,
    refundedAmount,
    netAmount,
    settlementId,
    settlementStatus,
  };
}

/**
 * Hydrates each SettlementRecord with the full details of its included orders
 * and ensures `settlementAmount` equals the exact sum of the included orders' merchant earnings.
 */
export function hydrateSettlementsWithOrders(
  rawSettlements: SettlementRecord[],
  allTransactions: SalesTransaction[]
): SettlementRecord[] {
  return rawSettlements.map((settlement) => {
    const matchedTransactions = allTransactions.filter(
      (tx) =>
        settlement.transactionIds.includes(tx.id) ||
        settlement.transactionIds.includes(tx.sourceOrderId)
    );

    const includedOrders: SettlementIncludedOrder[] =
      settlement.orders && settlement.orders.length > 0
        ? settlement.orders
        : matchedTransactions.map((tx) => ({
            transactionId: tx.id,
            orderId: tx.sourceOrderId,
            customerName: tx.customerName,
            itemSummary: tx.itemSummary,
            orderDate: tx.dateTime,
            createdAt: tx.createdAt,
            deliveryConfirmedAt: tx.deliveryConfirmedAt,
            orderAmount: tx.netAmount,
          }));

    const calculatedTotal = includedOrders.reduce(
      (sum, item) => sum + item.orderAmount,
      0
    );

    // For merchant-initiated withdrawals with a specific requested amount, preserve settlement.settlementAmount
    const preserveExplicitAmount =
      settlement.recordType === 'merchant_withdrawal' &&
      settlement.settlementAmount > 0;

    return {
      ...settlement,
      orders: includedOrders,
      settlementAmount: preserveExplicitAmount
        ? settlement.settlementAmount
        : includedOrders.length > 0
          ? calculatedTotal
          : settlement.settlementAmount,
    };
  });
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
 * Calculates Overview summary metrics for the selected date range:
 * 1. Total Sales: Total value of successfully paid product orders within the selected date range, adjusted for applicable refunds.
 * 2. Awaiting Release: Merchant product earnings from successfully paid orders whose delivery has not yet been confirmed and whose funds remain in escrow.
 * 3. Released: Merchant funds that have been successfully paid out through completed settlements.
 * 4. Total Orders: Number of successfully paid orders within the selected date range.
 *
 * Ensures zero double-counting:
 * `awaitingRelease (In Escrow) + awaitingSettlement (Processing/Ready) + released (Settled) === totalSales`
 */
export function calculateOverviewMetrics(
  periodTransactions: SalesTransaction[]
): OverviewSummaryMetrics {
  let totalSales = 0;
  let awaitingRelease = 0;
  let awaitingSettlement = 0;
  let released = 0;
  let totalOrders = 0;
  let inEscrowOrderCount = 0;
  let awaitingSettlementOrderCount = 0;
  let releasedOrderCount = 0;
  let refundedTotal = 0;

  for (const tx of periodTransactions) {
    if (tx.refundedAmount > 0) {
      refundedTotal += tx.refundedAmount;
    }

    if (tx.paymentStatus === 'confirmed' && tx.netAmount > 0) {
      totalOrders += 1;
      totalSales += tx.netAmount;

      if (tx.fundsStatus === 'in_escrow') {
        awaitingRelease += tx.netAmount;
        inEscrowOrderCount += 1;
      } else if (tx.fundsStatus === 'awaiting_settlement') {
        awaitingSettlement += tx.netAmount;
        awaitingSettlementOrderCount += 1;
      } else if (tx.fundsStatus === 'settled') {
        released += tx.netAmount;
        releasedOrderCount += 1;
      }
    }
  }

  return {
    totalSales,
    awaitingRelease,
    awaitingSettlement,
    released,
    totalOrders,
    inEscrowOrderCount,
    awaitingSettlementOrderCount,
    releasedOrderCount,
    refundedTotal,
  };
}

/**
 * Calculates Settlements & Withdrawals view summary metrics:
 * 1. Awaiting Release: Funds still held in escrow because delivery has not yet been confirmed.
 * 2. Available Earnings: Delivery-confirmed order earnings currently eligible for withdrawal or promotion spending.
 * 3. Processing (Pending Withdrawals): Funds in the 72-hour withdrawal processing period.
 * 4. Successfully Paid: Funds successfully transferred to the merchant's bank account.
 */
export function calculateSettlementSummaryMetrics(
  transactions: SalesTransaction[],
  settlements: SettlementRecord[],
  promotionSpendFromEarnings = 0
): SettlementSummaryMetrics {
  const inEscrowTxs = transactions.filter(
    (tx) => tx.paymentStatus === 'confirmed' && tx.fundsStatus === 'in_escrow'
  );
  const awaitingRelease = inEscrowTxs.reduce(
    (sum, tx) => sum + tx.netAmount,
    0
  );

  const releasedTxs = transactions.filter(
    (tx) =>
      tx.paymentStatus === 'confirmed' &&
      tx.deliveryConfirmed === true &&
      tx.netAmount > 0
  );
  const totalReleasedFromEscrow = releasedTxs.reduce(
    (sum, tx) => sum + tx.netAmount,
    0
  );

  const processingSettlements = settlements.filter(
    (s) => s.status === 'processing'
  );
  const processing = processingSettlements.reduce(
    (sum, s) => sum + s.settlementAmount,
    0
  );
  const processingOrderCount = processingSettlements.reduce(
    (sum, s) => sum + Math.max(1, s.transactionIds.length),
    0
  );

  // Delivered orders not yet attached to a processing or paid settlement
  const readyTxs = transactions.filter(
    (tx) =>
      tx.paymentStatus === 'confirmed' &&
      tx.fundsStatus === 'awaiting_settlement' &&
      !tx.settlementId
  );
  const readyForSettlement = readyTxs.reduce(
    (sum, tx) => sum + tx.netAmount,
    0
  );

  const paidSettlements = settlements.filter((s) => s.status === 'paid');
  const successfullyPaid = paidSettlements.reduce(
    (sum, s) => sum + s.settlementAmount,
    0
  );
  const paidOrderCount = paidSettlements.reduce(
    (sum, s) => sum + Math.max(1, s.transactionIds.length),
    0
  );

  const availableEarnings = Math.max(
    0,
    totalReleasedFromEscrow -
      processing -
      successfullyPaid -
      promotionSpendFromEarnings
  );

  return {
    awaitingRelease,
    awaitingReleaseCount: inEscrowTxs.length,
    availableEarnings,
    availableOrderCount: readyTxs.length,
    processing,
    processingSettlementCount: processingSettlements.length,
    processingOrderCount,
    readyForSettlement,
    readyForSettlementCount: readyTxs.length,
    successfullyPaid,
    paidSettlementCount: paidSettlements.length,
    paidOrderCount,
    promotionSpendFromEarnings,
  };
}

/**
 * Generates time-bucketed chart data for the selected reporting period in Africa/Lagos timezone.
 */
export function buildSalesChartBuckets(
  periodTransactions: SalesTransaction[],
  window: DateRangeWindow
): SalesChartBucket[] {
  const qualifying = periodTransactions.filter(
    (tx) => tx.paymentStatus === 'confirmed' && tx.netAmount > 0
  );

  const spanDays = Math.max(
    1,
    Math.round(
      (window.endDate.getTime() - window.startDate.getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );

  // 1. Hourly buckets for single-day periods (Today or 1-day custom range)
  if (window.preset === 'today' || spanDays <= 1) {
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
        salesAmount: matching.reduce((s, t) => s + t.netAmount, 0),
        orderCount: matching.length,
      };
    });
  }

  // 2. Monthly buckets for > 45 days custom ranges
  if (spanDays > 45) {
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
        salesAmount: matching.reduce((s, t) => s + t.netAmount, 0),
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
      salesAmount: matching.reduce((s, t) => s + t.netAmount, 0),
      orderCount: matching.length,
    });

    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return buckets;
}

/**
 * Aggregates top-selling products across confirmed orders in the selected period.
 */
export function calculateProductPerformance(
  periodTransactions: SalesTransaction[]
): ProductSalesPerformanceItem[] {
  const qualifying = periodTransactions.filter(
    (tx) => tx.paymentStatus === 'confirmed' && tx.netAmount > 0
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
      salesValue: number;
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

      const lineSalesValue = Math.max(
        0,
        lineAfterProdDiscount - linePromoDiscount
      );

      const existing = map.get(key);
      if (existing) {
        existing.orderIds.add(tx.id);
        existing.quantitySold += item.quantity;
        existing.salesValue += lineSalesValue;
      } else {
        map.set(key, {
          productKey: key,
          productId: item.productId,
          productName: item.name,
          unit: item.unit,
          image: item.image,
          orderIds: new Set([tx.id]),
          quantitySold: item.quantity,
          salesValue: lineSalesValue,
        });
      }
    }
  }

  return Array.from(map.values())
    .map((entry) => ({
      productKey: entry.productKey,
      productId: entry.productId,
      productName: entry.productName,
      unit: entry.unit,
      image: entry.image,
      ordersCount: entry.orderIds.size,
      quantitySold: entry.quantitySold,
      salesValue: entry.salesValue,
    }))
    .sort((a, b) => b.salesValue - a.salesValue);
}

export function formatDateTimeWithTz(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: MERCHANT_TIMEZONE,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const DEFAULT_SALES_LEDGER: SalesFinancialLedgerEntry[] = [
  {
    id: 'sled-init-002',
    timestamp: '2026-11-09T09:00:00.000Z',
    formattedDate: 'Nov 09, 2026, 09:00 AM',
    type: 'withdrawal_requested',
    description:
      'Merchant withdrawal requested — 72-hour customer satisfaction processing period',
    reference: 'WDR-20261109-1002',
    amount: 59000,
    direction: 'debit',
    status: 'processing',
    paymentSource: 'sales_earnings',
    relatedWithdrawalId: 'set-2026-1109',
    expectedPayoutDate: 'Nov 12, 2026, 09:00 AM',
    bankSummary: `${MERCHANT_ONBOARDED_BANK.bankName} (${MERCHANT_ONBOARDED_BANK.maskedAccountNumber})`,
  },
  {
    id: 'sled-init-001',
    timestamp: '2026-11-06T14:18:00.000Z',
    formattedDate: 'Nov 06, 2026, 02:18 PM',
    type: 'withdrawal_paid',
    description:
      'Earnings payout completed to registered merchant bank account',
    reference: 'NIP-GTB-20261106-884120',
    amount: 116000,
    direction: 'debit',
    status: 'completed',
    paymentSource: 'sales_earnings',
    relatedWithdrawalId: 'set-2026-1106',
    expectedPayoutDate: 'Nov 06, 2026, 02:18 PM',
    bankSummary: `${MERCHANT_ONBOARDED_BANK.bankName} (${MERCHANT_ONBOARDED_BANK.maskedAccountNumber})`,
  },
];

function dispatchSalesUpdated(): void {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('errandify:sales-updated'));
    }
  } catch {
    // ignore in headless tests
  }
}

export const SalesStorage = {
  /**
   * Resets settlements, transaction metadata, promotion earnings deductions,
   * and sales ledger back to default state.
   */
  resetSalesAndWithdrawals(): void {
    try {
      localStorage.removeItem(SETTLEMENTS_STORAGE_KEY);
      localStorage.removeItem(TX_META_STORAGE_KEY);
      localStorage.removeItem(PROMO_EARNINGS_STORAGE_KEY);
      localStorage.removeItem(SALES_LEDGER_STORAGE_KEY);
      dispatchSalesUpdated();
    } catch {
      // ignore
    }
  },

  /**
   * Returns the merchant's registered bank account associated during onboarding (read-only).
   */
  getRegisteredBankAccount(): {
    bankName: string;
    maskedAccountNumber: string;
    accountName: string;
  } {
    try {
      const settings = SettingsStorage.getSettings();
      if (
        settings?.bankDetails?.bankName &&
        settings?.bankDetails?.maskedAccountNumber
      ) {
        return {
          bankName: settings.bankDetails.bankName,
          maskedAccountNumber: settings.bankDetails.maskedAccountNumber,
          accountName: settings.bankDetails.accountName,
        };
      }
    } catch {
      // fallback
    }
    return { ...MERCHANT_ONBOARDED_BANK };
  },

  getRawSettlements(): SettlementRecord[] {
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      if (!stored) {
        return DEFAULT_SETTLEMENTS.map((s) => ({ ...s }));
      }
      const parsed: SettlementRecord[] = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed
        : DEFAULT_SETTLEMENTS.map((s) => ({ ...s }));
    } catch {
      return DEFAULT_SETTLEMENTS.map((s) => ({ ...s }));
    }
  },

  saveSettlements(settlements: SettlementRecord[]): void {
    try {
      localStorage.setItem(
        SETTLEMENTS_STORAGE_KEY,
        JSON.stringify(settlements)
      );
      dispatchSalesUpdated();
    } catch (e) {
      console.error('Failed to save settlements', e);
    }
  },

  getTransactionMetadataMap(): Record<string, TransactionMetadataOverride> {
    try {
      const stored = localStorage.getItem(TX_META_STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_TX_METADATA };
      }
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_TX_METADATA, ...parsed };
    } catch {
      return { ...DEFAULT_TX_METADATA };
    }
  },

  saveTransactionMetadataMap(
    map: Record<string, TransactionMetadataOverride>
  ): void {
    try {
      localStorage.setItem(TX_META_STORAGE_KEY, JSON.stringify(map));
      dispatchSalesUpdated();
    } catch (e) {
      console.error('Failed to save transaction metadata', e);
    }
  },

  /**
   * Returns all promotion campaign payments funded from Sales Earnings.
   */
  getPromotionPaymentsFromEarnings(): SalesEarningsPromotionRecord[] {
    try {
      const stored = localStorage.getItem(PROMO_EARNINGS_STORAGE_KEY);
      if (!stored) return [];
      const parsed: SalesEarningsPromotionRecord[] = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [];
    } catch {
      return [];
    }
  },

  savePromotionPaymentsFromEarnings(
    records: SalesEarningsPromotionRecord[]
  ): void {
    localStorage.setItem(PROMO_EARNINGS_STORAGE_KEY, JSON.stringify(records));
    dispatchSalesUpdated();
  },

  /**
   * Returns the immutable Sales & Earnings financial movement ledger
   * (withdrawals requested, withdrawals paid after 72h, and promotion payments from sales earnings).
   */
  getFinancialLedger(): SalesFinancialLedgerEntry[] {
    try {
      const stored = localStorage.getItem(SALES_LEDGER_STORAGE_KEY);
      if (!stored) {
        return [...DEFAULT_SALES_LEDGER];
      }
      const parsed: SalesFinancialLedgerEntry[] = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        : [...DEFAULT_SALES_LEDGER];
    } catch {
      return [...DEFAULT_SALES_LEDGER];
    }
  },

  appendFinancialLedgerEntry(
    entry: Omit<SalesFinancialLedgerEntry, 'id'>
  ): SalesFinancialLedgerEntry {
    const existing = this.getFinancialLedger();
    const record: SalesFinancialLedgerEntry = {
      ...entry,
      id: `sled-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    };
    localStorage.setItem(
      SALES_LEDGER_STORAGE_KEY,
      JSON.stringify([record, ...existing])
    );
    return record;
  },

  /**
   * Returns all merchant transactions derived from store orders and historical records,
   * mapped with payment status, escrow/delivery-confirmation status, and combined settlement records.
   */
  getTransactions(): SalesTransaction[] {
    const activeOrders = OrderStorage.getOrders();
    const seenIds = new Set(activeOrders.map((o) => o.id));
    const combinedOrders: Order[] = [
      ...activeOrders,
      ...HISTORICAL_DELIVERED_ORDERS.filter((o) => !seenIds.has(o.id)),
    ];

    const metaMap = this.getTransactionMetadataMap();
    const rawSettlements = this.getRawSettlements();

    return combinedOrders
      .map((order) => mapOrderToTransaction(order, metaMap, rawSettlements))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  /**
   * Returns all automatic combined settlements and merchant withdrawals hydrated with included order details.
   */
  getSettlements(): SettlementRecord[] {
    const transactions = this.getTransactions();
    const rawSettlements = this.getRawSettlements();
    return hydrateSettlementsWithOrders(rawSettlements, transactions).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Computes the authoritative merchant earnings balance breakdown:
   * - Distinguishes between:
   *   1. Awaiting Release (In Escrow — customer delivery confirmation code not yet verified)
   *   2. Available Earnings (Released from escrow, not yet withdrawn or spent on promotions)
   *   3. Pending Withdrawals (In the 72-hour withdrawal processing period)
   *   4. Successfully Paid Withdrawals (Deposited to the merchant's registered bank account)
   *   5. Promotion Spend from Earnings (Campaigns funded via Sales Earnings that are held or charged)
   */
  getEarningsBalanceSummary(): EarningsBalanceSummary {
    const transactions = this.getTransactions();
    const settlements = this.getSettlements();
    const promoPayments = this.getPromotionPaymentsFromEarnings();
    const bankDetails = this.getRegisteredBankAccount();

    const confirmedTxs = transactions.filter(
      (tx) => tx.paymentStatus === 'confirmed' && tx.netAmount > 0
    );
    const totalConfirmedSales = confirmedTxs.reduce(
      (sum, tx) => sum + tx.netAmount,
      0
    );

    const inEscrowTxs = confirmedTxs.filter((tx) => !tx.deliveryConfirmed);
    const awaitingReleaseInEscrow = inEscrowTxs.reduce(
      (sum, tx) => sum + tx.netAmount,
      0
    );

    const releasedTxs = confirmedTxs.filter((tx) => tx.deliveryConfirmed);
    const totalReleasedFromEscrow = releasedTxs.reduce(
      (sum, tx) => sum + tx.netAmount,
      0
    );

    const pendingList = settlements.filter((s) => s.status === 'processing');
    const pendingWithdrawals = pendingList.reduce(
      (sum, s) => sum + s.settlementAmount,
      0
    );

    const paidList = settlements.filter((s) => s.status === 'paid');
    const successfullyPaidWithdrawals = paidList.reduce(
      (sum, s) => sum + s.settlementAmount,
      0
    );

    const promotionHeldFromEarnings = promoPayments
      .filter((p) => p.state === 'held')
      .reduce((sum, p) => sum + p.amount, 0);

    const promotionChargedFromEarnings = promoPayments
      .filter((p) => p.state === 'charged')
      .reduce((sum, p) => sum + p.amount, 0);

    const promotionSpendFromEarnings =
      promotionHeldFromEarnings + promotionChargedFromEarnings;

    const availableEarnings = Math.max(
      0,
      totalReleasedFromEscrow -
        pendingWithdrawals -
        successfullyPaidWithdrawals -
        promotionSpendFromEarnings
    );

    return {
      totalConfirmedSales,
      awaitingReleaseInEscrow,
      inEscrowOrderCount: inEscrowTxs.length,
      totalReleasedFromEscrow,
      releasedOrderCount: releasedTxs.length,
      availableEarnings,
      pendingWithdrawals,
      pendingWithdrawalCount: pendingList.length,
      successfullyPaidWithdrawals,
      paidWithdrawalCount: paidList.length,
      promotionSpendFromEarnings,
      promotionHeldFromEarnings,
      promotionChargedFromEarnings,
      bankDetails,
    };
  },

  /**
   * Backend handler to initiate a merchant withdrawal from eligible available earnings:
   * - Enforces mutex lock and idempotency key to prevent duplicate withdrawals or race conditions.
   * - Validates that `amount > 0` and `amount <= availableEarnings` on the backend.
   * - Never allows funds in escrow (unreleased), pending withdrawals, or funds spent on promotions to be withdrawn.
   * - Enforces a mandatory 72-hour withdrawal processing period (`status = 'processing'`, `expectedPayoutAt = requestedAt + 72h`).
   * - Uses the registered merchant bank account (no bank account editing).
   */
  requestWithdrawal(payload: {
    amount: number;
    idempotencyKey?: string;
    requestedAt?: Date | string;
  }): {
    withdrawal: SettlementRecord;
    balanceSummary: EarningsBalanceSummary;
    ledgerEntry: SalesFinancialLedgerEntry;
    deduplicated: boolean;
  } {
    acquireSalesLock();
    try {
      const rawSettlements = this.getRawSettlements();

      // 1. Idempotency check
      if (payload.idempotencyKey && payload.idempotencyKey.trim()) {
        const key = payload.idempotencyKey.trim();
        const existing = rawSettlements.find((s) => s.idempotencyKey === key);
        if (existing) {
          const hydrated =
            this.getSettlements().find((s) => s.id === existing.id) || existing;
          const existingLedger =
            this.getFinancialLedger().find(
              (l) => l.relatedWithdrawalId === existing.id
            ) || this.getFinancialLedger()[0];
          return {
            withdrawal: hydrated,
            balanceSummary: this.getEarningsBalanceSummary(),
            ledgerEntry: existingLedger,
            deduplicated: true,
          };
        }
      }

      // 2. Validate amount
      const requestedAmount = Math.round(Number(payload.amount));
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error(
          'Please enter a valid withdrawal amount greater than ₦0.'
        );
      }

      // 3. Authoritative backend balance validation
      const currentSummary = this.getEarningsBalanceSummary();
      if (currentSummary.availableEarnings <= 0) {
        throw new Error(
          'You currently have ₦0 in eligible available earnings. Funds in escrow awaiting customer delivery confirmation or already in a pending withdrawal cannot be withdrawn.'
        );
      }

      if (requestedAmount > currentSummary.availableEarnings) {
        throw new Error(
          `Insufficient eligible available earnings. Your available balance is ₦${currentSummary.availableEarnings.toLocaleString()}, which cannot cover a withdrawal of ₦${requestedAmount.toLocaleString()}. Unreleased escrow funds (₦${currentSummary.awaitingReleaseInEscrow.toLocaleString()}) and pending withdrawals (₦${currentSummary.pendingWithdrawals.toLocaleString()}) cannot be withdrawn.`
        );
      }

      // 4. Compute 72-hour processing period timestamps
      const reqDate = payload.requestedAt
        ? new Date(payload.requestedAt)
        : new Date();
      if (isNaN(reqDate.getTime())) {
        throw new Error('Invalid withdrawal request timestamp.');
      }
      const requestedAtIso = reqDate.toISOString();
      const expectedPayoutDateObj = new Date(
        reqDate.getTime() + WITHDRAWAL_PROCESSING_MS
      );
      const expectedPayoutAtIso = expectedPayoutDateObj.toISOString();

      const requestedFormatted = formatDateTimeWithTz(reqDate);
      const expectedPayoutFormatted = formatDateTimeWithTz(
        expectedPayoutDateObj
      );
      const shortSettlementDate = formatShortDate(reqDate);

      // 5. Identify eligible delivery-confirmed orders contributing to available earnings
      const allTransactions = this.getTransactions();
      const eligibleOrders = allTransactions.filter(
        (tx) =>
          tx.paymentStatus === 'confirmed' &&
          tx.deliveryConfirmed === true &&
          !tx.settlementId &&
          tx.netAmount > 0
      );

      let remainingToAllocate = requestedAmount;
      const includedOrders: SettlementIncludedOrder[] = [];
      const linkedTxIds: string[] = [];

      for (const tx of eligibleOrders) {
        if (remainingToAllocate <= 0) break;
        const allocated = Math.min(tx.netAmount, remainingToAllocate);
        includedOrders.push({
          transactionId: tx.id,
          orderId: tx.sourceOrderId,
          customerName: tx.customerName,
          itemSummary:
            allocated < tx.netAmount
              ? `${tx.itemSummary} (Partial earnings withdrawal)`
              : tx.itemSummary,
          orderDate: tx.dateTime,
          createdAt: tx.createdAt,
          deliveryConfirmedAt: tx.deliveryConfirmedAt,
          orderAmount: allocated,
        });
        linkedTxIds.push(tx.sourceOrderId);
        remainingToAllocate -= allocated;
      }

      const bank = this.getRegisteredBankAccount();
      const withdrawalId = `wd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const referenceCode = `WDR-${reqDate.getFullYear()}${String(reqDate.getMonth() + 1).padStart(2, '0')}${String(reqDate.getDate()).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

      const newWithdrawal: SettlementRecord = {
        id: withdrawalId,
        recordType: 'merchant_withdrawal',
        settlementDate: shortSettlementDate,
        createdAt: requestedAtIso,
        requestedAt: requestedAtIso,
        processingDate: requestedFormatted,
        expectedPayoutAt: expectedPayoutAtIso,
        expectedPayoutDate: expectedPayoutFormatted,
        processingHours: WITHDRAWAL_PROCESSING_HOURS,
        paidAt: undefined,
        paidDate: undefined,
        settlementAmount: requestedAmount,
        status: 'processing', // 72-hour processing period — NEVER deposited immediately!
        transactionIds: linkedTxIds,
        orders: includedOrders,
        bankName: bank.bankName,
        maskedAccountNumber: bank.maskedAccountNumber,
        accountName: bank.accountName,
        transactionReference: referenceCode,
        idempotencyKey: payload.idempotencyKey?.trim(),
      };

      this.saveSettlements([newWithdrawal, ...rawSettlements]);

      const ledgerEntry = this.appendFinancialLedgerEntry({
        timestamp: requestedAtIso,
        formattedDate: requestedFormatted,
        type: 'withdrawal_requested',
        description: `Withdrawal requested to ${bank.bankName} (${bank.maskedAccountNumber}) — 72-hour processing period`,
        reference: referenceCode,
        amount: requestedAmount,
        direction: 'debit',
        status: 'processing',
        paymentSource: 'sales_earnings',
        relatedWithdrawalId: withdrawalId,
        expectedPayoutDate: expectedPayoutFormatted,
        bankSummary: `${bank.bankName} (${bank.maskedAccountNumber})`,
      });

      dispatchSalesUpdated();

      return {
        withdrawal: newWithdrawal,
        balanceSummary: this.getEarningsBalanceSummary(),
        ledgerEntry,
        deduplicated: false,
      };
    } finally {
      releaseSalesLock();
    }
  },

  /**
   * Processes any pending withdrawals whose 72-hour processing period has elapsed as of `asOfDate`.
   * - Before 72 hours have elapsed (`asOfDate < expectedPayoutAt`), the withdrawal remains 'processing'.
   * - Once 72 hours have elapsed (`asOfDate >= expectedPayoutAt`), transitions status to 'paid' and records bank deposit.
   */
  processMaturedWithdrawals(asOfDate: Date | string = new Date()): {
    completedWithdrawals: SettlementRecord[];
    balanceSummary: EarningsBalanceSummary;
  } {
    acquireSalesLock();
    try {
      const checkDate = new Date(asOfDate);
      if (isNaN(checkDate.getTime())) {
        return {
          completedWithdrawals: [],
          balanceSummary: this.getEarningsBalanceSummary(),
        };
      }

      const rawSettlements = this.getRawSettlements();
      const metaMap = this.getTransactionMetadataMap();
      const completed: SettlementRecord[] = [];
      let changed = false;

      const updatedSettlements = rawSettlements.map((settlement) => {
        if (settlement.status !== 'processing') {
          return settlement;
        }

        const reqMs = settlement.requestedAt
          ? new Date(settlement.requestedAt).getTime()
          : new Date(settlement.createdAt).getTime();
        const expectedMs = settlement.expectedPayoutAt
          ? new Date(settlement.expectedPayoutAt).getTime()
          : reqMs + WITHDRAWAL_PROCESSING_MS;

        if (checkDate.getTime() < expectedMs) {
          return settlement;
        }

        // 72 hours have elapsed -> deposit funds into merchant's registered bank account
        changed = true;
        const paidAtIso = new Date(expectedMs).toISOString();
        const paidFormatted = formatDateTimeWithTz(new Date(expectedMs));
        const payoutRef =
          settlement.transactionReference &&
          settlement.transactionReference.startsWith('NIP-')
            ? settlement.transactionReference
            : `NIP-GTB-${paidAtIso.slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

        const paidRecord: SettlementRecord = {
          ...settlement,
          status: 'paid',
          paidAt: paidAtIso,
          paidDate: paidFormatted,
          transactionReference: payoutRef,
        };

        for (const txId of settlement.transactionIds) {
          if (metaMap[txId] && metaMap[txId].settlementId === settlement.id) {
            metaMap[txId] = {
              ...metaMap[txId],
              settlementStatus: 'paid',
            };
          }
        }

        this.appendFinancialLedgerEntry({
          timestamp: paidAtIso,
          formattedDate: paidFormatted,
          type: 'withdrawal_paid',
          description: `72-hour processing complete — withdrawal deposited to ${paidRecord.bankName || MERCHANT_ONBOARDED_BANK.bankName} (${paidRecord.maskedAccountNumber || MERCHANT_ONBOARDED_BANK.maskedAccountNumber})`,
          reference: payoutRef,
          amount: paidRecord.settlementAmount,
          direction: 'debit',
          status: 'completed',
          paymentSource: 'sales_earnings',
          relatedWithdrawalId: paidRecord.id,
          expectedPayoutDate: paidRecord.expectedPayoutDate,
          bankSummary: `${paidRecord.bankName || MERCHANT_ONBOARDED_BANK.bankName} (${paidRecord.maskedAccountNumber || MERCHANT_ONBOARDED_BANK.maskedAccountNumber})`,
        });

        completed.push(paidRecord);
        return paidRecord;
      });

      if (changed) {
        this.saveTransactionMetadataMap(metaMap);
        this.saveSettlements(updatedSettlements);
        dispatchSalesUpdated();
      }

      return {
        completedWithdrawals: completed,
        balanceSummary: this.getEarningsBalanceSummary(),
      };
    } finally {
      releaseSalesLock();
    }
  },

  /**
   * Completes a specific pending withdrawal once its 72-hour processing period has elapsed.
   * Throws an error if called before the 72-hour period has elapsed.
   */
  completeWithdrawalAfter72Hours(
    withdrawalId: string,
    asOfDate?: Date | string
  ): {
    withdrawal: SettlementRecord;
    balanceSummary: EarningsBalanceSummary;
  } {
    const rawSettlements = this.getRawSettlements();
    const target = rawSettlements.find((s) => s.id === withdrawalId);
    if (!target) {
      throw new Error('Withdrawal record not found.');
    }
    if (target.status === 'paid') {
      return {
        withdrawal: target,
        balanceSummary: this.getEarningsBalanceSummary(),
      };
    }

    const reqMs = target.requestedAt
      ? new Date(target.requestedAt).getTime()
      : new Date(target.createdAt).getTime();
    const expectedMs = target.expectedPayoutAt
      ? new Date(target.expectedPayoutAt).getTime()
      : reqMs + WITHDRAWAL_PROCESSING_MS;

    const effectiveCheckDate = asOfDate
      ? new Date(asOfDate)
      : new Date(expectedMs);

    if (effectiveCheckDate.getTime() < expectedMs) {
      const remainingHours = Math.ceil(
        (expectedMs - effectiveCheckDate.getTime()) / (60 * 60 * 1000)
      );
      throw new Error(
        `Withdrawal cannot be deposited before the 72-hour processing period completes (${remainingHours}h remaining until ${target.expectedPayoutDate}).`
      );
    }

    this.processMaturedWithdrawals(effectiveCheckDate);
    const updated =
      this.getSettlements().find((s) => s.id === withdrawalId) || target;
    return {
      withdrawal: updated,
      balanceSummary: this.getEarningsBalanceSummary(),
    };
  },

  /**
   * Reserves/deducts eligible available sales earnings when a merchant purchases a promotion
   * using their Sales Earnings (`paymentSource === 'sales_earnings'`).
   * - Validates on the backend that `availableEarnings >= amount`.
   * - Never combines balances or dips into escrow / pending withdrawals.
   * - Deduplicates by `campaignId` or `idempotencyKey`.
   */
  reserveSalesEarningsForPromotion(payload: {
    merchantId: string;
    campaignId: string;
    campaignName: string;
    productId: string;
    productName: string;
    placementName: string;
    packageName: string;
    amount: number;
    idempotencyKey?: string;
  }): {
    record: SalesEarningsPromotionRecord;
    balanceSummary: EarningsBalanceSummary;
    deduplicated: boolean;
  } {
    acquireSalesLock();
    try {
      const existingRecords = this.getPromotionPaymentsFromEarnings();
      const duplicate = existingRecords.find(
        (r) =>
          r.campaignId === payload.campaignId ||
          (payload.idempotencyKey &&
            r.idempotencyKey === payload.idempotencyKey)
      );
      if (duplicate) {
        return {
          record: duplicate,
          balanceSummary: this.getEarningsBalanceSummary(),
          deduplicated: true,
        };
      }

      const amount = Math.round(Number(payload.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Promotion payment amount must be greater than ₦0.');
      }

      const summary = this.getEarningsBalanceSummary();
      if (summary.availableEarnings < amount) {
        const shortfall = amount - summary.availableEarnings;
        throw new Error(
          `Insufficient eligible available sales earnings. Available sales earnings: ₦${summary.availableEarnings.toLocaleString()}, Campaign cost: ₦${amount.toLocaleString()} (Shortfall: ₦${shortfall.toLocaleString()}). Unreleased escrow funds and pending withdrawals cannot be spent on promotions. Please fund this promotion through your Ad Wallet.`
        );
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const formattedNow = formatDateTimeWithTz(now);
      const reference = `ERN-PRM-${payload.campaignId.toUpperCase()}`;

      const record: SalesEarningsPromotionRecord = {
        id: `sep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        merchantId: payload.merchantId,
        campaignId: payload.campaignId,
        campaignName: payload.campaignName,
        productId: payload.productId,
        productName: payload.productName,
        placementName: payload.placementName,
        packageName: payload.packageName,
        amount,
        state: 'held',
        paymentSource: 'sales_earnings',
        reference,
        createdAt: nowIso,
        updatedAt: nowIso,
        formattedDate: formattedNow,
        idempotencyKey: payload.idempotencyKey,
      };

      this.savePromotionPaymentsFromEarnings([record, ...existingRecords]);

      this.appendFinancialLedgerEntry({
        timestamp: nowIso,
        formattedDate: formattedNow,
        type: 'promotion_hold',
        description: `Promotion payment reserved from Sales Earnings (${payload.productName} · ${payload.packageName})`,
        reference,
        amount,
        direction: 'debit',
        status: 'processing',
        paymentSource: 'sales_earnings',
        relatedCampaignId: payload.campaignId,
        relatedCampaignName: payload.campaignName,
      });

      dispatchSalesUpdated();

      return {
        record,
        balanceSummary: this.getEarningsBalanceSummary(),
        deduplicated: false,
      };
    } finally {
      releaseSalesLock();
    }
  },

  /**
   * Finalizes a Sales Earnings promotion hold into a completed charge when the campaign goes Live.
   * Does NOT deduct a second time from `availableEarnings`.
   */
  finalizeSalesEarningsPromotionCharge(
    campaignId: string
  ): SalesEarningsPromotionRecord | undefined {
    acquireSalesLock();
    try {
      const records = this.getPromotionPaymentsFromEarnings();
      const idx = records.findIndex((r) => r.campaignId === campaignId);
      if (idx === -1) return undefined;

      const target = records[idx];
      if (target.state === 'charged') return target;

      const now = new Date();
      const nowIso = now.toISOString();
      const formattedNow = formatDateTimeWithTz(now);

      const updated: SalesEarningsPromotionRecord = {
        ...target,
        state: 'charged',
        updatedAt: nowIso,
      };
      records[idx] = updated;
      this.savePromotionPaymentsFromEarnings(records);

      this.appendFinancialLedgerEntry({
        timestamp: nowIso,
        formattedDate: formattedNow,
        type: 'promotion_charge',
        description: `Promotion campaign went Live — payment finalized from Sales Earnings (${target.productName} · ${target.packageName})`,
        reference: `CHG-${target.reference}`,
        amount: target.amount,
        direction: 'debit',
        status: 'completed',
        paymentSource: 'sales_earnings',
        relatedCampaignId: target.campaignId,
        relatedCampaignName: target.campaignName,
      });

      dispatchSalesUpdated();
      return updated;
    } finally {
      releaseSalesLock();
    }
  },

  /**
   * Releases a Sales Earnings promotion hold back to `availableEarnings` if a campaign is
   * rejected during review or cancelled before its start date.
   */
  releaseSalesEarningsPromotionHold(
    campaignId: string,
    reason = 'Campaign rejected or cancelled before start'
  ): SalesEarningsPromotionRecord | undefined {
    acquireSalesLock();
    try {
      const records = this.getPromotionPaymentsFromEarnings();
      const idx = records.findIndex((r) => r.campaignId === campaignId);
      if (idx === -1) return undefined;

      const target = records[idx];
      if (target.state !== 'held') return target;

      const now = new Date();
      const nowIso = now.toISOString();
      const formattedNow = formatDateTimeWithTz(now);

      const updated: SalesEarningsPromotionRecord = {
        ...target,
        state: 'released',
        updatedAt: nowIso,
      };
      records[idx] = updated;
      this.savePromotionPaymentsFromEarnings(records);

      this.appendFinancialLedgerEntry({
        timestamp: nowIso,
        formattedDate: formattedNow,
        type: 'promotion_release',
        description: `${reason} — reserved funds returned to Available Sales Earnings (${target.productName})`,
        reference: `REL-${target.reference}`,
        amount: target.amount,
        direction: 'credit',
        status: 'released',
        paymentSource: 'sales_earnings',
        relatedCampaignId: target.campaignId,
        relatedCampaignName: target.campaignName,
      });

      dispatchSalesUpdated();
      return updated;
    } finally {
      releaseSalesLock();
    }
  },
};
