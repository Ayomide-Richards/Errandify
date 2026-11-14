import {
  SalesStorage,
  buildSalesChartBuckets,
  calculateOverviewMetrics,
  calculateProductPerformance,
  calculateSettlementSummaryMetrics,
  filterSettlementsByWindow,
  filterTransactionsByWindow,
  getReferenceDate,
  resolveReportingPeriodWindow,
} from '../services/salesStorage';

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

console.log('--- RUNNING REVISED SALES & EARNINGS VERIFICATION SUITE ---');

// 1. Verify initial transactions and combined settlements
const transactions = SalesStorage.getTransactions();
const settlements = SalesStorage.getSettlements();

assert(
  transactions.length === 11,
  `Loaded 11 transactions across active and historical store orders (got ${transactions.length})`
);
assert(
  settlements.length === 2,
  `Loaded 2 automatic combined settlements (got ${settlements.length})`
);

// 2. Verify 'Picked Up' order status does NOT automatically release escrow
const pickedUpInEscrow = transactions.find(
  (t) => t.sourceOrderId === 'ord-1005'
);
assert(
  pickedUpInEscrow !== undefined &&
    pickedUpInEscrow.orderStatusLabel === 'Picked Up' &&
    pickedUpInEscrow.paymentStatus === 'confirmed' &&
    pickedUpInEscrow.deliveryConfirmed === false &&
    pickedUpInEscrow.fundsStatus === 'in_escrow',
  'Order ord-1005 (Picked Up by runner) remains In Escrow until customer delivery confirmation code is verified'
);

// 3. Verify Processing settlement orders have fundsStatus === 'awaiting_settlement' (not 'settled')
const processingSettlement = settlements.find(
  (s) => s.id === 'set-2026-1109'
);
assert(
  processingSettlement !== undefined &&
    processingSettlement.status === 'processing' &&
    processingSettlement.orders.length === 2 &&
    processingSettlement.settlementAmount === 120500,
  'Processing settlement set-2026-1109 combines 2 delivered orders totaling ₦120,500'
);

const processingOrderTx = transactions.find(
  (t) => t.sourceOrderId === 'ord-1004'
);
assert(
  processingOrderTx !== undefined &&
    processingOrderTx.deliveryConfirmed === true &&
    processingOrderTx.fundsStatus === 'awaiting_settlement',
  'Delivered order in a Processing settlement has Funds Status = Awaiting Settlement (never prematurely marked Settled)'
);

// 4. Verify Paid settlement orders have fundsStatus === 'settled'
const paidSettlement = settlements.find((s) => s.id === 'set-2026-1106');
assert(
  paidSettlement !== undefined &&
    paidSettlement.status === 'paid' &&
    paidSettlement.orders.length === 2 &&
    paidSettlement.settlementAmount === 116000 &&
    paidSettlement.transactionReference === 'NIP-GTB-20261106-884120',
  'Paid settlement set-2026-1106 combines 2 delivered orders totaling ₦116,000 with bank & reference details'
);

const settledOrderTx = transactions.find((t) => t.sourceOrderId === 'ord-0998');
assert(
  settledOrderTx !== undefined &&
    settledOrderTx.deliveryConfirmed === true &&
    settledOrderTx.fundsStatus === 'settled',
  'Delivered order in a Paid settlement has Funds Status = Settled'
);

// 5. Verify Refunded transaction handling
const refundedTx = transactions.find((t) => t.sourceOrderId === 'ord-1001');
assert(
  refundedTx !== undefined &&
    refundedTx.paymentStatus === 'refunded' &&
    refundedTx.fundsStatus === 'refunded' &&
    refundedTx.refundedAmount === 25000 &&
    refundedTx.netAmount === 0,
  'Refunded transaction ord-1001 has Payment Status = Refunded, Funds Status = Refunded, and ₦0 net sales contribution'
);

// 6. Verify Overview & Settlements metrics reconciliation (Zero double-counting)
const refDate = getReferenceDate(transactions);
const last7Window = resolveReportingPeriodWindow(
  'last_7_days',
  undefined,
  undefined,
  refDate
);
const last7Tx = filterTransactionsByWindow(transactions, last7Window);
const last7Settlements = filterSettlementsByWindow(settlements, last7Window);

const overviewMetrics = calculateOverviewMetrics(last7Tx);
const settlementMetrics = calculateSettlementSummaryMetrics(
  last7Tx,
  last7Settlements
);

// Expected:
// In Escrow (Awaiting Release): 55,350 + 54,000 + 81,000 + 45,000 + 59,000 + 78,000 = 372,350 (6 orders)
// Awaiting Settlement (Processing): 61,500 + 59,000 = 120,500 (2 orders)
// Released (Successfully Paid): 35,000 + 81,000 = 116,000 (2 orders)
// Total Sales = 372,350 + 120,500 + 116,000 = 608,850 (10 paid orders)
assert(
  overviewMetrics.totalOrders === 10,
  `Overview Total Orders = 10 paid orders (got ${overviewMetrics.totalOrders})`
);
assert(
  overviewMetrics.awaitingRelease === 372350,
  `Overview Awaiting Release (In Escrow) = ₦372,350 (got ${overviewMetrics.awaitingRelease})`
);
assert(
  overviewMetrics.awaitingSettlement === 120500,
  `Overview Awaiting Settlement (Processing) = ₦120,500 (got ${overviewMetrics.awaitingSettlement})`
);
assert(
  overviewMetrics.released === 116000,
  `Overview Released (Settled) = ₦116,000 (got ${overviewMetrics.released})`
);
assert(
  overviewMetrics.totalSales === 608850 &&
    overviewMetrics.awaitingRelease +
      overviewMetrics.awaitingSettlement +
      overviewMetrics.released ===
      overviewMetrics.totalSales,
  'Overview Total Sales (₦608,850) reconciles 100% with Awaiting Release + Awaiting Settlement + Released with zero double-counting'
);

assert(
  settlementMetrics.awaitingRelease === 372350 &&
    settlementMetrics.processing === 120500 &&
    settlementMetrics.successfullyPaid === 116000,
  'Settlements summary cards (Awaiting Release ₦372,350, Processing ₦120,500, Successfully Paid ₦116,000) reconcile 100% with Overview'
);

// 7. Verify Chart Buckets & Top-Selling Products reconcile with Total Sales
const buckets = buildSalesChartBuckets(last7Tx, last7Window);
const bucketSum = buckets.reduce((sum, b) => sum + b.salesAmount, 0);
assert(
  bucketSum === overviewMetrics.totalSales,
  `Sales chart buckets sum (₦${bucketSum}) reconciles 100% with Total Sales (₦${overviewMetrics.totalSales})`
);

const topProducts = calculateProductPerformance(last7Tx);
const productSalesSum = topProducts.reduce((sum, p) => sum + p.salesValue, 0);
assert(
  productSalesSum === overviewMetrics.totalSales,
  `Top-selling products sales value sum (₦${productSalesSum}) reconciles 100% with Total Sales (₦${overviewMetrics.totalSales})`
);

console.log('--- ALL REVISED SALES & EARNINGS SCENARIOS VERIFIED ---');
