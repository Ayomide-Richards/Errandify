import React, { useState } from 'react';
import type { Product } from '../../types/product';
import {
  getProductStock,
  getProductPriceDisplay,
} from '../../services/productStorage';
import { PublicationBadge } from '../common/Badge';
import {
  MoreVertical,
  Eye,
  Edit,
  EyeOff,
  Archive,
  Trash2,
  Package,
  Layers,
} from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onTogglePublish: (product: Product) => void;
  onArchiveProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onViewProduct,
  onEditProduct,
  onTogglePublish,
  onArchiveProduct,
  onDeleteProduct,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const someSelected =
    products.some((p) => selectedIds.includes(p.id)) && !allSelected;

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Exact Royal Purple Table Header */}
          <thead className="bg-[#5E17EB] text-white">
            <tr className="text-xs font-semibold select-none">
              <th className="py-3.5 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-white/60 text-[#5E17EB] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
                  aria-label="Select all products on page"
                />
              </th>
              <th className="py-3.5 px-4 font-semibold text-white">Product</th>
              <th className="py-3.5 px-4 font-semibold text-white">Category</th>
              <th className="py-3.5 px-4 font-semibold text-white">Price</th>
              <th className="py-3.5 px-4 font-semibold text-white">Stock</th>
              <th className="py-3.5 px-4 font-semibold text-white text-center">Status</th>
              <th className="py-3.5 px-4 font-semibold text-white text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {products.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              const primaryImg = product.images?.[0];
              const stock = getProductStock(product);
              const priceDisplay = getProductPriceDisplay(product);

              return (
                <tr
                  key={product.id}
                  onClick={() => onViewProduct(product)}
                  className={`group hover:bg-[#F8F9FE] transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#F5F2FE]/50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-4 px-4 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(product.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(product.id)}
                      className="w-4 h-4 rounded border-slate-300 text-[#5E17EB] focus:ring-[#5E17EB]/20 cursor-pointer accent-[#5E17EB]"
                    />
                  </td>

                  {/* Product Thumbnail + Title + Indicators */}
                  <td className="py-4 px-4 min-w-[260px]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {primaryImg ? (
                          <img
                            src={primaryImg.url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 group-hover:text-[#5E17EB] transition-colors truncate">
                            {product.name}
                          </p>
                          {product.productType === 'with_options' && (
                            <span className="shrink-0 text-[10px] font-semibold bg-[#F3EFFE] text-[#5E17EB] px-1.5 py-0.5 rounded-md border border-[#DDD0FA] flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" />
                              {product.options?.length || 0} options
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                          {product.productType === 'individual'
                            ? `Sold by ${product.unitOfSale || 'Unit'}`
                            : `${product.combinations?.length || 0} variant combinations`}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-4 text-slate-600 text-xs font-medium whitespace-nowrap">
                    {product.category}
                  </td>

                  {/* Price */}
                  <td className="py-4 px-4 font-semibold text-slate-900 text-xs whitespace-nowrap">
                    {priceDisplay.display}
                  </td>

                  {/* Stock */}
                  <td className="py-4 px-4 text-slate-700 text-xs font-medium whitespace-nowrap">
                    <span>{stock}</span>
                    {product.productType === 'individual' && product.unitOfSale && (
                      <span className="text-slate-400 text-[11px] ml-1">
                        {product.unitOfSale.split(' ')[0]}
                      </span>
                    )}
                  </td>

                  {/* Status Badge (Matches Errandify peach Published pill) */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <PublicationBadge isPublished={product.isPublished} />
                  </td>

                  {/* Actions Kebab Menu */}
                  <td
                    className="py-4 px-4 text-right relative whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleMenu(product.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      aria-label="Actions menu"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Action Menu */}
                    {openMenuId === product.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-4 top-12 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onViewProduct(product);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            View Product
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onEditProduct(product);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-400" />
                            Edit Product
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onTogglePublish(product);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            {product.isPublished ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-[#5E17EB]" />
                                Publish
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onArchiveProduct(product);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            <Archive className="w-3.5 h-3.5 text-slate-400" />
                            Archive
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onDeleteProduct(product);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
