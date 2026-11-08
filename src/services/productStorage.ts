import { INITIAL_PRODUCTS } from '../data/initialProducts';
import type { AvailabilityStatus, Product, SummaryMetrics } from '../types/product';

const STORAGE_KEY = 'errandify_merchant_products_v1';

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('NGN', '₦');
}

export function getProductStock(product: Product): number {
  if (product.productType === 'with_options') {
    if (!product.combinations || product.combinations.length === 0) return 0;
    return product.combinations.reduce((sum, c) => sum + (c.isAvailable ? (c.stockQuantity || 0) : 0), 0);
  }
  return product.stockQuantity || 0;
}

export function getProductAvailability(product: Product): AvailabilityStatus {
  const stock = getProductStock(product);
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 10) return 'low_stock';
  return 'in_stock';
}

export interface ProductPriceInfo {
  display: string;
  min: number;
  max: number;
  hasDiscount: boolean;
  effectivePrice?: number;
  originalPrice?: number;
  originalDisplay?: string;
  discountPercentage?: number;
}

export function getProductPriceDisplay(product: Product): ProductPriceInfo {
  // Products with options
  if (product.productType === 'with_options' && product.combinations && product.combinations.length > 0) {
    const activeCombs = product.combinations.filter((c) => c.isAvailable && c.price > 0);
    const targetCombs = activeCombs.length > 0 ? activeCombs : product.combinations;

    const effectivePrices = targetCombs.map((c) =>
      c.discountPrice && c.discountPrice > 0 && c.discountPrice < c.price
        ? c.discountPrice
        : c.price
    );
    const originalPrices = targetCombs.map((c) => c.price);

    const minEffective = Math.min(...effectivePrices);
    const maxEffective = Math.max(...effectivePrices);
    const minOriginal = Math.min(...originalPrices);
    const maxOriginal = Math.max(...originalPrices);

    const hasDiscount = targetCombs.some(
      (c) => c.discountPrice && c.discountPrice > 0 && c.discountPrice < c.price
    );

    const display =
      minEffective === maxEffective
        ? formatNaira(minEffective)
        : `${formatNaira(minEffective)} - ${formatNaira(maxEffective)}`;

    const originalDisplay =
      minOriginal === maxOriginal
        ? formatNaira(minOriginal)
        : `${formatNaira(minOriginal)} - ${formatNaira(maxOriginal)}`;

    return {
      display,
      min: minEffective,
      max: maxEffective,
      hasDiscount,
      originalDisplay: hasDiscount ? originalDisplay : undefined,
    };
  }

  // Individual product
  const original = product.price || 0;
  const discount = product.discountPrice;
  const hasDiscount = Boolean(discount && discount > 0 && discount < original);

  if (hasDiscount && discount) {
    const savings = original - discount;
    const discountPercentage = Math.round((savings / original) * 100);

    return {
      display: formatNaira(discount),
      min: discount,
      max: discount,
      hasDiscount: true,
      effectivePrice: discount,
      originalPrice: original,
      originalDisplay: formatNaira(original),
      discountPercentage,
    };
  }

  return {
    display: formatNaira(original),
    min: original,
    max: original,
    hasDiscount: false,
    effectivePrice: original,
    originalPrice: original,
  };
}

export function calculateSummaryMetrics(products: Product[]): SummaryMetrics {
  const total = products.length;
  const published = products.filter((p) => p.isPublished).length;
  const unpublished = products.filter((p) => !p.isPublished).length;
  const outOfStock = products.filter((p) => getProductAvailability(p) === 'out_of_stock').length;

  return {
    totalProducts: total,
    publishedProducts: published,
    unpublishedProducts: unpublished,
    outOfStockProducts: outOfStock,
  };
}

export const ProductStorage = {
  getProducts(): Product[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load products from storage', e);
      return INITIAL_PRODUCTS;
    }
  },

  getProductById(id: string): Product | undefined {
    const list = this.getProducts();
    return list.find((p) => p.id === id);
  },

  saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products to storage', e);
    }
  },

  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const list = this.getProducts();
    const newId = `prod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();

    const newProduct: Product = {
      ...product,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newProduct, ...list];
    this.saveProducts(updated);
    return newProduct;
  },

  updateProduct(id: string, updates: Partial<Product>): Product {
    const list = this.getProducts();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const updatedProduct: Product = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if ('discountPrice' in updates && updates.discountPrice === undefined) {
      delete updatedProduct.discountPrice;
    }

    list[index] = updatedProduct;
    this.saveProducts(list);
    return updatedProduct;
  },

  togglePublish(id: string): Product {
    const product = this.getProductById(id);
    if (!product) throw new Error('Product not found');
    return this.updateProduct(id, { isPublished: !product.isPublished });
  },

  bulkUnpublish(ids: string[]): void {
    const list = this.getProducts();
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    const updated = list.map((p) => {
      if (idSet.has(p.id)) {
        return { ...p, isPublished: false, updatedAt: now };
      }
      return p;
    });
    this.saveProducts(updated);
  },

  bulkPublish(ids: string[]): void {
    const list = this.getProducts();
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    const updated = list.map((p) => {
      if (idSet.has(p.id)) {
        return { ...p, isPublished: true, updatedAt: now };
      }
      return p;
    });
    this.saveProducts(updated);
  },

  deleteProduct(id: string): void {
    const list = this.getProducts();
    const filtered = list.filter((p) => p.id !== id);
    this.saveProducts(filtered);
  },

  bulkDelete(ids: string[]): void {
    const list = this.getProducts();
    const idSet = new Set(ids);
    const filtered = list.filter((p) => !idSet.has(p.id));
    this.saveProducts(filtered);
  },

  resetToDefault(): Product[] {
    localStorage.removeItem(STORAGE_KEY);
    return this.getProducts();
  },
};
