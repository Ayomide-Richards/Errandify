export type StockAdjustmentType = 'add' | 'remove' | 'set';

export type StockAdjustmentReason =
  | 'New stock received'
  | 'Damaged goods'
  | 'Expired goods'
  | 'Missing or lost stock'
  | 'Stock correction'
  | 'Manual stock count'
  | 'Order fulfilled'
  | 'Other';

export interface StockAdjustmentRecord {
  id: string;
  productId: string;
  productName: string;
  combinationId?: string;
  combinationTitle?: string;
  unitOfSale?: string;
  adjustmentType: StockAdjustmentType;
  previousQuantity: number;
  quantityChanged: number; // Positive delta for add/remove, or absolute difference for set
  resultingQuantity: number;
  reason: string;
  notes?: string;
  performedBy: string; // e.g. "XYZ limited (Store Admin)"
  createdAt: string; // ISO 8601 timestamp
}

export interface InventoryFilters {
  search: string;
  category: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'updated_desc' | 'name_asc' | 'qty_asc' | 'qty_desc';
}

export interface InventorySummaryMetrics {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  lowStockCombinationsCount: number;
  outOfStockCombinationsCount: number;
}

export interface OrderStockCheckItem {
  productId: string;
  combinationId?: string;
  quantity: number;
}

export interface OrderStockValidationIssue {
  productId: string;
  productName: string;
  combinationId?: string;
  combinationTitle?: string;
  requestedQuantity: number;
  availableQuantity: number;
  unitOfSale?: string;
  issueType:
    | 'out_of_stock'
    | 'insufficient_stock'
    | 'combination_disabled'
    | 'product_not_found';
  message: string;
}

export interface OrderStockValidationResult {
  isValid: boolean;
  issues: OrderStockValidationIssue[];
}

