import React from 'react';
import type { MerchantFeeConfig, SalesTransaction } from '../../types/sales';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatNaira } from '../../services/productStorage';
import { TransactionStatusBadge } from './SalesStatusBadges';
import {
  User,
  Calendar,
  Package,
  Layers,
  Tag,
  Info,
  Wallet,
} from 'lucide-react';

interface TransactionDetailsModalProps {
  transaction: SalesTransaction | null;
  feeConfig: MerchantFeeConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailsModal: React.FC<
  TransactionDetailsModalProps
> = ({ transaction, feeConfig, isOpen, onClose }) => {
  if (!transaction) return null;

  const totalUnits = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" showCloseButton>
      <div className="space-y-5 pt-1 max-h-[82vh] overflow-y-auto pr-1 -mr-1">
        {/* Top Header: Customer Name, Transaction Status, Date & Time, Net Amount */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {transaction.customerName}
              </h3>
              <TransactionStatusBadge status={transaction.status} />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-0.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Transaction Date & Time: {transaction.dateTime}</span>
              <span>·</span>
              <span>
                {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
              </span>
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
            <span className="text-xs text-slate-400 block">
              Net Transaction Amount
            </span>
            <span className="text-xl font-extrabold text-[#5E17EB] tabular-nums">
              {formatNaira(transaction.netAmount)}
            </span>
          </div>
        </div>

        {/* Ordered Products Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Ordered Products ({totalUnits} {totalUnits === 1 ? 'Item' : 'Items'})
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product & Options</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap">
                      Qty
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">
                      Unit Price
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">
                      Product Discount
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">
                      Line Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transaction.items.map((item) => {
                    const hasDiscount =
                      typeof item.discountPrice === 'number' &&
                      item.discountPrice > 0 &&
                      item.discountPrice < item.price;
                    const effectiveUnitPrice = hasDiscount
                      ? item.discountPrice!
                      : item.price;
                    const unitDiscount = hasDiscount
                      ? item.price - item.discountPrice!
                      : 0;
                    const lineDiscountTotal = unitDiscount * item.quantity;
                    const lineEffectiveTotal =
                      effectiveUnitPrice * item.quantity;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {item.selectedOptionsLabel && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5E17EB] bg-[#F3EFFE] px-1.5 py-0.5 rounded border border-[#DDD0FA]">
                                    <Layers className="w-2.5 h-2.5" />
                                    {item.selectedOptionsLabel}
                                  </span>
                                )}
                                {item.unit && (
                                  <span className="text-[11px] text-slate-500">
                                    Unit: {item.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-2.5 text-center font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {item.quantity}
                        </td>

                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                          {hasDiscount ? (
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                {formatNaira(effectiveUnitPrice)}
                              </span>
                              <span className="text-[11px] text-slate-400 line-through block">
                                {formatNaira(item.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-700 font-medium">
                              {formatNaira(item.price)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                          {lineDiscountTotal > 0 ? (
                            <span className="text-emerald-700 font-medium">
                              -{formatNaira(lineDiscountTotal)}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {formatNaira(0)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          {formatNaira(lineEffectiveTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Financial Breakdown: Gross Sales, Deductions, and Net Amount */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Transaction Financial Breakdown
            </span>
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-[#5E17EB]" />
              {transaction.settlementStatus === 'paid'
                ? 'Settled to Merchant'
                : 'Awaiting Settlement'}
            </span>
          </div>

          {/* 1. Gross Product Amount */}
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-semibold">
              Gross Product Amount (Before Discounts)
            </span>
            <span className="tabular-nums font-bold text-slate-900">
              {formatNaira(transaction.grossAmount)}
            </span>
          </div>

          {/* 2. Discounts & Deductions */}
          <div className="space-y-2 pt-1 border-t border-slate-200/60">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Applicable Discounts & Merchant Deductions
            </p>

            <div className="flex items-center justify-between text-slate-600">
              <span>Product Discounts</span>
              <span
                className={`tabular-nums font-medium ${
                  transaction.productDiscountAmount > 0
                    ? 'text-emerald-700'
                    : 'text-slate-500'
                }`}
              >
                {transaction.productDiscountAmount > 0
                  ? `-${formatNaira(transaction.productDiscountAmount)}`
                  : formatNaira(0)}
              </span>
            </div>

            {(transaction.promotionDiscountAmount > 0 ||
              transaction.promotionName) && (
              <div className="flex items-center justify-between text-slate-600 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Applicable Promotion Discounts</span>
                  {transaction.promotionName && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA]">
                      <Tag className="w-2.5 h-2.5" />
                      {transaction.promotionName}
                    </span>
                  )}
                </div>
                <span className="tabular-nums font-medium shrink-0 text-emerald-700">
                  -{formatNaira(transaction.promotionDiscountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-600 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>Applicable Merchant Commissions & Deductions</span>
                {!feeConfig.isConfigured && transaction.merchantFeeAmount === 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-600">
                    <Info className="w-2.5 h-2.5" />
                    No fee rule configured
                  </span>
                )}
                {transaction.merchantFeeLabel && (
                  <span className="text-[11px] text-slate-500">
                    ({transaction.merchantFeeLabel})
                  </span>
                )}
              </div>
              <span className="tabular-nums font-medium text-slate-700 shrink-0">
                {transaction.merchantFeeAmount > 0
                  ? `-${formatNaira(transaction.merchantFeeAmount)}`
                  : formatNaira(0)}
              </span>
            </div>

            {transaction.refundedAmount > 0 && (
              <div className="flex items-center justify-between text-amber-800">
                <span>
                  {transaction.status === 'refunded'
                    ? 'Full Refund Deduction'
                    : 'Partial Refund Deduction'}
                </span>
                <span className="tabular-nums font-semibold">
                  -{formatNaira(transaction.refundedAmount)}
                </span>
              </div>
            )}
          </div>

          {/* 3. Net Transaction Amount */}
          <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
            <span>Net Transaction Amount</span>
            <span className="tabular-nums text-base text-[#5E17EB]">
              {formatNaira(transaction.netAmount)}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

