import {
  SalesStorage,
  buildCsvContent,
  buildSalesChartBuckets,
  calculateFinancialMetrics,
  calculatePeriodComparison,
  calculateProductPerformance,
  filterSettlementsByWindow,
  filterTransactionsByWindow,
  getReferenceDate,
  resolveReportingPeriodWindow,
} from '../services/salesStorage';
import type { SettlementRecord } from '../types/sales';

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

console.log('--- RUNNING SALES & EARNINGS VERIFICATION SUITE ---');

// 1. Verify initial transactions derived from actual MOCK_ORDERS
const initialTransactions = SalesStorage.getTransactions();
const feeConfig = SalesStorage.getFeeConfig();
const initialSettlements = SalesStorage.getSettlements();

assert(
  initialTransactions.length === 7,
  `Loaded 7 actual store transactions from OrderStorage (got ${initialTransactions.length})`
);
assert(
  feeConfig.isConfigured === false,
  'Default MerchantFeeConfig is unconfigured (no fabricated commission percentage)'
);
assert(
  initialSettlements.length === 0,
  'Default SettlementRecord list is empty (no fabricated settlement records)'
);

const refDate = getReferenceDate(initialTransactions);

// 2. Verify Last 7 Days (Nov 4 – Nov 10, 2026) metrics against actual MOCK_ORDERS
const last7Window = resolveReportingPeriodWindow(
  'last_7_days',
  undefined,
  undefined,
  refDate
);
const last7Tx = filterTransactionsByWindow(initialTransactions, last7Window);
const last7Metrics = calculateFinancialMetrics(last7Tx, [], feeConfig);

// Expected from actual MOCK_ORDERS:
// Gross Sales = 63,500 + 60,000 + 90,000 + 45,000 + 62,000 + 82,000 + 35,000 = 437,500
// Product Discounts = 2,000 + 3,000 + 0 + 0 + 0 + 4,000 + 0 = 9,000
// Promotion Discounts = 6,150 + 3,000 + 9,000 + 0 + 3,000 + 0 + 0 = 21,150
// Total Discounts = 30,150
// Net Earnings = 437,500 - 30,150 = 407,350
// Pending Settlement = 407,350, Total Settled = 0
assert(
  last7Metrics.grossSales === 437500,
  `Last 7 Days Gross Sales = ₦437,500 (got ${last7Metrics.grossSales})`
);
assert(
  last7Metrics.productDiscounts === 9000,
  `Last 7 Days Product Discounts = ₦9,000 (got ${last7Metrics.productDiscounts})`
);
assert(
  last7Metrics.promotionDiscounts === 21150,
  `Last 7 Days Promotion Discounts = ₦21,150 (got ${last7Metrics.promotionDiscounts})`
);
assert(
  last7Metrics.totalDiscounts === 30150,
  `Last 7 Days Total Discounts = ₦30,150 (got ${last7Metrics.totalDiscounts})`
);
assert(
  last7Metrics.feesAndCommissions === 0 &&
    !last7Metrics.isFeeConfigAvailable,
  'Last 7 Days Fees & Commissions = ₦0 (unconfigured state)'
);
assert(
  last7Metrics.netEarnings === 407350,
  `Last 7 Days Net Earnings = ₦407,350 (got ${last7Metrics.netEarnings})`
);
assert(
  last7Metrics.pendingSettlement === 407350 &&
    last7Metrics.totalSettled === 0,
  'Last 7 Days Pending Settlement = ₦407,350 and Total Settled = ₦0'
);

// 3. Verify Today (Nov 10, 2026) vs Yesterday (Nov 09, 2026) & Period Comparison
const todayWindow = resolveReportingPeriodWindow(
  'today',
  undefined,
  undefined,
  refDate
);
const todayTx = filterTransactionsByWindow(initialTransactions, todayWindow);
const todayMetrics = calculateFinancialMetrics(todayTx, [], feeConfig);
// Nov 10 has ord-1024 (55,350), ord-1023 (54,000), ord-1022 (81,000) -> Net = 190,350, Gross = 213,500
assert(
  todayMetrics.qualifyingOrderCount === 3 &&
    todayMetrics.grossSales === 213500 &&
    todayMetrics.netEarnings === 190350,
  `Today (Nov 10) has 3 orders, Gross ₦213,500, Net ₦190,350`
);

const todayComparison = calculatePeriodComparison(
  initialTransactions,
  todayWindow
);
// Yesterday (Nov 9) has ord-1021 (45,000) and ord-1019 (59,000) -> Net = 104,000
// Percentage change = ((190350 - 104000) / 104000) * 100 = +83.0%
assert(
  todayComparison.hasSufficientHistoricalData === true &&
    todayComparison.previousPeriodNetSales === 104000 &&
    todayComparison.percentageChange === 83,
  `Today vs Yesterday comparison is verified: +83% (${todayComparison.currentPeriodNetSales} vs ${todayComparison.previousPeriodNetSales})`
);

// Verify Last Month (Oct 2026) empty period & no fabricated comparison
const lastMonthWindow = resolveReportingPeriodWindow(
  'last_month',
  undefined,
  undefined,
  refDate
);
const lastMonthTx = filterTransactionsByWindow(
  initialTransactions,
  lastMonthWindow
);
const lastMonthMetrics = calculateFinancialMetrics(lastMonthTx, [], feeConfig);
const lastMonthComparison = calculatePeriodComparison(
  initialTransactions,
  lastMonthWindow
);
assert(
  lastMonthMetrics.qualifyingOrderCount === 0 &&
    lastMonthMetrics.netEarnings === 0,
  'Last Month (Oct 2026) has 0 orders and ₦0 net earnings'
);
assert(
  lastMonthComparison.hasSufficientHistoricalData === false &&
    lastMonthComparison.percentageChange === null,
  'Last Month comparison reports insufficient historical data without fabricating a trend'
);

