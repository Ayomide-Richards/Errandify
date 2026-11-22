import React, { useState, useEffect, useMemo } from 'react';
import type {
  EarningsBalanceSummary,
  FundsStatus,
  PaymentStatus,
  ReportingPeriodPreset,
  SalesFinancialLedgerEntry,
  SalesSubTab,
  SalesTransaction,
  SettlementRecord,
  SettlementStatus,
  TransactionFiltersState,
  TransactionSortOption,
} from '../../types/sales';
import {
  REPORTING_PERIOD_LABELS,
  SalesStorage,
  WITHDRAWAL_PROCESSING_HOURS,
  WITHDRAWAL_PROCESSING_MS,
  buildSalesChartBuckets,
  calculateOverviewMetrics,
  calculateProductPerformance,
  calculateSettlementSummaryMetrics,
  filterSettlementsByWindow,
  filterTransactionsByWindow,
  formatDateTimeWithTz,
  getReferenceDate,
  resolveReportingPeriodWindow,
} from '../../services/salesStorage';
import { formatNaira } from '../../services/productStorage';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  FundsStatusBadge,
  PaymentStatusBadge,
  SettlementStatusBadge,
} from './SalesStatusBadges';
import { SalesPerformanceChart } from './SalesPerformanceChart';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { SettlementDetailsModal } from './SettlementDetailsModal';
import {
  Calendar,
  Search,
  X,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Package,
  Landmark,
  BarChart3,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Wallet,
  Megaphone,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

const SUB_TABS: Array<{
  id: SalesSubTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'settlements', label: 'Settlements', icon: Landmark },
];

const OVERVIEW_PERIOD_PRESETS: ReportingPeriodPreset[] = [
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'custom',
];

