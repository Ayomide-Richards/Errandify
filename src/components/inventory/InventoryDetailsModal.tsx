import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product';
import type { StockAdjustmentRecord, StockAdjustmentType } from '../../types/inventory';
import {
  getProductStock,
  getProductAvailability,
  getProductLowStockThreshold,
  getCombinationAvailability,
  getCombinationLowStockThreshold,
} from '../../services/productStorage';
import { AvailabilityBadge, PublicationBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  Package,
  Layers,
  SlidersHorizontal,
  Clock,
  Bell,
  Check,
  X,
  PlusCircle,
  MinusCircle,
  Edit3,
  AlertTriangle,
} from 'lucide-react';

interface InventoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  history: StockAdjustmentRecord[];
  onOpenAdjustModal: (
    product: Product,
    combinationId?: string,
    initialType?: StockAdjustmentType
  ) => void;
  onUpdateThreshold: (
    productId: string,
    newThreshold: number,
    combinationId?: string
  ) => void;
}

export const InventoryDetailsModal: React.FC<InventoryDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
  history,
  onOpenAdjustModal,
  onUpdateThreshold,
}) => {
  const [editingProductThreshold, setEditingProductThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState('');
  const [editingCombId, setEditingCombId] = useState<string | null>(null);
  const [combThresholdInput, setCombThresholdInput] = useState('');
  const [thresholdError, setThresholdError] = useState('');

  useEffect(() => {
    if (product) {
      setThresholdInput(getProductLowStockThreshold(product).toString());
      setEditingProductThreshold(false);
      setEditingCombId(null);
      setThresholdError('');
    }
  }, [product, isOpen]);

  if (!product) return null;

  const isWithOptions = product.productType === 'with_options';
  const totalStock = getProductStock(product);
  const availability = getProductAvailability(product);
  const productThreshold = getProductLowStockThreshold(product);
  const unitLabel = isWithOptions
    ? 'units'
    : product.unitOfSale?.split(' ')[0] || 'units';

  const productHistory = history
    .filter((r) => r.productId === product.id)
    .slice(0, 8);

  const handleSaveProductThreshold = () => {
    if (!/^\d+$/.test(thresholdInput.trim())) {
      setThresholdError('Enter a valid whole number (0 or greater)');
      return;
    }
    const val = parseInt(thresholdInput.trim(), 10);
    onUpdateThreshold(product.id, val);
    setEditingProductThreshold(false);
    setThresholdError('');
  };

  const handleSaveCombThreshold = (combId: string) => {
    if (!/^\d+$/.test(combThresholdInput.trim())) {
      return;
    }
    const val = parseInt(combThresholdInput.trim(), 10);
    onUpdateThreshold(product.id, val, combId);
    setEditingCombId(null);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return 'Not recorded';
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" showCloseButton={false}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 -mt-1">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {product.images?.[0] ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 leading-snug break-words">
                {product.name}
              </h3>
              <AvailabilityBadge status={availability} />
              <PublicationBadge isPublished={product.isPublished} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {product.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => onOpenAdjustModal(product)}
          >
            Adjust Stock
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6 pt-5 max-h-[75vh] overflow-y-auto pr-1 -mr-1">
        {/* Key Stock Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Current Stock */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <span className="text-xs font-medium text-slate-500 block">
              Current Stock Quantity
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalStock}{' '}
              <span className="text-xs font-medium text-slate-500">{unitLabel}</span>
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isWithOptions
                ? `Total across ${product.combinations?.length || 0} combinations`
                : `Sold by ${product.unitOfSale || 'Unit'}`}
            </span>
          </div>

          {/* Low-Stock Threshold (Editable) */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                Low-Stock Threshold
              </span>
              {!editingProductThreshold && (
                <button
                  type="button"
                  onClick={() => {
                    setThresholdInput(productThreshold.toString());
                    setEditingProductThreshold(true);
                  }}
                  className="text-[11px] font-semibold text-[#5E17EB] hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            {editingProductThreshold ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={thresholdInput}
                    onChange={(e) => {
                      setThresholdInput(e.target.value);
                      setThresholdError('');
                    }}
                    className="w-20 px-2.5 py-1 text-xs font-bold bg-white border border-[#5E17EB] rounded-lg text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveProductThreshold}
                    className="p-1.5 rounded-lg bg-[#5E17EB] text-white hover:bg-[#4E12C6]"
                    title="Save threshold"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductThreshold(false);
                      setThresholdError('');
                    }}
                    className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {thresholdError && (
                  <p className="text-[10px] text-red-600">{thresholdError}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  ≤ {productThreshold}{' '}
                  <span className="text-xs font-medium text-slate-500">{unitLabel}</span>
                </p>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Flags Low Stock at or below {productThreshold}
                </span>
              </>
            )}
          </div>

          {/* Last Updated */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last Stock Update
            </span>
            <p className="text-sm font-bold text-slate-900 mt-2">
              {formatDateTime(product.lastStockUpdate || product.updatedAt)}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Storefront: {product.isPublished ? 'Published' : 'Unpublished'}
            </span>
          </div>
        </div>

        {/* Selectable Option Combinations Stock Breakdown */}
        {isWithOptions && product.combinations && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#5E17EB]" />
                  Option Combinations Stock ({product.combinations.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Each option combination is tracked and validated independently.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#5E17EB] text-white font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3.5">Combination</th>
                      <th className="py-2.5 px-3.5 text-right">Stock</th>
                      <th className="py-2.5 px-3.5 text-center">Low-Stock Alert</th>
                      <th className="py-2.5 px-3.5 text-center">Status</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {product.combinations.map((comb) => {
                      const combStatus = getCombinationAvailability(
                        comb,
                        product.lowStockThreshold
                      );
                      const combThreshold = getCombinationLowStockThreshold(
                        comb,
                        product.lowStockThreshold
                      );
                      const isEditingThisComb = editingCombId === comb.id;

                      return (
                        <tr
                          key={comb.id}
                          className={`hover:bg-[#F8F9FE] transition-colors ${
                            !comb.isAvailable ? 'opacity-60 bg-slate-50' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{comb.title}</span>
                              {!comb.isAvailable && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                            {comb.stockQuantity}{' '}
                            <span className="font-normal text-slate-400">units</span>
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            {isEditingThisComb ? (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={combThresholdInput}
                                  onChange={(e) => setCombThresholdInput(e.target.value)}
                                  className="w-14 px-2 py-0.5 text-xs font-bold border border-[#5E17EB] rounded text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCombThreshold(comb.id)}
                                  className="p-1 rounded bg-[#5E17EB] text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCombId(null)}
                                  className="p-1 rounded bg-slate-200 text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCombId(comb.id);
                                  setCombThresholdInput(combThreshold.toString());
                                }}
                                className="text-slate-600 hover:text-[#5E17EB] font-medium inline-flex items-center gap-1"
                                title="Click to change combination threshold"
                              >
                                <span>≤ {combThreshold}</span>
                                <Edit3 className="w-3 h-3 text-slate-400" />
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            <AvailabilityBadge status={combStatus} />
                          </td>

                          <td className="py-3 px-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenAdjustModal(product, comb.id, 'add')
                                }
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F3EFFE] text-[#5E17EB] hover:bg-[#EDE9FE] transition-colors"
                              >
                                Adjust Stock
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent Stock Adjustments for this Product */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5E17EB]" />
              Recent Stock Adjustments
            </h4>
            <span className="text-xs text-slate-400">
              {productHistory.length} recent record{productHistory.length === 1 ? '' : 's'}
            </span>
          </div>

          {productHistory.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200/80 text-center text-xs text-slate-500">
              No stock adjustments have been recorded for this product yet.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    {isWithOptions && <th className="py-2.5 px-3">Option</th>}
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Date & By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {productHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {rec.adjustmentType === 'add' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <PlusCircle className="w-3 h-3" /> Added
                          </span>
                        )}
                        {rec.adjustmentType === 'remove' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <MinusCircle className="w-3 h-3" /> Removed
                          </span>
                        )}
                        {rec.adjustmentType === 'set' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#5E17EB] bg-[#F3EFFE] px-2 py-0.5 rounded-md border border-[#DDD0FA]">
                            <SlidersHorizontal className="w-3 h-3" /> Set Count
                          </span>
                        )}
                      </td>

                      {isWithOptions && (
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {rec.combinationTitle || '—'}
                        </td>
                      )}

                      <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                        <span className="text-slate-500">{rec.previousQuantity}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="font-bold text-slate-900">
                          {rec.resultingQuantity}
                        </span>
                        <span className="ml-1.5 text-[11px] text-slate-400">
                          (
                          {rec.adjustmentType === 'add'
                            ? `+${rec.quantityChanged}`
                            : rec.adjustmentType === 'remove'
                            ? `-${rec.quantityChanged}`
                            : `=${rec.resultingQuantity}`}
                          )
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800 block">
                          {rec.reason}
                        </span>
                        {rec.notes && (
                          <span className="text-[11px] text-slate-400 block leading-snug break-words mt-0.5">
                            {rec.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        <span className="block text-slate-700">
                          {formatDateTime(rec.createdAt)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {rec.performedBy}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Out of Stock / Publication Status Clarification Note */}
        {totalStock <= 0 && product.isPublished && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Published but Out of Stock:</span> This product remains visible in your catalog as Published, but customers are prevented from ordering it until stock is restored above 0.
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