// 4. Verify Pending, Failed, Refunded, and Partially Refunded transaction handling
SalesStorage.saveTransactionMetadataMap({
  'ord-1024': { status: 'pending' }, // Should be excluded from successful sales
  'ord-1023': { status: 'failed' }, // Should be excluded from successful sales
  'ord-1022': { status: 'refunded' }, // Full refund (81,000) -> excluded from net earnings
  'ord-1021': { status: 'partially_refunded', refundedAmount: 15000 }, // 45,000 - 15,000 = 30,000 net
});

const modifiedTx = SalesStorage.getTransactions();
const modifiedMetrics = calculateFinancialMetrics(modifiedTx, [], feeConfig);
// Qualifying transactions now:
// - ord-1021 (partially_refunded: gross 45,000, refund 15,000 -> net 30,000)
// - ord-1019 (successful: net 59,000)
// - ord-1005 (successful: net 78,000)
// - ord-0998 (successful: net 35,000)
// Expected Net Earnings = 30,000 + 59,000 + 78,000 + 35,000 = 202,000
assert(
  modifiedMetrics.qualifyingOrderCount === 4,
  `Pending, Failed, and Fully Refunded transactions excluded from qualifying sales count (got ${modifiedMetrics.qualifyingOrderCount})`
);
assert(
  modifiedMetrics.netEarnings === 202000,
  `Partially Refunded deducts exact ₦15,000 refund; Net Earnings = ₦202,000 (got ${modifiedMetrics.netEarnings})`
);

// Reset transaction overrides
SalesStorage.saveTransactionMetadataMap({});

// 5. Verify Settlement calculations (Pending/Processing vs Paid, no double counting)
const testSettlements: SettlementRecord[] = [
  {
    id: 'set-001',
    settlementDate: 'Nov 09, 2026',
    createdAt: '2026-11-09T18:00:00.000Z',
    periodStartIso: '2026-11-05T00:00:00.000Z',
    periodEndIso: '2026-11-08T23:59:59.999Z',
    settlementPeriodLabel: 'Nov 5 – Nov 8, 2026',
    grossAmount: 117000, // ord-1005 (82k) + ord-0998 (35k)
    totalDiscounts: 4000,
    merchantFees: 0,
    totalDeductions: 4000,
    netSettlementAmount: 113000, // 78,000 + 35,000
    status: 'paid',
    transactionIds: ['ord-1005', 'ord-0998'],
    payoutReference: 'PYT-20261109-001',
    activityLog: [],
  },
  {
    id: 'set-002',
    settlementDate: 'Nov 10, 2026',
    createdAt: '2026-11-10T17:00:00.000Z',
    periodStartIso: '2026-11-09T00:00:00.000Z',
    periodEndIso: '2026-11-09T23:59:59.999Z',
    settlementPeriodLabel: 'Nov 9, 2026',
    grossAmount: 107000, // ord-1021 (45k) + ord-1019 (62k)
    totalDiscounts: 3000,
    merchantFees: 0,
    totalDeductions: 3000,
    netSettlementAmount: 104000,
    status: 'processing', // Processing must NOT be counted as Total Settled!
    transactionIds: ['ord-1021', 'ord-1019'],
    activityLog: [],
  },
];

SalesStorage.saveSettlements(testSettlements);
const txWithSettlements = SalesStorage.getTransactions();
const settledMetrics = calculateFinancialMetrics(
  txWithSettlements,
  filterSettlementsByWindow(testSettlements, last7Window),
  feeConfig
);

assert(
  settledMetrics.totalSettled === 113000,
  `Paid settlement (₦113,000) counted in Total Settled while Processing settlement (₦104,000) is excluded (got ${settledMetrics.totalSettled})`
);
assert(
  settledMetrics.pendingSettlement === 294350,
  `Pending Settlement = ₦407,350 - ₦113,000 = ₦294,350 with zero double-counting (got ${settledMetrics.pendingSettlement})`
);
assert(
  settledMetrics.totalSettled + settledMetrics.pendingSettlement ===
    settledMetrics.netEarnings,
  'Total Settled + Pending Settlement reconciles 100% with Net Earnings'
);

// Clean up settlements back to default
SalesStorage.saveSettlements([]);

// 6. Verify Chart Buckets & Product Performance & CSV Export
const buckets = buildSalesChartBuckets(
  SalesStorage.getTransactions(),
  last7Window
);
const bucketNetSum = buckets.reduce((s, b) => s + b.netSales, 0);
assert(
  bucketNetSum === 407350,
  `Chart buckets Net Sales sum (₦${bucketNetSum}) reconciles 100% with Overview Net Earnings (₦407,350)`
);

const productPerf = calculateProductPerformance(SalesStorage.getTransactions());
const prodNetSum = productPerf.reduce((s, p) => s + p.netSalesValue, 0);
assert(
  prodNetSum === 407350,
  `Product Performance Net Sales Value sum (₦${prodNetSum}) reconciles 100% with Overview Net Earnings (₦407,350)`
);

const csvOutput = buildCsvContent(
  ['Product', 'Net Sales'],
  productPerf.map((p) => [p.productName, p.netSalesValue])
);
assert(
  csvOutput.includes('"Product","Net Sales"') &&
    csvOutput.includes('"Classic Sneakers"'),
  'CSV export builder produces properly quoted headers and rows'
);

console.log('--- ALL SALES & EARNINGS SCENARIOS VERIFIED SUCCESSFULLY ---');
