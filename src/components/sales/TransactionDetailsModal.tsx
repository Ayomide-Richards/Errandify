import React from 'react';
import type { SalesTransaction, SettlementRecord } from '../../types/sales';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatNaira } from '../../services/productStorage';
import {
  FundsStatusBadge,
  PaymentStatusBadge,
  SettlementStatusBadge,
} from './SalesStatusBadges';
import {
  User,
  Calendar,
  Package,
  Layers,
  Tag,
  CheckCircle2,
  Clock,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

interface TransactionDetailsModalProps {
  transaction: SalesTransaction | null;
  settlement?: SettlementRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailsModal: React.FC<
  TransactionDetailsModalProps
> = ({ transaction, settlement, isOpen, onClose }) => {
  if (!transaction) return null;

  const totalUnits = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" showCloseButton>
      <div className="space-y-5 pt-1 max-h-[82vh] overflow-y-auto pr-1 -mr-1">
        {/* Top Header: Customer Name, Payment & Funds Status Badges, Date, Order Value */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {transaction.customerName}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap pl-0.5">
              <span className="text-[11px] font-medium text-slate-500">
                Payment:
              </span>
              <PaymentStatusBadge status={transaction.paymentStatus} />
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-medium text-slate-500">
                Funds:
              </span>
              <FundsStatusBadge status={transaction.fundsStatus} />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-0.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Order Date: {transaction.dateTime}</span>
              <span>·</span>
              <span>
                {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
              </span>
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
            <span className="text-xs text-slate-400 block">Order Value</span>
            <span className="text-xl font-extrabold text-[#5E17EB] tabular-nums">
              {formatNaira(transaction.orderValue)}
            </span>
          </div>
        </div>

        {/* Products Purchased Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Products Purchased ({totalUnits}{' '}
              {totalUnits === 1 ? 'Item' : 'Items'})
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
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

        {/* Order Financial Breakdown (Merchant Product Earnings) */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Order Financial Breakdown
            </span>
          </div>

          {/* 1. Product Subtotal */}
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-medium">Product Subtotal</span>
            <span className="tabular-nums font-bold text-slate-900">
              {formatNaira(transaction.productSubtotal)}
            </span>
          </div>

          {/* 2. Product Discounts */}
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

          {/* 3. Applicable Product Promotion Discounts */}
          {(transaction.promotionDiscountAmount > 0 ||
            transaction.promotionName) && (
            <div className="flex items-center justify-between text-slate-600 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>Applicable Product Promotion Discounts</span>
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

          {/* 4. Order Value after applicable product discounts */}
          <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
            <span>Order Value</span>
            <span className="tabular-nums text-base text-[#5E17EB]">
              {formatNaira(transaction.orderValue)}
            </span>
          </div>

          {transaction.refundedAmount > 0 && (
            <>
              <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                <span className="font-medium">Refunded Amount</span>
                <span className="tabular-nums font-semibold text-slate-800">
                  -{formatNaira(transaction.refundedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Net Merchant Earnings after Refund</span>
                <span className="tabular-nums">
                  {formatNaira(transaction.netAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Payment Confirmation, Escrow & Delivery Completion Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Payment & Funds Status Card */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5E17EB]" />
                Payment & Escrow Status
              </span>
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <PaymentStatusBadge status={transaction.paymentStatus} />
              </div>
              {transaction.paymentConfirmedAt && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Confirmed On:</span>
                  <span className="font-medium text-slate-800">
                    {transaction.paymentConfirmedAt}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500">Funds Status:</span>
                <FundsStatusBadge status={transaction.fundsStatus} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
              {transaction.fundsStatus === 'in_escrow' &&
                'Customer payment is confirmed and held in escrow until delivery is completed and confirmed with the customer code.'}
              {transaction.fundsStatus === 'awaiting_settlement' &&
                'Delivery has been confirmed. Eligible order funds are released from escrow for automatic merchant settlement.'}
              {transaction.fundsStatus === 'settled' &&
                'Order funds have been paid out to your bank account through a completed automatic settlement.'}
              {transaction.fundsStatus === 'refunded' &&
                'This transaction was refunded to the customer.'}
            </p>
          </div>

          {/* Delivery Completion Information Card */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                {transaction.deliveryConfirmed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                )}
                Delivery Confirmation
              </span>
            </div>

            {transaction.deliveryConfirmed ? (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer Code:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified in Runner App
                  </span>
                </div>
                {transaction.deliveryConfirmedAt && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Delivered At:</span>
                    <span className="font-medium text-slate-800">
                      {transaction.deliveryConfirmedAt}
                    </span>
                  </div>
                )}
                {transaction.runnerName && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Runner:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[170px]">
                      {transaction.runnerName}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                  The runner verified the customer&apos;s delivery confirmation
                  code, releasing this order&apos;s funds from escrow.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Delivery Status:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {transaction.paymentStatus === 'refunded'
                      ? 'Order Refunded'
                      : 'Awaiting Confirmation'}
                  </span>
                </div>
                {transaction.orderStatusLabel && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Store Fulfillment:</span>
                    <span className="font-medium text-slate-800">
                      {transaction.orderStatusLabel}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                  {transaction.paymentStatus === 'refunded'
                    ? 'Order was refunded prior to delivery completion.'
                    : transaction.orderStatusLabel === 'Picked Up'
                    ? 'Runner has collected the order from your store. Funds remain in escrow until the runner delivers the order and enters the customer confirmation code in the runner app.'
                    : 'Funds remain in escrow until the order is delivered and the runner verifies the customer confirmation code in the Errandify runner app.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settlement Information (shown once transaction has been included in a settlement) */}
        {settlement && (
          <div className="p-4 bg-[#F8F6FE] border border-[#DDD0FA] rounded-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#DDD0FA]/80 pb-2">
              <span className="font-bold text-[#5E17EB] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                Automatic Settlement Information
              </span>
              <SettlementStatusBadge status={settlement.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <div>
                <span className="text-slate-500 block text-[11px]">
                  Settlement Date
                </span>
                <span className="font-semibold text-slate-900">
                  {settlement.settlementDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">
                  Combined Settlement Total ({settlement.orders.length}{' '}
                  {settlement.orders.length === 1 ? 'order' : 'orders'})
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatNaira(settlement.settlementAmount)}
                </span>
              </div>
              {(settlement.bankName || settlement.maskedAccountNumber) && (
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    Destination Bank Account
                  </span>
                  <span className="font-semibold text-slate-900">
                    {[settlement.bankName, settlement.maskedAccountNumber]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              )}
              {settlement.transactionReference && (
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    Transaction Reference
                  </span>
                  <span className="font-semibold text-slate-900">
                    {settlement.transactionReference}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

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
