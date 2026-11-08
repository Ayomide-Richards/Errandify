import React from 'react';
import type { AvailabilityStatus } from '../../types/product';
import type { OrderStatus } from '../../types/order';
import type { PromotionStatus, PromotionType } from '../../types/promotion';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'published'
    | 'unpublished'
    | 'in_stock'
    | 'low_stock'
    | 'out_of_stock'
    | 'purple'
    | 'neutral'
    | 'new_order'
    | 'preparing'
    | 'ready_for_pickup'
    | 'runner_assigned'
    | 'picked_up'
    | 'delivered'
    | 'cancelled'
    | 'active'
    | 'scheduled'
    | 'expired'
    | 'inactive';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-medium';

  const variantClasses = {
    // Exact peach/orange badge from Errandify mockup for Published & New order
    published: 'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]/60 font-medium',
    unpublished: 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] font-medium',

    // Availability statuses
    in_stock: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    low_stock: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
    out_of_stock: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',

    // Accent badges
    purple: 'bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA] font-medium',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',

    // Order status badges (Exact match from Merchant Dashboard Active.png)
    new_order: 'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]/60 font-medium',
    preparing: 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]/60 font-medium',
    ready_for_pickup: 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]/60 font-medium',
    runner_assigned: 'bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3]/60 font-medium',
    picked_up: 'bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE]/60 font-medium',
    delivered: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',

    // Promotion status badges
    active: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] font-medium',
    scheduled: 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] font-medium',
    expired: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] font-medium',
    inactive: 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] font-medium',
  }[variant];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full transition-colors ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export const AvailabilityBadge: React.FC<{ status: AvailabilityStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'in_stock':
      return <Badge variant="in_stock" className={className}>In Stock</Badge>;
    case 'low_stock':
      return <Badge variant="low_stock" className={className}>Low Stock</Badge>;
    case 'out_of_stock':
      return <Badge variant="out_of_stock" className={className}>Out of Stock</Badge>;
  }
};

export const PublicationBadge: React.FC<{ isPublished: boolean; className?: string }> = ({
  isPublished,
  className = '',
}) => {
  return isPublished ? (
    <Badge variant="published" className={className}>Published</Badge>
  ) : (
    <Badge variant="unpublished" className={className}>Unpublished</Badge>
  );
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus; label?: string; className?: string }> = ({
  status,
  label,
  className = '',
}) => {
  const displayLabel = label || {
    new_order: 'New order',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready for pickup',
    runner_assigned: 'Runner assigned',
    picked_up: 'Picked up',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }[status];

  return (
    <Badge variant={status} className={className}>
      {displayLabel}
    </Badge>
  );
};

export const PromotionStatusBadge: React.FC<{ status: PromotionStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const labels: Record<PromotionStatus, string> = {
    active: 'Active',
    scheduled: 'Scheduled',
    expired: 'Expired',
    inactive: 'Inactive',
  };

  return (
    <Badge variant={status} className={className}>
      {labels[status]}
    </Badge>
  );
};

export const PromotionTypeBadge: React.FC<{ type: PromotionType; className?: string }> = ({
  type,
  className = '',
}) => {
  const labels: Record<PromotionType, string> = {
    percentage_discount: 'Percentage Discount',
    fixed_discount: 'Fixed Discount',
    minimum_purchase: 'Min Purchase Discount',
    free_delivery: 'Free Delivery',
    custom: 'Custom Promotion',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F5F2FE] text-[#5E17EB] border border-[#DDD0FA] ${className}`}
    >
      {labels[type]}
    </span>
  );
};
