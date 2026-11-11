import React, { useState, useEffect, useMemo } from 'react';
import type {
  MerchantFeeConfig,
  MerchantSettlementSchedule,
  ReportCategory,
  ReportingPeriodPreset,
  SalesSubTab,
  SalesTransaction,
  SettlementRecord,
  SettlementStatus,
  TransactionFiltersState,
  TransactionSortOption,
  TransactionStatus,
} from '../../types/sales';
import {
  REPORTING_PERIOD_LABELS,
  SalesStorage,
  TRANSACTION_STATUS_LABELS,
  buildCsvContent,
  buildSalesChartBuckets,
  calculateFinancialMetrics,
  calculatePeriodComparison,
  calculateProductPerformance,
  filterSettlementsByWindow,
  filterTransactionsByWindow,
  getReferenceDate,
  resolveReportingPeriodWindow,
} from '../../services/salesStorage';
import { formatNaira } from '../../services/productStorage';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import {
  SettlementStatusBadge,
  TransactionStatusBadge,
} from './SalesStatusBadges';
import { SalesPerformanceChart } from './SalesPerformanceChart';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { SettlementDetailsModal } from './SettlementDetailsModal';
import {
  Wallet,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Info,
  AlertCircle,
  RefreshCw,
  Package,
  Landmark,
  BarChart3,
  Receipt,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Award,
} from 'lucide-react';

const SUB_TABS: Array<{
  id: SalesSubTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'settlements', label: 'Settlements', icon: Landmark },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
];

const PERIOD_PRESETS: ReportingPeriodPreset[] = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'this_year',
  'custom',
];

const REPORT_CATEGORIES: Array<{
  id: ReportCategory;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'sales_report',
    title: 'Sales Report',
    subtitle:
      'Gross sales, discounts, net sales, order volume, and period breakdown.',
  },
  {
    id: 'transaction_report',
    title: 'Transaction Report',
    subtitle:
      'Status breakdown across successful, pending, failed, and refunded transactions.',
  },
  {
    id: 'earnings_report',
    title: 'Earnings Report',
    subtitle:
      'Gross sales, applicable fees & commissions, net earnings, and settlement reconciliation.',
  },
  {
    id: 'product_performance_report',
    title: 'Product Performance Report',
    subtitle:
      'Best-selling products by quantity and sales value with applied discounts.',
  },
];

