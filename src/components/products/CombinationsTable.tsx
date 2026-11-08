import React, { useState } from 'react';
import type { ProductCombination } from '../../types/product';
import { Trash2, Search } from 'lucide-react';
import { Button } from '../common/Button';

interface CombinationsTableProps {
  combinations: ProductCombination[];
  onChange: (combinations: ProductCombination[]) => void;
  onRequestDelete?: (comb: ProductCombination) => void;
}

export const CombinationsTable: React.FC<CombinationsTableProps> = ({
  combinations,
  onChange,
  onRequestDelete,
}) => {
  const [defaultPrice, setDefaultPrice] = useState<string>('');
  const [defaultStock, setDefaultStock] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handlePriceChange = (id: string, value: string) => {
    const num = Math.max(0, parseInt(value.replace(/[^0-9]/g, ''), 10) || 0);
    const updated = combinations.map((c) => (c.id === id ? { ...c, price: num } : c));
    onChange(updated);
  };

  const handleDiscountPriceChange = (id: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      const updated = combinations.map((c) => {
        if (c.id !== id) return c;
        const copy = { ...c };
        delete copy.discountPrice;
        return copy;
      });
      onChange(updated);
      return;
    }
    const num = Math.max(0, parseInt(cleaned, 10));
    const updated = combinations.map((c) =>
      c.id === id ? { ...c, discountPrice: num } : c
    );
    onChange(updated);
  };

  const handleStockChange = (id: string, value: string) => {
    const num = Math.max(0, parseInt(value.replace(/[^0-9]/g, ''), 10) || 0);
    const updated = combinations.map((c) => (c.id === id ? { ...c, stockQuantity: num } : c));
    onChange(updated);
  };

  const handleToggleAvailable = (id: string) => {
    const updated = combinations.map((c) =>
      c.id === id ? { ...c, isAvailable: !c.isAvailable } : c
    );
    onChange(updated);
  };

  const handleApplyDefaultPrice = () => {
    const p = parseInt(defaultPrice.replace(/[^0-9]/g, ''), 10);
    if (isNaN(p) || p <= 0) return;

    const updated = combinations.map((c) => ({
      ...c,
      price: p,
    }));
    onChange(updated);
  };

  const handleApplyDefaultStock = () => {
    const s = parseInt(defaultStock.replace(/[^0-9]/g, ''), 10);
    if (isNaN(s) || s < 0) return;

    const updated = combinations.map((c) => ({
      ...c,
      stockQuantity: s,
    }));
    onChange(updated);
  };

  const filteredCombinations = combinations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCalculatedStock = combinations.reduce(
    (sum, c) => sum + (c.isAvailable ? c.stockQuantity : 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Quick Bulk Tools Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Apply Bulk Price */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">₦ Price:</span>
            <input
              type="text"
              placeholder="e.g. 35000"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              className="w-24 text-xs font-medium text-slate-900 outline-none"
            />
            <Button
              type="button"
              size="sm"
              variant="purple-light"
              onClick={handleApplyDefaultPrice}
              className="text-[11px] py-1 px-2"
            >
              Apply to all
            </Button>
          </div>

          {/* Apply Bulk Stock */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Qty:</span>
            <input
              type="text"
              placeholder="e.g. 10"
              value={defaultStock}
              onChange={(e) => setDefaultStock(e.target.value)}
              className="w-16 text-xs font-medium text-slate-900 outline-none"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleApplyDefaultStock}
              className="text-[11px] py-1 px-2"
            >
              Apply to all
            </Button>
          </div>
        </div>

        {/* Total Stock Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Total Calculated Stock:</span>
          <span className="text-xs font-bold text-[#5E17EB] bg-[#F5F2FE] px-2.5 py-1 rounded-md border border-[#DDD0FA]">
            {totalCalculatedStock} units
          </span>
        </div>
      </div>

      {/* Combinations Filter & Count */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search combinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
          />
        </div>
        <p className="text-xs text-slate-500">
          Showing {filteredCombinations.length} of {combinations.length} combinations
        </p>
      </div>

      {/* Combinations Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#5E17EB] text-white z-10 font-semibold shadow-xs">
              <tr>
                <th className="py-3 px-4">Combination</th>
                <th className="py-3 px-4 w-40">Price (₦)</th>
                <th className="py-3 px-4 w-44">Discount Price (Optional)</th>
                <th className="py-3 px-4 w-32">Quantity</th>
                <th className="py-3 px-4 w-28 text-center">Availability</th>
                <th className="py-3 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCombinations.map((comb) => {
                const hasDiscountErr =
                  comb.discountPrice !== undefined &&
                  (comb.discountPrice <= 0 || comb.discountPrice >= comb.price);
                const discountErrMsg =
                  comb.discountPrice !== undefined
                    ? comb.discountPrice <= 0
                      ? 'Must be > ₦0'
                      : comb.discountPrice === comb.price
                      ? 'Cannot equal normal price'
                      : comb.discountPrice > comb.price
                      ? 'Must be lower than normal price'
                      : ''
                    : '';

                return (
                  <tr
                    key={comb.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !comb.isAvailable ? 'opacity-60 bg-slate-50/40' : ''
                    }`}
                  >
                    {/* Combination Label */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-xs">
                          {comb.title}
                        </span>
                        {!comb.isAvailable && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price Input */}
                    <td className="py-2 px-4 align-top">
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-semibold text-xs">
                          ₦
                        </span>
                        <input
                          type="text"
                          value={comb.price ? comb.price.toLocaleString() : ''}
                          onChange={(e) => handlePriceChange(comb.id, e.target.value)}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                        />
                      </div>
                    </td>

                    {/* Discount Price (Optional) Input */}
                    <td className="py-2 px-4 align-top">
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-semibold text-xs">
                          ₦
                        </span>
                        <input
                          type="text"
                          value={
                            comb.discountPrice !== undefined
                              ? comb.discountPrice.toLocaleString()
                              : ''
                          }
                          onChange={(e) =>
                            handleDiscountPriceChange(comb.id, e.target.value)
                          }
                          placeholder="Enter discounted price"
                          className={`w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                            hasDiscountErr
                              ? 'border-red-400 bg-red-50/30 focus:ring-red-200'
                              : 'border-slate-200 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]'
                          }`}
                        />
                      </div>
                      {hasDiscountErr && (
                        <p className="text-[10px] text-red-600 mt-1 font-medium">
                          {discountErrMsg}
                        </p>
                      )}
                    </td>

                    {/* Stock Input */}
                    <td className="py-2 px-4 align-top">
                      <input
                        type="number"
                        min="0"
                        value={comb.stockQuantity}
                        onChange={(e) => handleStockChange(comb.id, e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                      />
                    </td>

                    {/* Availability Toggle */}
                    <td className="py-2 px-4 text-center align-top pt-3">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailable(comb.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          comb.isAvailable ? 'bg-[#5E17EB]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            comb.isAvailable ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Remove Button */}
                    <td className="py-2 px-4 text-center align-top pt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequestDelete) {
                            onRequestDelete(comb);
                          } else {
                            onChange(combinations.filter((c) => c.id !== comb.id));
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Remove combination"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
