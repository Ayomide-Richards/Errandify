import React from 'react';
import type {
  FundsStatus,
  PaymentStatus,
  SettlementStatus,
} from '../../types/sales';
import {
  FUNDS_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
} from '../../services/salesStorage';

export const PaymentStatusBadge: React.FC<{
  status: PaymentStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  const styles: Record<PaymentStatus, string> = {
    confirmed: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    pending: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
    failed: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    refunded: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]} ${className}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
};

export const FundsStatusBadge: React.FC<{
  status: FundsStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  const styles: Record<FundsStatus, string> = {
    in_escrow: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
    awaiting_settlement: 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]',
    settled: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    refunded: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]} ${className}`}
    >
      {FUNDS_STATUS_LABELS[status]}
    </span>
  );
};

export const SettlementStatusBadge: React.FC<{
  status: SettlementStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  const styles: Record<SettlementStatus, string> = {
    paid: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    processing: 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]',
    failed: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]} ${className}`}
    >
      {SETTLEMENT_STATUS_LABELS[status]}
    </span>
  );
};
