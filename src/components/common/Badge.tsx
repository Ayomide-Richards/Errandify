import React from 'react';
import type { AvailabilityStatus } from '../../types/product';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'published' | 'unpublished' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'purple' | 'neutral';
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
    // Exact peach/orange badge from Errandify mockup for Published
    published: 'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]/50 font-medium',
    // Soft slate/gray badge for Unpublished
    unpublished: 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] font-medium',
    // Availability statuses
    in_stock: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    low_stock: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
    out_of_stock: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    // Accent badges
    purple: 'bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA] font-medium',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
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
