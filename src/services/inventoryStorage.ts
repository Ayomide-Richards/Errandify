import { INITIAL_STOCK_HISTORY } from '../data/initialStockHistory';
import type {
  InventorySummaryMetrics,
  OrderStockCheckItem,
  OrderStockValidationIssue,
  OrderStockValidationResult,
  StockAdjustmentRecord,
  StockAdjustmentType,
} from '../types/inventory';
import type { Product } from '../types/product';
import {
  ProductStorage,
  getCombinationAvailability,
  getProductAvailability,
} from './productStorage';

const HISTORY_STORAGE_KEY = 'errandify_merchant_inventory_history_v1';

/**
 * Product-level summary counting approach:
 * - Each product in the catalog is counted in exactly one mutually exclusive stock status category
 *   (In Stock, Low Stock, or Out of Stock) based on `getProductAvailability(product)`:
 *   - Out of Stock: Available stock === 0
 *   - Low Stock: 0 < Available stock <= product's lowStockThreshold (default 10)
 *   - In Stock: Available stock > product's lowStockThreshold
 * - For products with selectable options (`with_options`), individual option combinations are also
 *   evaluated separately against their combination-level threshold so merchants receive specific
 *   combination-level low-stock and out-of-stock alerts even when aggregate product stock is high.
 */
export function calculateInventoryMetrics(products: Product[]): InventorySummaryMetrics {
  let inStockProducts = 0;
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let lowStockCombinationsCount = 0;
  let outOfStockCombinationsCount = 0;

  for (const product of products) {
    const status = getProductAvailability(product);
    if (status === 'in_stock') inStockProducts += 1;
    else if (status === 'low_stock') lowStockProducts += 1;
    else outOfStockProducts += 1;

    if (product.productType === 'with_options' && product.combinations) {
      for (const comb of product.combinations) {
        if (!comb.isAvailable) continue;
        const combStatus = getCombinationAvailability(comb, product.lowStockThreshold);
        if (combStatus === 'low_stock') lowStockCombinationsCount += 1;
        else if (combStatus === 'out_of_stock') outOfStockCombinationsCount += 1;
      }
    }
  }

  return {
    totalProducts: products.length,
    inStockProducts,
    lowStockProducts,
    outOfStockProducts,
    lowStockCombinationsCount,
    outOfStockCombinationsCount,
  };
}

export function getCombinationStockBreakdown(product: Product): {
  totalCombinations: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  disabledCount: number;
  lowStockTitles: string[];
  outOfStockTitles: string[];
} {
  const combinations = product.combinations || [];
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let disabledCount = 0;
  const lowStockTitles: string[] = [];
  const outOfStockTitles: string[] = [];

  for (const comb of combinations) {
    if (!comb.isAvailable) {
      disabledCount += 1;
      continue;
    }
    const status = getCombinationAvailability(comb, product.lowStockThreshold);
    if (status === 'in_stock') {
      inStockCount += 1;
    } else if (status === 'low_stock') {
      lowStockCount += 1;
      lowStockTitles.push(`${comb.title} (${comb.stockQuantity})`);
    } else {
      outOfStockCount += 1;
      outOfStockTitles.push(comb.title);
    }
  }

  return {
    totalCombinations: combinations.length,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    disabledCount,
    lowStockTitles,
    outOfStockTitles,
  };
}

export function previewStockAdjustment(
  currentStock: number,
  adjustmentType: StockAdjustmentType,
  quantityInput: number
): {
  isValid: boolean;
  resultingQuantity: number;
  delta: number;
  error?: string;
} {
  if (isNaN(quantityInput) || !Number.isInteger(quantityInput) || quantityInput < 0) {
    return {
      isValid: false,
      resultingQuantity: currentStock,
      delta: 0,
      error: 'Please enter a valid whole number (0 or greater).',
    };
  }

  if (adjustmentType === 'add') {
    if (quantityInput <= 0) {
      return {
        isValid: false,
        resultingQuantity: currentStock,
        delta: 0,
        error: 'Quantity to add must be greater than 0.',
      };
    }
    return {
      isValid: true,
      resultingQuantity: currentStock + quantityInput,
      delta: quantityInput,
    };
  }

  if (adjustmentType === 'remove') {
    if (quantityInput <= 0) {
      return {
        isValid: false,
        resultingQuantity: currentStock,
        delta: 0,
        error: 'Quantity to remove must be greater than 0.',
      };
    }
    if (quantityInput > currentStock) {
      return {
        isValid: false,
        resultingQuantity: currentStock - quantityInput,
        delta: quantityInput,
        error: `Cannot remove ${quantityInput} units when only ${currentStock} units are available in stock.`,
      };
    }
    return {
      isValid: true,
      resultingQuantity: currentStock - quantityInput,
      delta: quantityInput,
    };
  }

  // adjustmentType === 'set'
  return {
    isValid: true,
    resultingQuantity: quantityInput,
    delta: Math.abs(quantityInput - currentStock),
  };
}

