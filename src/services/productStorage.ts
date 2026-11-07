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

export function getProductPriceDisplay(product: Product): { display: string; min: number; max: number } {
  if (product.productType === 'with_options' && product.combinations && product.combinations.length > 0) {
    const validPrices = product.combinations
      .filter((c) => c.isAvailable && c.price > 0)
      .map((c) => c.price);

    if (validPrices.length === 0) {
      const allPrices = product.combinations.map((c) => c.price);
      const min = Math.min(...allPrices);
      const max = Math.max(...allPrices);
      return {
        display: min === max ? formatNaira(min) : `${formatNaira(min)} - ${formatNaira(max)}`,
        min,
        max,
      };
    }

    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    return {
      display: min === max ? formatNaira(min) : `${formatNaira(min)} - ${formatNaira(max)}`,
      min,
      max,
    };
  }

  const p = product.price || 0;
  return {
    display: formatNaira(p),
    min: p,
    max: p,
  };
}

export function calculateSummaryMetrics(products: Product[]): SummaryMetrics {
  const activeProducts = products.filter((p) => !p.isArchived);
  const total = activeProducts.length;
  const published = activeProducts.filter((p) => p.isPublished).length;
  const unpublished = activeProducts.filter((p) => !p.isPublished).length;
  const outOfStock = activeProducts.filter((p) => getProductAvailability(p) === 'out_of_stock').length;

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

  archiveProduct(id: string): Product {
    return this.updateProduct(id, { isArchived: true });
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
