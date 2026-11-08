export type PromotionType =
  | 'percentage_discount'
  | 'fixed_discount'
  | 'minimum_purchase'
  | 'free_delivery'
  | 'custom';

export type PromotionStatus = 'scheduled' | 'active' | 'expired' | 'inactive';

export type PromotionTarget = 'all_products' | 'selected_products' | 'selected_categories';

export interface Promotion {
  id: string;
  name: string; // Title e.g. "Weekend 10% Off Flash Sale"
  description?: string;
  type: PromotionType;
  
  // Conditional discount values based on type
  discountPercentage?: number; // e.g. 10 for 10%
  discountAmount?: number; // e.g. 2000 for ₦2,000
  minimumPurchaseAmount?: number; // e.g. 20000 for ₦20,000
  freeDeliveryThreshold?: number; // Minimum order spend for free delivery, 0 for unconditional
  customBenefit?: string; // For custom promotions
  
  // Scope / Target
  targetType: PromotionTarget;
  applicableProductIds?: string[];
  applicableCategories?: string[];
  
  // Scheduling
  startDate: string; // ISO date or "YYYY-MM-DDTHH:mm"
  endDate: string;
  
  // Controls
  isActive: boolean; // Merchant toggle (active vs paused/inactive)
  allowStackingWithProductDiscounts: boolean; // Configurable discount stacking rule
  
  createdAt: string;
  updatedAt: string;
}

export interface PromotionFormData {
  name: string;
  description: string;
  type: PromotionType;
  discountPercentage: string;
  discountAmount: string;
  minimumPurchaseAmount: string;
  freeDeliveryThreshold: string;
  customBenefit: string;
  targetType: PromotionTarget;
  applicableProductIds: string[];
  applicableCategories: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  allowStackingWithProductDiscounts: boolean;
}