export const SalesAndEarningsView: React.FC = () => {
  // Sub-navigation inside Sales & Earnings (Overview | Transactions | Settlements)
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>('overview');

  // Underlying financial data state
  const [transactions, setTransactions] = useState<SalesTransaction[]>(() =>
    SalesStorage.getTransactions()
  );
  const [settlements, setSettlements] = useState<SettlementRecord[]>(() =>
    SalesStorage.getSettlements()
  );
  const [earningsSummary, setEarningsSummary] =
    useState<EarningsBalanceSummary>(() =>
      SalesStorage.getEarningsBalanceSummary()
    );
  const [financialLedger, setFinancialLedger] = useState<
    SalesFinancialLedgerEntry[]
  >(() => SalesStorage.getFinancialLedger());

  // Withdraw Earnings Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [submittedWithdrawal, setSubmittedWithdrawal] =
    useState<SettlementRecord | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Overview Reporting Period State (default Last 7 Days)
  const [overviewPreset, setOverviewPreset] =
    useState<ReportingPeriodPreset>('last_7_days');
  const [overviewCustomFrom, setOverviewCustomFrom] = useState('2026-11-01');
  const [overviewCustomTo, setOverviewCustomTo] = useState('2026-11-10');

  // Transactions Tab Filter & Pagination State
  const [txFilters, setTxFilters] = useState<TransactionFiltersState>({
    search: '',
    paymentStatus: 'all',
    fundsStatus: 'all',
    periodPreset: 'all',
    customFrom: '2026-11-01',
    customTo: '2026-11-10',
    sortBy: 'date_desc',
  });
  const [txPage, setTxPage] = useState(1);
  const txPageSize = 10;

  // Settlements Tab Filter State
  const [settlementPreset, setSettlementPreset] = useState<
    'all' | ReportingPeriodPreset
  >('all');
  const [settlementCustomFrom, setSettlementCustomFrom] =
    useState('2026-11-01');
  const [settlementCustomTo, setSettlementCustomTo] = useState('2026-11-10');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<
    'all' | SettlementStatus
  >('all');

  // Detail Modals State
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<
    string | null
  >(null);

  const loadFinancialData = () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setTransactions(SalesStorage.getTransactions());
      setSettlements(SalesStorage.getSettlements());
      setEarningsSummary(SalesStorage.getEarningsBalanceSummary());
      setFinancialLedger(SalesStorage.getFinancialLedger());
    } catch (err: any) {
      setLoadError(
        err?.message || 'Unable to load store financial records. Please retry.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const syncData = () => {
      setTransactions(SalesStorage.getTransactions());
      setSettlements(SalesStorage.getSettlements());
      setEarningsSummary(SalesStorage.getEarningsBalanceSummary());
      setFinancialLedger(SalesStorage.getFinancialLedger());
    };
    window.addEventListener('errandify:orders-updated', syncData);
    window.addEventListener('errandify:sales-updated', syncData);
    window.addEventListener('errandify:ads-updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      window.removeEventListener('errandify:orders-updated', syncData);
      window.removeEventListener('errandify:sales-updated', syncData);
      window.removeEventListener('errandify:ads-updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const handleOpenWithdrawModal = () => {
    const freshSummary = SalesStorage.getEarningsBalanceSummary();
    setEarningsSummary(freshSummary);
    setWithdrawError(null);
    setSubmittedWithdrawal(null);
    setWithdrawAmountInput(
      freshSummary.availableEarnings > 0
        ? String(freshSummary.availableEarnings)
        : ''
    );
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    const parsed = Number(withdrawAmountInput.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setWithdrawError(
        'Please enter a valid withdrawal amount greater than ₦0.'
      );
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const idempotencyKey = `wdr-idem-${Math.round(parsed)}-${Date.now()}`;
      const res = SalesStorage.requestWithdrawal({
        amount: parsed,
        idempotencyKey,
      });
      setTransactions(SalesStorage.getTransactions());
      setSettlements(SalesStorage.getSettlements());
      setEarningsSummary(res.balanceSummary);
      setFinancialLedger(SalesStorage.getFinancialLedger());
      setSubmittedWithdrawal(res.withdrawal);
    } catch (err: any) {
      setWithdrawError(
        err?.message ||
          'Could not submit withdrawal request. Please check your available balance.'
      );
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleCompletePendingWithdrawalAfter72h = (
    target: SettlementRecord
  ) => {
    try {
      const expectedDate = target.expectedPayoutAt
        ? new Date(target.expectedPayoutAt)
        : new Date(
            new Date(target.createdAt).getTime() + WITHDRAWAL_PROCESSING_MS
          );
      SalesStorage.completeWithdrawalAfter72Hours(target.id, expectedDate);
      setTransactions(SalesStorage.getTransactions());
      setSettlements(SalesStorage.getSettlements());
      setEarningsSummary(SalesStorage.getEarningsBalanceSummary());
      setFinancialLedger(SalesStorage.getFinancialLedger());
    } catch (err: any) {
      alert(err?.message || 'Could not complete withdrawal payout.');
    }
  };

  const pendingWithdrawalsList = useMemo(
    () => settlements.filter((s) => s.status === 'processing'),
    [settlements]
  );

  const referenceDate = useMemo(
    () => getReferenceDate(transactions),
    [transactions]
  );

  // ============================================================================
  // 1. OVERVIEW TAB COMPUTATIONS
  // ============================================================================
  const overviewWindow = useMemo(
    () =>
      resolveReportingPeriodWindow(
        overviewPreset,
        overviewCustomFrom,
        overviewCustomTo,
        referenceDate
      ),
    [overviewPreset, overviewCustomFrom, overviewCustomTo, referenceDate]
  );

  const overviewTransactions = useMemo(
    () => filterTransactionsByWindow(transactions, overviewWindow),
    [transactions, overviewWindow]
  );

  const overviewMetrics = useMemo(
    () => calculateOverviewMetrics(overviewTransactions),
    [overviewTransactions]
  );

  const overviewChartBuckets = useMemo(
    () => buildSalesChartBuckets(overviewTransactions, overviewWindow),
    [overviewTransactions, overviewWindow]
  );

  const overviewTopProducts = useMemo(
    () => calculateProductPerformance(overviewTransactions),
    [overviewTransactions]
  );

  // ============================================================================
  // 2. TRANSACTIONS TAB COMPUTATIONS
  // ============================================================================
  const hasActiveTxFilters =
    txFilters.search.trim() !== '' ||
    txFilters.paymentStatus !== 'all' ||
    txFilters.fundsStatus !== 'all' ||
    txFilters.periodPreset !== 'all' ||
    txFilters.sortBy !== 'date_desc';

  const handleResetTxFilters = () => {
    setTxFilters({
      search: '',
      paymentStatus: 'all',
      fundsStatus: 'all',
      periodPreset: 'all',
      customFrom: '2026-11-01',
      customTo: '2026-11-10',
      sortBy: 'date_desc',
    });
    setTxPage(1);
  };

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Date preset filter
    if (txFilters.periodPreset !== 'all') {
      const win = resolveReportingPeriodWindow(
        txFilters.periodPreset,
        txFilters.customFrom,
        txFilters.customTo,
        referenceDate
      );
      list = filterTransactionsByWindow(list, win);
    }

    // Payment Status filter
    if (txFilters.paymentStatus !== 'all') {
      list = list.filter((tx) => tx.paymentStatus === txFilters.paymentStatus);
    }

    // Funds Status filter
    if (txFilters.fundsStatus !== 'all') {
      list = list.filter((tx) => tx.fundsStatus === txFilters.fundsStatus);
    }

    // Search by customer name or product name (including options)
    if (txFilters.search.trim()) {
      const q = txFilters.search.trim().toLowerCase();
      list = list.filter((tx) => {
        const matchCustomer = tx.customerName.toLowerCase().includes(q);
        const matchSummary = tx.itemSummary.toLowerCase().includes(q);
        const matchItem = tx.items.some(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.selectedOptionsLabel &&
              i.selectedOptionsLabel.toLowerCase().includes(q))
        );
        return matchCustomer || matchSummary || matchItem;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (txFilters.sortBy === 'amount_desc')
        return b.orderValue - a.orderValue;
      if (txFilters.sortBy === 'amount_asc')
        return a.orderValue - b.orderValue;
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (txFilters.sortBy === 'date_asc') return timeA - timeB;
      return timeB - timeA;
    });

    return list;
  }, [transactions, txFilters, referenceDate]);

  const txTotalItems = filteredTransactions.length;
  const txTotalPages = Math.max(1, Math.ceil(txTotalItems / txPageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage, txPageSize]);

  // ============================================================================
  // 3. SETTLEMENTS TAB COMPUTATIONS
  // ============================================================================
  const settlementPeriodTransactions = useMemo(() => {
    if (settlementPreset === 'all') return transactions;
    const win = resolveReportingPeriodWindow(
      settlementPreset,
      settlementCustomFrom,
      settlementCustomTo,
      referenceDate
    );
    return filterTransactionsByWindow(transactions, win);
  }, [
    transactions,
    settlementPreset,
    settlementCustomFrom,
    settlementCustomTo,
    referenceDate,
  ]);

  const settlementPeriodRecords = useMemo(() => {
    if (settlementPreset === 'all') return settlements;
    const win = resolveReportingPeriodWindow(
      settlementPreset,
      settlementCustomFrom,
      settlementCustomTo,
      referenceDate
    );
    return filterSettlementsByWindow(settlements, win);
  }, [
    settlements,
    settlementPreset,
    settlementCustomFrom,
    settlementCustomTo,
    referenceDate,
  ]);

  const filteredSettlements = useMemo(() => {
    let list = [...settlementPeriodRecords];
    if (settlementStatusFilter !== 'all') {
      list = list.filter((s) => s.status === settlementStatusFilter);
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [settlementPeriodRecords, settlementStatusFilter]);

  const settlementSummaryMetrics = useMemo(
    () =>
      calculateSettlementSummaryMetrics(
        settlementPeriodTransactions,
        settlementPeriodRecords,
        earningsSummary.promotionSpendFromEarnings
      ),
    [
      settlementPeriodTransactions,
      settlementPeriodRecords,
      earningsSummary.promotionSpendFromEarnings,
    ]
  );

  const selectedTransaction =
    transactions.find((t) => t.id === selectedTransactionId) || null;
  const selectedTransactionSettlement = useMemo(() => {
    if (!selectedTransaction?.settlementId) return null;
    return (
      settlements.find((s) => s.id === selectedTransaction.settlementId) ||
      null
    );
  }, [selectedTransaction, settlements]);

  const selectedSettlement =
    settlements.find((s) => s.id === selectedSettlementId) || null;

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sales & Earnings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your product sales, funds held in escrow, and automatic bank
            settlements.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 h-32 animate-pulse"
            >
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-36 bg-slate-200 rounded mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (loadError) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sales & Earnings
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-red-900">
            Unable to Load Financial Records
          </h3>
          <p className="text-xs text-red-700 max-w-md mx-auto">{loadError}</p>
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadFinancialData}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with Withdraw Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sales & Earnings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your product sales, funds held in escrow, available earnings,
            and 72-hour bank withdrawals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#F8F6FE] border border-[#DDD0FA] text-xs">
            <span className="text-slate-500">Available to Withdraw: </span>
            <span className="font-extrabold text-[#5E17EB] tabular-nums">
              {formatNaira(earningsSummary.availableEarnings)}
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenWithdrawModal}
            leftIcon={<Landmark className="w-4 h-4" />}
          >
            Withdraw
          </Button>
        </div>
      </div>

      {/* Merchant Earnings & Withdrawals Balance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Available Earnings */}
        <div className="bg-white border-2 border-[#5E17EB]/30 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#5E17EB] flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#5E17EB]" />
                Available Earnings
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA]">
                Eligible to Withdraw
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatNaira(earningsSummary.availableEarnings)}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Delivery-confirmed earnings ready for bank withdrawal or paying
              for product promotions.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              className="text-xs font-bold text-[#5E17EB] hover:text-[#4E12C6] inline-flex items-center gap-1"
            >
              <span>Initiate Withdrawal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            {earningsSummary.promotionSpendFromEarnings > 0 && (
              <span className="text-[10px] font-semibold text-slate-500">
                Promo Spend:{' '}
                {formatNaira(earningsSummary.promotionSpendFromEarnings)}
              </span>
            )}
          </div>
        </div>

        {/* 2. Pending Withdrawals (72-Hour Processing) */}
        <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#5E17EB] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#5E17EB]" />
                Pending Withdrawals
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                {earningsSummary.pendingWithdrawalCount} · 72h Processing
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] tracking-tight tabular-nums">
              {formatNaira(earningsSummary.pendingWithdrawals)}
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Withdrawals in the mandatory {WITHDRAWAL_PROCESSING_HOURS}-hour
              customer satisfaction period before deposit.
            </p>
          </div>
          {pendingWithdrawalsList[0]?.expectedPayoutDate && (
            <p className="text-[11px] font-semibold text-[#5E17EB] pt-2 border-t border-[#DDD0FA]/70">
              Next Payout: {pendingWithdrawalsList[0].expectedPayoutDate}
            </p>
          )}
        </div>

        {/* 3. Successfully Paid Withdrawals */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Successfully Paid Withdrawals
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                {earningsSummary.paidWithdrawalCount} Paid Out
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatNaira(earningsSummary.successfullyPaidWithdrawals)}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Completed withdrawals deposited into{' '}
              {earningsSummary.bankDetails.bankName} (
              {earningsSummary.bankDetails.maskedAccountNumber}).
            </p>
          </div>
        </div>

        {/* 4. Awaiting Release (In Escrow) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Awaiting Release (Escrow)
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]">
                {earningsSummary.inEscrowOrderCount} In Escrow
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatNaira(earningsSummary.awaitingReleaseInEscrow)}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Paid orders awaiting customer delivery confirmation code. Cannot
              be withdrawn or spent until released.
            </p>
          </div>
        </div>
      </div>

      {/* Page-Level Navigation Tabs: Overview | Transactions | Settlements */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-[#5E17EB] text-[#5E17EB]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#5E17EB]' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================================================
          TAB 1: OVERVIEW
          ========================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Range Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <div className="w-8 h-8 rounded-xl bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">
                    Date Range: {overviewWindow.label} (
                    {overviewWindow.formattedRange})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Showing merchant product sales and settlement status
                  </span>
                </div>
              </div>

              {/* Selectable Period Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {OVERVIEW_PERIOD_PRESETS.map((preset) => {
                  const active = overviewPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOverviewPreset(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-[#5E17EB] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      {REPORTING_PERIOD_LABELS[preset]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {overviewPreset === 'custom' && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">
                  Custom Date Range:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">From</label>
                  <input
                    type="date"
                    value={overviewCustomFrom}
                    onChange={(e) => setOverviewCustomFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">To</label>
                  <input
                    type="date"
                    value={overviewCustomTo}
                    onChange={(e) => setOverviewCustomTo(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4 Summary Cards: Total Sales, Awaiting Release, Released, Total Orders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Sales */}
            <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#5E17EB]">
                  Total Sales
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#5E17EB] border border-[#DDD0FA]">
                  Net of Refunds
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.totalSales)}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Total value of successfully paid product orders, adjusted for
                applicable refunds.
              </p>
            </div>

            {/* 2. Awaiting Release */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Awaiting Release
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]">
                  In Escrow
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.awaitingRelease)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Earnings from paid orders in escrow awaiting customer delivery
                confirmation.
                {overviewMetrics.awaitingSettlement > 0 && (
                  <span className="block text-sky-700 font-medium mt-0.5">
                    +{formatNaira(overviewMetrics.awaitingSettlement)} delivery
                    confirmed (processing settlement)
                  </span>
                )}
              </p>
            </div>

            {/* 3. Released */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Released
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                  Paid Out
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.released)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Merchant funds successfully paid out through completed
                settlements.
              </p>
            </div>

            {/* 4. Total Orders */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Total Orders
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Paid Orders
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {overviewMetrics.totalOrders}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Number of successfully paid orders within the selected date
                range.
              </p>
            </div>
          </div>

          {/* Pending Withdrawals (72-Hour Processing Period) Banner on Overview */}
          {pendingWithdrawalsList.length > 0 && (
            <div className="bg-white border border-[#DDD0FA] rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5E17EB]" />
                      Pending Withdrawals ({WITHDRAWAL_PROCESSING_HOURS}-Hour
                      Processing Period)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                      {pendingWithdrawalsList.length} Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Withdrawals are held in a 72-hour processing period to allow
                    customers time to confirm satisfaction with their orders
                    before funds are deposited into your registered bank
                    account.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubTab('settlements')}
                >
                  View All in Settlements
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5">Reference</th>
                        <th className="py-2.5 px-3.5">Request Date & Time</th>
                        <th className="py-2.5 px-3.5">
                          Expected Payout Date & Time (72h)
                        </th>
                        <th className="py-2.5 px-3.5">Destination Bank</th>
                        <th className="py-2.5 px-3.5 text-right">Amount</th>
                        <th className="py-2.5 px-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingWithdrawalsList.map((pw) => (
                        <tr
                          key={pw.id}
                          onClick={() => setSelectedSettlementId(pw.id)}
                          className="hover:bg-[#F8F9FE] cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {pw.transactionReference || pw.id}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {pw.processingDate || pw.settlementDate}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-[#5E17EB] whitespace-nowrap">
                            {pw.expectedPayoutDate ||
                              '72 hours after request'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {pw.bankName ||
                              earningsSummary.bankDetails.bankName}{' '}
                            (
                            {pw.maskedAccountNumber ||
                              earningsSummary.bankDetails.maskedAccountNumber}
                            )
                          </td>
                          <td className="py-3 px-3.5 text-right font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatNaira(pw.settlementAmount)}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <SettlementStatusBadge status={pw.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sales Chart */}
          <SalesPerformanceChart
            buckets={overviewChartBuckets}
            periodWindow={overviewWindow}
            hasAnyStoreSales={transactions.length > 0}
          />

          {/* Top-Selling Products */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#5E17EB]" />
                  Top-Selling Products
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Products ranked by sales value during{' '}
                  {overviewWindow.formattedRange}.
                </p>
              </div>
            </div>

            {overviewTopProducts.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2 bg-slate-50/50">
                <ShoppingBag className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  No product sales in this period
                </p>
                <p className="text-[11px] text-slate-500">
                  Select a date range with paid orders to view top-selling
                  products.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-3 text-center whitespace-nowrap">
                          Units Sold
                        </th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">
                          Sales Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overviewTopProducts.slice(0, 6).map((prod, idx) => (
                        <tr
                          key={prod.productKey}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-[#F3EFFE] text-[#5E17EB] font-bold text-[11px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                                {prod.image ? (
                                  <img
                                    src={prod.image}
                                    alt={prod.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {prod.productName}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {prod.ordersCount}{' '}
                                  {prod.ordersCount === 1 ? 'order' : 'orders'}
                                  {prod.unit ? ` · ${prod.unit}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800 tabular-nums whitespace-nowrap">
                            {prod.quantitySold}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                            {formatNaira(prod.salesValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
          TAB 2: TRANSACTIONS
          ========================================================================== */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-5">
          {/* Sales Earnings Withdrawals & Promotion Payments Activity Ledger */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#5E17EB]" />
                  Sales Earnings Withdrawals &amp; Promotion Payments
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Traceable record of merchant withdrawals and promotion
                  campaigns funded directly from your eligible available sales
                  earnings.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F8F6FE] text-[#5E17EB] border border-[#DDD0FA] self-start sm:self-auto">
                Source: Sales &amp; Earnings
              </span>
            </div>

            {financialLedger.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                No withdrawals or promotion payments from sales earnings
                recorded yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5">Date &amp; Time</th>
                        <th className="py-2.5 px-3.5">Activity Type</th>
                        <th className="py-2.5 px-3.5">
                          Description &amp; Reference
                        </th>
                        <th className="py-2.5 px-3.5">Payment Source</th>
                        <th className="py-2.5 px-3.5 text-right">Amount</th>
                        <th className="py-2.5 px-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {financialLedger.map((entry) => {
                        const isPromo =
                          entry.type === 'promotion_hold' ||
                          entry.type === 'promotion_charge' ||
                          entry.type === 'promotion_release';
                        const isCredit = entry.direction === 'credit';
                        return (
                          <tr
                            key={entry.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                              {entry.formattedDate}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isPromo
                                    ? 'bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA]'
                                    : entry.type === 'withdrawal_paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                                }`}
                              >
                                {entry.type === 'withdrawal_requested'
                                  ? 'Withdrawal Requested (72h)'
                                  : entry.type === 'withdrawal_paid'
                                    ? 'Withdrawal Paid'
                                    : entry.type === 'promotion_hold'
                                      ? 'Promotion Reserved'
                                      : entry.type === 'promotion_charge'
                                        ? 'Promotion Charged'
                                        : 'Promotion Hold Released'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <p className="font-semibold text-slate-900">
                                {entry.description}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Ref: {entry.reference}
                                {entry.expectedPayoutDate &&
                                  entry.type === 'withdrawal_requested' &&
                                  ` · Expected Payout: ${entry.expectedPayoutDate}`}
                              </p>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                                Sales Earnings
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-extrabold tabular-nums whitespace-nowrap">
                              <span
                                className={
                                  isCredit
                                    ? 'text-emerald-700'
                                    : 'text-slate-900'
                                }
                              >
                                {isCredit ? '+' : '−'}
                                {formatNaira(entry.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  entry.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : entry.status === 'processing'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : entry.status === 'released'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {entry.status === 'processing'
                                  ? isPromo
                                    ? 'Reserved'
                                    : '72h Processing'
                                  : entry.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Search & Filters Controls */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions by customer name or product..."
                value={txFilters.search}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }));
                  setTxPage(1);
                }}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] focus:bg-white transition-all"
              />
              {txFilters.search && (
                <button
                  type="button"
                  onClick={() => {
                    setTxFilters((prev) => ({ ...prev, search: '' }));
                    setTxPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* 1. Payment Status Filter */}
              <select
                value={txFilters.paymentStatus}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    paymentStatus: e.target.value as 'all' | PaymentStatus,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="all">Payment Status: All</option>
                <option value="confirmed">Payment Status: Confirmed</option>
                <option value="pending">Payment Status: Pending</option>
                <option value="failed">Payment Status: Failed</option>
                <option value="refunded">Payment Status: Refunded</option>
              </select>

              {/* 2. Funds Status Filter */}
              <select
                value={txFilters.fundsStatus}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    fundsStatus: e.target.value as 'all' | FundsStatus,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="all">Funds Status: All</option>
                <option value="in_escrow">Funds Status: In Escrow</option>
                <option value="awaiting_settlement">
                  Funds Status: Awaiting Settlement
                </option>
                <option value="settled">Funds Status: Settled</option>
                <option value="refunded">Funds Status: Refunded</option>
              </select>

              {/* 3. Date Preset Filter */}
              <select
                value={txFilters.periodPreset}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    periodPreset: e.target.value as
                      | 'all'
                      | ReportingPeriodPreset,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="all">Date: All Recorded Dates</option>
                <option value="today">Date: Today</option>
                <option value="last_7_days">Date: Last 7 Days</option>
                <option value="last_30_days">Date: Last 30 Days</option>
                <option value="this_month">Date: This Month</option>
                <option value="last_month">Date: Last Month</option>
                <option value="custom">Date: Custom Range</option>
              </select>

              {/* 4. Sort By */}
              <select
                value={txFilters.sortBy}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as TransactionSortOption,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="date_desc">Sort: Date (Newest First)</option>
                <option value="date_asc">Sort: Date (Oldest First)</option>
                <option value="amount_desc">Sort: Amount (High to Low)</option>
                <option value="amount_asc">Sort: Amount (Low to High)</option>
              </select>
            </div>

            {/* Custom Date Range Picker for Transactions */}
            {txFilters.periodPreset === 'custom' && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">
                  Custom Date Range:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">From</label>
                  <input
                    type="date"
                    value={txFilters.customFrom}
                    onChange={(e) => {
                      setTxFilters((prev) => ({
                        ...prev,
                        customFrom: e.target.value,
                      }));
                      setTxPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">To</label>
                  <input
                    type="date"
                    value={txFilters.customTo}
                    onChange={(e) => {
                      setTxFilters((prev) => ({
                        ...prev,
                        customTo: e.target.value,
                      }));
                      setTxPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Filter Summary & Reset Button */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500 flex-wrap gap-2">
              <span>
                Showing <strong>{filteredTransactions.length}</strong> of{' '}
                <strong>{transactions.length}</strong> transactions · Click any
                row to view full details
              </span>
              {hasActiveTxFilters && (
                <button
                  type="button"
                  onClick={handleResetTxFilters}
                  className="font-semibold text-[#5E17EB] hover:text-[#4E12C6] px-2.5 py-1 rounded-lg hover:bg-[#F3EFFE] transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table (6 columns: Customer, Items / Order Summary, Date, Amount, Payment Status, Funds Status; NO Action column) */}
          {paginatedTransactions.length > 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 lg:table-fixed text-left border-collapse text-xs">
                  <thead className="bg-[#5E17EB] text-white">
                    <tr className="font-semibold select-none">
                      <th className="py-3.5 pl-4 pr-2.5 lg:w-[17%]">
                        Customer
                      </th>
                      <th className="py-3.5 px-2.5 lg:w-[29%]">
                        Items / Order Summary
                      </th>
                      <th className="py-3.5 px-2.5 whitespace-nowrap lg:w-[17%]">
                        Date
                      </th>
                      <th className="py-3.5 px-2.5 text-right whitespace-nowrap lg:w-[12%]">
                        Amount
                      </th>
                      <th className="py-3.5 px-2 text-center whitespace-nowrap lg:w-[12%]">
                        Payment Status
                      </th>
                      <th className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap lg:w-[13%]">
                        Funds Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTransactions.map((tx) => {
                      const itemCount = tx.items.reduce(
                        (s, i) => s + i.quantity,
                        0
                      );
                      return (
                        <tr
                          key={tx.id}
                          tabIndex={0}
                          role="button"
                          onClick={() => setSelectedTransactionId(tx.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedTransactionId(tx.id);
                            }
                          }}
                          className="hover:bg-[#F8F9FE] focus:bg-[#F8F9FE] focus:outline-none transition-colors cursor-pointer group"
                        >
                          {/* 1. Customer */}
                          <td className="py-3.5 pl-4 pr-2.5 font-semibold text-slate-900 group-hover:text-[#5E17EB] transition-colors align-middle">
                            <span
                              className="block truncate"
                              title={tx.customerName}
                            >
                              {tx.customerName}
                            </span>
                          </td>

                          {/* 2. Items / Order Summary */}
                          <td className="py-3.5 px-2.5 min-w-0 align-middle">
                            <p
                              className="font-medium text-slate-800 truncate"
                              title={tx.itemSummary}
                            >
                              {tx.itemSummary}
                            </p>
                            <span className="text-[11px] text-slate-400 block">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                          </td>

                          {/* 3. Date */}
                          <td className="py-3.5 px-2.5 text-slate-600 whitespace-nowrap align-middle">
                            {tx.dateTime}
                          </td>

                          {/* 4. Amount */}
                          <td className="py-3.5 px-2.5 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap align-middle">
                            {formatNaira(tx.orderValue)}
                          </td>

                          {/* 5. Payment Status */}
                          <td className="py-3.5 px-2 text-center whitespace-nowrap align-middle">
                            <PaymentStatusBadge status={tx.paymentStatus} />
                          </td>

                          {/* 6. Funds Status */}
                          <td className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap align-middle">
                            <FundsStatusBadge status={tx.fundsStatus} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {transactions.length === 0
                    ? 'No transactions recorded yet'
                    : 'No transactions match your active filters'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {transactions.length === 0
                    ? 'Customer order transactions will appear here automatically once payments are confirmed.'
                    : 'Try adjusting your search query, payment status, funds status, or date range.'}
                </p>
              </div>
              {hasActiveTxFilters && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetTxFilters}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pagination Footer */}
          {filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 pt-1">
              <p>
                Showing{' '}
                {Math.min(1 + (txPage - 1) * txPageSize, txTotalItems)} –{' '}
                {Math.min(txPage * txPageSize, txTotalItems)} of {txTotalItems}{' '}
                {txTotalItems === 1 ? 'transaction' : 'transactions'}
              </p>

              <div className="flex items-center gap-1 self-center sm:self-auto select-none">
                <button
                  type="button"
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: txTotalPages }).map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setTxPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        txPage === page
                          ? 'bg-[#5E17EB] text-white'
                          : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setTxPage((p) => Math.min(txTotalPages, p + 1))
                  }
                  disabled={txPage === txTotalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          TAB 3: SETTLEMENTS
          ========================================================================== */}
      {activeSubTab === 'settlements' && (
        <div className="space-y-6">
          {/* 4 Settlement & Withdrawal Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Available Earnings */}
            <div className="bg-white border-2 border-[#5E17EB]/30 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#5E17EB] flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#5E17EB]" />
                  Available Earnings
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA]">
                  Ready to Withdraw
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(earningsSummary.availableEarnings)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Eligible released earnings available for bank withdrawal or
                promotion purchases.
              </p>
            </div>

            {/* 2. Pending Withdrawals (Processing) */}
            <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#5E17EB] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#5E17EB]" />
                  Pending Withdrawals
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                  {settlementSummaryMetrics.processingSettlementCount} · 72h
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.processing)}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Withdrawal requests in the mandatory 72-hour customer
                satisfaction processing period.
              </p>
            </div>

            {/* 3. Successfully Paid */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Successfully Paid
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                  {settlementSummaryMetrics.paidSettlementCount} Paid
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.successfullyPaid)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Funds successfully deposited into your registered merchant bank
                account.
              </p>
            </div>

            {/* 4. Awaiting Release */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Awaiting Release
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]">
                  {settlementSummaryMetrics.awaitingReleaseCount} In Escrow
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.awaitingRelease)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Funds still held in escrow because order delivery has not yet
                been confirmed.
              </p>
            </div>
          </div>

          {/* Settlement Filters Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={settlementPreset}
                onChange={(e) =>
                  setSettlementPreset(
                    e.target.value as 'all' | ReportingPeriodPreset
                  )
                }
                className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="all">Period: All Time</option>
                <option value="today">Period: Today</option>
                <option value="last_7_days">Period: Last 7 Days</option>
                <option value="last_30_days">Period: Last 30 Days</option>
                <option value="this_month">Period: This Month</option>
                <option value="last_month">Period: Last Month</option>
                <option value="custom">Period: Custom Range</option>
              </select>

              <select
                value={settlementStatusFilter}
                onChange={(e) =>
                  setSettlementStatusFilter(
                    e.target.value as 'all' | SettlementStatus
                  )
                }
                className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="all">Settlement Status: All</option>
                <option value="processing">
                  Settlement Status: Processing
                </option>
                <option value="paid">Settlement Status: Paid</option>
                <option value="failed">Settlement Status: Failed</option>
              </select>
            </div>

            {(settlementPreset !== 'all' ||
              settlementStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSettlementPreset('all');
                  setSettlementStatusFilter('all');
                }}
                className="text-xs font-semibold text-[#5E17EB] hover:text-[#4E12C6] px-3 py-1.5 rounded-xl hover:bg-[#F3EFFE] transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset filters
              </button>
            )}

            {settlementPreset === 'custom' && (
              <div className="w-full pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">
                  Custom Period:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">From</label>
                  <input
                    type="date"
                    value={settlementCustomFrom}
                    onChange={(e) => setSettlementCustomFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">To</label>
                  <input
                    type="date"
                    value={settlementCustomTo}
                    onChange={(e) => setSettlementCustomTo(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Settlement & Withdrawal History Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Withdrawals &amp; Settlement History
                </h3>
                <p className="text-xs text-slate-500">
                  Merchant withdrawal requests (72-hour processing period) and
                  completed bank payouts · Click any row for full details
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenWithdrawModal}
                leftIcon={<Landmark className="w-3.5 h-3.5" />}
              >
                Request Withdrawal
              </Button>
            </div>

            {filteredSettlements.length > 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[680px] lg:min-w-0 lg:table-fixed text-left border-collapse text-xs">
                    <thead className="bg-[#5E17EB] text-white">
                      <tr className="font-semibold select-none">
                        <th className="py-3.5 pl-4 pr-3 whitespace-nowrap lg:w-[22%]">
                          Request / Settlement Date
                        </th>
                        <th className="py-3.5 px-3 whitespace-nowrap lg:w-[26%]">
                          Expected Payout / Deposit Date (72h)
                        </th>
                        <th className="py-3.5 px-3 text-center whitespace-nowrap lg:w-[18%]">
                          Orders Included
                        </th>
                        <th className="py-3.5 px-3 text-right whitespace-nowrap lg:w-[18%]">
                          Withdrawal Amount
                        </th>
                        <th className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap lg:w-[16%]">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSettlements.map((s) => {
                        const count =
                          s.orders.length > 0
                            ? s.orders.length
                            : s.transactionIds.length;
                        return (
                          <tr
                            key={s.id}
                            tabIndex={0}
                            role="button"
                            onClick={() => setSelectedSettlementId(s.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedSettlementId(s.id);
                              }
                            }}
                            className="hover:bg-[#F8F9FE] focus:bg-[#F8F9FE] focus:outline-none transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 pl-4 pr-3 font-semibold text-slate-900 group-hover:text-[#5E17EB] transition-colors whitespace-nowrap align-middle">
                              <span className="block">
                                {s.processingDate || s.settlementDate}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {s.transactionReference || s.id}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                              {s.status === 'paid' ? (
                                <div>
                                  <span className="font-semibold text-emerald-700 block">
                                    Deposited: {s.paidDate || s.settlementDate}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {s.bankName ||
                                      earningsSummary.bankDetails.bankName}{' '}
                                    (
                                    {s.maskedAccountNumber ||
                                      earningsSummary.bankDetails
                                        .maskedAccountNumber}
                                    )
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-semibold text-[#5E17EB] block">
                                    Expected:{' '}
                                    {s.expectedPayoutDate ||
                                      '72 hours after request'}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    72-hour customer satisfaction window
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center font-medium text-slate-700 whitespace-nowrap align-middle">
                              {count} {count === 1 ? 'order' : 'orders'}
                            </td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap align-middle">
                              {formatNaira(s.settlementAmount)}
                            </td>
                            <td className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap align-middle">
                              <SettlementStatusBadge status={s.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Landmark className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {settlements.length === 0
                    ? 'No withdrawal or settlement history yet'
                    : 'No records matching the selected filters'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {settlements.length === 0
                    ? 'Withdrawal requests and completed bank payouts will appear here.'
                    : 'Try adjusting your period or status filter to view records.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        settlement={selectedTransactionSettlement}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransactionId(null)}
      />

      {/* Settlement Details Modal */}
      <SettlementDetailsModal
        settlement={selectedSettlement}
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlementId(null)}
        onCompleteAfter72Hours={handleCompletePendingWithdrawalAfter72h}
      />

      {/* Withdraw Earnings Modal */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        maxWidth="md"
        title="Withdraw Merchant Earnings"
      >
        {submittedWithdrawal ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="text-sm font-bold text-emerald-950">
                  Withdrawal Request Submitted ({WITHDRAWAL_PROCESSING_HOURS}
                  -Hour Processing)
                </p>
                <p className="text-emerald-900 leading-relaxed">
                  Your withdrawal request for{' '}
                  <span className="font-bold">
                    {formatNaira(submittedWithdrawal.settlementAmount)}
                  </span>{' '}
                  is now in its mandatory{' '}
                  <span className="font-bold">
                    {WITHDRAWAL_PROCESSING_HOURS}-hour processing period
                  </span>{' '}
                  and will be deposited into your registered bank account once
                  the processing window completes.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono font-bold text-slate-900">
                  {submittedWithdrawal.transactionReference ||
                    submittedWithdrawal.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Withdrawal Amount</span>
                <span className="font-extrabold text-[#5E17EB] text-sm">
                  {formatNaira(submittedWithdrawal.settlementAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Request Date &amp; Time</span>
                <span className="font-semibold text-slate-800">
                  {submittedWithdrawal.processingDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  Expected Payout (After 72h)
                </span>
                <span className="font-bold text-[#5E17EB]">
                  {submittedWithdrawal.expectedPayoutDate}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500">Destination Bank</span>
                <span className="font-semibold text-slate-900">
                  {submittedWithdrawal.bankName} (
                  {submittedWithdrawal.maskedAccountNumber})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <SettlementStatusBadge status={submittedWithdrawal.status} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setActiveSubTab('settlements');
                }}
              >
                View Pending Withdrawals
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmWithdrawal} className="space-y-4">
            {/* Balance Summary inside Modal */}
            <div className="p-4 rounded-2xl bg-[#F8F6FE] border border-[#DDD0FA] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5E17EB]">
                  Eligible Available Earnings
                </span>
                <span className="text-xl font-extrabold text-slate-900 tabular-nums">
                  {formatNaira(earningsSummary.availableEarnings)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DDD0FA]/70 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-500 block">
                    In Escrow (Unreleased):
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatNaira(earningsSummary.awaitingReleaseInEscrow)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    Pending Withdrawals (72h):
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatNaira(earningsSummary.pendingWithdrawals)}
                  </span>
                </div>
              </div>
            </div>

            {/* Read-Only Registered Merchant Bank Account */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#5E17EB]" />
                  Registered Bank Account
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  <Lock className="w-2.5 h-2.5" />
                  Read-Only
                </span>
              </div>
              <p className="font-bold text-slate-900">
                {earningsSummary.bankDetails.bankName} ·{' '}
                {earningsSummary.bankDetails.maskedAccountNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                Account Name: {earningsSummary.bankDetails.accountName}
              </p>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Withdrawal Amount (₦)
                </label>
                {earningsSummary.availableEarnings > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawAmountInput(
                        String(earningsSummary.availableEarnings)
                      )
                    }
                    className="text-[11px] font-bold text-[#5E17EB] hover:underline"
                  >
                    Withdraw Max (
                    {formatNaira(earningsSummary.availableEarnings)})
                  </button>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={Math.max(1, earningsSummary.availableEarnings)}
                step="any"
                value={withdrawAmountInput}
                onChange={(e) => {
                  setWithdrawAmountInput(e.target.value);
                  setWithdrawError(null);
                }}
                disabled={earningsSummary.availableEarnings <= 0}
                placeholder="Enter amount to withdraw..."
                className="w-full px-3.5 py-2.5 text-sm font-bold bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* 72-Hour Processing Period Explanation & Timeline */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-1.5 text-xs text-amber-950">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                {WITHDRAWAL_PROCESSING_HOURS}-Hour Processing Period Before Bank
                Deposit
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                After submission, funds are held in a{' '}
                <span className="font-semibold">
                  {WITHDRAWAL_PROCESSING_HOURS}-hour withdrawal processing
                  period
                </span>{' '}
                to give customers time to confirm satisfaction with their orders
                before the money is deposited into your bank account.
              </p>
              <p className="text-[11px] font-semibold text-amber-950 pt-1">
                Expected Payout Date/Time:{' '}
                {formatDateTimeWithTz(
                  new Date(Date.now() + WITHDRAWAL_PROCESSING_MS)
                )}
              </p>
            </div>

            {earningsSummary.availableEarnings <= 0 && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                You currently have{' '}
                <span className="font-bold">₦0</span> in eligible available
                earnings. Orders still in escrow awaiting customer delivery
                confirmation or funds already in a pending withdrawal cannot be
                withdrawn.
              </div>
            )}

            {withdrawError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{withdrawError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingWithdrawal}
                disabled={
                  earningsSummary.availableEarnings <= 0 ||
                  isSubmittingWithdrawal
                }
                leftIcon={<Landmark className="w-4 h-4" />}
              >
                Confirm Withdrawal Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
