import React from 'react';
import type { SettlementStatus, TransactionStatus } from '../../types/sales';
import {
  SETTLEMENT_STATUS_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '../../services/salesStorage';

export const TransactionStatusBadge: React.FC<{
  status: TransactionStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  const styles: Record<TransactionStatus, string> = {
    successful: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    pending: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
    failed: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    refunded: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
    partially_refunded: 'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]} ${className}`}
    >
      {TRANSACTION_STATUS_LABELS[status]}
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
    pending: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
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

