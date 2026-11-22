import React from 'react';
import type { SettlementRecord } from '../../types/sales';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatNaira } from '../../services/productStorage';
import { SettlementStatusBadge } from './SalesStatusBadges';
import {
  Landmark,
  Calendar,
  AlertTriangle,
  FileText,
  Package,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface SettlementDetailsModalProps {
  settlement: SettlementRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteAfter72Hours?: (settlement: SettlementRecord) => void;
}

export const SettlementDetailsModal: React.FC<SettlementDetailsModalProps> = ({
  settlement,
  isOpen,
  onClose,
  onCompleteAfter72Hours,
}) => {
  if (!settlement) return null;

  const ordersCount =
    settlement.orders.length > 0
      ? settlement.orders.length
      : settlement.transactionIds.length;
  const isMerchantWithdrawal =
    settlement.recordType === 'merchant_withdrawal';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" showCloseButton>
      <div className="space-y-5 pt-1 max-h-[82vh] overflow-y-auto pr-1 -mr-1">
        {/* Top Header: Title, Status, Settlement Date, Settlement Amount */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {isMerchantWithdrawal
                  ? 'Merchant Withdrawal Details'
                  : 'Settlement Details'}
              </h3>
              <SettlementStatusBadge status={settlement.status} />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-0.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isMerchantWithdrawal ? 'Request Date:' : 'Settlement Date:'}{' '}
                {settlement.processingDate || settlement.settlementDate}
              </span>
              {ordersCount > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {ordersCount} {ordersCount === 1 ? 'order' : 'orders'}{' '}
                    included
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
            <span className="text-xs text-slate-400 block">
              {isMerchantWithdrawal
                ? 'Withdrawal Amount'
                : 'Settlement Amount'}
            </span>
            <span className="text-xl font-extrabold text-[#5E17EB] tabular-nums">
              {formatNaira(settlement.settlementAmount)}
            </span>
          </div>
        </div>

        {/* Recorded Failure Information (only if status === 'failed') */}
        {settlement.status === 'failed' && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Payout Transfer Failed</span>
              <p className="text-red-800 leading-relaxed">
                {settlement.failureReason ||
                  'This automatic settlement could not be completed to the destination bank account. Funds have not been transferred.'}
              </p>
            </div>
          </div>
        )}

        {/* Destination Bank & Settlement Timeline Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Destination Bank Account */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[#5E17EB]" />
              Destination Bank Account
            </span>
            <div className="space-y-1.5 pt-0.5">
              {settlement.bankName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {settlement.bankName}
                  </span>
                </div>
              )}
              {settlement.maskedAccountNumber && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Account Number:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {settlement.maskedAccountNumber}
                  </span>
                </div>
              )}
              {settlement.accountName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Account Name:</span>
                  <span className="font-medium text-slate-800">
                    {settlement.accountName}
                  </span>
                </div>
              )}
              {!settlement.bankName && !settlement.maskedAccountNumber && (
                <p className="text-slate-500">
                  Onboarded merchant bank account
                </p>
              )}
            </div>
          </div>

          {/* Processing, Payment Date & Reference */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              {settlement.status === 'paid' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-sky-600" />
              )}
              72-Hour Processing & Payout Timeline
            </span>
            <div className="space-y-1.5 pt-0.5">
              {settlement.processingDate && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Request Date:</span>
                  <span className="font-medium text-slate-800">
                    {settlement.processingDate}
                  </span>
                </div>
              )}
              {settlement.expectedPayoutDate && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">
                    Expected Payout (72h):
                  </span>
                  <span className="font-semibold text-[#5E17EB]">
                    {settlement.expectedPayoutDate}
                  </span>
                </div>
              )}
              {settlement.paidDate && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Deposited Date:</span>
                  <span className="font-semibold text-emerald-700">
                    {settlement.paidDate}
                  </span>
                </div>
              )}
              {settlement.transactionReference && (
                <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-semibold text-slate-900 inline-flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#5E17EB]" />
                    {settlement.transactionReference}
                  </span>
                </div>
              )}
              {settlement.status === 'processing' && (
                <div className="pt-1 space-y-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This withdrawal is in its mandatory{' '}
                    <span className="font-semibold text-slate-700">
                      72-hour processing period
                    </span>{' '}
                    to allow customers time to confirm satisfaction with their
                    orders before funds are deposited into your registered bank
                    account.
                  </p>
                  {onCompleteAfter72Hours && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => onCompleteAfter72Hours(settlement)}
                    >
                      Simulate 72-Hour Period Elapsed (Complete Bank Deposit)
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Individual Orders Included in Settlement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#5E17EB]" />
              Orders Included in Settlement ({ordersCount})
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Items / Order Summary</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">
                      Order Date
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">
                      Order Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {settlement.orders.map((ord) => (
                    <tr
                      key={ord.transactionId}
                      className="hover:bg-slate-50/60"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {ord.customerName}
                      </td>
                      <td className="py-3 px-3 text-slate-700 min-w-[180px]">
                        <span className="block">{ord.itemSummary}</span>
                        {ord.deliveryConfirmedAt && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Delivered: {ord.deliveryConfirmedAt}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {ord.orderDate}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatNaira(ord.orderAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-extrabold text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3">
                      Combined Settlement Amount ({ordersCount}{' '}
                      {ordersCount === 1 ? 'Order' : 'Orders'})
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#5E17EB]">
                      {formatNaira(settlement.settlementAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
