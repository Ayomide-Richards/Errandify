import React from 'react';
import type { MerchantFeeConfig, SettlementRecord } from '../../types/sales';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatNaira } from '../../services/productStorage';
import { SettlementStatusBadge } from './SalesStatusBadges';
import {
  Landmark,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  FileText,
} from 'lucide-react';

interface SettlementDetailsModalProps {
  settlement: SettlementRecord | null;
  feeConfig: MerchantFeeConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementDetailsModal: React.FC<SettlementDetailsModalProps> = ({
  settlement,
  feeConfig,
  isOpen,
  onClose,
}) => {
  if (!settlement) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl" showCloseButton>
      <div className="space-y-5 pt-1 max-h-[82vh] overflow-y-auto pr-1 -mr-1">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Settlement Details
              </h3>
              <SettlementStatusBadge status={settlement.status} />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-0.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Settlement Date: {settlement.settlementDate}</span>
              <span>·</span>
              <span>Period: {settlement.settlementPeriodLabel}</span>
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
            <span className="text-xs text-slate-400 block">
              Net Settlement Amount
            </span>
            <span className="text-xl font-extrabold text-[#5E17EB] tabular-nums">
              {formatNaira(settlement.netSettlementAmount)}
            </span>
          </div>
        </div>

        {/* Recorded Failure Information (only if status === 'failed' and actual failureReason exists) */}
        {settlement.status === 'failed' && settlement.failureReason && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Recorded Settlement Issue</span>
              <p className="text-red-800 leading-relaxed">
                {settlement.failureReason}
              </p>
            </div>
          </div>
        )}

        {/* Payout Reference & Period Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-400 block">Settlement Period</span>
            <span className="font-bold text-slate-900 block">
              {settlement.settlementPeriodLabel}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {settlement.transactionIds.length}{' '}
              {settlement.transactionIds.length === 1
                ? 'qualifying transaction'
                : 'qualifying transactions'}{' '}
              included
            </span>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-400 block">
              Payout Reference & Destination
            </span>
            {settlement.payoutReference ? (
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#5E17EB]" />
                {settlement.payoutReference}
              </span>
            ) : (
              <span className="font-medium text-slate-500 block">
                Not yet recorded
              </span>
            )}
            {settlement.payoutMethodLabel && (
              <span className="text-[11px] text-slate-500 block">
                {settlement.payoutMethodLabel}
              </span>
            )}
          </div>
        </div>

        {/* Settlement Financial Breakdown */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-200/80 pb-2">
            Settlement Financial Summary
          </span>

          <div className="flex items-center justify-between text-slate-700">
            <span className="font-medium">
              Gross Sales Included in Settlement
            </span>
            <span className="tabular-nums font-bold text-slate-900">
              {formatNaira(settlement.grossAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Applicable Discounts</span>
            <span
              className={`tabular-nums font-medium ${
                settlement.totalDiscounts > 0
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              {settlement.totalDiscounts > 0
                ? `-${formatNaira(settlement.totalDiscounts)}`
                : formatNaira(0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Applicable Merchant Fees & Commissions</span>
              {!feeConfig.isConfigured && settlement.merchantFees === 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-600">
                  <Info className="w-2.5 h-2.5" />
                  No fee rule configured
                </span>
              )}
            </div>
            <span className="tabular-nums font-medium text-slate-700 shrink-0">
              {settlement.merchantFees > 0
                ? `-${formatNaira(settlement.merchantFees)}`
                : formatNaira(0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
            <span className="font-medium">Total Deductions</span>
            <span className="tabular-nums font-semibold text-slate-800">
              {settlement.totalDeductions > 0
                ? `-${formatNaira(settlement.totalDeductions)}`
                : formatNaira(0)}
            </span>
          </div>

          <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
            <span>Net Settlement Amount</span>
            <span className="tabular-nums text-base text-[#5E17EB]">
              {formatNaira(settlement.netSettlementAmount)}
            </span>
          </div>
        </div>

        {/* Settlement Activity Timestamps */}
        {settlement.activityLog && settlement.activityLog.length > 0 && (
          <div className="space-y-2.5">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#5E17EB]" />
              Settlement Activity Timestamps
            </span>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
              {settlement.activityLog.map((item, idx) => {
                const isLatest = idx === settlement.activityLog.length - 1;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 text-xs"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1 ${
                          isLatest
                            ? 'bg-[#5E17EB] ring-4 ring-[#5E17EB]/15'
                            : 'bg-slate-300'
                        }`}
                      />
                      {!isLatest && (
                        <div className="w-0.5 h-6 bg-slate-200 my-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {item.formattedTime}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-slate-600 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
