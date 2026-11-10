import React, { useState } from 'react';
import type { Product } from '../../types/product';
import {
  getProductStock,
  getProductAvailability,
  getProductPriceDisplay,
  formatNaira,
} from '../../services/productStorage';
import { AvailabilityBadge, PublicationBadge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  ChevronRight,
  ArrowLeft,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  Layers,
  Package,
  Clock,
  MoreVertical,
} from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onBack,
  onEdit,
  onTogglePublish,
  onDelete,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedId, setCopiedId] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const images = product.images || [];
  const primaryImage = images[selectedImageIndex] || images[0];
  const stock = getProductStock(product);
  const availability = getProductAvailability(product);
  const priceInfo = getProductPriceDisplay(product);

  const handleCopyId = () => {
    navigator.clipboard.writeText(product.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              onClick={onBack}
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Products
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-medium truncate max-w-xs">
              {product.name}
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {product.name}
            </h1>
            <PublicationBadge isPublished={product.isPublished} />
            <AvailabilityBadge status={availability} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={onTogglePublish}
            leftIcon={
              product.isPublished ? (
                <EyeOff className="w-4 h-4 text-slate-500" />
              ) : (
                <Eye className="w-4 h-4 text-[#5E17EB]" />
              )
            }
          >
            {product.isPublished ? 'Unpublish' : 'Publish'}
          </Button>

          <Button
            variant="primary"
            onClick={onEdit}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit Product
          </Button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors bg-white shadow-2xs"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    Delete Product
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Package className="w-12 h-12 stroke-[1.5] mb-2" />
                <span className="text-xs">No image provided</span>
              </div>
            )}
            {product.isPublished && (
              <span className="absolute top-3 left-3 bg-[#FFEDD5] text-[#C2410C] font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-2xs border border-[#FED7AA]">
                Published
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-[#5E17EB] ring-2 ring-[#5E17EB]/20 scale-102'
                      : 'border-slate-200 hover:border-slate-300 opacity-80'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key Details & Metrics (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {/* Price */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Price</span>
                {priceInfo.hasDiscount && priceInfo.discountPercentage && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {priceInfo.discountPercentage}% OFF
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <p className="text-xl font-bold text-slate-900">
                  {priceInfo.display}
                </p>
                {priceInfo.hasDiscount && priceInfo.originalDisplay && (
                  <span className="text-sm font-medium text-slate-400 line-through">
                    {priceInfo.originalDisplay}
                  </span>
                )}
              </div>
              {product.productType === 'with_options' && (
                <span className="text-[11px] text-slate-400 block mt-0.5">Across combinations</span>
              )}
            </div>

            {/* Total Stock */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Available Stock</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {stock}{' '}
                <span className="text-xs font-medium text-slate-500">
                  {product.productType === 'individual'
                    ? product.unitOfSale
                    : 'units'}
                </span>
              </p>
              <span className="text-[11px] text-slate-400 capitalize">
                {availability.replace('_', ' ')}
              </span>
            </div>

            {/* Product Type */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-slate-500">Listing Type</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                {product.productType === 'individual' ? (
                  <>
                    <Package className="w-4 h-4 text-[#5E17EB]" />
                    <span className="text-xs font-bold text-slate-800">Individual</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-[#5E17EB]" />
                    <span className="text-xs font-bold text-slate-800">
                      With Options ({product.combinations?.length || 0})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Classification Details */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Classification & Attributes
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Category</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {product.category}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Subcategory</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {product.subcategory || 'None specified'}
                </span>
              </div>

              {product.productType === 'individual' && (
                <div>
                  <span className="text-slate-500 block mb-0.5">Unit of Sale</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {product.unitOfSale || 'Standard'}
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-500 block mb-0.5">Product ID</span>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="truncate max-w-[140px]">{product.id}</span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                    title="Copy Product ID"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-2">
        <h3 className="text-sm font-bold text-slate-900">Product Description</h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {product.description || 'No description provided.'}
        </p>
      </section>

      {/* Options & Combinations Matrix (ONLY for products with selectable options) */}
      {product.productType === 'with_options' && product.combinations && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#5E17EB]" />
                Selectable Options & Combinations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer-selectable attributes and corresponding inventory matrix.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-[#F5F2FE] text-[#5E17EB] rounded-full border border-[#DDD0FA] self-start sm:self-auto">
              {product.combinations.length} Combinations Total
            </span>
          </div>

          {/* Option Types Pills */}
          {product.options && product.options.length > 0 && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Configured Attributes
              </span>
              <div className="flex flex-wrap gap-4">
                {product.options.map((opt) => (
                  <div key={opt.id} className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-500">
                      {opt.name}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.values.map((val) => (
                        <span
                          key={val.id}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                        >
                          {val.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combinations Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#5E17EB] text-white font-semibold">
                <tr>
                  <th className="py-3 px-4">Combination</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Quantity in Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {product.combinations.map((comb) => (
                  <tr
                    key={comb.id}
                    className={`hover:bg-slate-50/80 ${
                      !comb.isAvailable ? 'opacity-50 bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {comb.title}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {comb.discountPrice &&
                      comb.discountPrice > 0 &&
                      comb.discountPrice < comb.price ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">
                            {formatNaira(comb.discountPrice)}
                          </span>
                          <span className="text-slate-400 line-through font-normal text-[11px]">
                            {formatNaira(comb.price)}
                          </span>
                        </div>
                      ) : (
                        formatNaira(comb.price)
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {comb.stockQuantity}
                      </span>{' '}
                      <span className="text-slate-500 text-[11px]">units</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {comb.isAvailable ? (
                        comb.stockQuantity > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                            Out of stock
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Disabled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Product Activity & Metadata */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Product Activity & Platform Records
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block mb-1">Created Date</span>
            <span className="font-semibold text-slate-800">
              {formatDate(product.createdAt)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block mb-1">Last Updated</span>
            <span className="font-semibold text-slate-800">
              {formatDate(product.updatedAt)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block mb-1">Store Listing Status</span>
            <span className="font-semibold text-slate-800">
              {product.isPublished ? 'Active on Storefront' : 'Draft / Unpublished'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
