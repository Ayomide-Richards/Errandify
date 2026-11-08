import React, { useState, useMemo } from 'react';
import type { Product, ProductFilters } from '../../types/product';
import {
  calculateSummaryMetrics,
  getProductAvailability,
  getProductPriceDisplay,
} from '../../services/productStorage';
import { CATEGORIES } from '../../data/categories';
import { ProductTable } from './ProductTable';
import { Button } from '../common/Button';
import { UnpublishModal } from './modals/UnpublishModal';
import { DeleteModal } from './modals/DeleteModal';
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Trash2,
  EyeOff,
  Eye,
  Tag,
} from 'lucide-react';

interface ProductsListingProps {
  products: Product[];
  onAddProduct: () => void;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onTogglePublish: (id: string) => void;
  onBulkUnpublish: (ids: string[]) => void;
  onBulkPublish: (ids: string[]) => void;
  onDeleteProduct: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onOpenPromotions: () => void;
}

export const ProductsListing: React.FC<ProductsListingProps> = ({
  products,
  onAddProduct,
  onViewProduct,
  onEditProduct,
  onTogglePublish,
  onBulkUnpublish,
  onBulkPublish,
  onDeleteProduct,
  onBulkDelete,
  onOpenPromotions,
}) => {
  // Filters State
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: 'all',
    availability: 'all',
    publicationStatus: 'all',
    sortBy: 'recent',
  });

  // Table Row Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals State
  const [unpublishModalState, setUnpublishModalState] = useState<{
    isOpen: boolean;
    productIds: string[];
    productName?: string;
  }>({ isOpen: false, productIds: [] });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    productIds: string[];
    productName?: string;
    hasOrderHistory?: boolean;
  }>({ isOpen: false, productIds: [] });

  // Summary Metrics
  const metrics = useMemo(() => calculateSummaryMetrics(products), [products]);

  // Active products filtering & sorting
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          const matchSub = p.subcategory?.toLowerCase().includes(q);
          if (!matchName && !matchCat && !matchSub) return false;
        }

        // Category filter
        if (filters.category !== 'all' && p.category !== filters.category) {
          return false;
        }

        // Availability filter
        if (filters.availability !== 'all') {
          const avail = getProductAvailability(p);
          if (avail !== filters.availability) return false;
        }

        // Publication status filter
        if (filters.publicationStatus !== 'all') {
          if (filters.publicationStatus === 'published' && !p.isPublished) return false;
          if (filters.publicationStatus === 'unpublished' && p.isPublished) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (filters.sortBy === 'price_asc') {
          const priceA = getProductPriceDisplay(a).min;
          const priceB = getProductPriceDisplay(b).min;
          return priceA - priceB;
        }
        if (filters.sortBy === 'price_desc') {
          const priceA = getProductPriceDisplay(a).max;
          const priceB = getProductPriceDisplay(b).max;
          return priceB - priceA;
        }
        // default recent
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, filters]);

  // Paginated slice
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedProducts.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk unpublish
  const handleTriggerBulkUnpublish = () => {
    setUnpublishModalState({
      isOpen: true,
      productIds: selectedIds,
    });
  };

  // Bulk delete
  const handleTriggerBulkDelete = () => {
    setDeleteModalState({
      isOpen: true,
      productIds: selectedIds,
      hasOrderHistory: selectedIds.some((id) => {
        const p = products.find((x) => x.id === id);
        return p && (p.name.includes('Ofada') || p.name.includes('Classic Sneakers'));
      }),
    });
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      availability: 'all',
      publicationStatus: 'all',
      sortBy: 'recent',
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the products available in your store.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPromotions}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 border border-slate-200 bg-white transition-colors font-medium shadow-2xs"
            title="Manage store promotions and discounts"
          >
            <Tag className="w-3.5 h-3.5" />
            Add Promotion
          </button>

          <Button
            variant="primary"
            onClick={onAddProduct}
            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            className="shadow-sm font-semibold"
          >
            Add product
          </Button>
        </div>
      </div>

      {/* Summary Cards (Matching Errandify Mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Products */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Total products
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.totalProducts}
          </p>
        </div>

        {/* Published Products */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Published products
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.publishedProducts}
          </p>
        </div>

        {/* Unpublished Products */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Unpublished products
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.unpublishedProducts}
          </p>
        </div>

        {/* Out of Stock */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Out of Stock
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {metrics.outOfStockProducts}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-3">
        {/* Search input with pill styling matching mockup */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/90 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] shadow-2xs transition-all"
          />
          {filters.search && (
            <button
              onClick={() => {
                setFilters((prev) => ({ ...prev, search: '' }));
                setCurrentPage(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, category: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="relative">
            <select
              value={filters.availability}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  availability: e.target.value as ProductFilters['availability'],
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">Availability</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (≤ 10)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filters.publicationStatus}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  publicationStatus: e.target.value as ProductFilters['publicationStatus'],
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">Status</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as ProductFilters['sortBy'],
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="recent">Recently Added</option>
              <option value="name_asc">Product Name (A-Z)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row Selection Action Bar (Matches Products Selection.png) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900">
              {selectedIds.length} {selectedIds.length === 1 ? 'product' : 'products'} selected
            </span>
            <button
              onClick={handleClearSelection}
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Delete Products Button (Soft Red) */}
            <Button
              variant="danger-light"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleTriggerBulkDelete}
            >
              Delete products
            </Button>

            {/* Unpublish Products Button (Soft Purple) */}
            <Button
              variant="purple-light"
              size="sm"
              leftIcon={<EyeOff className="w-3.5 h-3.5" />}
              onClick={handleTriggerBulkUnpublish}
            >
              Unpublish products
            </Button>

            {/* Bulk Publish Button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
              onClick={() => {
                onBulkPublish(selectedIds);
                handleClearSelection();
              }}
            >
              Publish products
            </Button>
          </div>
        </div>
      )}

      {/* Main Table / Empty State */}
      {paginatedProducts.length > 0 ? (
        <ProductTable
          products={paginatedProducts}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAllOnPage}
          onViewProduct={onViewProduct}
          onEditProduct={onEditProduct}
          onTogglePublish={(p) => {
            if (p.isPublished) {
              setUnpublishModalState({
                isOpen: true,
                productIds: [p.id],
                productName: p.name,
              });
            } else {
              onTogglePublish(p.id);
            }
          }}
          onDeleteProduct={(p) => {
            setDeleteModalState({
              isOpen: true,
              productIds: [p.id],
              productName: p.name,
              hasOrderHistory: p.name.includes('Ofada') || p.name.includes('Classic Sneakers'),
            });
          }}
        />
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <PackageOpen className="w-8 h-8 stroke-[1.5]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {filters.search || filters.category !== 'all' || filters.availability !== 'all' || filters.publicationStatus !== 'all'
                ? 'No matching products found'
                : 'No products in your store'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filters.search || filters.category !== 'all' || filters.availability !== 'all' || filters.publicationStatus !== 'all'
                ? 'Try adjusting your search criteria, category filters, or availability status.'
                : 'Get started by listing your first product with custom pricing, units of sale, or selectable options.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {filters.search || filters.category !== 'all' || filters.availability !== 'all' || filters.publicationStatus !== 'all' ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={onAddProduct}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add product
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pagination Footer (Matching Errandify Mockup) */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 pt-2">
          <p>
            Showing {Math.min(1 + (currentPage - 1) * pageSize, totalItems)} -{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} products
          </p>

          <div className="flex items-center gap-1 self-center sm:self-auto select-none">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
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
              }
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
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

      {/* Unpublish Confirmation Modal */}
      <UnpublishModal
        isOpen={unpublishModalState.isOpen}
        onClose={() => setUnpublishModalState({ isOpen: false, productIds: [] })}
        productCount={unpublishModalState.productIds.length}
        productName={unpublishModalState.productName}
        onConfirm={() => {
          if (unpublishModalState.productIds.length > 1) {
            onBulkUnpublish(unpublishModalState.productIds);
            handleClearSelection();
          } else if (unpublishModalState.productIds.length === 1) {
            onTogglePublish(unpublishModalState.productIds[0]);
          }
          setUnpublishModalState({ isOpen: false, productIds: [] });
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, productIds: [] })}
        productCount={deleteModalState.productIds.length}
        productName={deleteModalState.productName}
        hasOrderHistory={deleteModalState.hasOrderHistory}
        onConfirm={() => {
          if (deleteModalState.productIds.length > 1) {
            onBulkDelete(deleteModalState.productIds);
            handleClearSelection();
          } else if (deleteModalState.productIds.length === 1) {
            onDeleteProduct(deleteModalState.productIds[0]);
          }
          setDeleteModalState({ isOpen: false, productIds: [] });
        }}
      />
    </div>
  );
};