export const InventoryStorage = {
  getHistory(): StockAdjustmentRecord[] {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(INITIAL_STOCK_HISTORY));
        return INITIAL_STOCK_HISTORY;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load stock adjustment history', e);
      return INITIAL_STOCK_HISTORY;
    }
  },

  saveHistory(records: StockAdjustmentRecord[]): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save stock adjustment history', e);
    }
  },

  getProductHistory(productId: string): StockAdjustmentRecord[] {
    return this.getHistory().filter((r) => r.productId === productId);
  },

  adjustStock(params: {
    productId: string;
    combinationId?: string;
    adjustmentType: StockAdjustmentType;
    quantity: number;
    reason: string;
    notes?: string;
    performedBy?: string;
  }): { updatedProduct: Product; record: StockAdjustmentRecord } {
    const product = ProductStorage.getProductById(params.productId);
    if (!product) {
      throw new Error('Product not found in catalog.');
    }

    const now = new Date().toISOString();
    const performedBy = params.performedBy || 'XYZ limited (Store Admin)';

    if (product.productType === 'with_options') {
      if (!params.combinationId) {
        throw new Error('Please select a specific product option combination to adjust.');
      }
      const combinations = product.combinations || [];
      const combIdx = combinations.findIndex((c) => c.id === params.combinationId);
      if (combIdx === -1) {
        throw new Error('Selected option combination was not found.');
      }

      const targetComb = combinations[combIdx];
      const previousQuantity = targetComb.stockQuantity || 0;
      const preview = previewStockAdjustment(
        previousQuantity,
        params.adjustmentType,
        params.quantity
      );

      if (!preview.isValid) {
        throw new Error(preview.error || 'Invalid stock adjustment quantity.');
      }

      const updatedCombinations = [...combinations];
      updatedCombinations[combIdx] = {
        ...targetComb,
        stockQuantity: preview.resultingQuantity,
        lastStockUpdate: now,
      };

      const updatedProduct = ProductStorage.updateProduct(product.id, {
        combinations: updatedCombinations,
        lastStockUpdate: now,
      });

      const record: StockAdjustmentRecord = {
        id: `adj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        productId: product.id,
        productName: product.name,
        combinationId: targetComb.id,
        combinationTitle: targetComb.title,
        unitOfSale: 'units',
        adjustmentType: params.adjustmentType,
        previousQuantity,
        quantityChanged: preview.delta,
        resultingQuantity: preview.resultingQuantity,
        reason: params.reason,
        notes: params.notes?.trim() || undefined,
        performedBy,
        createdAt: now,
      };

      const history = this.getHistory();
      this.saveHistory([record, ...history]);

      return { updatedProduct, record };
    }

    // Individual product
    const previousQuantity = product.stockQuantity || 0;
    const preview = previewStockAdjustment(
      previousQuantity,
      params.adjustmentType,
      params.quantity
    );

    if (!preview.isValid) {
      throw new Error(preview.error || 'Invalid stock adjustment quantity.');
    }

    const updatedProduct = ProductStorage.updateProduct(product.id, {
      stockQuantity: preview.resultingQuantity,
      lastStockUpdate: now,
    });

    const record: StockAdjustmentRecord = {
      id: `adj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      productId: product.id,
      productName: product.name,
      unitOfSale: product.unitOfSale || 'Unit',
      adjustmentType: params.adjustmentType,
      previousQuantity,
      quantityChanged: preview.delta,
      resultingQuantity: preview.resultingQuantity,
      reason: params.reason,
      notes: params.notes?.trim() || undefined,
      performedBy,
      createdAt: now,
    };

    const history = this.getHistory();
    this.saveHistory([record, ...history]);

    return { updatedProduct, record };
  },

  updateLowStockThreshold(params: {
    productId: string;
    threshold: number;
    combinationId?: string;
  }): Product {
    if (isNaN(params.threshold) || !Number.isInteger(params.threshold) || params.threshold < 0) {
      throw new Error('Low-stock threshold must be a whole number of 0 or greater.');
    }

    const product = ProductStorage.getProductById(params.productId);
    if (!product) {
      throw new Error('Product not found.');
    }

    if (params.combinationId && product.productType === 'with_options' && product.combinations) {
      const updatedCombinations = product.combinations.map((c) =>
        c.id === params.combinationId ? { ...c, lowStockThreshold: params.threshold } : c
      );
      return ProductStorage.updateProduct(product.id, {
        combinations: updatedCombinations,
      });
    }

    return ProductStorage.updateProduct(product.id, {
      lowStockThreshold: params.threshold,
    });
  },

  /**
   * Validates requested order quantities against current live inventory.
   * Aggregates duplicate lines for the same product/combination before checking stock.
   */
  validateOrderStock(
    items: OrderStockCheckItem[],
    currentProducts?: Product[]
  ): OrderStockValidationResult {
    const products = currentProducts || ProductStorage.getProducts();
    const issues: OrderStockValidationIssue[] = [];

    // Aggregate quantities by productId + combinationId
    const aggregated = new Map<string, { productId: string; combinationId?: string; quantity: number }>();
    for (const item of items) {
      const key = `${item.productId}::${item.combinationId || 'base'}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        aggregated.set(key, {
          productId: item.productId,
          combinationId: item.combinationId,
          quantity: item.quantity,
        });
      }
    }

    for (const req of aggregated.values()) {
      const product = products.find((p) => p.id === req.productId);
      if (!product) {
        issues.push({
          productId: req.productId,
          productName: 'Unknown Product',
          requestedQuantity: req.quantity,
          availableQuantity: 0,
          issueType: 'product_not_found',
          message: 'This product is no longer available in the catalog.',
        });
        continue;
      }

      if (product.productType === 'with_options') {
        const comb = product.combinations?.find((c) => c.id === req.combinationId);
        if (!comb) {
          issues.push({
            productId: product.id,
            productName: product.name,
            combinationId: req.combinationId,
            requestedQuantity: req.quantity,
            availableQuantity: 0,
            unitOfSale: 'units',
            issueType: 'product_not_found',
            message: `${product.name}: Please select a valid product option combination.`,
          });
          continue;
        }

        if (!comb.isAvailable) {
          issues.push({
            productId: product.id,
            productName: product.name,
            combinationId: comb.id,
            combinationTitle: comb.title,
            requestedQuantity: req.quantity,
            availableQuantity: 0,
            unitOfSale: 'units',
            issueType: 'combination_disabled',
            message: `${product.name} (${comb.title}) is currently disabled and unavailable for purchase.`,
          });
          continue;
        }

        const available = comb.stockQuantity || 0;
        if (available <= 0) {
          issues.push({
            productId: product.id,
            productName: product.name,
            combinationId: comb.id,
            combinationTitle: comb.title,
            requestedQuantity: req.quantity,
            availableQuantity: 0,
            unitOfSale: 'units',
            issueType: 'out_of_stock',
            message: `${product.name} (${comb.title}) is Out of Stock (0 available).`,
          });
        } else if (req.quantity > available) {
          issues.push({
            productId: product.id,
            productName: product.name,
            combinationId: comb.id,
            combinationTitle: comb.title,
            requestedQuantity: req.quantity,
            availableQuantity: available,
            unitOfSale: 'units',
            issueType: 'insufficient_stock',
            message: `${product.name} (${comb.title}): Requested ${req.quantity} units, but only ${available} units are available in stock.`,
          });
        }
      } else {
        // Individual product
        const available = product.stockQuantity || 0;
        const unitLabel = product.unitOfSale || 'units';
        if (available <= 0) {
          issues.push({
            productId: product.id,
            productName: product.name,
            requestedQuantity: req.quantity,
            availableQuantity: 0,
            unitOfSale: unitLabel,
            issueType: 'out_of_stock',
            message: `${product.name} is Out of Stock (0 ${unitLabel} available).`,
          });
        } else if (req.quantity > available) {
          issues.push({
            productId: product.id,
            productName: product.name,
            requestedQuantity: req.quantity,
            availableQuantity: available,
            unitOfSale: unitLabel,
            issueType: 'insufficient_stock',
            message: `${product.name}: Requested ${req.quantity} ${unitLabel}, but only ${available} ${unitLabel} available in stock.`,
          });
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  },

  /**
   * Validates all items in an order and deducts their stock once.
   */
  deductStockForOrder(params: {
    orderNumber: string;
    items: OrderStockCheckItem[];
  }): { success: boolean; validation: OrderStockValidationResult } {
    const products = ProductStorage.getProducts();
    const validation = this.validateOrderStock(params.items, products);
    if (!validation.isValid) {
      return { success: false, validation };
    }

    for (const item of params.items) {
      this.adjustStock({
        productId: item.productId,
        combinationId: item.combinationId,
        adjustmentType: 'remove',
        quantity: item.quantity,
        reason: 'Order fulfilled',
        notes: `Stock deducted upon confirming order ${params.orderNumber}.`,
        performedBy: `Order ${params.orderNumber}`,
      });
    }

    return { success: true, validation };
  },
};

