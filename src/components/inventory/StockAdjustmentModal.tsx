import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product';
import type { StockAdjustmentType } from '../../types/inventory';
import { previewStockAdjustment } from '../../services/inventoryStorage';
import {
  getProductLowStockThreshold,
  getCombinationLowStockThreshold,
} from '../../services/productStorage';
import { AvailabilityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  AlertCircle,
  ArrowRight,
  Package,
  Layers,
  X,
} from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialCombinationId?: string;
  initialType?: StockAdjustmentType;
  onConfirmAdjustment: (params: {
    productId: string;
    combinationId?: string;
    adjustmentType: StockAdjustmentType;
    quantity: number;
    reason: string;
    notes?: string;
  }) => void;
}

const REASONS_BY_TYPE: Record<StockAdjustmentType, string[]> = {
  add: [
    'New stock received',
    'Stock correction',
    'Manual stock count',
    'Other',
  ],
  remove: [
    'Damaged goods',
    'Expired goods',
    'Missing or lost stock',
    'Stock correction',
    'Manual stock count',
    'Other',
  ],
  set: [
    'Manual stock count',
    'Stock correction',
    'New stock received',
    'Damaged goods',
    'Expired goods',
    'Missing or lost stock',
    'Other',
  ],
};

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  initialCombinationId,
  initialType = 'add',
  onConfirmAdjustment,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>(initialType);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>('');
  const [quantityStr, setQuantityStr] = useState<string>('');
  const [reason, setReason] = useState<string>('New stock received');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && product) {
      setAdjustmentType(initialType);
      setQuantityStr('');
      setNotes('');
      setError('');
      setReason(REASONS_BY_TYPE[initialType][0]);

      if (product.productType === 'with_options' && product.combinations?.length) {
        setSelectedCombinationId(
          initialCombinationId || product.combinations[0].id
        );
      } else {
        setSelectedCombinationId('');
      }
    }
  }, [isOpen, product, initialCombinationId, initialType]);

  if (!product) return null;

  const isWithOptions = product.productType === 'with_options';
  const selectedCombination = isWithOptions
    ? product.combinations?.find((c) => c.id === selectedCombinationId)
    : undefined;

  const currentStock = isWithOptions
    ? selectedCombination?.stockQuantity ?? 0
    : product.stockQuantity ?? 0;

  const unitLabel = isWithOptions
    ? 'units'
    : product.unitOfSale?.split(' ')[0] || 'units';

  const activeThreshold = isWithOptions && selectedCombination
    ? getCombinationLowStockThreshold(selectedCombination, product.lowStockThreshold)
    : getProductLowStockThreshold(product);

  const parsedQty = quantityStr.trim() === '' ? NaN : Number(quantityStr);
  const preview =
    quantityStr.trim() !== ''
      ? previewStockAdjustment(currentStock, adjustmentType, parsedQty)
      : null;

  const getStatusForQuantity = (qty: number) => {
    if (qty <= 0) return 'out_of_stock' as const;
    if (qty <= activeThreshold) return 'low_stock' as const;
    return 'in_stock' as const;
  };

  const currentStatus = getStatusForQuantity(currentStock);
  const resultingStatus =
    preview && preview.isValid
      ? getStatusForQuantity(preview.resultingQuantity)
      : currentStatus;

  const handleTypeSelect = (type: StockAdjustmentType) => {
    setAdjustmentType(type);
    setError('');
    const validReasons = REASONS_BY_TYPE[type];
    if (!validReasons.includes(reason)) {
      setReason(validReasons[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWithOptions && !selectedCombinationId) {
      setError('Please select a product option combination.');
      return;
    }
    if (quantityStr.trim() === '') {
      setError('Please enter a valid quantity.');
      return;
    }
    if (!/^\d+$/.test(quantityStr.trim())) {
      setError('Quantity must be a valid non-negative whole number.');
      return;
    }

    const num = parseInt(quantityStr.trim(), 10);
    const check = previewStockAdjustment(currentStock, adjustmentType, num);
    if (!check.isValid) {
      setError(check.error || 'Invalid stock adjustment.');
      return;
    }

    if (!reason.trim()) {
      setError('Please select a reason for this stock adjustment.');
      return;
    }

    onConfirmAdjustment({
      productId: product.id,
      combinationId: isWithOptions ? selectedCombinationId : undefined,
      adjustmentType,
      quantity: num,
      reason,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const quantityFieldLabel = {
    add: 'Quantity to Add',
    remove: 'Quantity to Remove',
    set: 'Actual Counted Stock Quantity',
  }[adjustmentType];

  const quantityPlaceholder = {
    add: 'e.g. 15',
    remove: 'e.g. 5',
    set: 'e.g. 17',
  }[adjustmentType];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" showCloseButton={false}>
      {/* Modal Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100 -mt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0 border border-[#DDD0FA]">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Adjust Stock</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update recorded inventory quantity and log reason for adjustment.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pt-4">
        {/* Product Summary Banner */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {product.images?.[0] ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {product.category}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-500 block">Current Stock</span>
            <span className="text-base font-extrabold text-slate-900">
              {currentStock} <span className="text-xs font-medium text-slate-500">{unitLabel}</span>
            </span>
          </div>
        </div>

        {/* Option Combination Selector (if product has selectable options) */}
        {isWithOptions && product.combinations && (
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#5E17EB]" />
              Select Option Combination <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCombinationId}
              onChange={(e) => {
                setSelectedCombinationId(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#5E17EB] focus:ring-2 focus:ring-[#5E17EB]/20"
            >
              {product.combinations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — Current Stock: {c.stockQuantity} units
                  {c.stockQuantity <= 0
                    ? ' (Out of Stock)'
                    : c.stockQuantity <= getCombinationLowStockThreshold(c, product.lowStockThreshold)
                    ? ' (Low Stock)'
                    : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Adjustment Method Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Adjustment Method <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleTypeSelect('add')}
              className={`p-3 rounded-xl border text-left transition-all ${
                adjustmentType === 'add'
                  ? 'border-[#5E17EB] bg-[#F5F2FE] ring-2 ring-[#5E17EB]/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <PlusCircle
                  className={`w-4 h-4 ${
                    adjustmentType === 'add' ? 'text-[#5E17EB]' : 'text-emerald-600'
                  }`}
                />
                <span>Add Stock</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                Receive new inventory
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSelect('remove')}
              className={`p-3 rounded-xl border text-left transition-all ${
                adjustmentType === 'remove'
                  ? 'border-[#5E17EB] bg-[#F5F2FE] ring-2 ring-[#5E17EB]/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <MinusCircle
                  className={`w-4 h-4 ${
                    adjustmentType === 'remove' ? 'text-[#5E17EB]' : 'text-amber-600'
                  }`}
                />
                <span>Remove Stock</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                Damaged, expired or lost
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSelect('set')}
              className={`p-3 rounded-xl border text-left transition-all ${
                adjustmentType === 'set'
                  ? 'border-[#5E17EB] bg-[#F5F2FE] ring-2 ring-[#5E17EB]/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <SlidersHorizontal
                  className={`w-4 h-4 ${
                    adjustmentType === 'set' ? 'text-[#5E17EB]' : 'text-slate-600'
                  }`}
                />
                <span>Set Quantity</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                Physical stock count
              </p>
            </button>
          </div>
        </div>

        {/* Quantity & Reason Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              {quantityFieldLabel} ({unitLabel}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={adjustmentType === 'set' ? '0' : '1'}
              step="1"
              placeholder={quantityPlaceholder}
              value={quantityStr}
              onChange={(e) => {
                setQuantityStr(e.target.value);
                setError('');
              }}
              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 transition-all ${
                error || (preview && !preview.isValid)
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Reason for Adjustment <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB] focus:ring-2 focus:ring-[#5E17EB]/20"
            >
              {REASONS_BY_TYPE[adjustmentType].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Resulting Quantity Preview */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            preview && !preview.isValid
              ? 'bg-red-50/70 border-red-200'
              : 'bg-[#F8F9FE] border-[#DDD0FA]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">
                  Current Stock
                </span>
                <span className="text-base font-bold text-slate-800">
                  {currentStock} {unitLabel}
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

              <div>
                <span className="text-[11px] font-medium text-slate-500 block">
                  Resulting Stock
                </span>
                <span
                  className={`text-lg font-extrabold ${
                    preview && !preview.isValid
                      ? 'text-red-600'
                      : 'text-[#5E17EB]'
                  }`}
                >
                  {preview ? preview.resultingQuantity : currentStock} {unitLabel}
                </span>
              </div>
            </div>

            {preview && preview.isValid && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">New Status:</span>
                <AvailabilityBadge status={resultingStatus} />
              </div>
            )}
          </div>

          {(error || (preview && !preview.isValid)) && (
            <p className="text-xs text-red-600 font-medium mt-2.5 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error || preview?.error}</span>
            </p>
          )}
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            maxLength={250}
            placeholder="Add batch reference, supplier delivery note, or audit details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5E17EB] focus:ring-2 focus:ring-[#5E17EB]/20 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={Boolean(preview && !preview.isValid)}
          >
            Confirm Stock Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};

