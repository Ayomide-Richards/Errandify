import React, { useState, useEffect, useMemo } from 'react';
import type {
  Order,
  OrderDateFilterPreset,
  OrderFiltersState,
  OrderSortOption,
  OrderStatus,
} from '../../types/order';
import {
  OrderStorage,
  STATUS_LABELS,
  calculateOrderMetrics,
  getOrderTotalItemCount,
} from '../../services/orderStorage';
import { formatNaira } from '../../services/productStorage';
import { OrderStatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { OrderDetailsModal } from '../dashboard/OrderDetailsModal';
import {
  Search,
  X,
  ShoppingCart,
  Calendar,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface OrdersViewProps {
  onStockUpdated?: () => void;
}

const ORDER_TABS: Array<{
  id: 'all' | OrderStatus;
  label: string;
}> = [
  { id: 'all', label: 'All Orders' },
  { id: 'new_order', label: 'New Order' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready_for_pickup', label: 'Ready for Pickup' },
  { id: 'runner_assigned', label: 'Runner Assigned' },
  { id: 'picked_up', label: 'Picked Up' },
];

export const OrdersView: React.FC<OrdersViewProps> = ({ onStockUpdated }) => {
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>(() => OrderStorage.getOrders());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [filters, setFilters] = useState<OrderFiltersState>({
    search: '',
    status: 'all',
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date_desc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadOrdersData = () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = OrderStorage.getOrders();
      setOrders(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      setOrders(OrderStorage.getOrders());
    };
    window.addEventListener('errandify:orders-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('errandify:orders-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const metrics = useMemo(() => calculateOrderMetrics(orders), [orders]);

  const tabCounts: Record<'all' | OrderStatus, number> = useMemo(
    () => ({
      all: metrics.totalOrders,
      new_order: metrics.newOrders,
      preparing: metrics.preparing,
      ready_for_pickup: metrics.readyForPickup,
      runner_assigned: metrics.runnerAssigned,
      picked_up: metrics.pickedUp,
    }),
    [metrics]
  );

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.datePreset !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sortBy !== 'date_desc';

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      datePreset: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date_desc',
    });
    setCurrentPage(1);
  };

  const handleSelectStatus = (status: 'all' | OrderStatus) => {
    setFilters((prev) => ({
      ...prev,
      status,
    }));
    setCurrentPage(1);
  };

  // Reference timestamp anchored to the latest order in dataset for preset filtering
  const referenceTimestamp = useMemo(() => {
    const fallback = new Date('2026-11-10T12:00:00.000Z').getTime();
    if (orders.length === 0) return fallback;
    const times = orders
      .map((o) => new Date(o.createdAt).getTime())
      .filter((t) => !isNaN(t));
    return times.length > 0 ? Math.max(...times) : fallback;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // 1. Search by customer name or product name (including option names)
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          const matchCustomer = order.customerName.toLowerCase().includes(q);
          const matchSummary = order.itemSummary.toLowerCase().includes(q);
          const matchItems = order.items.some(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              (item.selectedOptionsLabel &&
                item.selectedOptionsLabel.toLowerCase().includes(q))
          );
          if (!matchCustomer && !matchSummary && !matchItems) {
            return false;
          }
        }

        // 2. Filter by order status
        if (filters.status !== 'all' && order.status !== filters.status) {
          return false;
        }

        // 3. Filter by order date or date range
        const orderTime = new Date(order.createdAt).getTime();
        if (!isNaN(orderTime)) {
          if (filters.datePreset === 'today') {
            const refDate = new Date(referenceTimestamp);
            const startOfRefDay = new Date(
              refDate.getFullYear(),
              refDate.getMonth(),
              refDate.getDate()
            ).getTime();
            const endOfRefDay = startOfRefDay + 24 * 60 * 60 * 1000 - 1;
            if (orderTime < startOfRefDay || orderTime > endOfRefDay) {
              return false;
            }
          } else if (filters.datePreset === 'last_7_days') {
            const cutoff = referenceTimestamp - 7 * 24 * 60 * 60 * 1000;
            if (orderTime < cutoff) return false;
          } else if (filters.datePreset === 'last_30_days') {
            const cutoff = referenceTimestamp - 30 * 24 * 60 * 60 * 1000;
            if (orderTime < cutoff) return false;
          } else if (filters.datePreset === 'custom') {
            if (filters.dateFrom) {
              const fromTime = new Date(`${filters.dateFrom}T00:00:00`).getTime();
              if (!isNaN(fromTime) && orderTime < fromTime) return false;
            }
            if (filters.dateTo) {
              const toTime = new Date(`${filters.dateTo}T23:59:59.999`).getTime();
              if (!isNaN(toTime) && orderTime > toTime) return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'amount_desc') {
          return b.totalAmount - a.totalAmount;
        }
        if (filters.sortBy === 'amount_asc') {
          return a.totalAmount - b.totalAmount;
        }
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (filters.sortBy === 'date_asc') {
          return timeA - timeB;
        }
        // default date_desc
        return timeB - timeA;
      });
  }, [orders, filters, referenceTimestamp]);

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || null;

  const handleUpdateOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    options?: { handoverNotes?: string }
  ) => {
    const { updatedOrder, stockUpdated } = OrderStorage.updateOrderStatus({
      orderId,
      nextStatus,
      handoverNotes: options?.handoverNotes,
    });

    setOrders(OrderStorage.getOrders());
    if (stockUpdated && onStockUpdated) {
      onStockUpdated();
    }

    if (nextStatus === 'preparing') {
      toast.success(
        'Order marked as Preparing',
        `${updatedOrder.customerName}'s order is now in preparation.`
      );
    } else if (nextStatus === 'ready_for_pickup') {
      toast.success(
        'Order is Ready for Pickup',
        `${updatedOrder.customerName}'s order is complete and awaiting runner assignment.`
      );
    } else if (nextStatus === 'runner_assigned') {
      toast.success(
        'Runner Assigned',
        `${updatedOrder.runnerName || 'A runner'} has been assigned to ${updatedOrder.customerName}'s order.`
      );
    } else if (nextStatus === 'picked_up') {
      toast.success(
        'Order Picked Up',
        `${updatedOrder.customerName}'s order was collected by the runner at ${updatedOrder.handedOverAt}.`
      );
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor customer orders, manage preparation, and track runner pickups.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 h-28 animate-pulse"
            >
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-12 bg-slate-200 rounded mt-4" />
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-xs text-slate-500">
          Loading merchant orders...
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
            Orders
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-red-900">
            Unable to Load Orders
          </h3>
          <p className="text-xs text-red-700 max-w-md mx-auto">{loadError}</p>
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadOrdersData}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty Store State (when merchant has no orders at all)
  if (orders.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor customer orders, manage preparation, and track runner pickups.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No customer orders yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            New orders will appear here automatically as soon as customers complete payment through the Errandify marketplace.
          </p>
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
            Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor customer orders, manage preparation, and track runner pickups.
          </p>
        </div>
      </div>

      {/* 5 Summary Metric Cards: New Order, Preparing, Ready for Pickup, Runner Assigned, Picked Up */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1. New Order */}
        <div
          onClick={() =>
            handleSelectStatus(
              filters.status === 'new_order' ? 'all' : 'new_order'
            )
          }
          className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.status === 'new_order'
              ? 'border-[#C2410C] ring-1 ring-[#C2410C]/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">New Order</p>
            <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.newOrders}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Awaiting preparation
          </p>
        </div>

        {/* 2. Preparing */}
        <div
          onClick={() =>
            handleSelectStatus(
              filters.status === 'preparing' ? 'all' : 'preparing'
            )
          }
          className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.status === 'preparing'
              ? 'border-[#0284C7] ring-1 ring-[#0284C7]/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Preparing</p>
            <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.preparing}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Being assembled
          </p>
        </div>

        {/* 3. Ready for Pickup */}
        <div
          onClick={() =>
            handleSelectStatus(
              filters.status === 'ready_for_pickup' ? 'all' : 'ready_for_pickup'
            )
          }
          className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.status === 'ready_for_pickup'
              ? 'border-[#5E17EB] ring-1 ring-[#5E17EB]/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Ready for Pickup
            </p>
            <span className="w-2 h-2 rounded-full bg-[#5E17EB]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.readyForPickup}
          </p>
          <p className="text-[11px] text-[#5E17EB] font-medium mt-1">
            Awaiting runner assignment
          </p>
        </div>

        {/* 4. Runner Assigned */}
        <div
          onClick={() =>
            handleSelectStatus(
              filters.status === 'runner_assigned' ? 'all' : 'runner_assigned'
            )
          }
          className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.status === 'runner_assigned'
              ? 'border-[#E11D48] ring-1 ring-[#E11D48]/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Runner Assigned
            </p>
            <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.runnerAssigned}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Runner assigned for pickup
          </p>
        </div>

        {/* 5. Picked Up */}
        <div
          onClick={() =>
            handleSelectStatus(
              filters.status === 'picked_up' ? 'all' : 'picked_up'
            )
          }
          className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm col-span-2 sm:col-span-1 ${
            filters.status === 'picked_up'
              ? 'border-blue-600 ring-1 ring-blue-600/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Picked Up</p>
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.pickedUp}
          </p>
          <p className="text-[11px] text-blue-700 mt-1">
            Collected by runner
          </p>
        </div>
      </div>

      {/* Page-Level Status Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {ORDER_TABS.map((tab) => {
            const isActive = filters.status === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectStatus(tab.id)}
                className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-[#5E17EB] text-[#5E17EB]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-[#F3EFFE] text-[#5E17EB]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search, Status, Date & Sort Controls */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or product name..."
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/90 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] shadow-2xs transition-all"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, search: '' }));
                setCurrentPage(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Sort Dropdowns Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {/* Status Filter Dropdown */}
            <select
              value={filters.status}
              onChange={(e) =>
                handleSelectStatus(e.target.value as 'all' | OrderStatus)
              }
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs"
            >
              <option value="all">Status: All Orders</option>
              <option value="new_order">Status: New Order</option>
              <option value="preparing">Status: Preparing</option>
              <option value="ready_for_pickup">Status: Ready for Pickup</option>
              <option value="runner_assigned">Status: Runner Assigned</option>
              <option value="picked_up">Status: Picked Up</option>
            </select>

            {/* Date Filter Preset Dropdown */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filters.datePreset}
                onChange={(e) => {
                  const preset = e.target.value as OrderDateFilterPreset;
                  setFilters((prev) => ({
                    ...prev,
                    datePreset: preset,
                  }));
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs"
              >
                <option value="all">Order Date: All Dates</option>
                <option value="today">Order Date: Today</option>
                <option value="last_7_days">Order Date: Last 7 Days</option>
                <option value="last_30_days">Order Date: Last 30 Days</option>
                <option value="custom">Order Date: Custom Date Range</option>
              </select>
            </div>

            {/* Sort By Dropdown */}
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as OrderSortOption,
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs"
            >
              <option value="date_desc">Sort: Order Date (Newest First)</option>
              <option value="date_asc">Sort: Order Date (Oldest First)</option>
              <option value="amount_desc">Sort: Total Amount (High to Low)</option>
              <option value="amount_asc">Sort: Total Amount (Low to High)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#5E17EB] hover:text-[#4E12C6] px-3 py-2 rounded-xl hover:bg-[#F3EFFE] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Custom Date Range Picker Row */}
        {filters.datePreset === 'custom' && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs shadow-2xs">
            <span className="font-semibold text-slate-700">
              Filter by Date Range:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#5E17EB]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#5E17EB]"
              />
            </div>
          </div>
        )}
      </div>

      {/* All Orders Table or Empty Filter / Tab State */}
      {paginatedOrders.length > 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] lg:min-w-0 lg:table-fixed text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-[#5E17EB] text-white">
                <tr className="text-xs font-semibold select-none">
                  <th className="py-3.5 pl-4 pr-2.5 lg:w-[15%]">Customer Name</th>
                  <th className="py-3.5 px-2.5 lg:w-[27%]">
                    Items / Order Summary
                  </th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap lg:w-[9%]">
                    Item Count
                  </th>
                  <th className="py-3.5 px-2.5 whitespace-nowrap lg:w-[16%]">
                    Order Date and Time
                  </th>
                  <th className="py-3.5 px-2.5 text-right whitespace-nowrap lg:w-[11%]">
                    Total Amount
                  </th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap lg:w-[12%]">
                    Order Status
                  </th>
                  <th className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap lg:w-[10%]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((order) => {
                  const itemCount = getOrderTotalItemCount(order);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="hover:bg-[#F8F9FE] transition-colors cursor-pointer group"
                    >
                      {/* 1. Customer Name */}
                      <td className="py-3.5 pl-4 pr-2.5 font-semibold text-slate-900 group-hover:text-[#5E17EB] transition-colors">
                        <span
                          className="block truncate"
                          title={order.customerName}
                        >
                          {order.customerName}
                        </span>
                      </td>

                      {/* 2. Items / Order Summary (Only ordered product names and customer notes) */}
                      <td className="py-3.5 px-2.5 min-w-0">
                        <p
                          className="font-medium text-slate-800 truncate"
                          title={order.itemSummary}
                        >
                          {order.itemSummary}
                        </p>
                        {order.notes && (
                          <div
                            className="flex items-center gap-1 text-[11px] text-amber-700 font-medium mt-0.5 min-w-0"
                            title={`Note: ${order.notes}`}
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{order.notes}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Item Count */}
                      <td className="py-3.5 px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* 4. Order Date and Time */}
                      <td className="py-3.5 px-2.5 text-xs text-slate-600 whitespace-nowrap">
                        {order.dateTime}
                      </td>

                      {/* 5. Total Amount */}
                      <td className="py-3.5 px-2.5 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatNaira(order.totalAmount)}
                      </td>

                      {/* 6. Order Status */}
                      <td className="py-3.5 px-2 text-center whitespace-nowrap">
                        <OrderStatusBadge
                          status={order.status}
                          label={STATUS_LABELS[order.status]}
                        />
                      </td>

                      {/* 7. Actions (Only View Order) */}
                      <td
                        className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="purple-light"
                          size="sm"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          View Order
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State for Individual Status Tabs or Search/Filter Results */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {filters.search.trim() || filters.datePreset !== 'all'
                ? 'No matching orders found'
                : filters.status !== 'all'
                ? `No orders in "${STATUS_LABELS[filters.status]}"`
                : 'No orders found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filters.search.trim() || filters.datePreset !== 'all'
                ? 'No customer orders matched your search query or selected date range.'
                : filters.status !== 'all'
                ? `There are currently no orders with the "${STATUS_LABELS[filters.status]}" status.`
                : 'No orders match the current view.'}
            </p>
          </div>
          {hasActiveFilters && (
            <div className="pt-1">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                View All Orders
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 pt-2">
          <p>
            Showing {Math.min(1 + (currentPage - 1) * pageSize, totalItems)} -{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems}{' '}
            {totalItems === 1 ? 'order' : 'orders'}
          </p>

          <div className="flex items-center gap-1 self-center sm:self-auto select-none">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === page
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reused Order Details & Management Modal (Same component used by Overview) */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={handleUpdateOrderStatus}
        onStockUpdated={onStockUpdated}
      />
    </div>
  );
};
