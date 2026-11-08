import { INITIAL_PROMOTIONS } from '../data/initialPromotions';
import type { Promotion, PromotionStatus } from '../types/promotion';
import { formatNaira } from './productStorage';

const PROMOTIONS_STORAGE_KEY = 'errandify_merchant_promotions_v1';

export function getPromotionStatus(promo: Promotion): PromotionStatus {
  if (!promo.isActive) return 'inactive';

  const now = new Date().getTime();
  const start = new Date(promo.startDate).getTime();
  const end = new Date(promo.endDate).getTime();

  if (now > end) return 'expired';
  if (now < start) return 'scheduled';
  return 'active';
}

export function getPromotionBenefitLabel(promo: Promotion): string {
  switch (promo.type) {
    case 'percentage_discount':
      return `${promo.discountPercentage || 0}% Off`;
    case 'fixed_discount':
      return `${formatNaira(promo.discountAmount || 0)} Off`;
    case 'minimum_purchase':
      return `${formatNaira(promo.discountAmount || 0)} Off (Min ${formatNaira(promo.minimumPurchaseAmount || 0)})`;
    case 'free_delivery':
      return promo.freeDeliveryThreshold && promo.freeDeliveryThreshold > 0
        ? `Free Delivery over ${formatNaira(promo.freeDeliveryThreshold)}`
        : 'Free Delivery';
    case 'custom':
      return promo.customBenefit || 'Custom Offer';
    default:
      return 'Special Offer';
  }
}

export const PromotionStorage = {
  getPromotions(): Promotion[] {
    try {
      const stored = localStorage.getItem(PROMOTIONS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(INITIAL_PROMOTIONS));
        return INITIAL_PROMOTIONS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load promotions from storage', e);
      return INITIAL_PROMOTIONS;
    }
  },

  getPromotionById(id: string): Promotion | undefined {
    return this.getPromotions().find((p) => p.id === id);
  },

  savePromotions(promotions: Promotion[]): void {
    try {
      localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(promotions));
    } catch (e) {
      console.error('Failed to save promotions', e);
    }
  },

  createPromotion(data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promotion {
    const list = this.getPromotions();
    const now = new Date().toISOString();
    const newId = `promo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;

    const newPromotion: Promotion = {
      ...data,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newPromotion, ...list];
    this.savePromotions(updated);
    return newPromotion;
  },

  updatePromotion(id: string, updates: Partial<Promotion>): Promotion {
    const list = this.getPromotions();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Promotion not found');

    const updatedPromotion: Promotion = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedPromotion;
    this.savePromotions(list);
    return updatedPromotion;
  },

  togglePromotionActive(id: string): Promotion {
    const promo = this.getPromotionById(id);
    if (!promo) throw new Error('Promotion not found');
    return this.updatePromotion(id, { isActive: !promo.isActive });
  },

  deletePromotion(id: string): void {
    const list = this.getPromotions();
    const filtered = list.filter((p) => p.id !== id);
    this.savePromotions(filtered);
  },

  getActivePromotionsCount(): number {
    return this.getPromotions().filter((p) => getPromotionStatus(p) === 'active').length;
  },
};