export const SalesAndEarningsView: React.FC = () => {
  const toast = useToast();

  // Sub-navigation inside Sales & Earnings (Overview | Transactions | Settlements | Reports)
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>('overview');

  // Underlying financial data state
  const [transactions, setTransactions] = useState<SalesTransaction[]>(() =>
    SalesStorage.getTransactions()
  );
  const [settlements, setSettlements] = useState<SettlementRecord[]>(() =>
    SalesStorage.getSettlements()
  );
  const [feeConfig, setFeeConfig] = useState<MerchantFeeConfig>(() =>
    SalesStorage.getFeeConfig()
  );
  const [settlementSchedule, setSettlementSchedule] =
    useState<MerchantSettlementSchedule>(() =>
      SalesStorage.getSettlementSchedule()
    );

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Overview & Settlements Reporting Period State (default Last 7 Days to cover active store history)
  const [overviewPreset, setOverviewPreset] =
    useState<ReportingPeriodPreset>('last_7_days');
  const [overviewCustomFrom, setOverviewCustomFrom] = useState('2026-11-01');
  const [overviewCustomTo, setOverviewCustomTo] = useState('2026-11-10');

  // Transactions Tab Filter & Pagination State
  const [txFilters, setTxFilters] = useState<TransactionFiltersState>({
    search: '',
    status: 'all',
    periodPreset: 'all',
    customFrom: '2026-11-01',
    customTo: '2026-11-10',
    minAmount: '',
    maxAmount: '',
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

  // Reports Tab State
  const [reportCategory, setReportCategory] =
    useState<ReportCategory>('sales_report');
  const [reportPreset, setReportPreset] =
    useState<ReportingPeriodPreset>('last_7_days');
  const [reportCustomFrom, setReportCustomFrom] = useState('2026-11-01');
  const [reportCustomTo, setReportCustomTo] = useState('2026-11-10');
  const [reportStatusFilter, setReportStatusFilter] = useState<
    'all' | TransactionStatus
  >('all');
  const [reportProductFilter, setReportProductFilter] = useState<string>('all');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

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
      setFeeConfig(SalesStorage.getFeeConfig());
      setSettlementSchedule(SalesStorage.getSettlementSchedule());
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
      setFeeConfig(SalesStorage.getFeeConfig());
      setSettlementSchedule(SalesStorage.getSettlementSchedule());
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

  const overviewSettlements = useMemo(
    () => filterSettlementsByWindow(settlements, overviewWindow),
    [settlements, overviewWindow]
  );

  const overviewMetrics = useMemo(
    () =>
      calculateFinancialMetrics(
        overviewTransactions,
        overviewSettlements,
        feeConfig
      ),
    [overviewTransactions, overviewSettlements, feeConfig]
  );

  const overviewChartBuckets = useMemo(
    () => buildSalesChartBuckets(overviewTransactions, overviewWindow),
    [overviewTransactions, overviewWindow]
  );

  const overviewBestProducts = useMemo(
    () => calculateProductPerformance(overviewTransactions),
    [overviewTransactions]
  );

  const overviewComparison = useMemo(
    () => calculatePeriodComparison(transactions, overviewWindow),
    [transactions, overviewWindow]
  );

  // ============================================================================
  // 2. TRANSACTIONS TAB COMPUTATIONS
  // ============================================================================
  const hasActiveTxFilters =
    txFilters.search.trim() !== '' ||
    txFilters.status !== 'all' ||
    txFilters.periodPreset !== 'all' ||
    txFilters.minAmount.trim() !== '' ||
    txFilters.maxAmount.trim() !== '' ||
    txFilters.sortBy !== 'date_desc';

  const handleResetTxFilters = () => {
    setTxFilters({
      search: '',
      status: 'all',
      periodPreset: 'all',
      customFrom: '2026-11-01',
      customTo: '2026-11-10',
      minAmount: '',
      maxAmount: '',
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

    // Status filter
    if (txFilters.status !== 'all') {
      list = list.filter((tx) => tx.status === txFilters.status);
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

    // Amount range filter (evaluates against Net Amount)
    const minVal =
      txFilters.minAmount.trim() !== '' ? Number(txFilters.minAmount) : null;
    const maxVal =
      txFilters.maxAmount.trim() !== '' ? Number(txFilters.maxAmount) : null;

    if (minVal !== null && !isNaN(minVal)) {
      list = list.filter((tx) => tx.netAmount >= minVal);
    }
    if (maxVal !== null && !isNaN(maxVal)) {
      list = list.filter((tx) => tx.netAmount <= maxVal);
    }

    // Sorting
    list.sort((a, b) => {
      if (txFilters.sortBy === 'net_desc') return b.netAmount - a.netAmount;
      if (txFilters.sortBy === 'net_asc') return a.netAmount - b.netAmount;
      if (txFilters.sortBy === 'gross_desc')
        return b.grossAmount - a.grossAmount;
      if (txFilters.sortBy === 'gross_asc')
        return a.grossAmount - b.grossAmount;
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

  const filteredSettlements = useMemo(() => {
    let list = [...settlements];
    if (settlementPreset !== 'all') {
      const win = resolveReportingPeriodWindow(
        settlementPreset,
        settlementCustomFrom,
        settlementCustomTo,
        referenceDate
      );
      list = filterSettlementsByWindow(list, win);
    }
    if (settlementStatusFilter !== 'all') {
      list = list.filter((s) => s.status === settlementStatusFilter);
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [
    settlements,
    settlementPreset,
    settlementCustomFrom,
    settlementCustomTo,
    settlementStatusFilter,
    referenceDate,
  ]);

  const settlementSummaryMetrics = useMemo(
    () =>
      calculateFinancialMetrics(
        settlementPeriodTransactions,
        settlementPreset === 'all'
          ? settlements
          : filterSettlementsByWindow(
              settlements,
              resolveReportingPeriodWindow(
                settlementPreset,
                settlementCustomFrom,
                settlementCustomTo,
                referenceDate
              )
            ),
        feeConfig
      ),
    [
      settlementPeriodTransactions,
      settlements,
      settlementPreset,
      settlementCustomFrom,
      settlementCustomTo,
      referenceDate,
      feeConfig,
    ]
  );

  const unsettledQualifyingTransactions = useMemo(
    () =>
      settlementPeriodTransactions.filter(
        (tx) =>
          (tx.status === 'successful' || tx.status === 'partially_refunded') &&
          tx.settlementStatus !== 'paid'
      ),
    [settlementPeriodTransactions]
  );

  // ============================================================================
  // 4. REPORTS TAB COMPUTATIONS & CSV EXPORT
  // ============================================================================
  const reportWindow = useMemo(
    () =>
      resolveReportingPeriodWindow(
        reportPreset,
        reportCustomFrom,
        reportCustomTo,
        referenceDate
      ),
    [reportPreset, reportCustomFrom, reportCustomTo, referenceDate]
  );

  // Unique product names for report product filter dropdown
  const availableReportProducts = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach((tx) => {
      tx.items.forEach((item) => names.add(item.name));
    });
    return Array.from(names).sort();
  }, [transactions]);

  const reportFilteredTransactions = useMemo(() => {
    let list = filterTransactionsByWindow(transactions, reportWindow);

    if (
      reportCategory !== 'product_performance_report' &&
      reportStatusFilter !== 'all'
    ) {
      list = list.filter((tx) => tx.status === reportStatusFilter);
    }

    if (reportProductFilter !== 'all') {
      list = list.filter((tx) =>
        tx.items.some((item) => item.name === reportProductFilter)
      );
    }

    return list;
  }, [
    transactions,
    reportWindow,
    reportCategory,
    reportStatusFilter,
    reportProductFilter,
  ]);

  const reportFilteredSettlements = useMemo(
    () => filterSettlementsByWindow(settlements, reportWindow),
    [settlements, reportWindow]
  );

  const reportMetrics = useMemo(
    () =>
      calculateFinancialMetrics(
        reportFilteredTransactions,
        reportFilteredSettlements,
        feeConfig
      ),
    [reportFilteredTransactions, reportFilteredSettlements, feeConfig]
  );

  const reportChartBuckets = useMemo(
    () => buildSalesChartBuckets(reportFilteredTransactions, reportWindow),
    [reportFilteredTransactions, reportWindow]
  );

  const reportProductPerformance = useMemo(() => {
    const allProdPerf = calculateProductPerformance(reportFilteredTransactions);
    if (reportProductFilter === 'all') return allProdPerf;
    return allProdPerf.filter((p) => p.productName === reportProductFilter);
  }, [reportFilteredTransactions, reportProductFilter]);

  const hasActiveReportFilters =
    reportPreset !== 'last_7_days' ||
    reportStatusFilter !== 'all' ||
    reportProductFilter !== 'all';

  const handleResetReportFilters = () => {
    setReportPreset('last_7_days');
    setReportCustomFrom('2026-11-01');
    setReportCustomTo('2026-11-10');
    setReportStatusFilter('all');
    setReportProductFilter('all');
  };

  // Functional CSV Export
  const handleExportReportCsv = () => {
    try {
      setIsExportingCsv(true);

      let headers: string[] = [];
      let rows: Array<Array<string | number>> = [];
      let filePrefix = 'errandify-report';

      if (reportCategory === 'sales_report') {
        filePrefix = 'errandify-sales-report';
        const nonZeroBuckets = reportChartBuckets.filter(
          (b) => b.orderCount > 0 || b.grossSales > 0
        );
        if (nonZeroBuckets.length === 0) {
          toast.info(
            'No report data to export',
            'There are no sales records matching the selected reporting period and filters.'
          );
          setIsExportingCsv(false);
          return;
        }
        headers = [
          'Date / Interval',
          'Qualifying Orders',
          'Gross Sales (NGN)',
          'Discounts Applied (NGN)',
          'Fees & Commissions (NGN)',
          'Net Sales (NGN)',
        ];
        rows = reportChartBuckets.map((b) => [
          b.fullLabel,
          b.orderCount,
          formatNaira(b.grossSales),
          formatNaira(b.discounts),
          feeConfig.isConfigured || b.fees > 0
            ? formatNaira(b.fees)
            : '₦0 (Not Configured)',
          formatNaira(b.netSales),
        ]);
        // Append summary row
        rows.push([
          `TOTAL (${reportWindow.formattedRange})`,
          reportMetrics.qualifyingOrderCount,
          formatNaira(reportMetrics.grossSales),
          formatNaira(reportMetrics.totalDiscounts),
          feeConfig.isConfigured || reportMetrics.feesAndCommissions > 0
            ? formatNaira(reportMetrics.feesAndCommissions)
            : '₦0 (Not Configured)',
          formatNaira(reportMetrics.netEarnings),
        ]);
      } else if (reportCategory === 'transaction_report') {
        filePrefix = 'errandify-transaction-report';
        if (reportFilteredTransactions.length === 0) {
          toast.info(
            'No transactions to export',
            'There are no transaction records matching the selected filters.'
          );
          setIsExportingCsv(false);
          return;
        }
        headers = [
          'Date & Time',
          'Customer Name',
          'Items / Order Summary',
          'Gross Amount (NGN)',
          'Product Discounts (NGN)',
          'Promotion Discounts (NGN)',
          'Fees & Commissions (NGN)',
          'Net Amount (NGN)',
          'Transaction Status',
        ];
        rows = reportFilteredTransactions.map((tx) => [
          tx.dateTime,
          tx.customerName,
          tx.itemSummary,
          formatNaira(tx.grossAmount),
          formatNaira(tx.productDiscountAmount),
          formatNaira(tx.promotionDiscountAmount),
          feeConfig.isConfigured || tx.merchantFeeAmount > 0
            ? formatNaira(tx.merchantFeeAmount)
            : '₦0 (Not Configured)',
          formatNaira(tx.netAmount),
          TRANSACTION_STATUS_LABELS[tx.status],
        ]);
      } else if (reportCategory === 'earnings_report') {
        filePrefix = 'errandify-earnings-report';
        const qualifying = reportFilteredTransactions.filter(
          (tx) =>
            tx.status === 'successful' || tx.status === 'partially_refunded'
        );
        if (qualifying.length === 0) {
          toast.info(
            'No earnings data to export',
            'There are no qualifying earnings records in the selected reporting period.'
          );
          setIsExportingCsv(false);
          return;
        }
        headers = [
          'Date & Time',
          'Customer Name',
          'Gross Sales (NGN)',
          'Total Discounts (NGN)',
          'Applicable Commissions & Fees (NGN)',
          'Net Earnings (NGN)',
          'Settlement Status',
        ];
        rows = qualifying.map((tx) => [
          tx.dateTime,
          tx.customerName,
          formatNaira(tx.grossAmount),
          formatNaira(tx.totalDiscounts),
          feeConfig.isConfigured || tx.merchantFeeAmount > 0
            ? formatNaira(tx.merchantFeeAmount)
            : '₦0 (Not Configured)',
          formatNaira(tx.netAmount),
          tx.settlementStatus === 'paid' ? 'Settled' : 'Pending Settlement',
        ]);
        rows.push([
          `PERIOD TOTAL (${reportWindow.formattedRange})`,
          `${qualifying.length} Orders`,
          formatNaira(reportMetrics.grossSales),
          formatNaira(reportMetrics.totalDiscounts),
          feeConfig.isConfigured || reportMetrics.feesAndCommissions > 0
            ? formatNaira(reportMetrics.feesAndCommissions)
            : '₦0 (Not Configured)',
          formatNaira(reportMetrics.netEarnings),
          `Pending: ${formatNaira(
            reportMetrics.pendingSettlement
          )} | Settled: ${formatNaira(reportMetrics.totalSettled)}`,
        ]);
      } else if (reportCategory === 'product_performance_report') {
        filePrefix = 'errandify-product-performance-report';
        if (reportProductPerformance.length === 0) {
          toast.info(
            'No product performance data to export',
            'There are no product sales matching the selected reporting period and filters.'
          );
          setIsExportingCsv(false);
          return;
        }
        headers = [
          'Product Name',
          'Unit of Sale',
          'Orders Count',
          'Quantity Sold',
          'Gross Sales Value (NGN)',
          'Product Discounts Applied (NGN)',
          'Promotion Discounts Allocated (NGN)',
          'Net Sales Value (NGN)',
        ];
        rows = reportProductPerformance.map((p) => [
          p.productName,
          p.unit || 'Unit',
          p.ordersCount,
          p.quantitySold,
          formatNaira(p.grossSalesValue),
          formatNaira(p.productDiscountsApplied),
          formatNaira(p.promotionDiscountsAllocated),
          formatNaira(p.netSalesValue),
        ]);
      }

      const csvString = buildCsvContent(headers, rows);
      const blob = new Blob(['\uFEFF' + csvString], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safePeriod = reportWindow.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      link.href = url;
      link.setAttribute('download', `${filePrefix}-${safePeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        'Report exported as CSV',
        `Downloaded ${rows.length} rows for ${
          REPORT_CATEGORIES.find((c) => c.id === reportCategory)?.title
        } (${reportWindow.formattedRange}).`
      );
    } catch (err: any) {
      toast.error(
        'Export failed',
        err?.message || 'Unable to generate CSV export. Please try again.'
      );
    } finally {
      setIsExportingCsv(false);
    }
  };

  const selectedTransaction =
    transactions.find((t) => t.id === selectedTransactionId) || null;
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
            Monitor store sales performance, transaction breakdowns, net
            earnings, settlements, and financial reports.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
            Monitor store sales performance, transaction breakdowns, applicable
            deductions, net earnings, settlements, and reports.
          </p>
        </div>
      </div>

      {/* Page-Level Navigation Tabs: Overview | Transactions | Settlements | Reports */}
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
          {/* Reporting Period Selector Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-8 h-8 rounded-xl bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">
                    Reporting Period: {overviewWindow.label} (
                    {overviewWindow.formattedRange})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Grouped in merchant timezone ({overviewWindow.timezoneLabel})
                  </span>
                </div>
              </div>

              {/* Preset Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PERIOD_PRESETS.map((preset) => {
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
                  Select Custom Date Range:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={overviewCustomFrom}
                    onChange={(e) => setOverviewCustomFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">End Date</label>
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

          {/* 6 Financial Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Gross Sales */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Gross Sales
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {overviewMetrics.qualifyingOrderCount}{' '}
                  {overviewMetrics.qualifyingOrderCount === 1
                    ? 'order'
                    : 'orders'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.grossSales)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Total value of products sold before discounts and merchant
                deductions.
              </p>
            </div>

            {/* 2. Total Discounts */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Total Discounts
                </span>
                {overviewMetrics.totalDiscounts > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Applied
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {overviewMetrics.totalDiscounts > 0
                  ? `-${formatNaira(overviewMetrics.totalDiscounts)}`
                  : formatNaira(0)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Product discounts (
                {formatNaira(overviewMetrics.productDiscounts)}) + promotion
                discounts ({formatNaira(overviewMetrics.promotionDiscounts)}).
              </p>
            </div>

            {/* 3. Fees & Commissions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Fees & Commissions
                </span>
                {!overviewMetrics.isFeeConfigAvailable && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <Info className="w-2.5 h-2.5" />
                    Not Configured
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {overviewMetrics.isFeeConfigAvailable
                  ? overviewMetrics.feesAndCommissions > 0
                    ? `-${formatNaira(overviewMetrics.feesAndCommissions)}`
                    : formatNaira(0)
                  : formatNaira(0)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {overviewMetrics.isFeeConfigAvailable
                  ? 'Applicable merchant-facing fees and commissions deducted from sales.'
                  : 'No merchant commission or fee rule is configured on this store profile (₦0 deducted).'}
              </p>
            </div>

            {/* 4. Net Earnings */}
            <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5E17EB]">
                  Net Earnings
                </span>
                <Wallet className="w-4 h-4 text-[#5E17EB]" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.netEarnings)}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Store earnings after applicable product/promotion discounts and
                merchant deductions.
              </p>
            </div>

            {/* 5. Pending Settlement */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Pending Settlement
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Awaiting Payout
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.pendingSettlement)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Earned merchant funds from confirmed sales awaiting settlement.
              </p>
            </div>

            {/* 6. Total Settled */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Total Settled
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paid Out
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(overviewMetrics.totalSettled)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Funds successfully settled to the merchant over the selected
                period.
              </p>
            </div>
          </div>

          {/* Sales Performance Chart */}
          <SalesPerformanceChart
            buckets={overviewChartBuckets}
            periodWindow={overviewWindow}
            hasAnyStoreSales={transactions.length > 0}
          />

          {/* Additional Sales Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Order Volume, AOV, and Verified Period Comparison */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Performance Insights
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Qualifying Orders
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block tabular-nums">
                    {overviewMetrics.qualifyingOrderCount}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Contributing to sales
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Average Order Value
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block tabular-nums">
                    {formatNaira(overviewMetrics.averageOrderValue)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Net sales per order
                  </span>
                </div>
              </div>

              {/* Sales Trend vs Previous Equivalent Period */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Trend vs. Previous Period
                  </span>
                  {overviewComparison.hasSufficientHistoricalData &&
                    overviewComparison.percentageChange !== null && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                          overviewComparison.percentageChange >= 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {overviewComparison.percentageChange >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {overviewComparison.percentageChange >= 0 ? '+' : ''}
                        {overviewComparison.percentageChange}%
                      </span>
                    )}
                </div>

                {overviewComparison.hasSufficientHistoricalData ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Net sales of{' '}
                    <strong className="tabular-nums text-slate-900">
                      {formatNaira(overviewComparison.currentPeriodNetSales)}
                    </strong>{' '}
                    ({overviewComparison.currentPeriodOrders} orders) compared
                    with{' '}
                    <strong className="tabular-nums text-slate-900">
                      {formatNaira(overviewComparison.previousPeriodNetSales)}
                    </strong>{' '}
                    ({overviewComparison.previousPeriodOrders} orders) in{' '}
                    <span className="font-medium">
                      {overviewComparison.previousPeriodLabel}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {overviewComparison.reasonIfUnavailable}
                  </p>
                )}
              </div>
            </div>

            {/* Right 2 Columns: Best-Selling Products by Sales Value */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#5E17EB]" />
                    Best-Selling Products by Sales Value
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ranked by actual net sales value during{' '}
                    {overviewWindow.formattedRange}.
                  </p>
                </div>
              </div>

              {overviewBestProducts.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2 bg-slate-50/50">
                  <ShoppingBag className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    No product sales in this period
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Select a reporting period with recorded transactions to view
                    best-selling products.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            Qty Sold
                          </th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">
                            Gross Value
                          </th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">
                            Discounts
                          </th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">
                            Net Sales Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overviewBestProducts.slice(0, 5).map((prod, idx) => (
                          <tr
                            key={prod.productKey}
                            className="hover:bg-slate-50/70"
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-[#F3EFFE] text-[#5E17EB] font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
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
                                    {prod.ordersCount === 1
                                      ? 'order'
                                      : 'orders'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-bold text-slate-800 tabular-nums whitespace-nowrap">
                              {prod.quantitySold}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                              {formatNaira(prod.grossSalesValue)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                              {prod.totalDiscounts > 0 ? (
                                <span className="text-emerald-700 font-medium">
                                  -{formatNaira(prod.totalDiscounts)}
                                </span>
                              ) : (
                                <span className="text-slate-400">
                                  {formatNaira(0)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                              {formatNaira(prod.netSalesValue)}
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
                placeholder="Search transactions by customer name or product name..."
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

            {/* Filter Dropdowns & Amount Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* 1. Status Filter */}
              <select
                value={txFilters.status}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    status: e.target.value as 'all' | TransactionStatus,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
              >
                <option value="all">Status: All Transactions</option>
                <option value="successful">Status: Successful</option>
                <option value="pending">Status: Pending</option>
                <option value="failed">Status: Failed</option>
                <option value="refunded">Status: Refunded</option>
                <option value="partially_refunded">
                  Status: Partially Refunded
                </option>
              </select>

              {/* 2. Date Preset Filter */}
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
                <option value="yesterday">Date: Yesterday</option>
                <option value="last_7_days">Date: Last 7 Days</option>
                <option value="last_30_days">Date: Last 30 Days</option>
                <option value="this_month">Date: This Month</option>
                <option value="last_month">Date: Last Month</option>
                <option value="this_year">Date: This Year</option>
                <option value="custom">Date: Custom Date Range</option>
              </select>

              {/* 3. Min Amount */}
              <input
                type="number"
                min="0"
                placeholder="Min Net Amount (₦)"
                value={txFilters.minAmount}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    minAmount: e.target.value,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 tabular-nums"
              />

              {/* 4. Max Amount */}
              <input
                type="number"
                min="0"
                placeholder="Max Net Amount (₦)"
                value={txFilters.maxAmount}
                onChange={(e) => {
                  setTxFilters((prev) => ({
                    ...prev,
                    maxAmount: e.target.value,
                  }));
                  setTxPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 tabular-nums"
              />

              {/* 5. Sort By */}
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
                <option value="net_desc">Sort: Net Amount (High to Low)</option>
                <option value="net_asc">Sort: Net Amount (Low to High)</option>
                <option value="gross_desc">
                  Sort: Gross Amount (High to Low)
                </option>
                <option value="gross_asc">
                  Sort: Gross Amount (Low to High)
                </option>
              </select>
            </div>

            {/* Custom Date Range Picker for Transactions */}
            {txFilters.periodPreset === 'custom' && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">
                  Custom Transaction Date Range:
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
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <span>
                Showing <strong>{filteredTransactions.length}</strong> of{' '}
                <strong>{transactions.length}</strong> recorded transactions
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

          {/* Transactions Table or Empty State */}
          {paginatedTransactions.length > 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[920px] xl:min-w-0 xl:table-fixed text-left border-collapse text-xs">
                  <thead className="bg-[#5E17EB] text-white">
                    <tr className="font-semibold select-none">
                      <th className="py-3.5 pl-4 pr-2 whitespace-nowrap xl:w-[13%]">
                        Date & Time
                      </th>
                      <th className="py-3.5 px-2 xl:w-[13%]">Customer Name</th>
                      <th className="py-3.5 px-2.5 xl:w-[21%]">
                        Items / Order Summary
                      </th>
                      <th className="py-3.5 px-2 text-right whitespace-nowrap xl:w-[10%]">
                        Gross Amount
                      </th>
                      <th className="py-3.5 px-2 text-right whitespace-nowrap xl:w-[9%]">
                        Discounts
                      </th>
                      <th className="py-3.5 px-2 text-right whitespace-nowrap xl:w-[11%]">
                        Fees & Commissions
                      </th>
                      <th className="py-3.5 px-2 text-right whitespace-nowrap xl:w-[10%]">
                        Net Amount
                      </th>
                      <th className="py-3.5 px-2 text-center whitespace-nowrap xl:w-[11%]">
                        Transaction Status
                      </th>
                      <th className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap xl:w-[10%]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTransactionId(tx.id)}
                        className="hover:bg-[#F8F9FE] transition-colors cursor-pointer group"
                      >
                        {/* 1. Date & Time */}
                        <td className="py-3.5 pl-4 pr-2 text-slate-600 whitespace-nowrap">
                          {tx.dateTime}
                        </td>

                        {/* 2. Customer Name */}
                        <td className="py-3.5 px-2 font-semibold text-slate-900 group-hover:text-[#5E17EB] transition-colors">
                          <span
                            className="block truncate"
                            title={tx.customerName}
                          >
                            {tx.customerName}
                          </span>
                        </td>

                        {/* 3. Items / Order Summary */}
                        <td className="py-3.5 px-2.5 min-w-0">
                          <p
                            className="font-medium text-slate-800 truncate"
                            title={tx.itemSummary}
                          >
                            {tx.itemSummary}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {tx.items.reduce((s, i) => s + i.quantity, 0)}{' '}
                            {tx.items.reduce((s, i) => s + i.quantity, 0) === 1
                              ? 'item'
                              : 'items'}
                          </span>
                        </td>

                        {/* 4. Gross Amount */}
                        <td className="py-3.5 px-2 text-right tabular-nums font-medium text-slate-800 whitespace-nowrap">
                          {formatNaira(tx.grossAmount)}
                        </td>

                        {/* 5. Discounts */}
                        <td className="py-3.5 px-2 text-right tabular-nums whitespace-nowrap">
                          {tx.totalDiscounts > 0 ? (
                            <span className="text-emerald-700 font-medium">
                              -{formatNaira(tx.totalDiscounts)}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {formatNaira(0)}
                            </span>
                          )}
                        </td>

                        {/* 6. Fees & Commissions */}
                        <td className="py-3.5 px-2 text-right tabular-nums whitespace-nowrap">
                          {tx.merchantFeeAmount > 0 ? (
                            <span className="text-slate-700 font-medium">
                              -{formatNaira(tx.merchantFeeAmount)}
                            </span>
                          ) : (
                            <div>
                              <span className="text-slate-500 block">
                                {formatNaira(0)}
                              </span>
                              {!feeConfig.isConfigured && (
                                <span className="text-[10px] text-slate-400 block">
                                  Not configured
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 7. Net Amount */}
                        <td className="py-3.5 px-2 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          {formatNaira(tx.netAmount)}
                        </td>

                        {/* 8. Transaction Status */}
                        <td className="py-3.5 px-2 text-center whitespace-nowrap">
                          <TransactionStatusBadge status={tx.status} />
                        </td>

                        {/* 9. Actions */}
                        <td
                          className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="purple-light"
                            size="sm"
                            onClick={() => setSelectedTransactionId(tx.id)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                    ? 'Customer payment transactions will appear here automatically once orders are confirmed.'
                    : 'Try adjusting your search query, status filter, date range, or amount range.'}
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
          {/* Settlement Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Total Settled */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Total Settled
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paid Out
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.totalSettled)}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Total funds successfully paid out to your store bank account.
              </p>
            </div>

            {/* 2. Pending Settlement */}
            <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5E17EB]">
                  Pending Settlement
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {unsettledQualifyingTransactions.length} Unsettled{' '}
                  {unsettledQualifyingTransactions.length === 1
                    ? 'Order'
                    : 'Orders'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] tracking-tight tabular-nums">
                {formatNaira(settlementSummaryMetrics.pendingSettlement)}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Earned merchant funds from confirmed sales awaiting settlement
                payout.
              </p>
            </div>

            {/* 3. Next Scheduled Settlement (only when an actual settlement schedule exists) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Next Scheduled Settlement
                </span>
                {!settlementSchedule.isConfigured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <Clock className="w-2.5 h-2.5" />
                    Not Configured
                  </span>
                )}
              </div>
              {settlementSchedule.isConfigured &&
              settlementSchedule.nextScheduledFormatted ? (
                <>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {settlementSchedule.nextScheduledFormatted}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {settlementSchedule.frequencyLabel ||
                      'Scheduled automated settlement cycle.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-slate-700 mt-1">
                    No Schedule Configured
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No automated payout schedule is currently configured on the
                    store backend.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Settlement Filters Row */}
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
                <option value="yesterday">Period: Yesterday</option>
                <option value="last_7_days">Period: Last 7 Days</option>
                <option value="last_30_days">Period: Last 30 Days</option>
                <option value="this_month">Period: This Month</option>
                <option value="last_month">Period: Last Month</option>
                <option value="this_year">Period: This Year</option>
                <option value="custom">Period: Custom Date Range</option>
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
                <option value="pending">Settlement Status: Pending</option>
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
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Settlement History
              </h3>
              <p className="text-xs text-slate-500">
                Completed and in-progress payout settlements to your merchant
                account.
              </p>
            </div>

            {filteredSettlements.length > 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[780px] lg:min-w-0 lg:table-fixed text-left border-collapse text-xs">
                    <thead className="bg-[#5E17EB] text-white">
                      <tr className="font-semibold select-none">
                        <th className="py-3.5 pl-4 pr-2.5 whitespace-nowrap lg:w-[15%]">
                          Settlement Date
                        </th>
                        <th className="py-3.5 px-2.5 lg:w-[22%]">
                          Settlement Period
                        </th>
                        <th className="py-3.5 px-2.5 text-right whitespace-nowrap lg:w-[14%]">
                          Gross Amount
                        </th>
                        <th className="py-3.5 px-2.5 text-right whitespace-nowrap lg:w-[14%]">
                          Total Deductions
                        </th>
                        <th className="py-3.5 px-2.5 text-right whitespace-nowrap lg:w-[15%]">
                          Net Settlement Amount
                        </th>
                        <th className="py-3.5 px-2 text-center whitespace-nowrap lg:w-[10%]">
                          Settlement Status
                        </th>
                        <th className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap lg:w-[10%]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSettlements.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedSettlementId(s.id)}
                          className="hover:bg-[#F8F9FE] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 pl-4 pr-2.5 font-semibold text-slate-900 whitespace-nowrap">
                            {s.settlementDate}
                          </td>
                          <td className="py-3.5 px-2.5 text-slate-700">
                            <span className="block truncate">
                              {s.settlementPeriodLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-2.5 text-right tabular-nums font-medium text-slate-800 whitespace-nowrap">
                            {formatNaira(s.grossAmount)}
                          </td>
                          <td className="py-3.5 px-2.5 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                            {s.totalDeductions > 0
                              ? `-${formatNaira(s.totalDeductions)}`
                              : formatNaira(0)}
                          </td>
                          <td className="py-3.5 px-2.5 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                            {formatNaira(s.netSettlementAmount)}
                          </td>
                          <td className="py-3.5 px-2 text-center whitespace-nowrap">
                            <SettlementStatusBadge status={s.status} />
                          </td>
                          <td
                            className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="purple-light"
                              size="sm"
                              onClick={() => setSelectedSettlementId(s.id)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
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
                    : 'No settlements matching the selected period or status'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {settlements.length === 0
                    ? 'No payout settlement batches have been recorded yet. All earned store funds are currently held in Pending Settlement below.'
                    : 'No recorded settlement batches matched your selected period or status filter.'}
                </p>
              </div>
            )}
          </div>

          {/* Pending Settlement Breakdown: Unsettled Transactions Awaiting Payout */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pending Settlement Breakdown (Unsettled Earnings)
                </h3>
                <p className="text-xs text-slate-500">
                  Successful transactions awaiting settlement payout (
                  {formatNaira(settlementSummaryMetrics.pendingSettlement)}{' '}
                  total net pending).
                </p>
              </div>
            </div>

            {unsettledQualifyingTransactions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs space-y-2">
                <p className="text-sm font-bold text-slate-800">
                  No pending settlements for this period
                </p>
                <p className="text-xs text-slate-500">
                  There are no unsettled transactions in the selected period.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[780px] lg:min-w-0 lg:table-fixed text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr className="font-semibold select-none">
                        <th className="py-3 pl-4 pr-2.5 whitespace-nowrap lg:w-[16%]">
                          Transaction Date
                        </th>
                        <th className="py-3 px-2.5 lg:w-[16%]">Customer Name</th>
                        <th className="py-3 px-2.5 lg:w-[24%]">
                          Items / Order Summary
                        </th>
                        <th className="py-3 px-2 text-right whitespace-nowrap lg:w-[11%]">
                          Gross Amount
                        </th>
                        <th className="py-3 px-2 text-right whitespace-nowrap lg:w-[11%]">
                          Deductions
                        </th>
                        <th className="py-3 px-2 text-right whitespace-nowrap lg:w-[12%]">
                          Unsettled Net
                        </th>
                        <th className="py-3 pl-2 pr-4 text-right whitespace-nowrap lg:w-[10%]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unsettledQualifyingTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => setSelectedTransactionId(tx.id)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3 pl-4 pr-2.5 text-slate-600 whitespace-nowrap">
                            {tx.dateTime}
                          </td>
                          <td className="py-3 px-2.5 font-semibold text-slate-900 truncate">
                            {tx.customerName}
                          </td>
                          <td className="py-3 px-2.5 text-slate-700 truncate">
                            {tx.itemSummary}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                            {formatNaira(tx.grossAmount)}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                            {tx.totalDiscounts + tx.merchantFeeAmount > 0
                              ? `-${formatNaira(
                                  tx.totalDiscounts + tx.merchantFeeAmount
                                )}`
                              : formatNaira(0)}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums font-bold text-[#5E17EB] whitespace-nowrap">
                            {formatNaira(tx.netAmount)}
                          </td>
                          <td
                            className="py-3 pl-2 pr-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="purple-light"
                              size="sm"
                              onClick={() => setSelectedTransactionId(tx.id)}
                            >
                              View Details
                            </Button>
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
          TAB 4: REPORTS
          ========================================================================== */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {REPORT_CATEGORIES.map((cat) => {
              const isSelected = reportCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setReportCategory(cat.id)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-[#F8F6FE] border-[#5E17EB] ring-1 ring-[#5E17EB]/20 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isSelected ? 'text-[#5E17EB]' : 'text-slate-900'
                      }`}
                    >
                      {cat.title}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-[#5E17EB]' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    {cat.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Report Filters & Export Action Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
                {/* 1. Date Range Preset */}
                <select
                  value={reportPreset}
                  onChange={(e) =>
                    setReportPreset(e.target.value as ReportingPeriodPreset)
                  }
                  className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
                >
                  {PERIOD_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      Period: {REPORTING_PERIOD_LABELS[preset]}
                    </option>
                  ))}
                </select>

                {/* 2. Transaction Status Filter (where relevant) */}
                {reportCategory !== 'product_performance_report' ? (
                  <select
                    value={reportStatusFilter}
                    onChange={(e) =>
                      setReportStatusFilter(
                        e.target.value as 'all' | TransactionStatus
                      )
                    }
                    className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
                  >
                    <option value="all">Status: All Transactions</option>
                    <option value="successful">Status: Successful</option>
                    <option value="pending">Status: Pending</option>
                    <option value="failed">Status: Failed</option>
                    <option value="refunded">Status: Refunded</option>
                    <option value="partially_refunded">
                      Status: Partially Refunded
                    </option>
                  </select>
                ) : (
                  <div className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-500 flex items-center">
                    Status: Qualifying Sales Only
                  </div>
                )}

                {/* 3. Product Filter */}
                <select
                  value={reportProductFilter}
                  onChange={(e) => setReportProductFilter(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
                >
                  <option value="all">Product: All Store Products</option>
                  {availableReportProducts.map((prodName) => (
                    <option key={prodName} value={prodName}>
                      Product: {prodName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 self-end lg:self-auto">
                {hasActiveReportFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={handleResetReportFilters}
                  >
                    Reset
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isExportingCsv}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportReportCsv}
                >
                  Export Report (CSV)
                </Button>
              </div>
            </div>

            {reportPreset === 'custom' && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">
                  Custom Report Date Range:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={reportCustomFrom}
                    onChange={(e) => setReportCustomFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={reportCustomTo}
                    onChange={(e) => setReportCustomTo(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Report Header Banner */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {
                    REPORT_CATEGORIES.find((c) => c.id === reportCategory)
                      ?.title
                  }
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reporting Period: <strong>{reportWindow.label}</strong> (
                  {reportWindow.formattedRange}) · {reportWindow.timezoneLabel}
                  {reportProductFilter !== 'all' &&
                    ` · Product: ${reportProductFilter}`}
                </p>
              </div>
            </div>

            {/* REPORT 1: SALES REPORT */}
            {reportCategory === 'sales_report' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 block">
                      Total Gross Sales
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.grossSales)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 block">
                      Total Discounts
                    </span>
                    <span className="text-lg font-extrabold text-emerald-700 mt-1 block tabular-nums">
                      {reportMetrics.totalDiscounts > 0
                        ? `-${formatNaira(reportMetrics.totalDiscounts)}`
                        : formatNaira(0)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F6FE] border border-[#DDD0FA]">
                    <span className="text-xs font-semibold text-[#5E17EB] block">
                      Total Net Sales
                    </span>
                    <span className="text-lg font-extrabold text-[#5E17EB] mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.netEarnings)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 block">
                      Number of Orders
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">
                      {reportMetrics.qualifyingOrderCount}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 col-span-2 sm:col-span-1">
                    <span className="text-xs text-slate-500 block">
                      Average Order Value
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.averageOrderValue)}
                    </span>
                  </div>
                </div>

                {/* Sales Breakdown Table over Selected Period */}
                {reportMetrics.qualifyingOrderCount === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center space-y-2 bg-slate-50/40">
                    <p className="text-sm font-bold text-slate-800">
                      No sales data matching the selected filters
                    </p>
                    <p className="text-xs text-slate-500">
                      There were no qualifying sales transactions during{' '}
                      {reportWindow.formattedRange}.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="py-3 px-4">Date / Time Interval</th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">
                              Orders
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Gross Sales
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Discounts
                            </th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">
                              Net Sales
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportChartBuckets
                            .filter((b) => b.orderCount > 0 || b.grossSales > 0)
                            .map((b) => (
                              <tr key={b.key} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  {b.fullLabel}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-slate-800 tabular-nums">
                                  {b.orderCount}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                                  {formatNaira(b.grossSales)}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-emerald-700">
                                  {b.discounts > 0
                                    ? `-${formatNaira(b.discounts)}`
                                    : formatNaira(0)}
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                                  {formatNaira(b.netSales)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-extrabold text-slate-900">
                          <tr>
                            <td className="py-3 px-4">Period Total</td>
                            <td className="py-3 px-3 text-center tabular-nums">
                              {reportMetrics.qualifyingOrderCount}
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums">
                              {formatNaira(reportMetrics.grossSales)}
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-emerald-700">
                              {reportMetrics.totalDiscounts > 0
                                ? `-${formatNaira(
                                    reportMetrics.totalDiscounts
                                  )}`
                                : formatNaira(0)}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums text-[#5E17EB]">
                              {formatNaira(reportMetrics.netEarnings)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REPORT 2: TRANSACTION REPORT */}
            {reportCategory === 'transaction_report' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-xs font-medium text-emerald-800 block">
                      Successful
                    </span>
                    <span className="text-xl font-extrabold text-emerald-900 mt-1 block tabular-nums">
                      {
                        reportFilteredTransactions.filter(
                          (t) => t.status === 'successful'
                        ).length
                      }
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                    <span className="text-xs font-medium text-amber-800 block">
                      Pending
                    </span>
                    <span className="text-xl font-extrabold text-amber-900 mt-1 block tabular-nums">
                      {
                        reportFilteredTransactions.filter(
                          (t) => t.status === 'pending'
                        ).length
                      }
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
                    <span className="text-xs font-medium text-red-800 block">
                      Failed
                    </span>
                    <span className="text-xl font-extrabold text-red-900 mt-1 block tabular-nums">
                      {
                        reportFilteredTransactions.filter(
                          (t) => t.status === 'failed'
                        ).length
                      }
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="text-xs font-medium text-slate-700 block">
                      Refunded / Partial
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 mt-1 block tabular-nums">
                      {
                        reportFilteredTransactions.filter(
                          (t) =>
                            t.status === 'refunded' ||
                            t.status === 'partially_refunded'
                        ).length
                      }
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F6FE] border border-[#DDD0FA] col-span-2 sm:col-span-1">
                    <span className="text-xs font-semibold text-[#5E17EB] block">
                      Total Net Transaction Value
                    </span>
                    <span className="text-lg font-extrabold text-[#5E17EB] mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.netEarnings)}
                    </span>
                  </div>
                </div>

                {reportFilteredTransactions.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center space-y-2 bg-slate-50/40">
                    <p className="text-sm font-bold text-slate-800">
                      No transactions matching the selected filters
                    </p>
                    <p className="text-xs text-slate-500">
                      Adjust the reporting period, status, or product filter to
                      view transaction records.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[780px] text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="py-3 px-3.5 whitespace-nowrap">
                              Date & Time
                            </th>
                            <th className="py-3 px-3">Customer Name</th>
                            <th className="py-3 px-3">Items Summary</th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Gross Amount
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Discounts
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Net Amount
                            </th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportFilteredTransactions.map((tx) => (
                            <tr
                              key={tx.id}
                              onClick={() => setSelectedTransactionId(tx.id)}
                              className="hover:bg-slate-50/80 cursor-pointer"
                            >
                              <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                                {tx.dateTime}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-900">
                                {tx.customerName}
                              </td>
                              <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                                {tx.itemSummary}
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums text-slate-800 whitespace-nowrap">
                                {formatNaira(tx.grossAmount)}
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                                {tx.totalDiscounts > 0
                                  ? `-${formatNaira(tx.totalDiscounts)}`
                                  : formatNaira(0)}
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                                {formatNaira(tx.netAmount)}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <TransactionStatusBadge status={tx.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REPORT 3: EARNINGS REPORT */}
            {reportCategory === 'earnings_report' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 block">
                      Gross Sales
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.grossSales)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 block">
                      Commissions & Fees
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.feesAndCommissions)}
                    </span>
                    {!reportMetrics.isFeeConfigAvailable && (
                      <span className="text-[10px] text-slate-400 block">
                        Not configured
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F6FE] border border-[#DDD0FA]">
                    <span className="text-xs font-semibold text-[#5E17EB] block">
                      Net Earnings
                    </span>
                    <span className="text-lg font-extrabold text-[#5E17EB] mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.netEarnings)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                    <span className="text-xs font-medium text-amber-800 block">
                      Pending Settlement
                    </span>
                    <span className="text-lg font-extrabold text-amber-900 mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.pendingSettlement)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 col-span-2 sm:col-span-1">
                    <span className="text-xs font-medium text-emerald-800 block">
                      Settled Amount
                    </span>
                    <span className="text-lg font-extrabold text-emerald-900 mt-1 block tabular-nums">
                      {formatNaira(reportMetrics.totalSettled)}
                    </span>
                  </div>
                </div>

                {reportMetrics.qualifyingOrderCount === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center space-y-2 bg-slate-50/40">
                    <p className="text-sm font-bold text-slate-800">
                      No earnings data available for this period
                    </p>
                    <p className="text-xs text-slate-500">
                      Select a period with confirmed transactions to review
                      merchant earnings.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[740px] text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="py-3 px-3.5">Date & Time</th>
                            <th className="py-3 px-3">Customer Name</th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Gross Sales
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Discounts
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Fees & Commissions
                            </th>
                            <th className="py-3 px-3 text-right whitespace-nowrap">
                              Net Earnings
                            </th>
                            <th className="py-3 px-3.5 text-center whitespace-nowrap">
                              Settlement State
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportFilteredTransactions
                            .filter(
                              (tx) =>
                                tx.status === 'successful' ||
                                tx.status === 'partially_refunded'
                            )
                            .map((tx) => (
                              <tr
                                key={tx.id}
                                onClick={() => setSelectedTransactionId(tx.id)}
                                className="hover:bg-slate-50/80 cursor-pointer"
                              >
                                <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                                  {tx.dateTime}
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-900">
                                  {tx.customerName}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-slate-800 whitespace-nowrap">
                                  {formatNaira(tx.grossAmount)}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                                  {tx.totalDiscounts > 0
                                    ? `-${formatNaira(tx.totalDiscounts)}`
                                    : formatNaira(0)}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-slate-600 whitespace-nowrap">
                                  {tx.merchantFeeAmount > 0
                                    ? `-${formatNaira(tx.merchantFeeAmount)}`
                                    : formatNaira(0)}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums font-bold text-[#5E17EB] whitespace-nowrap">
                                  {formatNaira(tx.netAmount)}
                                </td>
                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                  {tx.settlementStatus === 'paid' ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Settled
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                      Pending Settlement
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REPORT 4: PRODUCT PERFORMANCE REPORT */}
            {reportCategory === 'product_performance_report' && (
              <div className="space-y-5">
                {reportProductPerformance.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center space-y-2 bg-slate-50/40">
                    <p className="text-sm font-bold text-slate-800">
                      No product performance data for the selected filters
                    </p>
                    <p className="text-xs text-slate-500">
                      Select a period with confirmed product sales to generate
                      this report.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Top Highlights: Best by Value & Best by Quantity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="p-4 rounded-xl bg-[#F8F6FE] border border-[#DDD0FA]">
                        <span className="text-[11px] font-semibold text-[#5E17EB] block">
                          Top Product by Sales Value
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 mt-1 block truncate">
                          {reportProductPerformance[0]?.productName}
                        </span>
                        <span className="text-xs font-bold text-[#5E17EB] tabular-nums">
                          {formatNaira(
                            reportProductPerformance[0]?.netSalesValue || 0
                          )}
                        </span>
                      </div>

                      {(() => {
                        const topByQty = [...reportProductPerformance].sort(
                          (a, b) => b.quantitySold - a.quantitySold
                        )[0];
                        return (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                            <span className="text-[11px] font-medium text-slate-500 block">
                              Top Product by Quantity Sold
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 mt-1 block truncate">
                              {topByQty?.productName}
                            </span>
                            <span className="text-xs font-bold text-slate-700 tabular-nums">
                              {topByQty?.quantitySold || 0} units sold
                            </span>
                          </div>
                        );
                      })()}

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Total Units Sold
                        </span>
                        <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">
                          {reportProductPerformance.reduce(
                            (s, p) => s + p.quantitySold,
                            0
                          )}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Product Discounts Applied
                        </span>
                        <span className="text-lg font-extrabold text-emerald-700 mt-1 block tabular-nums">
                          {formatNaira(
                            reportProductPerformance.reduce(
                              (s, p) => s + p.productDiscountsApplied,
                              0
                            )
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Product Performance Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                            <tr>
                              <th className="py-3 px-4">Product Name</th>
                              <th className="py-3 px-2.5 text-center whitespace-nowrap">
                                Orders
                              </th>
                              <th className="py-3 px-2.5 text-center whitespace-nowrap">
                                Qty Sold
                              </th>
                              <th className="py-3 px-3 text-right whitespace-nowrap">
                                Gross Sales Value
                              </th>
                              <th className="py-3 px-3 text-right whitespace-nowrap">
                                Product Discounts
                              </th>
                              <th className="py-3 px-3 text-right whitespace-nowrap">
                                Promo Discounts
                              </th>
                              <th className="py-3 px-4 text-right whitespace-nowrap">
                                Net Sales Value
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportProductPerformance.map((p) => (
                              <tr
                                key={p.productKey}
                                className="hover:bg-slate-50/80"
                              >
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                                      {p.image ? (
                                        <img
                                          src={p.image}
                                          alt={p.productName}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Package className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="block">
                                        {p.productName}
                                      </span>
                                      {p.unit && (
                                        <span className="text-[11px] text-slate-400 font-normal">
                                          Unit: {p.unit}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-2.5 text-center tabular-nums text-slate-700">
                                  {p.ordersCount}
                                </td>
                                <td className="py-3 px-2.5 text-center tabular-nums font-bold text-slate-900">
                                  {p.quantitySold}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-slate-800 whitespace-nowrap">
                                  {formatNaira(p.grossSalesValue)}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                                  {p.productDiscountsApplied > 0
                                    ? `-${formatNaira(
                                        p.productDiscountsApplied
                                      )}`
                                    : formatNaira(0)}
                                </td>
                                <td className="py-3 px-3 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                                  {p.promotionDiscountsAllocated > 0
                                    ? `-${formatNaira(
                                        p.promotionDiscountsAllocated
                                      )}`
                                    : formatNaira(0)}
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums font-bold text-[#5E17EB] whitespace-nowrap">
                                  {formatNaira(p.netSalesValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        feeConfig={feeConfig}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransactionId(null)}
      />

      {/* Settlement Details Modal */}
      <SettlementDetailsModal
        settlement={selectedSettlement}
        feeConfig={feeConfig}
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlementId(null)}
      />
    </div>
  );
};
