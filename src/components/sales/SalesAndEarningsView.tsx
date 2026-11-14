import React, { useState, useEffect, useMemo } from 'react';
import type {
  FundsStatus,
  PaymentStatus,
  ReportingPeriodPreset,
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
  buildSalesChartBuckets,
  calculateOverviewMetrics,
  calculateProductPerformance,
  calculateSettlementSummaryMetrics,
  filterSettlementsByWindow,
  filterTransactionsByWindow,
  getReferenceDate,
  resolveReportingPeriodWindow,
} from '../../services/salesStorage';
import { formatNaira } from '../../services/productStorage';
import { Button } from '../common/Button';
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
    };
    window.addEventListener('errandify:orders-updated', syncData);
    window.addEventListener('errandify:sales-updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      window.removeEventListener('errandify:orders-updated', syncData);
      window.removeEventListener('errandify:sales-updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

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
        settlementPeriodRecords
      ),
    [settlementPeriodTransactions, settlementPeriodRecords]
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sales & Earnings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your product sales, funds held in escrow, and automatic bank
            settlements.
          </p>
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
        <div className="space-y-4">
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
          {/* 3 Settlement Summary Cards: Awaiting Release, Processing, Successfully Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Awaiting Release */}
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

            {/* 2. Processing */}
            <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#5E17EB] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#5E17EB]" />
                  Processing
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                  {settlementSummaryMetrics.processingOrderCount}{' '}
                  {settlementSummaryMetrics.processingOrderCount === 1
                    ? 'Order'
                    : 'Orders'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.processing)}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Funds from delivered orders included in an automatic settlement
                currently being processed.
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
                  {settlementSummaryMetrics.paidOrderCount}{' '}
                  {settlementSummaryMetrics.paidOrderCount === 1
                    ? 'Order'
                    : 'Orders'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.successfullyPaid)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Funds successfully transferred to your merchant bank account.
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

          {/* Settlement History Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Settlement History
                </h3>
                <p className="text-xs text-slate-500">
                  Automatic payouts combining eligible funds from delivered
                  orders · Click any row to view included orders and bank
                  details
                </p>
              </div>
            </div>

            {filteredSettlements.length > 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[560px] lg:min-w-0 lg:table-fixed text-left border-collapse text-xs">
                    <thead className="bg-[#5E17EB] text-white">
                      <tr className="font-semibold select-none">
                        <th className="py-3.5 pl-4 pr-3 whitespace-nowrap lg:w-[26%]">
                          Settlement Date
                        </th>
                        <th className="py-3.5 px-3 text-center whitespace-nowrap lg:w-[26%]">
                          Number of Orders Included
                        </th>
                        <th className="py-3.5 px-3 text-right whitespace-nowrap lg:w-[26%]">
                          Settlement Amount
                        </th>
                        <th className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap lg:w-[22%]">
                          Settlement Status
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
                              {s.settlementDate}
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
                    ? 'No settlement history yet'
                    : 'No settlements matching the selected filters'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {settlements.length === 0
                    ? 'Automatic settlements will appear here once delivered orders are batched for payout.'
                    : 'Try adjusting your period or status filter to view settlement records.'}
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
      />
    </div>
  );
};
