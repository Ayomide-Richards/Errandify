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

// 3. Verify Processing withdrawal (set-2026-1109, ₦59,000) and Available Earnings order (ord-1004, ₦61,500)
const processingSettlement = settlements.find(
  (s) => s.id === 'set-2026-1109'
);
assert(
  processingSettlement !== undefined &&
    processingSettlement.status === 'processing' &&
    processingSettlement.orders.length === 1 &&
    processingSettlement.settlementAmount === 59000 &&
    processingSettlement.processingHours === 72 &&
    processingSettlement.expectedPayoutDate === 'Nov 12, 2026, 09:00 AM',
  'Pending withdrawal set-2026-1109 (₦59,000 from ord-1002) is in its 72-hour processing period with expected payout Nov 12, 2026, 09:00 AM'
);

const availableOrderTx = transactions.find(
  (t) => t.sourceOrderId === 'ord-1004'
);
assert(
  availableOrderTx !== undefined &&
    availableOrderTx.deliveryConfirmed === true &&
    availableOrderTx.fundsStatus === 'awaiting_settlement' &&
    !availableOrderTx.settlementId,
  'Delivered order ord-1004 (₦61,500) has verified customer delivery confirmation and is available for withdrawal or promotion spending'
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

// 6. Verify Overview, Settlements, and Earnings Balance Summary reconciliation (Zero double-counting)
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
const initialBalanceSummary = SalesStorage.getEarningsBalanceSummary();

// Expected:
// In Escrow (Awaiting Release): 55,350 + 54,000 + 81,000 + 45,000 + 59,000 + 78,000 = 372,350 (6 orders)
// Delivery-Confirmed (Released from Escrow): 61,500 (ord-1004 Available) + 59,000 (ord-1002 Pending 72h Withdrawal) + 116,000 (ord-0998 + ord-0995 Paid) = 236,500
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
  `Overview Awaiting Settlement (Available + Pending Withdrawal) = ₦120,500 (got ${overviewMetrics.awaitingSettlement})`
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
    settlementMetrics.availableEarnings === 61500 &&
    settlementMetrics.processing === 59000 &&
    settlementMetrics.successfullyPaid === 116000,
  'Settlements & Withdrawals summary cards distinguish Available Earnings (₦61,500), Pending Withdrawals (₦59,000), Successfully Paid (₦116,000), and In Escrow (₦372,350)'
);

assert(
  initialBalanceSummary.availableEarnings === 61500 &&
    initialBalanceSummary.pendingWithdrawals === 59000 &&
    initialBalanceSummary.successfullyPaidWithdrawals === 116000 &&
    initialBalanceSummary.awaitingReleaseInEscrow === 372350,
  'EarningsBalanceSummary accurately distinguishes Available Earnings (₦61,500), Pending Withdrawals (₦59,000), Paid Withdrawals (₦116,000), and Unreleased Escrow (₦372,350)'
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

// 8. Verify Merchant Withdrawal Flow, 72-Hour Processing Period, Duplicate Prevention, and Escrow/Over-withdrawal Protection
const requestTime = new Date('2026-11-10T10:00:00.000Z');
const wdrRes = SalesStorage.requestWithdrawal({
  amount: 25000,
  idempotencyKey: 'idem-wdr-001',
  requestedAt: requestTime,
});
assert(
  wdrRes.deduplicated === false &&
    wdrRes.withdrawal.status === 'processing' &&
    wdrRes.withdrawal.settlementAmount === 25000 &&
    wdrRes.withdrawal.paidDate === undefined &&
    wdrRes.withdrawal.expectedPayoutAt === '2026-11-13T10:00:00.000Z' &&
    wdrRes.withdrawal.bankName === 'Guaranty Trust Bank (GTBank)' &&
    wdrRes.withdrawal.maskedAccountNumber === '****4821' &&
    wdrRes.balanceSummary.availableEarnings === 36500 &&
    wdrRes.balanceSummary.pendingWithdrawals === 84000,
  '8a. Submitting a ₦25,000 withdrawal request does NOT deposit immediately, sets a 72-hour processing period (expected 2026-11-13T10:00:00.000Z), uses registered bank account, reduces Available Earnings to ₦36,500, and increases Pending Withdrawals to ₦84,000'
);

// Duplicate withdrawal request with same idempotencyKey is deduplicated
const wdrRetry = SalesStorage.requestWithdrawal({
  amount: 25000,
  idempotencyKey: 'idem-wdr-001',
  requestedAt: requestTime,
});
assert(
  wdrRetry.deduplicated === true &&
    wdrRetry.balanceSummary.availableEarnings === 36500 &&
    wdrRetry.balanceSummary.pendingWithdrawals === 84000,
  '8b. Retrying withdrawal request with the same idempotencyKey is deduplicated without deducting Available Earnings twice'
);

// Attempting to withdraw more than remaining Available Earnings (₦36,500) — e.g. trying to withdraw unreleased escrow or pending withdrawal funds — is blocked
let overWithdrawBlocked = false;
try {
  SalesStorage.requestWithdrawal({
    amount: 40000,
    requestedAt: requestTime,
  });
} catch {
  overWithdrawBlocked = true;
}
assert(
  overWithdrawBlocked &&
    SalesStorage.getEarningsBalanceSummary().availableEarnings === 36500,
  '8c. Backend blocks withdrawal requests exceeding Available Earnings (₦36,500) — unreleased escrow funds and pending withdrawals cannot be withdrawn'
);

// Attempting to complete payout BEFORE 72 hours (e.g. after 48 hours on 2026-11-12T10:00:00.000Z) is blocked
let prematurePayoutBlocked = false;
try {
  SalesStorage.completeWithdrawalAfter72Hours(
    wdrRes.withdrawal.id,
    new Date('2026-11-12T10:00:00.000Z')
  );
} catch {
  prematurePayoutBlocked = true;
}
assert(
  prematurePayoutBlocked &&
    SalesStorage.getSettlements().find((s) => s.id === wdrRes.withdrawal.id)
      ?.status === 'processing',
  '8d. Withdrawal cannot be deposited before the 72-hour processing period completes (at 48h it remains in processing)'
);

// After 72 hours elapse (2026-11-13T10:00:00.000Z), withdrawal matures to 'paid'
const maturedRes = SalesStorage.completeWithdrawalAfter72Hours(
  wdrRes.withdrawal.id,
  new Date('2026-11-13T10:00:00.000Z')
);
assert(
  maturedRes.withdrawal.status === 'paid' &&
    Boolean(maturedRes.withdrawal.paidDate) &&
    Boolean(maturedRes.withdrawal.transactionReference?.startsWith('NIP-')) &&
    maturedRes.balanceSummary.availableEarnings === 36500 &&
    maturedRes.balanceSummary.successfullyPaidWithdrawals === 200000 && // 116,000 + 59,000 (matured on Nov 12) + 25,000 (matured on Nov 13)
    maturedRes.balanceSummary.pendingWithdrawals === 0,
  '8e. After 72 hours elapse, pending withdrawals transition to Paid, record bank deposit reference, move from Pending Withdrawals to Successfully Paid Withdrawals, and preserve Available Earnings (₦36,500)'
);

SalesStorage.resetSalesAndWithdrawals();

console.log('--- ALL REVISED SALES & EARNINGS SCENARIOS VERIFIED ---');
