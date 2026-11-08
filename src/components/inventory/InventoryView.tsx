import React, { useState, useMemo } from 'react';
import type { Product } from '../../types/product';
import type {
  InventoryFilters,
  StockAdjustmentRecord,
  StockAdjustmentType,
} from '../../types/inventory';
import {
  InventoryStorage,
  calculateInventoryMetrics,
  getCombinationStockBreakdown,
} from '../../services/inventoryStorage';
import {
  getProductStock,
  getProductAvailability,
  getProductLowStockThreshold,
  getCombinationAvailability,
  getCombinationLowStockThreshold,
} from '../../services/productStorage';
import { CATEGORIES } from '../../data/categories';
import { AvailabilityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { InventoryDetailsModal } from './InventoryDetailsModal';
import { StockHistoryModal } from './StockHistoryModal';
import {
  Search,
  X,
  Package,
  Layers,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Check,
  Eye,
  PackageOpen,
  Plus,
  RotateCcw,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToAddProduct: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToAddProduct,
}) => {
  const toast = useToast();

  // Filter & Sort State
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    sortBy: 'updated_desc',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Expanded option-based products in table
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([
    'prod-005',
  ]);

  // Inline threshold editing in table
  const [inlineThresholdProductId, setInlineThresholdProductId] = useState<
    string | null
  >(null);
  const [inlineThresholdValue, setInlineThresholdValue] = useState<string>('');

  // History state
  const [history, setHistory] = useState<StockAdjustmentRecord[]>(() =>
    InventoryStorage.getHistory()
  );

  // Modals State
  const [adjustModalState, setAdjustModalState] = useState<{
    isOpen: boolean;
    productId: string | null;
    combinationId?: string;
    initialType?: StockAdjustmentType;
  }>({ isOpen: false, productId: null });

  const [detailsProductId, setDetailsProductId] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const refreshAll = () => {
    onRefreshProducts();
    setHistory(InventoryStorage.getHistory());
  };

  // Summary metrics
  const metrics = useMemo(() => calculateInventoryMetrics(products), [products]);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category !== 'all' ||
    filters.stockStatus !== 'all' ||
    filters.sortBy !== 'updated_desc';

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      stockStatus: 'all',
      sortBy: 'updated_desc',
    });
    setCurrentPage(1);
  };

  const toggleExpandProduct = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Filtered & sorted inventory list
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search by product name, category, or combination title
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          const matchComb = p.combinations?.some((c) =>
            c.title.toLowerCase().includes(q)
          );
          if (!matchName && !matchCat && !matchComb) {
            return false;
          }
        }

        // Category filter
        if (filters.category !== 'all' && p.category !== filters.category) {
          return false;
        }

        // Stock status filter
        if (filters.stockStatus !== 'all') {
          const prodStatus = getProductAvailability(p);
          if (prodStatus !== filters.stockStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (filters.sortBy === 'qty_asc') {
          return getProductStock(a) - getProductStock(b);
        }
        if (filters.sortBy === 'qty_desc') {
          return getProductStock(b) - getProductStock(a);
        }
        // default updated_desc
        const timeA = new Date(a.lastStockUpdate || a.updatedAt).getTime();
        const timeB = new Date(b.lastStockUpdate || b.updatedAt).getTime();
        return timeB - timeA;
      });
  }, [products, filters]);

  // Pagination
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Handlers
  const handleConfirmAdjustment = (params: {
    productId: string;
    combinationId?: string;
    adjustmentType: StockAdjustmentType;
    quantity: number;
    reason: string;
    notes?: string;
  }) => {
    try {
      const { updatedProduct, record } = InventoryStorage.adjustStock(params);
      refreshAll();
      const targetLabel = record.combinationTitle
        ? `${updatedProduct.name} (${record.combinationTitle})`
        : updatedProduct.name;

      toast.success(
        `Stock updated for "${targetLabel}"`,
        `Quantity changed from ${record.previousQuantity} to ${record.resultingQuantity} (${record.reason}).`
      );
    } catch (err: any) {
      toast.error(
        'Stock adjustment failed',
        err?.message || 'Unable to update stock quantity.'
      );
    }
  };

  const handleUpdateThreshold = (
    productId: string,
    newThreshold: number,
    combinationId?: string
  ) => {
    try {
      const updated = InventoryStorage.updateLowStockThreshold({
        productId,
        threshold: newThreshold,
        combinationId,
      });
      refreshAll();
      toast.success(
        'Low-stock threshold updated',
        `Threshold for "${updated.name}" set to ≤ ${newThreshold} units.`
      );
    } catch (err: any) {
      toast.error(
        'Failed to update threshold',
        err?.message || 'Please enter a valid whole number.'
      );
    }
  };

  const handleSaveInlineThreshold = (productId: string) => {
    if (!/^\d+$/.test(inlineThresholdValue.trim())) {
      toast.error('Invalid threshold', 'Please enter a non-negative whole number.');
      return;
    }
    const val = parseInt(inlineThresholdValue.trim(), 10);
    handleUpdateThreshold(productId, val);
    setInlineThresholdProductId(null);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const activeAdjustProduct = products.find(
    (p) => p.id === adjustModalState.productId
  ) || null;
  const activeDetailsProduct = products.find(
    (p) => p.id === detailsProductId
  ) || null;

  // Empty store state
  if (products.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor product stock levels, make stock adjustments, and manage low-stock warnings.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
            <PackageOpen className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              No products in inventory yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add your first product in the Products section to start tracking stock quantities, configuring low-stock alerts, and recording stock adjustments.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={onNavigateToAddProduct}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add First Product
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and manage your product stock, low-stock thresholds, and inventory adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 bg-white transition-colors font-medium shadow-2xs"
          >
            <Clock className="w-4 h-4 text-[#5E17EB]" />
            Stock History ({history.length})
          </button>
        </div>
      </div>

      {/* Inventory Summary Cards (Mutually Exclusive Product-Level Counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Products */}
        <div
          onClick={() => {
            setFilters((prev) => ({ ...prev, stockStatus: 'all' }));
            setCurrentPage(1);
          }}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.stockStatus === 'all'
              ? 'border-[#5E17EB]/50 ring-1 ring-[#5E17EB]/15'
              : 'border-slate-200/80'
          }`}
        >
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Total Products
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.totalProducts}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Tracked in store catalog
          </p>
        </div>

        {/* 2. In Stock */}
        <div
          onClick={() => {
            setFilters((prev) => ({
              ...prev,
              stockStatus: prev.stockStatus === 'in_stock' ? 'all' : 'in_stock',
            }));
            setCurrentPage(1);
          }}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.stockStatus === 'in_stock'
              ? 'border-emerald-500 ring-1 ring-emerald-500/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              In Stock
            </p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.inStockProducts}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">
            Above low-stock threshold
          </p>
        </div>

        {/* 3. Low Stock */}
        <div
          onClick={() => {
            setFilters((prev) => ({
              ...prev,
              stockStatus: prev.stockStatus === 'low_stock' ? 'all' : 'low_stock',
            }));
            setCurrentPage(1);
          }}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.stockStatus === 'low_stock'
              ? 'border-amber-500 ring-1 ring-amber-500/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Low Stock
            </p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.lowStockProducts}
          </p>
          <p className="text-[11px] text-amber-700 mt-1">
            {metrics.lowStockCombinationsCount > 0
              ? `+ ${metrics.lowStockCombinationsCount} option combinations low`
              : 'At or below threshold'}
          </p>
        </div>

        {/* 4. Out of Stock */}
        <div
          onClick={() => {
            setFilters((prev) => ({
              ...prev,
              stockStatus:
                prev.stockStatus === 'out_of_stock' ? 'all' : 'out_of_stock',
            }));
            setCurrentPage(1);
          }}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-sm ${
            filters.stockStatus === 'out_of_stock'
              ? 'border-red-500 ring-1 ring-red-500/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Out of Stock
            </p>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.outOfStockProducts}
          </p>
          <p className="text-[11px] text-red-600 mt-1">
            {metrics.outOfStockCombinationsCount > 0
              ? `+ ${metrics.outOfStockCombinationsCount} option combinations at 0`
              : '0 available units'}
          </p>
        </div>
      </div>

      {/* Search, Filters & Sort Controls */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, category, or option..."
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

        {/* Dropdowns Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, category: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Status Filter */}
            <select
              value={filters.stockStatus}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  stockStatus: e.target.value as InventoryFilters['stockStatus'],
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs"
            >
              <option value="all">All stock statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Sort By */}
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as InventoryFilters['sortBy'],
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs"
            >
              <option value="updated_desc">Sort: Most Recently Updated</option>
              <option value="name_asc">Sort: Product Name (A–Z)</option>
              <option value="qty_asc">Sort: Available Quantity (Low to High)</option>
              <option value="qty_desc">Sort: Available Quantity (High to Low)</option>
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
      </div>

      {/* Inventory Table or Empty Filter Results */}
      {paginatedProducts.length > 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#5E17EB] text-white">
                <tr className="text-xs font-semibold select-none">
                  <th className="py-3.5 pl-4 pr-2.5 xl:px-4">Product</th>
                  <th className="py-3.5 px-2.5 xl:px-3.5">Category</th>
                  <th className="py-3.5 px-2.5 xl:px-3.5 whitespace-nowrap">Available Stock</th>
                  <th className="py-3.5 px-2.5 xl:px-3.5 whitespace-nowrap">Low-Stock Alert</th>
                  <th className="py-3.5 px-2.5 xl:px-3.5 text-center whitespace-nowrap">Stock Status</th>
                  <th className="py-3.5 px-2.5 xl:px-3.5 whitespace-nowrap">Last Updated</th>
                  <th className="py-3.5 pl-2.5 pr-4 xl:px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedProducts.map((product) => {
                  const primaryImg = product.images?.[0];
                  const stock = getProductStock(product);
                  const status = getProductAvailability(product);
                  const threshold = getProductLowStockThreshold(product);
                  const isWithOptions = product.productType === 'with_options';
                  const isExpanded = expandedProductIds.includes(product.id);
                  const combBreakdown = isWithOptions
                    ? getCombinationStockBreakdown(product)
                    : null;
                  const unitLabel = isWithOptions
                    ? 'units'
                    : product.unitOfSale?.split(' ')[0] || 'units';

                  return (
                    <React.Fragment key={product.id}>
                      <tr
                        onClick={() => setDetailsProductId(product.id)}
                        className="group hover:bg-[#F8F9FE] transition-colors cursor-pointer"
                      >
                        {/* Product Image, Name & Combination Alerts */}
                        <td className="py-3.5 pl-4 pr-2.5 xl:px-4 max-w-[220px] xl:max-w-[280px]">
                          <div className="flex items-start gap-2.5 xl:gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                              {primaryImg ? (
                                <img
                                  src={primaryImg.url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p
                                  className="font-semibold text-slate-900 group-hover:text-[#5E17EB] transition-colors truncate max-w-full"
                                  title={product.name}
                                >
                                  {product.name}
                                </p>
                                {!product.isPublished && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                    Unpublished
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                {isWithOptions ? (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleExpandProduct(product.id, e)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E17EB] hover:underline"
                                  >
                                    <Layers className="w-3 h-3" />
                                    <span>
                                      {product.combinations?.length || 0} combinations
                                    </span>
                                    {isExpanded ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[11px] truncate">
                                    Unit: {product.unitOfSale || 'Standard'}
                                  </span>
                                )}
                              </div>

                              {/* Combination-specific Low / Out of Stock Badges */}
                              {isWithOptions &&
                                combBreakdown &&
                                (combBreakdown.outOfStockCount > 0 ||
                                  combBreakdown.lowStockCount > 0) && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    {combBreakdown.outOfStockCount > 0 && (
                                      <span
                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200"
                                        title={`Out of stock: ${combBreakdown.outOfStockTitles.join(', ')}`}
                                      >
                                        {combBreakdown.outOfStockCount} option
                                        {combBreakdown.outOfStockCount === 1 ? '' : 's'} out
                                        of stock
                                      </span>
                                    )}
                                    {combBreakdown.lowStockCount > 0 && (
                                      <span
                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                                        title={`Low stock: ${combBreakdown.lowStockTitles.join(', ')}`}
                                      >
                                        {combBreakdown.lowStockCount} option
                                        {combBreakdown.lowStockCount === 1 ? '' : 's'} low
                                        stock
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-2.5 xl:px-3.5 text-slate-700 text-xs font-medium max-w-[130px]">
                          <span className="block text-slate-800 truncate" title={product.category}>
                            {product.category}
                          </span>
                        </td>

                        {/* Available Stock Quantity */}
                        <td className="py-3.5 px-2.5 xl:px-3.5 whitespace-nowrap">
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-sm font-extrabold ${
                                stock <= 0
                                  ? 'text-red-600'
                                  : status === 'low_stock'
                                  ? 'text-amber-700'
                                  : 'text-slate-900'
                              }`}
                            >
                              {stock}
                            </span>
                            <span className="text-xs text-slate-400">{unitLabel}</span>
                          </div>
                          {isWithOptions && (
                            <button
                              type="button"
                              onClick={(e) => toggleExpandProduct(product.id, e)}
                              className="text-[11px] text-[#5E17EB] font-medium hover:underline mt-0.5 block"
                            >
                              {isExpanded ? 'Hide options ↑' : 'Inspect options ↓'}
                            </button>
                          )}
                        </td>

                        {/* Low-Stock Threshold */}
                        <td
                          className="py-3.5 px-2.5 xl:px-3.5 text-xs whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inlineThresholdProductId === product.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={inlineThresholdValue}
                                onChange={(e) =>
                                  setInlineThresholdValue(e.target.value)
                                }
                                className="w-14 px-2 py-1 text-xs font-bold bg-white border border-[#5E17EB] rounded-lg text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineThreshold(product.id)}
                                className="p-1 rounded-md bg-[#5E17EB] text-white hover:bg-[#4E12C6]"
                                title="Save threshold"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineThresholdProductId(null)}
                                className="p-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setInlineThresholdProductId(product.id);
                                setInlineThresholdValue(threshold.toString());
                              }}
                              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#5E17EB] font-medium px-1.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Click to update low-stock threshold"
                            >
                              <span>
                                ≤ {threshold} {unitLabel}
                              </span>
                              <Edit3 className="w-3 h-3 text-slate-400" />
                            </button>
                          )}
                        </td>

                        {/* Stock Status */}
                        <td className="py-3.5 px-2.5 xl:px-3.5 text-center whitespace-nowrap">
                          <AvailabilityBadge status={status} />
                        </td>

                        {/* Last Stock Update */}
                        <td className="py-3.5 px-2.5 xl:px-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(product.lastStockUpdate || product.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 pl-2.5 pr-4 xl:px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="purple-light"
                              size="sm"
                              onClick={() =>
                                setAdjustModalState({
                                  isOpen: true,
                                  productId: product.id,
                                  initialType: 'add',
                                })
                              }
                            >
                              Adjust Stock
                            </Button>

                            <button
                              type="button"
                              onClick={() => setDetailsProductId(product.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#5E17EB] hover:bg-[#F3EFFE] transition-colors"
                              title="View product inventory details & history"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Option Combinations Breakdown Row */}
                      {isWithOptions && isExpanded && product.combinations && (
                        <tr className="bg-[#F8F9FE]/90">
                          <td colSpan={7} className="px-6 py-4 border-t border-slate-200/60">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-[#5E17EB]" />
                                  <span className="text-xs font-bold text-slate-900">
                                    Option Combinations Inventory — {product.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    ({product.combinations.length} combinations tracked separately)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDetailsProductId(product.id)}
                                  className="text-xs font-semibold text-[#5E17EB] hover:underline"
                                >
                                  Open Full Product Inventory Details →
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {product.combinations.map((comb) => {
                                  const combStatus = getCombinationAvailability(
                                    comb,
                                    product.lowStockThreshold
                                  );
                                  const combThresh = getCombinationLowStockThreshold(
                                    comb,
                                    product.lowStockThreshold
                                  );

                                  return (
                                    <div
                                      key={comb.id}
                                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                                        combStatus === 'out_of_stock'
                                          ? 'bg-red-50/40 border-red-200'
                                          : combStatus === 'low_stock'
                                          ? 'bg-amber-50/40 border-amber-200'
                                          : 'bg-slate-50/60 border-slate-200'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                          {comb.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs font-extrabold text-slate-800">
                                            {comb.stockQuantity} units
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            (Alert ≤ {combThresh})
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <AvailabilityBadge
                                          status={combStatus}
                                          className="scale-90 origin-right"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setAdjustModalState({
                                              isOpen: true,
                                              productId: product.id,
                                              combinationId: comb.id,
                                              initialType: 'add',
                                            })
                                          }
                                          className="text-[11px] font-semibold text-[#5E17EB] hover:underline"
                                        >
                                          Adjust Stock
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* No Matching Search/Filter Results */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              No matching inventory records found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No products matched your current search query or stock status filter. Reset filters to view all tracked products.
            </p>
          </div>
          <div className="pt-1">
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 pt-2">
          <p>
            Showing {Math.min(1 + (currentPage - 1) * pageSize, totalItems)} -{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} tracked
            products
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

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={adjustModalState.isOpen}
        onClose={() => setAdjustModalState({ isOpen: false, productId: null })}
        product={activeAdjustProduct}
        initialCombinationId={adjustModalState.combinationId}
        initialType={adjustModalState.initialType}
        onConfirmAdjustment={handleConfirmAdjustment}
      />

      {/* Product Inventory Details Modal */}
      <InventoryDetailsModal
        isOpen={!!detailsProductId}
        onClose={() => setDetailsProductId(null)}
        product={activeDetailsProduct}
        history={history}
        onOpenAdjustModal={(prod, combId, initType) => {
          setAdjustModalState({
            isOpen: true,
            productId: prod.id,
            combinationId: combId,
            initialType: initType || 'add',
          });
        }}
        onUpdateThreshold={handleUpdateThreshold}
      />

      {/* Stock Activity History Modal */}
      <StockHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        history={history}
      />
    </div>
  );
};

