import React, { useState, useMemo } from 'react';
import type { StockAdjustmentRecord } from '../../types/inventory';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  Clock,
  Search,
  X,
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: StockAdjustmentRecord[];
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'add' | 'remove' | 'set'>('all');

  const filteredHistory = useMemo(() => {
    return history.filter((rec) => {
      if (typeFilter !== 'all' && rec.adjustmentType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchProduct = rec.productName.toLowerCase().includes(q);
        const matchComb = rec.combinationTitle?.toLowerCase().includes(q);
        const matchReason = rec.reason.toLowerCase().includes(q);
        const matchNotes = rec.notes?.toLowerCase().includes(q);
        const matchBy = rec.performedBy.toLowerCase().includes(q);
        if (!matchProduct && !matchComb && !matchReason && !matchNotes && !matchBy) {
          return false;
        }
      }
      return true;
    });
  }, [history, search, typeFilter]);

  const formatDateTime = (iso: string) => {
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
      <div className="flex items-start justify-between pb-4 border-b border-slate-100 -mt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0 border border-[#DDD0FA]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Inventory Activity & Stock History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit trail of all stock additions, removals, manual counts, and order deductions.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product, option, reason, or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#5E17EB] focus:ring-2 focus:ring-[#5E17EB]/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#5E17EB]"
        >
          <option value="all">All adjustment types</option>
          <option value="add">Stock Added (+)</option>
          <option value="remove">Stock Removed (-)</option>
          <option value="set">Quantity Set (=)</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden max-h-[58vh] overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No stock adjustment records match your filter criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#5E17EB] text-white font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3.5">Product</th>
                <th className="py-3 px-3.5">Adjustment</th>
                <th className="py-3 px-3.5 text-center">Prev → New</th>
                <th className="py-3 px-3.5">Reason & Notes</th>
                <th className="py-3 px-3.5">Date & Attribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredHistory.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#F8F9FE] transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-semibold text-slate-900 block">
                      {rec.productName}
                    </span>
                    {rec.combinationTitle && (
                      <span className="text-[11px] text-[#5E17EB] font-medium">
                        Option: {rec.combinationTitle}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {rec.adjustmentType === 'add' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <PlusCircle className="w-3 h-3" /> +{rec.quantityChanged}
                      </span>
                    )}
                    {rec.adjustmentType === 'remove' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <MinusCircle className="w-3 h-3" /> -{rec.quantityChanged}
                      </span>
                    )}
                    {rec.adjustmentType === 'set' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#5E17EB] bg-[#F3EFFE] px-2 py-0.5 rounded-md border border-[#DDD0FA]">
                        <SlidersHorizontal className="w-3 h-3" /> Set to {rec.resultingQuantity}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-center font-mono whitespace-nowrap">
                    <span className="text-slate-500">{rec.previousQuantity}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-slate-900">
                      {rec.resultingQuantity}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 max-w-[200px]">
                    <span className="font-semibold text-slate-800 block">
                      {rec.reason}
                    </span>
                    {rec.notes && (
                      <span className="text-[11px] text-slate-500 block line-clamp-2 mt-0.5">
                        {rec.notes}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span className="text-slate-700 font-medium block">
                      {formatDateTime(rec.createdAt)}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <UserCheck className="w-3 h-3" />
                      {rec.performedBy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          Showing {filteredHistory.length} of {history.length} stock events
        </span>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

